"""A free-tier capacity error retries only that request on the paid key."""

import pytest
from pydantic_ai import Agent
from pydantic_ai.exceptions import FallbackExceptionGroup, ModelHTTPError
from pydantic_ai.messages import ModelMessage, ModelResponse, TextPart, ToolCallPart
from pydantic_ai.models.fallback import FallbackModel
from pydantic_ai.models.function import AgentInfo, FunctionModel

from agent import create_monitoring_agent, with_fallback


def run_with_free_failure(status_code: int, *, fail_on_call: int = 2):
    """Run a three-request research loop whose free model fails one request."""
    calls: list[str] = []
    searches: list[str] = []

    def respond(messages: list[ModelMessage]) -> ModelResponse:
        turn = len([m for m in messages if isinstance(m, ModelResponse)])
        if turn < 2:
            return ModelResponse(parts=[ToolCallPart("search", {"query": f"q{turn}"})])
        return ModelResponse(parts=[TextPart("done")])

    def free(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        calls.append("free")
        if calls.count("free") == fail_on_call:
            raise ModelHTTPError(status_code, "gemini-free", "high demand")
        return respond(messages)

    def paid(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        calls.append("paid")
        return respond(messages)

    agent = Agent(with_fallback(FunctionModel(free), FunctionModel(paid)))

    @agent.tool_plain
    def search(query: str) -> str:
        searches.append(query)
        return "results"

    output = agent.run_sync("watch").output
    return output, calls, searches


@pytest.mark.parametrize("status_code", [429, 503])
def test_capacity_error_midway_retries_only_that_request_on_paid(status_code):
    output, calls, searches = run_with_free_failure(status_code)

    assert output == "done"
    # The second request fails on free and is answered by paid; the next
    # request goes back to free.
    assert calls == ["free", "free", "paid", "free"]
    assert searches == ["q0", "q1"]


def test_other_errors_do_not_fall_back():
    with pytest.raises(ModelHTTPError) as exc_info:
        run_with_free_failure(400)

    assert exc_info.value.status_code == 400


def failing(status_code: int) -> FunctionModel:
    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        raise ModelHTTPError(status_code, "gemini", "failed")

    return FunctionModel(model)


def test_paid_billing_error_after_free_capacity_error_surfaces_as_is():
    agent = Agent(with_fallback(failing(503), failing(402)))

    with pytest.raises(ModelHTTPError) as exc_info:
        agent.run_sync("watch")

    assert exc_info.value.status_code == 402


def test_both_keys_out_of_capacity_raises_a_group_ending_with_paid_error():
    agent = Agent(with_fallback(failing(429), failing(503)))

    with pytest.raises(FallbackExceptionGroup) as exc_info:
        agent.run_sync("watch")

    assert [str(e) for e in exc_info.value.exceptions] == [
        str(ModelHTTPError(429, "gemini", "failed")),
        str(ModelHTTPError(503, "gemini", "failed")),
    ]


def test_fallback_is_off_without_a_fallback_key(monkeypatch):
    monkeypatch.delenv("GEMINI_FALLBACK_API_KEY", raising=False)

    agent = create_monitoring_agent("google:gemini-3.5-flash-lite")

    assert agent.model == "google:gemini-3.5-flash-lite"


def test_fallback_key_wraps_gemini_in_a_fallback_model(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "free-key")
    monkeypatch.setenv("GEMINI_FALLBACK_API_KEY", "paid-key")

    agent = create_monitoring_agent("google:gemini-3.5-flash-lite")

    assert isinstance(agent.model, FallbackModel)
    assert [m.model_name for m in agent.model.models] == [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash-lite",
    ]
