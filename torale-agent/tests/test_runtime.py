"""Usage limits let ordinary research finish and still stop runaway runs."""

import pytest
from pydantic_ai import Agent
from pydantic_ai.exceptions import UsageLimitExceeded
from pydantic_ai.messages import ModelMessage, ModelResponse, TextPart, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel
from pydantic_ai.usage import RequestUsage

from runtime import MONITORING_USAGE_LIMITS

# Per-request input tokens of a prod run that failed the old 100k cumulative
# cap after six requests (2026-11-22, #390).
PROD_RUN_INPUT_TOKENS = [5527, 8746, 15407, 25546, 25598, 25647]


def run_with_input_tokens(input_tokens: list[int]) -> str:
    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        turn = len([m for m in messages if isinstance(m, ModelResponse)])
        usage = RequestUsage(input_tokens=input_tokens[turn], output_tokens=40)
        if turn < len(input_tokens) - 1:
            return ModelResponse(parts=[ToolCallPart("search", {})], usage=usage)
        return ModelResponse(parts=[TextPart("done")], usage=usage)

    agent = Agent(FunctionModel(model))

    @agent.tool_plain
    def search() -> str:
        return "results"

    return agent.run_sync("watch", usage_limits=MONITORING_USAGE_LIMITS).output


def test_six_request_research_run_completes():
    assert run_with_input_tokens(PROD_RUN_INPUT_TOKENS) == "done"


def test_oversized_request_is_stopped():
    with pytest.raises(UsageLimitExceeded, match="per_request_input_tokens_limit"):
        run_with_input_tokens([5_000, 130_000, 5_000])


def test_runaway_run_is_stopped_by_cost_backstop():
    with pytest.raises(UsageLimitExceeded, match="total_tokens_limit"):
        run_with_input_tokens([60_000] * 10)
