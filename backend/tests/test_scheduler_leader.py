"""Tests for the advisory-lock scheduler leader (webwhen.scheduler.leader)."""

from unittest.mock import AsyncMock, create_autospec, patch

import pytest
from apscheduler.schedulers.base import BaseScheduler

from webwhen.scheduler.leader import SCHEDULER_LOCK_KEY, SchedulerLeader


def make_conn(lock_granted: bool) -> AsyncMock:
    conn = AsyncMock()
    conn.fetchval.return_value = lock_granted
    return conn


@pytest.fixture
def scheduler():
    return create_autospec(BaseScheduler, instance=True)


async def tick_with(leader: SchedulerLeader, conn: AsyncMock) -> None:
    with patch("webwhen.scheduler.leader.asyncpg.connect", AsyncMock(return_value=conn)):
        await leader._tick()


async def test_acquiring_the_lock_resumes_the_scheduler(scheduler):
    leader = SchedulerLeader(scheduler, dsn="postgresql://test")
    conn = make_conn(lock_granted=True)

    await tick_with(leader, conn)

    conn.fetchval.assert_awaited_once_with("SELECT pg_try_advisory_lock($1)", SCHEDULER_LOCK_KEY)
    scheduler.resume.assert_called_once()
    assert leader.is_leader
    conn.close.assert_not_awaited()


async def test_lock_held_elsewhere_keeps_scheduler_paused(scheduler):
    leader = SchedulerLeader(scheduler, dsn="postgresql://test")
    conn = make_conn(lock_granted=False)

    await tick_with(leader, conn)

    scheduler.resume.assert_not_called()
    assert not leader.is_leader
    conn.close.assert_awaited_once()


async def test_leader_tick_wakes_scheduler_to_pick_up_other_pods_jobs(scheduler):
    leader = SchedulerLeader(scheduler, dsn="postgresql://test")
    conn = make_conn(lock_granted=True)
    await tick_with(leader, conn)

    await leader._tick()

    scheduler.wakeup.assert_called_once()


async def test_lost_lock_connection_pauses_and_steps_down(scheduler):
    leader = SchedulerLeader(scheduler, dsn="postgresql://test", interval_seconds=0)
    conn = make_conn(lock_granted=True)
    await tick_with(leader, conn)
    conn.fetchval.side_effect = ConnectionError("proxy gone")

    with pytest.raises(ConnectionError):
        await leader._tick()
    await leader._step_down()

    scheduler.pause.assert_called_once()
    assert not leader.is_leader


async def test_stop_pauses_before_releasing_the_lock(scheduler):
    leader = SchedulerLeader(scheduler, dsn="postgresql://test")
    conn = make_conn(lock_granted=True)
    await tick_with(leader, conn)
    order = []
    scheduler.pause.side_effect = lambda: order.append("pause")
    conn.close.side_effect = lambda: order.append("release")

    await leader.stop()

    assert order == ["pause", "release"]
    assert not leader.is_leader
