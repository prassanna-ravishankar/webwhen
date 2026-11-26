"""Shared runtime policy for production, CLI, and evaluation agent runs."""

from typing import Any

import logfire
from pydantic_ai import AgentRunResult
from pydantic_ai.usage import UsageLimits


MONITORING_USAGE_LIMITS = UsageLimits(
    request_limit=20,
    tool_calls_limit=40,
    per_request_input_tokens_limit=128_000,
    total_tokens_limit=400_000,
)
"""High enough for deliberate research, low enough to stop a runaway tool loop.

Every request resends the whole conversation, so cumulative tokens grow
quadratically with turns, and a 100k cumulative cap failed ordinary
six-request runs (#390). The run now stops once a single request's context
passes 128k (largest seen in prod: 46k), and the cumulative cap is only a
cost backstop (prod p99 was 119k per run).
"""


RESEARCH_USAGE_LIMITS = UsageLimits(
    request_limit=40,
    tool_calls_limit=60,
    per_request_input_tokens_limit=128_000,
    total_tokens_limit=600_000,
)
"""The nightly research run works across many watches, so it gets more room
than a single watch run, with the same per-request context guard."""


def record_run_usage(
    result: AgentRunResult[Any], *, operation: str, **context: str
) -> None:
    """Emit a compact per-run usage event in addition to Pydantic AI spans."""
    usage = result.usage
    logfire.info(
        "Monitoring agent run usage",
        operation=operation,
        requests=usage.requests,
        tool_calls=usage.tool_calls,
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        total_tokens=usage.total_tokens,
        context=context,
    )
