"""Admin trigger for the research run that grows shared memory."""

from fastapi import APIRouter, BackgroundTasks, Depends, status

from webwhen.access import ClerkUser, require_admin
from webwhen.scheduler.research import run_research

router = APIRouter()


@router.post("/research/run", status_code=status.HTTP_202_ACCEPTED)
async def admin_run_research(
    background_tasks: BackgroundTasks,
    admin: ClerkUser = Depends(require_admin),
):
    """Start the research run now; it is the same job the nightly cron runs."""
    background_tasks.add_task(run_research)
    return {"status": "started"}
