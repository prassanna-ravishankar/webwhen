"""Shared runtime policy for production, CLI, and evaluation agent runs."""

from typing import Any

import logfire
from pydantic_ai import AgentRunResult
from pydantic_ai.usage import UsageLimits


MONITORING_USAGE_LIMITS = UsageLimits(
    request_limit=20,
    tool_calls_limit=40,
    per_request_input_tokens_limit=64_000,
    total_tokens_limit=400_000,
)
"""High enough for deliberate research, low enough to stop a runaway tool loop.

Every request resends the whole conversation, so cumulative tokens grow
quadratically with turns. Context size is bounded per request (largest seen
in prod: 46k); the cumulative cap is only a cost backstop (prod p99 was 119k
per run, and a 100k cap failed ordinary six-request runs, #390).
"""


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
