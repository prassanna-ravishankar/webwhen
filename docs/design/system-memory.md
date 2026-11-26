---
status: draft
date: 2026-11-26
---

# System memory: a research agent for how information moves

Status: design only. Nothing ships without Prass's sign-off.

**Problem.** Each watch learns on its own where news breaks first, how long confirmation takes and when sources publish. A new watch on a similar event starts from zero.

**Idea.** A nightly research agent learns this across all watches and writes general findings to shared memory. Monitoring runs read those findings through the memory search they already make.

## Research agent

- **Definition.** A second agent definition in `torale-agent`, on the same framework, model and tools: `perplexity_search`, `parallel_search`, `fetch_url`, `search_memories` and `add_memory`. Only the prompt is new.
- **Memory scope.** Its memory tools use the system scope (`agent_id="webwhen-flow-map"`, `app_id="webwhen-system"`). mem0 merges and dedupes, with `infer=True`.
- **Prompt, in substance.** "You maintain webwhen's shared knowledge of how information moves. Starting from today's watch runs, research where news like this breaks first, how long confirmation takes, and when sources publish. Check and refine what's already in shared memory, and write durable, general findings."
- **Limits.** `RESEARCH_USAGE_LIMITS` in `runtime.py`, the same pattern as `MONITORING_USAGE_LIMITS`, set higher for a longer run: about 40 requests and 600k total tokens.
- **Runs.** Nightly from the backend's existing APScheduler at about 04:20 UTC. Both the scheduler and the admin endpoint call `run_research()`.
- **Admin trigger.** `POST /api/v1/admin/research/run` sits in the existing admin routes, behind `require_admin`. It starts `run_research()` in the background and returns `202`. Runs show up in Logfire like any other agent run.

## Input

The backend builds the input from the day's runs:

- the watch's topic and condition;
- public source hostnames from `grounding_sources`;
- the run time;
- the outcome: triggered or not, with confidence.

It leaves out ids, evidence and notification text, and the sources of runs that used a connector.

## Consumption

The monitoring agent's single `search_memories` call widens its filter to cover both scopes: `OR[AND(user_id, app_id=watch), agent_id="webwhen-flow-map"]`. The prompt gains one line: "Shared memories describe how information moves. Use them to pick sources and timing." Runs average 0.74 memory searches today and never more than one, so this adds no searches.

## Cost

A monitoring run today averages 4.2 model calls, 1.5 searches and $0.017 of model cost.

- **Typical night:** about $0.13 (model $0.05, about 10 searches at a list price of about $0.005 each, a few mem0 adds).
- **At the usage limit:** about $0.37.

That comes to about $4 a month.

## Trial

1. Run night one from the admin endpoint, then nightly for a week, with consumption off.
2. Prass and the orchestrator read the `webwhen-flow-map` memories.
3. Keep or kill:
   - **Keep:** turn consumption on.
   - **Kill:** `delete_all(agent_id="webwhen-flow-map")`.

**Decided:** all watches contribute, and the system scope lives in the same mem0 project.
