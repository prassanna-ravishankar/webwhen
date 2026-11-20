import logging
import random
from datetime import UTC, datetime, timedelta

from apscheduler.triggers.date import DateTrigger

from webwhen.core.database import db
from webwhen.scheduler import JOB_FUNC_REF
from webwhen.scheduler.scheduler import get_scheduler

logger = logging.getLogger(__name__)


async def reap_stale_executions() -> None:
    """Mark executions stuck in 'pending' or 'running' for >30 minutes as failed.

    A pending row is orphaned when its pod dies between creating the row and
    starting the run. Left alone it blocks manual runs and makes the job sync
    treat the watch as in flight forever.
    """
    now = datetime.now(UTC)
    cutoff_time = now - timedelta(minutes=30)
    result = await db.fetch_all(
        """UPDATE task_executions
           SET status = 'failed',
               error_message = 'Reaped: execution stuck in ' || status || ' state',
               completed_at = $1
           WHERE status IN ('pending', 'running')
             AND started_at < $2
           RETURNING id""",
        now,
        cutoff_time,
    )
    if result:
        logger.warning(f"Reaped {len(result)} stale pending/running executions")


async def sync_jobs_from_database() -> None:
    """Ensure APScheduler jobs match active/paused tasks in the database.

    Runs on startup and every 15 minutes on the scheduler leader. Creates
    missing jobs, removes orphaned jobs. A watch whose job is gone (lost after
    exhausted retries, a reaped execution, or a dead scheduler loop) is
    rescheduled within minutes rather than left active but never running.
    Tasks with an execution in flight are skipped: their date job has already
    fired and the execution schedules the next run itself.
    """
    scheduler = get_scheduler()

    rows = await db.fetch_all(
        """SELECT t.id, t.user_id, t.name, t.next_run, t.state,
                  EXISTS (
                      SELECT 1 FROM task_executions e
                      WHERE e.task_id = t.id AND e.status IN ('pending', 'running')
                  ) AS in_flight
           FROM tasks t
           WHERE t.state IN ('active', 'paused')"""
    )

    expected_job_ids = set()
    failed_count = 0

    now = datetime.now(UTC)

    for row in rows:
        try:
            task_id = str(row["id"])
            job_id = f"task-{task_id}"
            expected_job_ids.add(job_id)

            existing_job = scheduler.get_job(job_id)

            if existing_job is None and row["in_flight"]:
                continue

            next_run = row["next_run"]
            overdue = next_run is None or next_run <= now
            # A job parked well past an overdue next_run (earlier syncs used a
            # silent +24h fallback) is pulled in like a missing one.
            parked = (
                existing_job is not None
                and overdue
                and row["state"] == "active"
                and not row["in_flight"]
                and existing_job.next_run_time is not None
                and existing_job.next_run_time > now + timedelta(minutes=15)
            )
            if overdue and (existing_job is None or parked):
                # Run soon, spread out so a backlog doesn't fire at once.
                next_run = now + timedelta(seconds=random.uniform(60, 600))
                await db.execute(
                    "UPDATE tasks SET next_run = $1 WHERE id = $2", next_run, row["id"]
                )

            if parked:
                scheduler.reschedule_job(job_id, trigger=DateTrigger(run_date=next_run))
                logger.info(f"Pulled in overdue job {job_id} to {next_run.isoformat()}")
            elif existing_job is None:
                scheduler.add_job(
                    JOB_FUNC_REF,
                    trigger=DateTrigger(run_date=next_run),
                    id=job_id,
                    args=[
                        task_id,
                        str(row["user_id"]),
                        row["name"],
                        0,
                        None,
                    ],  # retry_count=0, execution_id=None on sync
                    replace_existing=True,
                )
                if row["state"] == "paused":
                    scheduler.pause_job(job_id)
                logger.info(f"Synced job {job_id} (state={row['state']})")
            else:
                if row["state"] == "paused" and existing_job.next_run_time is not None:
                    scheduler.pause_job(job_id)
                elif row["state"] == "active" and existing_job.next_run_time is None:
                    scheduler.resume_job(job_id)
        except Exception as e:
            failed_count += 1
            logger.error(f"Failed to sync job for task {row['id']}: {e}", exc_info=True)
            continue

    for job in scheduler.get_jobs():
        if job.id.startswith("task-") and job.id not in expected_job_ids:
            scheduler.remove_job(job.id)
            logger.info(f"Removed orphaned job {job.id}")

    if failed_count:
        logger.warning(f"Job sync completed with {failed_count} failures out of {len(rows)} tasks")
    else:
        logger.info(f"Job sync completed: {len(rows)} tasks synced, 0 failures")
