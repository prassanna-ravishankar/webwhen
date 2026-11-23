"""Search tools report provider failures to the model instead of failing the run."""

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import parallel
import perplexity
import pytest
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


def run_tool_once(tool_name: str, clients) -> list[ToolReturnPart]:
    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        if len(messages) == 1:
            return ModelResponse(parts=[ToolCallPart(tool_name, {"query": "test"})])
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
            "Perplexity search is unavailable (HTTP 401)",
        ),
        (
            "parallel_search",
            quota_error(parallel, 429, "RateLimitError"),
            "Parallel search is unavailable (HTTP 429)",
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
    )

    (tool_return,) = run_tool_once(tool_name, clients)

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
