---
status: draft
date: 2026-11-26
revised: 2026-11-26 (nightly research agent populates shared memory; monitoring agent consumes it)
---

# System memory: a research agent for how information moves

Status: design only. Nothing ships without Prass's sign-off.

**Problem.** Each watch learns on its own where news breaks first, how long confirmation takes and when sources publish. A new watch on a similar event starts from zero.

**Idea.** A nightly research agent does that learning for all watches and writes general findings to shared memory. Monitoring runs read those findings through the memory search they already make.

## Research agent

- **Same runtime.** It is a second agent definition in `torale-agent`. It uses the same pydantic-ai framework, the same Gemini model with free-then-paid fallback (#392), and the same tools: `perplexity_search`, `parallel_search`, `fetch_url`, `search_memories` and `add_memory`. Only the prompt and goal are new, so there is no new infrastructure.
- **Memory scope.** Its memory tools use the system scope: `agent_id="webwhen-flow-map"`, `app_id="webwhen-system"`, no `user_id`. Writes keep `infer=True` (BYOK is connected), so mem0 merges and deduplicates. The deps carry the scope, so the tools themselves stay the same.
- **Goal prompt, in substance:** "You maintain webwhen's shared knowledge of how information moves. Starting from today's watch runs, research where news like this breaks first, how long confirmation takes, and when sources publish. Check and refine what's already in shared memory, and write durable, general findings." The agent can search and fetch to verify, for example to look up who actually broke a story first.
- **Trigger.** A cron job on the backend's existing APScheduler runs at about 04:20 UTC on the scheduler leader. It makes one A2A call to the research agent.

## Input from the backend

The backend builds the input. That layer owns the data, so it is where stripping happens.

**Sent for each of the day's runs:**
- the watch's topic and condition;
- public source hostnames from `grounding_sources`;
- the run time;
- the outcome: triggered or not, with confidence.

**Never sent:**
- user, watch, execution or webhook ids;
- evidence or notification text;
- connector content. A run whose `activity` includes a connector step contributes no sources.

Condition text is user-written, so it is the one path by which something personal could reach shared memory. The prompt asks for general findings, not specifics, and the trial review checks for this.

## Consumption

The monitoring agent changes in two small ways:

- Its single `search_memories` call widens the filter to `OR[AND(user_id, app_id=watch), agent_id="webwhen-flow-map"]`. Over the last 30 days, runs averaged 0.74 searches each and never more than 1, so this adds no searches.
- One prompt line: "Shared memories describe how information moves. Use them to pick sources and timing."

Both sit behind a flag, which stays off during the trial.

## Guardrails

- **Per-night cap.** pydantic-ai `UsageLimits` caps the run at about 40 model requests, about 25 tool calls and about 600k total tokens. Hitting the cap ends the night's run. It does not retry.
- **Leader only.** It runs only on the scheduler leader, once a night.

## Cost per night

A monitoring run today (14 days, successful runs) averages 4.2 model calls and 1.5 searches, costing $0.017 for the model on the paid key.

| Item | Typical night | At the cap |
|---|---|---|
| Model (flash-lite, about $0.31 per million input tokens, measured) | $0.05 | about $0.19 |
| Searches (Perplexity and Parallel, list price about $0.005 per call, to confirm) | 10 searches: $0.05 | 25 searches: about $0.13 |
| mem0 adds (BYOK extraction, about $0.005 each) | 5 adds: $0.03 | 10 adds: $0.05 |
| **Total** | **about $0.13** | **about $0.37** |

That is about $4 a month typical and $11 at most. The free Gemini key answers model calls first, so the model line is usually lower.

## Trial

1. Run the research agent nightly for a week with consumption off.
2. Prass and the orchestrator read the `webwhen-flow-map` memories in the mem0 dashboard. They check whether the memories are useful and accurate, and whether any are personal.
3. Keep or kill:
   - **Keep:** turn consumption on.
   - **Kill:** run `delete_all(agent_id="webwhen-flow-map")` and remove the job.

**Check on night one.** With `infer=True`, mem0 attributes facts by message role. Confirm that the records land on `agent_id`, not `user_id`.

## Decided and not doing

- **Decided.** All watches contribute, with no opt-in. Shared memory lives in the same mem0 project as per-watch memory.
- **Not doing.**
  - No custom tables, sync machinery, k-thresholds, backtest harness or prompt-injected summaries.
  - No `published_at` capture: it would change the contract in both `models.py` copies.
  - Any of these can come back if the trial shows a need.
