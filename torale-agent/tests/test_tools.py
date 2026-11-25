"""Provider tools report failures to the model instead of failing the run."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import parallel
import perplexity
import pytest
from mem0.exceptions import RateLimitError as Mem0RateLimitError
from pydantic_ai import Agent
from pydantic_ai.messages import (
    ModelMessage,
    ModelResponse,
    ToolCallPart,
    ToolReturnPart,
)
from pydantic_ai.models.function import AgentInfo, FunctionModel

from models import MonitoringDeps, MonitoringResponse
from tools import register_tools

FINAL = {
    "evidence": "Searched with the remaining tools.",
    "notification": None,
    "sources": [],
    "confidence": 50,
    "next_run": "2099-01-01T00:00:00Z",
    "topic": None,
}


def quota_error(module, status_code: int, cls_name: str) -> Exception:
    request = httpx.Request("POST", "https://provider.test/search")
    response = httpx.Response(status_code, request=request)
    return getattr(module, cls_name)("insufficient_quota", response=response, body=None)


# What mem0's free plan returns once its 30-day memory-add allowance ends (2026-11-25).
MEM0_PLAN_LIMIT = Mem0RateLimitError(
    "Adding memories on the free plan needs your own LLM key after the first 30 days.",
    error_code="429",
)


def run_tool_once(
    tool_name: str, clients, args: dict | None = None
) -> list[ToolReturnPart]:
    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        if len(messages) == 1:
            call = ToolCallPart(tool_name, args or {"query": "test"})
            return ModelResponse(parts=[call])
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, FINAL)])

    agent = Agent[MonitoringDeps, MonitoringResponse](
        FunctionModel(model), deps_type=MonitoringDeps, output_type=MonitoringResponse
    )
    register_tools(agent)
    result = agent.run_sync(
        "watch",
        deps=MonitoringDeps.model_construct(user_id="u", task_id="t", clients=clients),
    )
    assert result.output.evidence == FINAL["evidence"]
    return [
        part
        for message in result.all_messages()
        for part in message.parts
        if isinstance(part, ToolReturnPart) and part.tool_name == tool_name
    ]


@pytest.mark.parametrize(
    ("tool_name", "error", "expected"),
    [
        (
            "perplexity_search",
            quota_error(perplexity, 401, "AuthenticationError"),
            "Perplexity search is unavailable (HTTP 401). Use another search tool.",
        ),
        (
            "parallel_search",
            quota_error(parallel, 429, "RateLimitError"),
            "Parallel search is unavailable (HTTP 429). Use another search tool.",
        ),
        (
            "twitter_search",
            httpx.ConnectTimeout("timed out"),
            "Twitter search is unavailable (ConnectTimeout). Use another search tool.",
        ),
        (
            "search_memories",
            MEM0_PLAN_LIMIT,
            "Memory search is unavailable (RateLimitError). Carry on without memory.",
        ),
        (
            "add_memory",
            MEM0_PLAN_LIMIT,
            "Memory storage is unavailable (RateLimitError). Carry on without memory.",
        ),
    ],
)
def test_provider_failure_becomes_tool_error(tool_name, error, expected):
    clients = SimpleNamespace(
        perplexity=SimpleNamespace(
            search=SimpleNamespace(create=AsyncMock(side_effect=error))
        ),
        parallel=SimpleNamespace(
            beta=SimpleNamespace(search=AsyncMock(side_effect=error))
        ),
        twitter=SimpleNamespace(get=AsyncMock(side_effect=error)),
        mem0=SimpleNamespace(
            search=AsyncMock(side_effect=error), add=AsyncMock(side_effect=error)
        ),
    )
    args = {"text": "note"} if tool_name == "add_memory" else None

    (tool_return,) = run_tool_once(tool_name, clients, args)

    assert expected in str(tool_return.content)


def test_search_memories_returns_only_memory_text_and_timestamps():
    hit = {
        "id": "m1",
        "memory": "Release notes appear on the GitHub releases page first.",
        "user_id": "u",
        "app_id": "t",
        "score": 0.9,
        "score_breakdown": {"semantic": 0.9},
        "categories": ["sources"],
        "created_at": "2026-11-01T00:00:00Z",
        "updated_at": "2026-11-02T00:00:00Z",
    }
    clients = SimpleNamespace(
        mem0=SimpleNamespace(search=AsyncMock(return_value={"results": [hit]}))
    )

    (tool_return,) = run_tool_once("search_memories", clients)

    assert json.loads(tool_return.model_response_str()) == [
        {
            "memory": hit["memory"],
            "created_at": "2026-11-01T00:00:00Z",
            "updated_at": "2026-11-02T00:00:00Z",
        }
    ]
