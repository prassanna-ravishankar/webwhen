"""webwhen watch agent factory."""

import os
from typing import Literal, cast

from pydantic_ai import Agent, NativeOutput, ToolOutput
from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.models import Model
from pydantic_ai.models.fallback import FallbackModel
from pydantic_ai.models.google import GoogleModel, GoogleModelSettings
from pydantic_ai.profiles import ModelProfile
from pydantic_ai.profiles.google import google_model_profile
from pydantic_ai.profiles.openai import openai_model_profile
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.settings import ThinkingLevel

from models import DEFAULT_MODEL, MonitoringDeps, MonitoringResponse
from prompts import instructions, research_instructions
from tools import register_tools

OutputMode = Literal["tool", "native"]

# Free-tier Gemini is out of capacity: rate limited or "high demand".
CAPACITY_STATUS_CODES = frozenset({429, 503})


def is_capacity_error(exc: Exception) -> bool:
    return isinstance(exc, ModelHTTPError) and exc.status_code in CAPACITY_STATUS_CODES


def with_fallback(primary: Model | str, fallback: Model) -> FallbackModel:
    """Retry only the failed request on `fallback`, so the run keeps its progress."""
    return FallbackModel(primary, fallback, fallback_on=is_capacity_error)


def _model_and_settings(
    model_id: str, thinking_level: str | None
) -> tuple[Model | str, GoogleModelSettings | None, ModelProfile | None]:
    """Resolve the model (with paid fallback), its thinking settings and profile."""
    model_settings = None
    model_lower = model_id.lower()
    model_name = model_lower.partition(":")[2]
    model_profile = None
    if model_lower.startswith("google:"):
        model_profile = google_model_profile(model_name) or ModelProfile()
        if model_profile.get("supports_thinking", False):
            default_level = (
                "minimal" if model_name == DEFAULT_MODEL.partition(":")[2] else "high"
            )
            level = thinking_level or os.getenv("MODEL_THINKING_LEVEL") or default_level
            if level not in {"minimal", "low", "medium", "high"}:
                raise ValueError(f"Unsupported thinking level: {level}")
            if (
                level == "minimal"
                and model_profile.get("thinking_always_enabled", False)
                and model_profile.get("google_supports_thinking_level", False)
            ):
                raise ValueError(
                    f"Thinking level minimal is not supported by {model_name}"
                )
            # Pydantic AI translates unified thinking effort into each Gemini
            # model's native thinking level or token budget.
            model_settings = GoogleModelSettings(thinking=cast(ThinkingLevel, level))
        elif thinking_level is not None:
            raise ValueError(f"Thinking is not supported by {model_name}")
    elif model_lower.startswith("openai-chat:"):
        model_profile = openai_model_profile(model_name)

    model: Model | str = model_id
    # The paid Gemini key answers any request the free key has no capacity for.
    fallback_api_key = os.getenv("GEMINI_FALLBACK_API_KEY")
    if fallback_api_key and model_lower.startswith("google:"):
        fallback_model = GoogleModel(
            model_id.partition(":")[2],
            provider=GoogleProvider(api_key=fallback_api_key),
        )
        model = with_fallback(model_id, fallback_model)
    return model, model_settings, model_profile


def create_monitoring_agent(
    model_id: str = DEFAULT_MODEL,
    thinking_level: str | None = None,
    output_mode: OutputMode | None = None,
) -> Agent[MonitoringDeps, MonitoringResponse]:
    """Create a monitoring agent with the specified model and all tools registered."""
    model, model_settings, model_profile = _model_and_settings(model_id, thinking_level)

    selected_output_mode = output_mode or os.getenv("MODEL_OUTPUT_MODE") or "tool"
    if selected_output_mode not in {"tool", "native"}:
        raise ValueError(f"Unsupported output mode: {selected_output_mode}")
    if selected_output_mode == "native" and not (
        model_profile and model_profile.get("supports_json_schema_output", False)
    ):
        raise ValueError(f"Native structured output is not supported by {model_id}")
    output_type = (
        NativeOutput(MonitoringResponse)
        if selected_output_mode == "native"
        else ToolOutput(MonitoringResponse)
    )

    agent = Agent[MonitoringDeps, MonitoringResponse](
        model,
        deps_type=MonitoringDeps,
        output_type=output_type,
        instructions=instructions,
        retries=3,
        model_settings=model_settings,
        # Resolve provider credentials at run time, not module import. This
        # keeps health checks, tests, and clean CI imports credential-free.
        defer_model_check=True,
        # Pydantic AI 2 defaults to `graceful`, which can execute more queued
        # tool calls after final output. Keep the v1 monitoring semantics.
        end_strategy="early",
    )

    register_tools(agent)

    return agent


def create_research_agent(
    model_id: str = DEFAULT_MODEL, thinking_level: str | None = "high"
) -> Agent[MonitoringDeps, str]:
    """Create the nightly research agent: same model and tools, a different goal.

    It thinks harder than a watch run: it runs once a night and has to judge
    what is worth learning, so minimal thinking writes shallow memories.

    It reads the day's watch runs and writes general findings about how
    information moves to the shared memory scope.
    """
    model, model_settings, _ = _model_and_settings(model_id, thinking_level)
    agent = Agent[MonitoringDeps, str](
        model,
        deps_type=MonitoringDeps,
        output_type=str,
        instructions=research_instructions,
        retries=3,
        model_settings=model_settings,
        defer_model_check=True,
    )
    register_tools(agent)
    return agent
