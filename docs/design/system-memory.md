---
status: draft
date: 2026-11-26
revised: 2026-11-26 (simplified: one nightly agent call, mem0 does the merging)
---

# System memory: what watches learn about how information moves

Status: design only. Nothing ships without Prass's sign-off.

**Problem.** Each watch learns alone where news breaks first, how long confirmation takes and when sources publish. A new watch on a similar event starts from zero.

**Idea.** Once a night, one agent call reads the day's watch runs and writes what it learned to a shared mem0 scope. Every run recalls it through the memory search it already makes.

## Nightly job

- **Where.** A cron job on the backend's existing APScheduler (leader only), at about 04:20 UTC. It sends one A2A call to the agent service in a `dream` mode.
- **Prompt (plain).** "Here are today's watch runs. What did you learn about how information moves: first sources, lag, cadence, reliability? Update the shared memories."
- **Tools.** The existing `search_memories` and `add_memory`, scoped to the system: `agent_id="webwhen-flow-map"`, `app_id="webwhen-system"`, no `user_id`. `add_memory` keeps `infer=True` (BYOK is connected), so mem0 merges and deduplicates. There are no new tables and no consolidation code.
- **Decided.** All watches contribute (Prass, Q3). Memories live in the same mem0 project as per-watch memory (Q4).

## Input: the one hard guard

The backend builds the input. That layer owns the data, so it is where stripping happens. For each run of the day, it sends:

- the watch's topic and condition;
- the hostnames from `grounding_sources`;
- the run time;
- the outcome: triggered or not, and confidence.

It never sends:

- user, watch, execution or webhook ids;
- connector-derived content: for a run whose `activity` includes a connector step, its sources are left out;
- evidence or notification text.

Condition text is user-written, so it is the one path by which something personal could reach shared memory. The prompt asks for patterns rather than specifics, and the review week checks for exactly this.

## Recall

Recall is unchanged. `search_memories` stays one call and widens its filter to `OR[AND(user_id, app_id=watch), agent_id="webwhen-flow-map"]`. Over the last 30 days, runs averaged 0.74 searches each and never more than 1, so recall adds no searches. It sits behind a flag and is off during the trial week.

## Cost

- **Nightly call.** One flash-lite call over roughly 16 runs' worth of input, plus a few tool calls. That is about $0.01 to $0.02 a night on the paid key, and usually $0 on the free key.
- **mem0.** A few adds a night, with extraction billed to the BYOK provider at about $0.005 per add. Searches are unchanged at about 900 a month.

## Trial

1. Run the nightly job for a week with recall off.
2. Prass and the orchestrator read the `webwhen-flow-map` memories in the mem0 dashboard. They check whether the memories are useful and whether any are personal.
3. Keep or kill:
   - **Keep:** turn recall on.
   - **Kill:** run `delete_all(agent_id="webwhen-flow-map")` and remove the job.

## To check on day one

- **mem0 attribution with `infer=True`.** mem0 attributes facts by message role, so the job writes as the assistant role. That way records land on `agent_id`, not `user_id`. Confirm in the dashboard after the first night.

## Not doing

- Per-moment observation and pattern tables, sync triggers, k-thresholds, a separate extraction skill, a backtest harness, or a backend summary injected into the prompt. Any of these can come back if the trial says the simple version isn't enough.
- **Source publish dates (`published_at`).** Dropped. Capturing them would change the agent-backend contract in both `models.py` copies, which is not trivial enough for this version.
