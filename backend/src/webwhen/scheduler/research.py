"""Nightly research run: feed the day's watch runs to the research agent.

The research agent turns them into shared knowledge of how information moves
(where news breaks first, lag, cadence, reliability) in mem0's system scope.
This module only selects and strips the input; the agent does the work.
"""

import logging
from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse

from webwhen.core.database import db
from webwhen.scheduler.agent import call_research_agent
from webwhen.scheduler.prompt_sanitizer import PromptSanitizer
from webwhen.utils.jsonb import parse_jsonb

logger = logging.getLogger(__name__)

RESEARCH_WINDOW = timedelta(hours=24)


def used_connector(row: dict) -> bool:
    result = parse_jsonb(row.get("result"), "result", dict, {})
    return any(
        isinstance(s, dict) and s.get("connector_slug") for s in result.get("activity") or []
    )


def format_run(row: dict) -> str:
    """One watch run as research input: no ids and no run text."""
    result = parse_jsonb(row.get("result"), "result", dict, {})
    hosts: list[str] = []
    sources = parse_jsonb(row.get("grounding_sources"), "grounding_sources", list, [])
    for source in sources:
        url = source.get("url") if isinstance(source, dict) else source
        host = urlparse(url).hostname if isinstance(url, str) else None
        if host and host not in hosts:
            hosts.append(host)

    triggered = "yes" if row.get("notification") else "no"
    lines = [
        f"- topic: {row.get('name') or 'untitled'}",
        f"  condition: {row.get('condition_description') or row.get('search_query') or ''}",
        f"  ran at: {row['completed_at'].isoformat()}",
        f"  triggered: {triggered}, confidence: {result.get('confidence', 'unknown')}",
        f"  source sites: {', '.join(hosts) if hosts else 'none'}",
    ]
    return "\n".join(lines)


async def build_research_input(since: datetime) -> str | None:
    """The successful watch runs since `since`, formatted for the research agent.

    Connector watches are left out entirely: their topic and condition can
    describe private data, and the research agent searches the public web
    and writes shared memory.
    """
    rows = await db.fetch_all(
        """
        SELECT t.name, t.search_query, t.condition_description,
               e.completed_at, e.notification, e.result, e.grounding_sources
        FROM task_executions e
        JOIN tasks t ON t.id = e.task_id
        WHERE e.status = 'success' AND e.completed_at >= $1
          AND cardinality(t.attached_connector_slugs) = 0
        ORDER BY t.id, e.completed_at
        """,
        since,
    )
    runs = "\n".join(format_run(row) for row in map(dict, rows) if not used_connector(row))
    if not runs:
        return None
    return PromptSanitizer.wrap("watch-runs", runs)


async def run_research() -> None:
    """Run the research agent over the last day of watch runs.

    Called by the nightly cron and the admin trigger.
    """
    since = datetime.now(UTC) - RESEARCH_WINDOW
    prompt = await build_research_input(since)
    if prompt is None:
        logger.info("Research run skipped: no watch runs since %s", since.isoformat())
        return
    logger.info("Research run started over watch runs since %s", since.isoformat())
    summary = await call_research_agent(prompt)
    logger.info("Research run finished: %s", summary[:500])
