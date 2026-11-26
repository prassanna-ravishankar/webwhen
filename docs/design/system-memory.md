---
status: draft
date: 2026-11-26
revised: 2026-11-26 (nightly dream, mem0 recall, instant forget)
---

# System memory: an information-flow map

Status: design only. Nothing here ships without Prass's sign-off.

## Problem

Each watch learns on its own. Per-watch memory (mem0, user + watch scope) records which sources work for that watch. A new watch on a similar event starts from zero. It has to work out again where news breaks, how long confirmation takes and when sources publish, and it pays for that in extra runs and late triggers.

System memory keeps what watches learn about how information moves, keyed by event type rather than by watch or user. The main beneficiary is the cold start: a new watch on a key that other watches already know.

**Learn slowly, forget fast.** A nightly job learns from a whole day in hindsight. Forgetting happens in the same flow as the change that requires it.

## Ownership

| Concern | Owner | Why |
|---|---|---|
| Executions, triggers, sources, watch visibility, deletion | Postgres (backend) | Already the source of truth |
| Observations, patterns, privacy invariants (k ≥ 3, eligibility, grounding, decay) | Postgres (backend) | Invariants must sit next to the data they guard, so deletes cascade |
| Scheduling the nightly dream | Backend APScheduler, on the leader | The backend already owns the scheduler |
| Model calls | Agent service, via a new A2A skill | It owns the Gemini keys and the free-then-paid fallback (#392) |
| Agent recall | mem0 | Memory stays in the memory system, and the agent reaches all of it through one tool |

What stays the same:

- Per-watch memory (`user_id`, `app_id=<watch>`, written mid-run) is unchanged.
- The agent still owns `next_run`.

## Data model (Postgres)

```sql
-- Each watch's classification, set from its first run (like `topic`)
ALTER TABLE tasks ADD COLUMN flow_event_type TEXT, ADD COLUMN flow_domain TEXT;

-- One row per triggered moment, written by the dream
CREATE TABLE flow_observations (
  id            UUID PRIMARY KEY,
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  execution_id  UUID NOT NULL REFERENCES task_executions(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  domain        TEXT NOT NULL,
  first_host    TEXT NOT NULL,   -- host of the earliest credible signal, from stored sources
  first_kind    TEXT NOT NULL,   -- official | press | aggregator | social | forum | leak
  first_seen_at TIMESTAMPTZ NOT NULL,  -- earliest execution (or source date) showing the signal
  confirm_host  TEXT NOT NULL,
  confirmed     BOOLEAN NOT NULL,      -- hindsight: did the early signal confirm?
  observed_at   TIMESTAMPTZ NOT NULL
);

-- One row per key: the consolidated pattern the dream derives
CREATE TABLE flow_patterns (
  event_type TEXT, domain TEXT,
  summary JSONB NOT NULL,        -- hosts with reliability, lag median and spread, cadence, publish window
  users INT NOT NULL, observations INT NOT NULL,
  mem0_id TEXT,                  -- null when not served
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (event_type, domain)
);
```

- **Event types are a closed enum:** `product_launch`, `release_date`, `restock`, `price_change`, `schedule_published`, `model_release`, `earnings`, `policy_decision`, `result_announced`, `status_change`, `other`. Moments typed `other` produce no observation; they are logged so the vocabulary grows from evidence.
- **Lag is computed in code:** `lag_h` is the trigger's `completed_at` minus `first_seen_at`. Reliability is also code: a host is `confirmed` as a confirm host, `early-and-right` when its first signals confirmed, otherwise `unproven`.

## The nightly dream

A cron job on the scheduler leader runs at 04:20 UTC, outside run peaks. Each night it works through five steps.

1. **Gather.** From Postgres, for eligible watches (public, no connectors), it selects:
   - executions completed since the last dream;
   - for every watch that triggered, its earlier executions back to the previous trigger or creation.

   That earlier history is the hindsight: the dream can see which run first carried the signal and whether it confirmed.
2. **Distill.** One model call per watch that triggered goes to the agent service's `distill_moment` A2A skill (flash-lite, free key first).
   - **Input:** the condition text, plus for each execution its timestamp, confidence, evidence, notification and stored `grounding_sources`, wrapped with `PromptSanitizer.wrap`. No user id, email, watch id or webhook is sent.
   - **Output:** `event_type`, `domain`, `first_host`, `first_kind`, the execution where the signal first appeared, and `confirm_host`.
   - The model labels one moment. It never merges records or does arithmetic.
3. **Guard.** Code validates each observation and writes it to `flow_observations`, or drops it with a logged reason. All guards live here, in one place:
   - every host must be the hostname of a URL in that watch's stored `grounding_sources` (grounding);
   - hostnames only, with no IP literals and no subdomains of user-content platforms (denylist: `substack.com`, `medium.com`, `github.io`, `wordpress.com`, `blogspot.com`, `tumblr.com`, `notion.site`, `linktr.ee` and similar);
   - `domain` must match `^[a-z0-9-]{2,32}$`, and is rejected if it holds an email or handle pattern, or a condition token that appears in no source host or title.
4. **Consolidate and decay.** For every key touched tonight, plus every key holding observations past their decay date, code recomputes `flow_patterns` from the observations:
   - eligibility is checked at query time;
   - observations older than 180 days are excluded and then deleted;
   - a fork counts with its root watch's user;
   - a host appears only when at least 2 distinct users cite it.

   A key needs at least 3 distinct users before it is served.
5. **Publish to recall.** For each recomputed key:
   - **Servable:** upsert its mem0 record. Scope is `agent_id="webwhen-flow-map"`, `app_id="webwhen-system"`, no `user_id`, `infer=False`. The text is one templated sentence and `metadata` holds the structured fields. The job looks the record up by `flow_patterns.mem0_id` and updates it, adding only for a new key.
   - **Not servable:** delete it from mem0 and clear `mem0_id`.
   - **Unchanged:** skip it, so no mem0 write happens.

### Does the dream need run-time context it can't recover later?

No for the observations themselves. Execution history, evidence, confidence and grounding sources are all persisted, and hindsight over them is what the dream is for. So there is no per-run extraction call.

One gap is a cheap data capture, not a model call. `grounding_sources` stores only `{url, title=host}`. The publish dates that Perplexity returns at run time (`date`, `last_updated`) are dropped, and they cannot be backfilled. Without them, `first_seen_at` is the first execution that carried the signal, so lag resolution is bounded by the watch's run spacing (hours to days).

- **Recommendation:** add an optional `published_at` to `GroundingSource` now. It is a field in the agent-backend contract, so both `models.py` copies change. It costs nothing per run and keeps the option open.
- **The backtest decides whether lag at run-spacing resolution is good enough** for the timing hit rate (below).

## Instant forget

Forgetting happens in the same flow as the change that requires it, never at the next dream.

- **Triggers.** Database triggers write `flow_sync_outbox(event_type, domain, reason)` in the same transaction as the change. Triggers also fire on cascaded deletes, so every path is covered:
  - a watch is deleted (directly, or through a user deletion cascade);
  - `is_public` goes from true to false;
  - connectors are attached;
  - `flow_event_type` or `flow_domain` changes.
- **Drain.** Right after commit, the handler that made the change drains the outbox for those keys. For each key it recomputes `flow_patterns` with eligibility as it stands now, then upserts the mem0 record or deletes it. A key that falls below k disappears from recall at once.
- **Failures.** If mem0 is unreachable, the outbox row persists. A short-interval sweeper on the leader retries it, and a `flow sync lagging` warning fires after 15 minutes. A pending delete is never dropped.

## Recall

Recall is unchanged: `search_memories` stays one call per invocation, and its filter covers both scopes.

```python
filters = {"OR": [
    {"AND": [{"user_id": user_id}, {"app_id": task_id}]},   # this watch
    {"agent_id": "webwhen-flow-map"},                        # system scope
]}
```

- **Output.** Results are split and labelled `watch` and `system`.
- **Crowding.** `top_k` goes from 10 to 13 so system records cannot crowd out watch memories.
- **Isolation.** mem0 filters only check the fields named: system records have no `user_id`, and per-watch records carry `agent_id=null`.
- **Prompt.** The prompt gains two lines: use system records to choose sources and to place `next_run` around the lag and publish window, and prefer this watch's own memories when the two conflict.

**Measured baseline: no extra searches.** Over the last 30 days (Logfire, 2026-11-26), 1,216 runs made 901 `search_memories` calls. That is 0.74 per run, a maximum of 1 in any run, and 315 runs with none (mostly first runs). The combined filter keeps one call per invocation, so retrievals stay at about 900 a month against the 10,000 a month mem0 allows with a connected LLM key. After launch the same query verifies it: `max_per_run` must stay 1 and `per_run` must not rise.

```sql
WITH r AS (
  SELECT trace_id,
         sum(CASE WHEN span_name = 'execute_tool search_memories' THEN 1 ELSE 0 END) AS s,
         max(CASE WHEN span_name = 'invoke_agent monitoring_agent' THEN 1 ELSE 0 END) AS is_run
  FROM records WHERE start_timestamp > now() - interval '30 days' GROUP BY 1)
SELECT count(*) AS runs, sum(s) AS searches, round(avg(s), 2) AS per_run, max(s) AS max_per_run
FROM r WHERE is_run = 1;
```

## Cost at today's volume

The measured baseline is the last 7 days of agent model calls: 942 calls on `gemini-3.5-flash-lite`, averaging 11,785 input and 70 output tokens, at $0.0037 per call when billed on the paid key.

| Item | Per night | Per month |
|---|---|---|
| Distill calls: one per eligible watch that triggered. Today there are 9 public watches and a few triggers a day, so 0 to 9 calls at about 10k input tokens each. | $0 to $0.03 | under $1 |
| Same, if every watch behind the ~16 runs a day were eligible (opt-in case, Q3) | up to $0.06 | under $2 |
| mem0 writes: only keys whose pattern changed, plus forget deletes | a few | well under 50k adds |
| mem0 searches | none added | about 900, unchanged |

The free Gemini key answers first, so most of this is $0 in practice. The paid key covers only capacity errors, as in #392.

## Measuring benefit: backtest, then shadow review

At about 16 runs a day an A/B test cannot detect a realistic effect, so there is none.

**1. Replay the dream night by night over history.**
- Run the dream for each past night in order, using only data available up to that night. Eligibility, k and decay apply as they stood then.
- For each later trigger, check two things against the patterns that existed the night before:
  - **Host hit rate:** did a served first-source host match the host that actually broke this moment?
  - **Timing hit rate:** would the served lag and window have placed a check at or after the first signal, and before the actual trigger?
- **Cold start:** for each watch at its creation, was its key servable, and how many runs between creation and the first trigger could a correct hint have saved?
- **Coverage:** what share of new eligible watches had a servable key at creation? With 9 public watches, k ≥ 3 users may starve this. That is the main input to Q3.
- **Lag resolution:** is timing hit rate acceptable with run-spacing lag? If not, `published_at` capture is required before serving.
- **Gate:** if host hit rate is below 50% on served keys, or coverage is near zero, nothing ships. Report and stop.

**2. Shadow mode with manual review for two weeks.**
- The dream and forget path run live and write to mem0, but `search_memories` does not include the system scope yet.
- Review every served record by hand on three counts:
  - privacy: no host or domain that identifies a person;
  - correctness against what later runs found;
  - usefulness.

**3. Serve.** Widen the search filter. Report runs per trigger, cost per trigger and detection lag descriptively.

## Rejected alternatives

- **Backend summary injected into the run payload (no mem0).** Simpler to build, but it creates a second memory path outside the memory system. With the instant forget path, it no longer has a staleness advantage.
- **Per-run extraction on every trigger.** It sees less than the dream: no hindsight on whether early signals confirmed, and no cross-watch consolidation in one pass. Its only advantage was run-time context, and the `published_at` capture covers that more cheaply.

## mem0 plan facts

From mem0's docs, read 2026-11-26.

| Question | Answer | Source |
|---|---|---|
| Does `infer=False` skip mem0's LLM? | Yes. It stores the text verbatim, skips extraction and semantic dedup, and dedupes exact repeats by hash. | [Direct import](https://docs.mem0.ai/platform/features/direct-import), [Add memories API](https://docs.mem0.ai/api-reference/memory/add-memories) |
| Does `infer=False` avoid the free plan's LLM-key block? | Not documented, so assume no. "New adds return an error until you connect a key." | [Pricing FAQ](https://docs.mem0.ai/platform/pricing) |
| Does `update` count as an add? | Not documented. The limits name only adds and retrievals. | [Pricing FAQ](https://docs.mem0.ai/platform/pricing), [Update memory API](https://docs.mem0.ai/api-reference/memory/update-memory) |
| Limits with a connected key (BYOK) | 50,000 adds and 10,000 retrievals a month. Extraction is billed by the provider. | [Pricing FAQ](https://docs.mem0.ai/platform/pricing), [BYOK](https://docs.mem0.ai/platform/features/byok) |

Prod connected a BYOK key on 2026-11-26. All 4 adds between 04:12Z and 04:58Z were accepted.

## Rollout

1. **Build.** Migrations, the `distill_moment` skill, the dream job, the forget triggers and outbox, and `published_at` capture.
2. **Backtest.** Replay the dream over history against the gate.
3. **Shadow.** Two weeks of live dream and forget with manual review.
4. **Serve.** Widen the `search_memories` filter.
5. **Optional, later.** A scheduler sanity check that only ever moves `next_run` later, on keys with at least 5 users.

## Open questions for Prass

- **Q3, eligibility.** Public watches only for v1, or private watches too with an opt-in? Today only 9 public watches exist, so coverage under k ≥ 3 users depends on this.
- **Q4, mem0 project.** The same project as per-watch memory, or a separate one?
  - **Same project:** one key, and one search per run. This is the recommendation.
  - **Separate project:** isolates billing, but needs a second key and a second search per run.
