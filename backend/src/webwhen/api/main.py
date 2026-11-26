import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from webwhen.access import (
    NoAuthProvider,
    ProductionAuthProvider,
    set_auth_provider,
)
from webwhen.api.rate_limiter import limiter
from webwhen.api.routers import (
    admin,
    auth,
    connectors,
    email_verification,
    notifications,
    og,
    public_tasks,
    sitemap,
    tasks,
    templates,
    waitlist,
    webhooks,
)
from webwhen.core.config import PROJECT_ROOT, settings
from webwhen.core.database import Database, db, get_db
from webwhen.core.redis import redis_client
from webwhen.core.views import flush_views_to_postgres
from webwhen.lib.posthog import shutdown as shutdown_posthog
from webwhen.scheduler import get_scheduler
from webwhen.scheduler.leader import HEARTBEAT_SECONDS, SchedulerLeader, record_heartbeat
from webwhen.scheduler.migrate import reap_stale_executions, sync_jobs_from_database
from webwhen.scheduler.research import run_research

logger = logging.getLogger(__name__)

_startup_sync_ok = False
_scheduler_leader: SchedulerLeader | None = None


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Modern security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # CSP - frame-ancestors replaces X-Frame-Options, CSP replaces X-XSS-Protection
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self' https://*.webwhen.ai; "
            "frame-ancestors 'none'; "
            "object-src 'none'; "
            "base-uri 'self';"
        )
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting webwhen API on {settings.api_host}:{settings.api_port}")
    await db.connect()
    logger.info("Database connection pool established")

    await redis_client.connect()

    # Initialize Auth Provider
    if settings.webwhen_noauth:
        logger.info("⚠️  WEBWHEN_NOAUTH mode enabled - using NoAuthProvider")
        provider = NoAuthProvider()
        set_auth_provider(provider)
        await provider.setup(db)
    else:
        logger.info("🔒 Using ProductionAuthProvider (Clerk + API Keys)")
        set_auth_provider(ProductionAuthProvider())

    # Start paused: every pod writes to the shared job store, but only the
    # advisory-lock holder runs jobs (see webwhen.scheduler.leader).
    scheduler = get_scheduler()
    scheduler.start(paused=True)
    logger.info("APScheduler started (paused until this pod holds the scheduler lock)")
    global _scheduler_leader
    _scheduler_leader = SchedulerLeader(scheduler)
    _scheduler_leader.start()

    global _startup_sync_ok
    try:
        await sync_jobs_from_database()
        _startup_sync_ok = True
        logger.info("Scheduler jobs synced from database")
    except Exception as e:
        logger.error(f"Failed to sync scheduler jobs from database: {e}", exc_info=True)

    # Register stale execution reaper (runs every 15 minutes)
    scheduler.add_job(
        reap_stale_executions,
        trigger="interval",
        minutes=15,
        id="reap-stale-executions",
        replace_existing=True,
    )
    # Re-run the job sync on the leader so no active watch stays unscheduled.
    scheduler.add_job(
        sync_jobs_from_database,
        trigger="interval",
        minutes=15,
        id="sync-task-jobs",
        replace_existing=True,
    )
    # Nightly research run that grows the shared memory of how information moves.
    scheduler.add_job(
        run_research,
        trigger="cron",
        hour=4,
        minute=20,
        timezone="UTC",
        id="research-shared-memory",
        replace_existing=True,
    )
    scheduler.add_job(
        record_heartbeat,
        trigger="interval",
        seconds=HEARTBEAT_SECONDS,
        id="scheduler-heartbeat",
        replace_existing=True,
    )

    if redis_client.client is not None:
        scheduler.add_job(
            flush_views_to_postgres,
            trigger="interval",
            minutes=5,
            id="flush-view-counts",
            replace_existing=True,
        )

    yield

    await _scheduler_leader.stop()
    scheduler.shutdown(wait=False)
    logger.info("APScheduler shut down")
    await flush_views_to_postgres()
    await redis_client.disconnect()
    shutdown_posthog()
    logger.info("PostHog shut down")
    await db.disconnect()
    logger.info("Shutting down webwhen API")


app = FastAPI(
    title="webwhen API",
    description="Platform-agnostic background task manager for AI-powered automation",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.webwhen_noauth else None,
    redoc_url="/redoc" if settings.webwhen_noauth else None,
    openapi_url="/openapi.json" if settings.webwhen_noauth else None,
)

_CORS_ORIGINS = [
    settings.frontend_url,
    # webwhen.ai rebrand soak window: API allows requests from the new domain
    # variants while both torale.ai and webwhen.ai resolve to the same backend.
    # Cutover-day diff strips the torale.ai entries from settings.frontend_url
    # (or flips it to https://webwhen.ai); these explicit entries can stay or
    # be culled in the same commit. See #246.
    "https://webwhen.ai",
    "https://www.webwhen.ai",
    "https://staging.webwhen.ai",
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Add SlowAPI rate limiting middleware
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Return structured JSON for HTTP exceptions. CORS headers are handled by CORSMiddleware."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


# Auth routes
app.include_router(auth.router, prefix="/auth", tags=["auth"])

# Admin routes
app.include_router(admin.router)

# Waitlist routes
app.include_router(waitlist.router, tags=["waitlist"])

# SEO routes (at root level for standard locations)
app.include_router(sitemap.router)

# Public task RSS feed (at root level: /tasks/{task_id}/rss)
app.include_router(public_tasks.rss_router)

# API routes
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")
app.include_router(email_verification.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(connectors.router, prefix="/api/v1")
app.include_router(public_tasks.router, prefix="/api/v1")
app.include_router(og.router, prefix="/api/v1")

# Serve changelog.json as static file
app.mount("/static", StaticFiles(directory=str(PROJECT_ROOT / "static")), name="static")


@app.get("/health")
async def health_check():
    scheduler = get_scheduler()
    scheduler_running = scheduler.running
    scheduler_stalled = _scheduler_leader is not None and _scheduler_leader.stalled
    if not scheduler_running or not _startup_sync_ok or scheduler_stalled:
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "scheduler_running": scheduler_running,
                "scheduler_stalled": scheduler_stalled,
                "startup_sync_ok": _startup_sync_ok,
            },
        )
    leader = _scheduler_leader is not None and _scheduler_leader.is_leader
    return {"status": "healthy", "scheduler_leader": leader}


@app.get("/public/stats")
async def get_public_stats(db: Database = Depends(get_db)):
    """
    Public endpoint for landing page stats.
    Returns available user capacity for beta signup messaging.
    """
    total_users = await db.fetch_val("SELECT COUNT(*) FROM users WHERE is_active = true")

    max_users = settings.max_users
    available_slots = max(0, max_users - total_users)

    return {
        "capacity": {
            "max_users": max_users,
            "current_users": total_users,
            "available_slots": available_slots,
        }
    }
