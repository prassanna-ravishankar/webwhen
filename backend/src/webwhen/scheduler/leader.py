"""Single active scheduler across API replicas.

Every API pod starts its APScheduler paused, so job writes from request
handlers still reach the shared SQLAlchemy job store. Only the pod holding a
Postgres session advisory lock resumes its scheduler and runs jobs; the rest
retry until the holder exits or its connection drops.
"""

import asyncio
import logging

import asyncpg
from apscheduler.schedulers.base import BaseScheduler

from webwhen.core.config import settings

logger = logging.getLogger(__name__)

# "webwhen" in ASCII; any fixed int64 works as long as nothing else uses it.
SCHEDULER_LOCK_KEY = 0x7765627768656E

# Server-side keep-alives end a vanished leader's session (and its lock) within
# about a minute instead of waiting on the OS default of hours.
_LOCK_SESSION_SETTINGS = {
    "tcp_keepalives_idle": "30",
    "tcp_keepalives_interval": "10",
    "tcp_keepalives_count": "3",
    "application_name": "webwhen-scheduler-lock",
}


class SchedulerLeader:
    def __init__(
        self,
        scheduler: BaseScheduler,
        dsn: str | None = None,
        interval_seconds: float = 5.0,
    ):
        self.scheduler = scheduler
        self.dsn = dsn or settings.database_url
        self.interval_seconds = interval_seconds
        self._conn: asyncpg.Connection | None = None
        self._task: asyncio.Task | None = None

    @property
    def is_leader(self) -> bool:
        return self._conn is not None

    def start(self) -> None:
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        """Stop dispatching jobs here, then release the lock for the next pod."""
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        await self._step_down()

    async def _run(self) -> None:
        while True:
            try:
                await self._tick()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Scheduler leader check failed")
                await self._step_down()
            await asyncio.sleep(self.interval_seconds)

    async def _tick(self) -> None:
        if self._conn is None:
            await self._try_acquire()
        else:
            await self._conn.fetchval("SELECT 1")
            # Re-scan the job store so jobs added by other pods run on time;
            # APScheduler only wakes itself for jobs added in this process.
            self.scheduler.wakeup()

    async def _try_acquire(self) -> None:
        conn = await asyncpg.connect(self.dsn, server_settings=_LOCK_SESSION_SETTINGS)
        try:
            acquired = await conn.fetchval("SELECT pg_try_advisory_lock($1)", SCHEDULER_LOCK_KEY)
        except BaseException:
            await conn.close()
            raise
        if not acquired:
            await conn.close()
            return
        self._conn = conn
        self.scheduler.resume()
        logger.info("Acquired scheduler lock; this pod now runs scheduled jobs")

    async def _step_down(self) -> None:
        conn, self._conn = self._conn, None
        if conn is None:
            return
        self.scheduler.pause()
        try:
            await conn.close()  # Ends the session, which releases the lock.
        except Exception:
            conn.terminate()
        logger.info("Released scheduler lock")
