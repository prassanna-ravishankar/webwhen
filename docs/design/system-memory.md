---
status: draft
date: 2026-11-26
revised: 2026-11-26 (after review 6068164533)
---

# System memory: an information-flow map

Status: design only. Nothing here ships without Prass's sign-off.

## Problem

Each watch learns on its own. Per-watch memory (mem0, user + watch scope) records which sources work for that watch. A new watch on a similar event starts from zero. It has to work out again where news breaks, how long confirmation takes and when the source publishes, and it pays for that in extra runs and late triggers.

System memory keeps what watches learn about how information moves, keyed by event type rather than by watch or user. The main beneficiary is the cold start: a new watch on a key other watches already know.

## What stays the same

- **Per-watch memory.** It stays in mem0 with `user_id=<user>` and `app_id=<watch id>`, written by the agent mid-run. Nothing about it changes.
- **`next_run`.** The agent still owns it. System memory improves its inputs and never takes over the decision.

## Source of truth: Postgres observations

The backend owns run history, watch visibility and deletion, so it owns the truth. Each fact is one row describing one moment.

```sql
-- Each watch's classification, set from its first run.
ALTER TABLE tasks ADD COLUMN flow_event_type TEXT, ADD COLUMN flow_domain TEXT;

-- One row per triggered execution.
CREATE TABLE flow_observations (
  id            UUID PRIMARY KEY,
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  execution_id  UUID NOT NULL REFERENCES task_executions(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,     -- closed enum, see below
  domain        TEXT NOT NULL,     -- public subject class: "apple", "ai-labs", "uk-rail"
  first_host    TEXT NOT NULL,     -- host of the earliest credible signal
  first_kind    TEXT NOT NULL,     -- official | press | aggregator | social | forum | leak
  confirm_host  TEXT NOT NULL,     -- host where the trigger was confirmed
  first_seen_at TIMESTAMPTZ,       -- earliest dated source for the moment, if any
  lag_h         REAL,              -- first signal to confirmation, null if undated
  observed_at   TIMESTAMPTZ NOT NULL
);
```

- **Event types are a closed enum:** `product_launch`, `release_date`, `restock`, `price_change`, `schedule_published`, `model_release`, `earnings`, `policy_decision`, `result_announced`, `status_change`, `other`.
  - Moments typed `other` produce no observation. They are only logged, so the list can grow based on what actually shows up.
- **Hard deletes cascade.** Deleting a watch, an execution or a user removes that watch's observations in the same transaction, because `tasks` already cascades from `users`. No second store needs to stay in sync.
- **Expiry is per observation.** Reads ignore rows with `observed_at` older than 180 days, and a nightly `DELETE` removes them. Old samples drop out one by one, while the key itself lives on.

## Extraction: one moment, one call

- **Trigger.** When an execution triggers, the scheduler queues an extraction for it after the trigger has been delivered.
  - Extraction never delays the trigger or blocks the run.
  - A one-off backfill covers existing triggered executions.
- **Model.** The agent service owns the models, so it hosts a new A2A skill, `extract_observation`.
  - It receives the condition text, the triggering execution and the watch's earlier executions: timestamps, confidence, and grounding sources with any publish dates.
  - It returns `event_type`, `domain`, `first_host`, `first_kind` and `confirm_host` for this one moment.
  - It runs on the free Gemini key with paid fallback (#392).
  - The model never merges records and never does arithmetic.
- **Code.** The backend computes everything else:
  - `first_seen_at` and `lag_h`, from the source dates;
  - every aggregate, at read time.
- **Cost.** One flash-lite call per triggered execution. At a few triggers a day that is well under $0.01 a day, and nothing is written outside Postgres.

**Hosts are never model-invented.** Each host the model returns must be the hostname of a URL in that execution's stored `grounding_sources`, meaning a source the agent actually searched or fetched. Anything else rejects the observation.

**Reliability comes from outcomes, not model labels.** A host's reliability for a key is computed:
- `confirmed` when it is the `confirm_host` of observed triggers;
- `early-and-right` when it was `first_host` on moments that went on to confirm;
- otherwise `unproven`.

## Privacy guard (requirements)

1. **Eligibility at write time.** Only watches with `is_public = true` and no attached connectors produce observations. Connector watches read private data and are excluded outright.
2. **Eligibility rechecked at read time.** Every aggregate joins `tasks` and filters on `is_public = true AND no connectors` when the query runs.
   - A watch that goes from public to private stops counting on the very next read, with no job involved.
   - A deleted watch cascades away, as described above.
3. **k-threshold of 3 distinct users.** A key is served only when observations from at least 3 distinct users stand behind it. Below that, the key serves nothing.
   - A fork (`forked_from_task_id`) counts with its root watch's user, so one person forking their own watch cannot reach k.
4. **Per-host threshold.** Within a served key, a host appears only if at least 2 distinct users' observations cite it.
5. **Hostname and PII guard.** These checks run in code at extraction time:
   - Hosts are bare hostnames only, never paths or query strings. IP literals are rejected.
   - Subdomains of user-content platforms are rejected, using a denylist kept in code: `substack.com`, `medium.com`, `github.io`, `wordpress.com`, `blogspot.com`, `tumblr.com`, `notion.site`, `linktr.ee` and similar. The platform's own domain stays allowed.
   - `domain` must match `^[a-z0-9-]{2,32}$`. It is rejected if it holds an email or handle pattern, or a token that appears in the condition text but in no source hostname or title.
   - For small entities the token check alone is weak. The k-threshold is the real guard.
6. **Minimised input.** The extraction payload carries no user id, email, watch id, name or webhook. Untrusted text is wrapped with `PromptSanitizer.wrap`.
7. **Poisoning.** Three guards together mean one account or one SEO page cannot steer other users' agents:
   - hosts must come from fetched sources;
   - reliability comes from outcomes;
   - a key needs 3 distinct users before it is served.

## Reading: how a run knows its key

The key comes from the watch, not from semantic matching.

- `MonitoringResponse` gains optional `event_type` and `domain` fields. Like `topic` today, the agent fills them on the first run and the backend stores them on `tasks`.
  - This is a contract change, so both `models.py` copies change together.
- From the second run on, the backend knows the key. The first run happens at creation, so the cold-start benefit starts at run 2, usually within 24 hours.
- The aggregate per key is served only above both thresholds. It contains:
  - the top 3 first-break hosts, with kind and reliability;
  - the top 2 confirm hosts;
  - the median lag and its spread, from at least 3 dated samples;
  - the observed publish window, when at least 3 samples agree;
  - the observation and user counts.

## Serving: two options

| | (A) mem0 as retrieval index over Postgres | (B) Backend injects the summary into the run payload |
|---|---|---|
| How | A sync job writes one mem0 memory per servable key (`agent_id="webwhen-flow-map"`, `infer=False`, templated text, metadata). `search_memories` reads both scopes in one OR-filtered search. | The backend computes the per-key aggregate in SQL and adds it to the run prompt next to the execution history, inside `PromptSanitizer` tags. |
| Source of truth | Postgres. mem0 holds a derived copy. | Postgres. |
| Deletes and unpublish | The sync job must delete or rewrite the mem0 memory whenever a key drops below k or loses rows. Stale data stays served until the next sync. | Correct on the next read, by construction. |
| Lookup | Semantic. It can surface records for similar keys when a watch has no exact key. | Exact key only. A watch without a key, or whose key is below the threshold, gets nothing. |
| mem0 plan | Uses mem0 adds and retrievals. With a connected key (BYOK): 50k adds and 10k retrievals a month, and adds billed by the provider. Prod already makes about 900 searches a month. Whether direct import or `update` count as adds is not documented. | None. |
| New parts | Sync job, mem0 record format, combined-filter search, dependency on the mem0 plan. | One SQL query, one prompt block. |
| Later scheduler hint | Needs the key echoed back, or a second lookup. | The backend already has both the key and the aggregate. |

**Recommendation: B for v1.**
- At this volume, tens of observations, an exact-key SQL lookup does the whole job.
- Every failure mode in A comes from keeping a second copy of the data: sync lag on delete or unpublish, plan limits, and a neighbouring key's record surfacing.
- B keeps A open. If keys turn out too narrow and semantic lookup across keys proves worth having, A can be added as an index built from the same table, with no change to the source of truth.

**The honest case for A.**
- It reuses the store the agent already queries.
- It handles fuzzy matches that B cannot.
- It builds toward a single mem0-centred memory if per-watch memory grows that way.
- Its cost is the sync job and the plan dependency above.

Prass's call.

## Measuring benefit: backtest, then shadow review

At about 16 runs a day, an A/B test cannot detect a realistic effect:
- the eligible pool is only a subset of watches;
- runs per moment are heavy-tailed;
- existing watches already have their own memory.

So there is no A/B test.

**1. Offline backtest over existing history.** This needs no flag and no waiting.
- Backfill observations from every past triggered execution of eligible watches.
- Replay moments in time order. For each one, build the key's aggregate from earlier observations only, with the k and host thresholds as they stood at the time.
- **Host hit rate:** did a served first-break host match the host that actually broke this moment?
- **Timing hit rate:** would the served lag and publish window have placed a check at or after the first signal and before the actual trigger?
- **Cold start:** for each watch, at its creation time, was its key servable, and would the aggregate have named the eventual breaking host? Count the runs between creation and the first trigger that a correct hint could have saved.
- **Coverage:** the share of new eligible watches whose key was servable at creation. This is likely low early on. It shows whether k=3 starves the feature.
- **Gate:** if the host hit rate on served keys is below 50%, or coverage is near zero, nothing ships. Report the numbers and stop.

**2. Shadow mode with manual review.** This runs only if the backtest passes.
- Compute the per-key summary for real runs and log it next to the run, without serving it.
- For two weeks, review every summary that would have been served, by hand, for:
  - privacy: no host or domain that identifies a person;
  - correctness: does it match what the run then found?
  - usefulness.

**3. Serve.** Report runs per trigger, cost per trigger and detection lag (where sources carry dates) as before/after descriptions, not as an experiment.

## mem0 plan facts

These apply to option A and to the per-watch memory incident. They come from mem0's docs, read 2026-11-26.

| Question | Answer | Source |
|---|---|---|
| Does `infer=False` skip mem0's LLM? | Yes. Direct import stores text verbatim and skips extraction and semantic dedup. Exact repeats in the same scope are deduplicated by hash. | [Direct import](https://docs.mem0.ai/platform/features/direct-import), [Add memories API](https://docs.mem0.ai/api-reference/memory/add-memories) |
| Does `infer=False` avoid the free plan's LLM-key block? | Not documented, so assume no. The FAQ says that after 30 days without a key, "New adds return an error until you connect a key", with no exception for direct import. | [Pricing FAQ](https://docs.mem0.ai/platform/pricing) |
| Does `update` count as an add? | Not documented. The plan limits name only adds and retrievals. | [Pricing FAQ](https://docs.mem0.ai/platform/pricing), [Update memory API](https://docs.mem0.ai/api-reference/memory/update-memory) |
| What are the limits? | Free plan, first 30 days: 10,000 adds and 1,000 retrievals a month. After that, without a key, adds are blocked and searches are capped at 1,000 a month. With a connected key (BYOK): 50,000 adds and 10,000 retrievals a month, with extraction billed by the provider (about $3.55 to $5.34 per 1,000 adds). Accounts created before 2026-10-26 had until 2026-11-25. | [Pricing FAQ](https://docs.mem0.ai/platform/pricing), [BYOK](https://docs.mem0.ai/platform/features/byok) |

The prod incident fits these facts. Adds started failing on 2026-11-25, the free-plan deadline. After Prass connected a BYOK key on 2026-11-26, all 4 adds between 04:12Z and 04:58Z were accepted.

## Rollout

1. **Build.** Migration plus the extraction skill, then backfill observations from history. Nothing is served yet.
2. **Backtest** against the gate.
3. **Shadow mode** with manual review for two weeks.
4. **Serve** with option B, or with A if Prass chooses it.
5. **Optional, later:** a scheduler sanity check that only ever moves `next_run` later, and only on keys with at least 5 users behind them.

## Open questions for Prass

- **Serving.** Option A (mem0 index) or option B (backend summary)? B is recommended for v1.
- **Q3, eligibility.** Public watches only for v1, or private watches too with an opt-in?
- **Q4, mem0 project (A only).** Same project as per-watch memory, or a separate one for the system index?
