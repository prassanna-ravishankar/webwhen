---
status: draft
date: 2026-11-26
---

# System memory: an information-flow map on mem0

Status: design only. Nothing here ships without Prass's sign-off.

## Problem

Each watch learns on its own. Per-watch memory (user + watch scope) records which sources work for that watch. A second watch on a similar event starts from zero. It has to work out again where news breaks, how long confirmation takes, and when the source publishes, and it pays for those lessons in extra runs and late triggers.

System memory keeps what watches learn about how information moves, keyed by event type rather than by watch or user.

## What stays the same

- Per-watch memory: `user_id=<user>`, `app_id=<watch id>`, `infer=True`, written by the agent mid-run through `add_memory`. No change.
- The agent still owns `next_run`. System memory gives it better inputs; it does not take the decision away.

## Record schema

Records are structured. One record covers one `(event_type, domain)` pair.

```python
class SourceRole(BaseModel):
    host: str                      # "macrumors.com", a hostname only, never a full URL
    kind: Literal["official", "press", "aggregator", "social", "forum", "leak"]
    reliability: Literal["rumour", "reported", "confirmed"]

class FlowRecord(BaseModel):
    schema_version: Literal[1] = 1
    event_type: EventType          # closed vocabulary, see below
    domain: str                    # public subject class: "apple", "ai-labs", "uk-rail", "ps5-retail"
    breaks_first: list[SourceRole] # where the first credible signal shows up, at most 5, ordered
    confirmed_at: list[SourceRole] # where it becomes confirmed, at most 3
    lag_samples_h: list[float]     # first signal -> confirmation, last 10 observations
    spread_h: float | None         # first break -> widely reported (3+ independent hosts)
    cadence: Literal["irregular", "daily", "weekly", "monthly", "quarterly", "annual"]
    publish_window_utc: str | None # "Tue-Thu 13:00-18:00", only when observed at least 3 times
    observations: int              # distinct moments behind this record
    last_observed: date
```

The code computes `lag_h_median` from `lag_samples_h` when it reads a record. The model never estimates the median.

`EventType` is a closed enum so records don't fragment into near-duplicates: `product_launch`, `release_date`, `restock`, `price_change`, `schedule_published`, `model_release`, `earnings`, `policy_decision`, `result_announced`, `status_change`, `other`. Records typed `other` are not written. The distill job logs them so the vocabulary can grow on evidence.

The mem0 memory text is one sentence built from the fields by a template, not by a model. For example: "product_launch / apple: breaks first on macrumors.com (leak, rumour); confirmed on apple.com; median lag 30h; irregular." Semantic search matches on that sentence, and the structured fields travel in `metadata`.

## mem0 scoping

| Scope | Entity ids | Write mode | Writer |
|---|---|---|---|
| Per-watch (today) | `user_id=<user>`, `app_id=<watch id>` | `infer=True` | agent, mid-run |
| System | `agent_id="webwhen-flow-map"`, `app_id="webwhen-system"`, no `user_id` | `infer=False` (direct import) | distill job only |

- **Isolation both ways.** mem0 filters only check the fields you name.
  - The per-watch search filters on `user_id AND app_id=<watch>`. System records have no `user_id`, so they never match.
  - The system search filters on `agent_id="webwhen-flow-map"`. Per-watch records from the inferred path carry `agent_id=null`, so they never match.
- **`infer=False`** stores the text exactly as written. mem0 runs no model of its own, so the record cannot be rewritten into something we didn't validate. Identical text in the same scope is deduplicated by hash.
  - Direct import skips semantic dedup, so the job updates records instead of adding new ones. It looks up the existing record by `metadata.event_type` + `metadata.domain`, then calls `update(memory_id, text, metadata)`. It calls `add` only for a new pair.
  - Direct import runs no model on mem0's side. The docs do not say it is exempt from the free plan's post-30-day add block, so the design assumes it is not. See [mem0 plan facts](#mem0-plan-facts).
- **Expiry.** Every write sets `expiration_date = last_observed + 180 days`, so stale patterns age out unless new moments refresh them.
- **Alternative considered: a separate mem0 project for the system scope.** It would split billing and make the blast radius obvious, at the cost of a second key. The design starts with the same project and entity scoping, and the split stays open.

## Distill job

Each concern sits with the layer that already owns it:

- **Backend** owns run history and the schedule, so it selects inputs and strips user data.
- **Agent service** owns the model and the mem0 client, so it runs the extraction and the write.

1. **Trigger.** A daily APScheduler cron job runs on the scheduler leader at about 04:20 UTC, outside run peaks. A watch is eligible if it has a new triggering execution since `tasks.flow_distilled_at`. Moments carry the signal: they show where the news broke and when it was confirmed. Plain "nothing yet" runs add little.
2. **Payload (backend).** For each eligible watch, the backend sends:
   - the condition text
   - executions since the last distill: `completed_at`, `confidence`, notification text, and source URLs with any publish dates the search tools returned
3. **Extract (agent).** A new A2A skill, `distill_flow`, runs a small pydantic-ai agent with `output_type=FlowRecord` on the free Gemini key, with the paid key as fallback (#392). It receives the existing record for the same `(event_type, domain)` plus the new observations and returns the merged record. Code then:
   - appends the lag sample and trims the list to 10
   - increments `observations`
   - validates hosts against the source URLs that were actually in the payload
4. **Write.** The agent updates the record or adds a new one, then the backend sets `flow_distilled_at`.

**Cost.**
- Model: one flash-lite call per eligible watch. At today's volume (about 16 runs a day, a few moments a day) that is under $0.01 a day.
- mem0: billed per add. The job is capped at **20 writes per day** (`FLOW_MAX_WRITES_PER_DAY`).
  - Before writing, it skips records where nothing material changed: same sources, lag within 10%, same cadence.
  - Over the cap, it defers the oldest pairs to the next day and logs `flow distill capped`.
  - mem0's plan limits count only adds and retrievals, and its docs never say how `update` is metered. Until the dashboard Usage page shows otherwise, the cap counts updates as adds. The existing-record lookup is a retrieval, so the job does one lookup per pair per day at most.

## Privacy guard

Defence in depth. Each layer would be enough on its own for most cases.

1. **Eligibility.** v1 distills only watches with `is_public = true` and no attached connectors. Public watches already show their triggers on the Explore feed. Connector watches read private data (Notion, mail) and are excluded outright.
2. **Minimised input.** The payload contains no user id, email, watch id, name or webhook. Execution evidence and grounding sources are wrapped with the existing `PromptSanitizer.wrap` tags (`scheduler/prompt_sanitizer.py`).
3. **Schema-only output.** The record is enums, hostnames, numbers and a short `domain` slug. It has no free-text field the model can copy a sentence into.
   - Hosts must come from the payload's own source URLs.
   - `domain` must match `^[a-z0-9-]{2,32}$` and is rejected if it contains any token from the condition text that is not also in a source hostname or title. This catches names and addresses.
4. **No provenance in mem0.** System records carry no user or watch ids. The backend keeps a `flow_contributions(task_id, event_type, domain, created_at)` table, so a deleted watch or account can be traced and its contribution removed. Records with a single contributor are deleted outright. Records with more contributors keep their counts and drop that watch's samples on the next distill.

## How runs consume it

- **Agent (phase 1).** `search_memories` also searches the system scope (`agent_id="webwhen-flow-map"`, top 3) and returns both, labelled `watch` and `system`. There is no new tool and no new prompt step. The prompt gains two lines: use system records to choose sources and to place `next_run` near the publish window and lag, and prefer this watch's own memories when the two conflict. It is one search, not two: a single `search` call with filter `{"OR": [{"AND": [{"user_id": u}, {"app_id": w}]}, {"agent_id": "webwhen-flow-map"}]}`, with results split by scope afterwards. Retrievals are metered (see below), and runs already use about 900 a month, so a second search per run would double that.
- **Scheduler (phase 3, optional).** If the run's `MonitoringResponse` reports the record it used (a new optional `flow_key` field, mirrored in both `models.py` files), the scheduler can sanity-check `next_run`. It only moves the time later, and only when it lands outside a well-supported publish window (`observations >= 5`). It never moves a run earlier. The agent stays the primary scheduler.

## Measuring benefit

Baseline the four weeks before launch, then A/B by watch-id hash (system reads on for half the eligible watches, `FLOW_MEMORY_READ_PCT`).

| Metric | Definition | Better |
|---|---|---|
| Runs per moment | Executions between watch creation (or the previous trigger) and the next trigger | lower |
| Detection lag | Trigger time minus the earliest publish date among the trigger's sources, where a date exists | lower |
| Runs per watch per day | Over active watches | lower at equal or better detection lag |
| Cost per moment | Model plus mem0 cost divided by triggers | lower |
| False triggers | Triggers later marked wrong or re-fired | not higher |

At about 16 runs a day the sample is small. The results will be directional rather than statistically significant. Decide on runs per moment and detection lag together. Fewer runs with later triggers is a regression.

## Rollout

0. **Shadow (2 weeks).** The distill job writes and nothing reads. Review every record for privacy leaks and for whether it is useful.
1. **Read behind the flag** for 50% of eligible watches.
2. **Measure for 4 weeks,** then keep the feature, change it, or drop it.
3. **Optional scheduler hint,** once records with `observations >= 5` exist.

## mem0 plan facts

Answers from mem0's docs, read 2026-11-26.

| Question | Answer | Source |
|---|---|---|
| Does `infer=False` skip mem0's LLM? | Yes. Direct import stores the text verbatim and skips extraction and semantic dedup. Exact repeats in the same scope are deduplicated by hash. | [Direct import](https://docs.mem0.ai/platform/features/direct-import), [Add memories API](https://docs.mem0.ai/api-reference/memory/add-memories) |
| Does `infer=False` avoid the free plan's LLM-key block? | Not documented, so assume no. The FAQ says that after 30 days without a key, "New adds return an error until you connect a key", with no exception for direct import. Our prod error reports `quota_limit: 0`, which reads as an add quota of zero rather than an extraction failure. | [Pricing FAQ](https://docs.mem0.ai/platform/pricing) |
| Does `update` count as an add? | Not documented. The plan limits name only adds and retrievals. The update docs say nothing about metering. | [Pricing FAQ](https://docs.mem0.ai/platform/pricing), [Update memory API](https://docs.mem0.ai/api-reference/memory/update-memory) |
| What are the limits? | Free plan, first 30 days: 10,000 adds and 1,000 retrievals a month. Afterwards, without a key: adds blocked, 1,000 searches a month. With a connected key (BYOK): 50,000 adds and 10,000 retrievals a month at no charge from mem0, with extraction billed by the provider (about $3.55 to $5.34 per 1,000 adds on the recommended models). Accounts that signed up before 2026-10-26 had until 2026-11-25. | [Pricing FAQ](https://docs.mem0.ai/platform/pricing), [BYOK](https://docs.mem0.ai/platform/features/byok) |

Consequences for this design:

- Retrievals bind before adds. Prod made 905 `search_memories` calls in the last 30 days (Logfire, 2026-11-26), against a 1,000-a-month limit without a key. Hence the single combined search above.
- A two-minute test settles both undocumented answers: one `add(..., infer=False)` into a throwaway scope on the prod mem0 project, then an `update` and a `delete`, then a look at the dashboard Usage page. It needs the prod mem0 key, so it is left to Prass.

## Open questions for Prass

- **Eligibility.** Public watches only for v1, or also private watches with an opt-in?
- **mem0 project.** Same project or a separate one for the system scope?
