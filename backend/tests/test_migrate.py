"""Tests for scheduler migration functions (sync_jobs_from_database, reap_stale_executions)."""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

MODULE = "webwhen.scheduler.migrate"


def _make_task_row(state="active", next_run=None, in_flight=False):
    return {
        "id": uuid4(),
        "user_id": uuid4(),
        "name": "Test Task",
        "next_run": next_run or (datetime.now(UTC) + timedelta(hours=24)),
        "state": state,
        "in_flight": in_flight,
    }


def _make_job(job_id, paused=False):
    job = MagicMock()
    job.id = job_id
    job.next_run_time = None if paused else datetime.now(UTC)
    return job


class TestSyncJobsFromDatabase:
    @pytest.mark.asyncio
    @patch(f"{MODULE}.get_scheduler")
    @patch(f"{MODULE}.db")
    async def test_active_task_no_job_creates_job(self, mock_db, mock_sched_fn):
        """Active task with no existing job -> creates job."""
        row = _make_task_row(state="active")
        mock_db.fetch_all = AsyncMock(return_value=[row])

        scheduler = MagicMock()
        scheduler.get_job.return_value = None
        scheduler.get_jobs.return_value = []
        mock_sched_fn.return_value = scheduler

        from webwhen.scheduler.migrate import sync_jobs_from_database

        await sync_jobs_from_database()

        scheduler.add_job.assert_called_once()
        scheduler.pause_job.assert_not_called()

    @pytest.mark.asyncio
    @patch(f"{MODULE}.get_scheduler")
    @patch(f"{MODULE}.db")
    async def test_paused_task_no_job_creates_and_pauses(self, mock_db, mock_sched_fn):
        """Paused task with no existing job -> creates job then pauses it."""
        row = _make_task_row(state="paused")
        mock_db.fetch_all = AsyncMock(return_value=[row])

        scheduler = MagicMock()
        scheduler.get_job.return_value = None
        scheduler.get_jobs.return_value = []
        mock_sched_fn.return_value = scheduler

        from webwhen.scheduler.migrate import sync_jobs_from_database

        await sync_jobs_from_database()

        scheduler.add_job.assert_called_once()
        scheduler.pause_job.assert_called_once_with(f"task-{row['id']}")

    @pytest.mark.asyncio
    @patch(f"{MODULE}.get_scheduler")
    @patch(f"{MODULE}.db")
    async def test_active_task_paused_job_resumes(self, mock_db, mock_sched_fn):
        """Active task with paused job -> resumes job."""
        row = _make_task_row(state="active")
        job_id = f"task-{row['id']}"
        mock_db.fetch_all = AsyncMock(return_value=[row])

        scheduler = MagicMock()
        scheduler.get_job.return_value = _make_job(job_id, paused=True)
        scheduler.get_jobs.return_value = [_make_job(job_id, paused=True)]
        mock_sched_fn.return_value = scheduler

        from webwhen.scheduler.migrate import sync_jobs_from_database

        await sync_jobs_from_database()

        scheduler.resume_job.assert_called_once_with(job_id)
        scheduler.add_job.assert_not_called()

    @pytest.mark.asyncio
    @patch(f"{MODULE}.get_scheduler")
    @patch(f"{MODULE}.db")
    async def test_paused_task_active_job_pauses(self, mock_db, mock_sched_fn):
        """Paused task with active job -> pauses job."""
        row = _make_task_row(state="paused")
        job_id = f"task-{row['id']}"
        mock_db.fetch_all = AsyncMock(return_value=[row])

        scheduler = MagicMock()
        scheduler.get_job.return_value = _make_job(job_id, paused=False)
        scheduler.get_jobs.return_value = [_make_job(job_id, paused=False)]
        mock_sched_fn.return_value = scheduler

        from webwhen.scheduler.migrate import sync_jobs_from_database

        await sync_jobs_from_database()

        scheduler.pause_job.assert_called_once_with(job_id)

    @pytest.mark.asyncio
    @patch(f"{MODULE}.get_scheduler")
    @patch(f"{MODULE}.db")
    async def test_overdue_task_without_job_runs_within_minutes(self, mock_db, mock_sched_fn):
        """A watch that lost its job is rescheduled soon and the new next_run persisted."""
        row = _make_task_row(state="active", next_run=datetime.now(UTC) - timedelta(days=4))
        mock_db.fetch_all = AsyncMock(return_value=[row])
        mock_db.execute = AsyncMock()

        scheduler = MagicMock()
        scheduler.get_job.return_value = None
        scheduler.get_jobs.return_value = []
        mock_sched_fn.return_value = scheduler

        from webwhen.scheduler.migrate import sync_jobs_from_database

        before = datetime.now(UTC)
        await sync_jobs_from_database()

        run_date = scheduler.add_job.call_args.kwargs["trigger"].run_date
        assert before + timedelta(seconds=60) <= run_date <= before + timedelta(seconds=601)
        mock_db.execute.assert_awaited_once_with(
            "UPDATE tasks SET next_run = $1 WHERE id = $2", run_date, row["id"]
        )

    @pytest.mark.asyncio
    @patch(f"{MODULE}.get_scheduler")
    @patch(f"{MODULE}.db")
    async def test_in_flight_task_without_job_is_left_alone(self, mock_db, mock_sched_fn):
        """A running execution already fired its job; re-adding it would run the watch twice."""
        row = _make_task_row(state="active", next_run=datetime.now(UTC), in_flight=True)
        mock_db.fetch_all = AsyncMock(return_value=[row])
        mock_db.execute = AsyncMock()

        scheduler = MagicMock()
        scheduler.get_job.return_value = None
        scheduler.get_jobs.return_value = []
        mock_sched_fn.return_value = scheduler

        from webwhen.scheduler.migrate import sync_jobs_from_database

        await sync_jobs_from_database()

        scheduler.add_job.assert_not_called()
        mock_db.execute.assert_not_awaited()

    @pytest.mark.asyncio
    @patch(f"{MODULE}.get_scheduler")
    @patch(f"{MODULE}.db")
    async def test_job_parked_past_overdue_next_run_is_pulled_in(self, mock_db, mock_sched_fn):
        """Old syncs parked overdue watches 24h out without persisting; run them soon instead."""
        row = _make_task_row(state="active", next_run=datetime.now(UTC) - timedelta(days=4))
        job_id = f"task-{row['id']}"
        parked = _make_job(job_id)
        parked.next_run_time = datetime.now(UTC) + timedelta(hours=21)
        mock_db.fetch_all = AsyncMock(return_value=[row])
        mock_db.execute = AsyncMock()

        scheduler = MagicMock()
        scheduler.get_job.return_value = parked
        scheduler.get_jobs.return_value = [parked]
        mock_sched_fn.return_value = scheduler

        from webwhen.scheduler.migrate import sync_jobs_from_database

        before = datetime.now(UTC)
        await sync_jobs_from_database()

        run_date = scheduler.reschedule_job.call_args.kwargs["trigger"].run_date
        assert before + timedelta(seconds=60) <= run_date <= before + timedelta(seconds=601)
        mock_db.execute.assert_awaited_once()
        scheduler.add_job.assert_not_called()

    @pytest.mark.asyncio
    @patch(f"{MODULE}.get_scheduler")
    @patch(f"{MODULE}.db")
    async def test_job_matching_future_next_run_is_untouched(self, mock_db, mock_sched_fn):
        row = _make_task_row(state="active")
        job_id = f"task-{row['id']}"
        job = _make_job(job_id)
        job.next_run_time = row["next_run"]
        mock_db.fetch_all = AsyncMock(return_value=[row])
        mock_db.execute = AsyncMock()

        scheduler = MagicMock()
        scheduler.get_job.return_value = job
        scheduler.get_jobs.return_value = [job]
        mock_sched_fn.return_value = scheduler

        from webwhen.scheduler.migrate import sync_jobs_from_database

        await sync_jobs_from_database()

        scheduler.reschedule_job.assert_not_called()
        scheduler.add_job.assert_not_called()
        mock_db.execute.assert_not_awaited()

    @pytest.mark.asyncio
    @patch(f"{MODULE}.get_scheduler")
    @patch(f"{MODULE}.db")
    async def test_orphaned_job_removed(self, mock_db, mock_sched_fn):
        """Job with no matching task -> removed."""
        mock_db.fetch_all = AsyncMock(return_value=[])

        orphan = _make_job("task-orphan-id", paused=False)
        scheduler = MagicMock()
        scheduler.get_jobs.return_value = [orphan]
        mock_sched_fn.return_value = scheduler

        from webwhen.scheduler.migrate import sync_jobs_from_database

        await sync_jobs_from_database()

        scheduler.remove_job.assert_called_once_with("task-orphan-id")

    @pytest.mark.asyncio
    @patch(f"{MODULE}.get_scheduler")
    @patch(f"{MODULE}.db")
    async def test_per_task_failure_continues(self, mock_db, mock_sched_fn):
        """Failure on one task doesn't block others."""
        row1 = _make_task_row(state="active")
        row2 = _make_task_row(state="active")
        mock_db.fetch_all = AsyncMock(return_value=[row1, row2])

        scheduler = MagicMock()
        scheduler.get_job.return_value = None
        scheduler.add_job.side_effect = [RuntimeError("bad cron"), None]
        scheduler.get_jobs.return_value = []
        mock_sched_fn.return_value = scheduler

        from webwhen.scheduler.migrate import sync_jobs_from_database

        await sync_jobs_from_database()

        assert scheduler.add_job.call_count == 2

    @pytest.mark.asyncio
    @patch(f"{MODULE}.get_scheduler")
    @patch(f"{MODULE}.db")
    async def test_empty_db_no_op(self, mock_db, mock_sched_fn):
        """Empty database -> no jobs created or removed."""
        mock_db.fetch_all = AsyncMock(return_value=[])

        scheduler = MagicMock()
        scheduler.get_jobs.return_value = []
        mock_sched_fn.return_value = scheduler

        from webwhen.scheduler.migrate import sync_jobs_from_database

        await sync_jobs_from_database()

        scheduler.add_job.assert_not_called()
        scheduler.remove_job.assert_not_called()


class TestReapStaleExecutions:
    @pytest.mark.asyncio
    @patch(f"{MODULE}.db")
    async def test_stale_executions_marked_failed(self, mock_db):
        """Stale executions -> marked as failed."""
        mock_db.fetch_all = AsyncMock(return_value=[{"id": uuid4()}, {"id": uuid4()}])

        from webwhen.scheduler.migrate import reap_stale_executions

        await reap_stale_executions()

        mock_db.fetch_all.assert_awaited_once()
        sql = mock_db.fetch_all.call_args[0][0]
        assert "failed" in sql
        assert "status IN ('pending', 'running')" in sql

    @pytest.mark.asyncio
    @patch(f"{MODULE}.db")
    async def test_no_stale_no_op(self, mock_db):
        """No stale executions -> no-op."""
        mock_db.fetch_all = AsyncMock(return_value=[])

        from webwhen.scheduler.migrate import reap_stale_executions

        await reap_stale_executions()

        mock_db.fetch_all.assert_awaited_once()
