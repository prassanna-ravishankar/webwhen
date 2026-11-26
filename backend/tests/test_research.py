"""Research run input: the day's watch runs, stripped of ids, run text and connector content."""

import json
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest

from webwhen.api.routers.admin_routes.research import admin_run_research
from webwhen.scheduler import research

RAN_AT = datetime(2026, 11, 26, 4, 13, tzinfo=UTC)


def run_row(**overrides):
    row = {
        "id": "exec-secret-id",
        "task_id": "watch-secret-id",
        "user_id": "user-secret-id",
        "name": "iPhone 18 release date",
        "search_query": "iphone 18 release date",
        "condition_description": "Apple announces the iPhone 18 release date",
        "completed_at": RAN_AT,
        "notification": None,
        "result": json.dumps(
            {
                "confidence": 70,
                "evidence": "private run text",
                "activity": [{"tool": "perplexity_search", "detail": "iphone 18"}],
            }
        ),
        "grounding_sources": json.dumps(
            [
                {"url": "https://www.macrumors.com/a", "title": "x"},
                {"url": "https://www.macrumors.com/b", "title": "y"},
                {"url": "https://www.apple.com/newsroom", "title": "z"},
            ]
        ),
    }
    return row | overrides


def test_run_lists_topic_condition_timing_outcome_and_hosts_only():
    text = research.format_run(run_row(notification="It's announced."))

    assert text == (
        "- topic: iPhone 18 release date\n"
        "  condition: Apple announces the iPhone 18 release date\n"
        "  ran at: 2026-11-26T04:13:00+00:00\n"
        "  triggered: yes, confidence: 70\n"
        "  source sites: www.macrumors.com, www.apple.com"
    )
    for secret in ("secret-id", "private run text", "It's announced."):
        assert secret not in text


@pytest.mark.asyncio
async def test_runs_that_used_a_connector_are_left_out():
    connector_step = {"tool": "NOTION_FETCH_DATA", "detail": "", "connector_slug": "notion"}
    private = run_row(
        name="Acquisition of Contoso",
        result=json.dumps({"confidence": 80, "activity": [connector_step]}),
    )
    with patch.object(research, "db") as db:
        db.fetch_all = AsyncMock(return_value=[private, run_row()])
        prompt = await research.build_research_input(RAN_AT)
        query = db.fetch_all.await_args.args[0]

    assert prompt is not None
    assert "Contoso" not in prompt
    assert "iPhone 18" in prompt
    assert "cardinality(t.attached_connector_slugs) = 0" in query


@pytest.mark.asyncio
async def test_only_connector_runs_means_no_input():
    connector_step = {"tool": "NOTION_FETCH_DATA", "connector_slug": "notion"}
    private = run_row(result=json.dumps({"activity": [connector_step]}))
    with patch.object(research, "db") as db:
        db.fetch_all = AsyncMock(return_value=[private])
        assert await research.build_research_input(RAN_AT) is None


@pytest.mark.asyncio
async def test_input_wraps_runs_as_data():
    with patch.object(research, "db") as db:
        db.fetch_all = AsyncMock(return_value=[run_row()])
        prompt = await research.build_research_input(RAN_AT)

    assert prompt is not None
    assert prompt.startswith("<watch-runs>\n- topic: iPhone 18 release date")
    assert prompt.endswith("</watch-runs>")


@pytest.mark.asyncio
async def test_no_runs_skips_the_agent():
    with (
        patch.object(research, "build_research_input", AsyncMock(return_value=None)),
        patch.object(research, "call_research_agent", AsyncMock()) as agent,
    ):
        await research.run_research()
    agent.assert_not_awaited()


@pytest.mark.asyncio
async def test_runs_are_sent_to_the_research_agent():
    with (
        patch.object(research, "build_research_input", AsyncMock(return_value="<watch-runs/>")),
        patch.object(research, "call_research_agent", AsyncMock(return_value="ok")) as agent,
    ):
        await research.run_research()
    agent.assert_awaited_once_with("<watch-runs/>")


@pytest.mark.asyncio
async def test_admin_trigger_starts_the_same_job_in_the_background():
    background = type("BG", (), {"add_task": lambda self, fn: setattr(self, "fn", fn)})()

    response = await admin_run_research(background, admin=object())

    assert response == {"status": "started"}
    assert background.fn is research.run_research
