// Build-time fetch + bake of landing-page watch evidence.
//
// For each entry in src/data/landingExamples.ts, hits /api/v1/public/feed
// for the latest successful execution, joins it with the curated config,
// and overwrites src/data/landingExamples.fallback.json — the JSON the
// React tree actually imports at module init. So the file plays two
// roles depending on context:
//   - In CI: it is the *bake target*. Fresh data overwrites it before
//     `vite build` reads the import.
//   - In git: the committed copy is the *fallback*. If CI's fetch ever
//     fails, the build still ships the last-known-good snapshot rather
//     than blowing up.
//
// .landing-examples-snapshot.json is also written as a debug artefact at
// the repo root (gitignored). Useful for inspecting what the script saw
// without diffing the committed JSON.
//
// Failure mode mirrors sync-changelog-fixture.mjs: if the fetch fails,
// the existing committed JSON stays put and we exit cleanly with a warn.

import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadTsModule } from './_lib/load-ts.mjs';

const PROJECT_ROOT = join(import.meta.dirname, '..');
const CONFIG_TS = join(PROJECT_ROOT, 'src/data/landingExamples.ts');
// The React tree imports this path at module init, so this is what we
// must write. Vite's resolveJsonModule + bundler resolution turn it into
// a static import that prerender then bakes into dist HTML.
const BAKE_TARGET = join(PROJECT_ROOT, 'src/data/landingExamples.fallback.json');
// Debug-only mirror, gitignored. Inspect this without git-diffing the
// committed JSON.
const DEBUG_OUT = join(PROJECT_ROOT, '.landing-examples-snapshot.json');

// Marketing snapshot data is brand-curated and lives in the production
// public feed. Both staging and production images bake from prod by
// design — the alternative (staging builds reading staging-API) showed
// stakeholders an empty hero on staging because curated taskIds are
// prod-only UUIDs. Same shape as the changelog fixture: one source of
// truth, no per-env split.
//
// LANDING_EXAMPLES_API_ORIGIN remains an env var so a developer can
// override locally (e.g. point at a fork of the API for testing), and
// so the explicit-env-var mechanism is preserved (no string-replace
// heuristics on PRERENDER_ORIGIN — that fell back silently when the
// staging API host turned out to be `api-staging` not `api.staging`).
const API_ORIGIN = process.env.LANDING_EXAMPLES_API_ORIGIN || 'https://api.webwhen.ai';

// Public endpoints cap limit at 100. The feed already returns the most-
// recent executions first, so 100 is enough to cover a curated set of ~10
// landing examples even at heavy ingestion rates.
const FEED_URL = `${API_ORIGIN}/api/v1/public/feed?limit=100`;
const TASKS_URL = `${API_ORIGIN}/api/v1/public/tasks?limit=100`;

// Editorial paraphrase of the agent's tool sequence. Hero composer log
// shows verbs from this map; anything not mapped falls back to a sensible
// default so a new tool slug doesn't crash the build.
const TOOL_TO_VERB = {
  search_memories: 'remembered',
  perplexity_search: 'searched',
  add_memory: 'noted',
  final_result: 'settled',
  fetch_url: 'read',
  google_search: 'searched',
  web_search: 'searched',
};

function paraphraseTool(tool) {
  return TOOL_TO_VERB[tool] || 'checked';
}

function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Trim evidence to a single sentence, max 220 chars, no orphan clauses. */
function trimEvidence(text) {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 220) return cleaned;
  // Prefer the first sentence terminator inside the budget.
  const slice = cleaned.slice(0, 220);
  const lastTerm = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (lastTerm > 80) return slice.slice(0, lastTerm + 1);
  // No clean break — fall back to soft truncation at last space.
  const lastSpace = slice.lastIndexOf(' ');
  return slice.slice(0, lastSpace > 0 ? lastSpace : 220) + '…';
}

/** Pick the 3 most-prominent source hosts from the execution. */
function topHosts(execution) {
  const sources =
    execution?.result?.sources ||
    execution?.grounding_sources ||
    execution?.result?.grounding_sources ||
    [];
  const seen = new Set();
  const hosts = [];
  for (const s of sources) {
    const h = hostOf(s.url || s);
    if (h && !seen.has(h)) {
      seen.add(h);
      hosts.push(h);
      if (hosts.length >= 3) break;
    }
  }
  return hosts;
}

/** Render the activity log as ≤3 verb/detail pairs for the hero composer. */
function paraphraseActivity(execution) {
  const activity = execution?.result?.activity || [];
  return activity
    .filter((a) => a && a.tool)
    .slice(0, 3)
    .map((a) => ({
      verb: paraphraseTool(a.tool),
      detail: (a.detail || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    }));
}

// Bare fetch() inherits Node's 10-minute socket timeout, which would
// stretch every Docker build by minutes if the API is slow or down.
// 15s is comfortably more than the API needs in healthy state and short
// enough to fail fast into the committed-snapshot fallback path.
const FETCH_TIMEOUT_MS = 15000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`${url} → timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const { LANDING_EXAMPLES } = await loadTsModule(CONFIG_TS);

  let feed = [];
  let tasks = [];
  let totalPublicConditions = 0;

  try {
    [feed, tasks] = await Promise.all([
      fetchJson(FEED_URL),
      fetchJson(TASKS_URL),
    ]);
    totalPublicConditions = tasks?.total ?? (Array.isArray(tasks?.tasks) ? tasks.tasks.length : 0);
  } catch (err) {
    // Fetch failed. The committed bake target stays untouched — Vite
    // will import the last-known-good snapshot. The debug mirror at
    // DEBUG_OUT is intentionally not refreshed; if you need to know what
    // CI saw, the warn line below is the audit trail.
    console.warn(`[sync-landing-examples] live fetch failed (${err.message}); using committed snapshot at ${BAKE_TARGET}.`);
    if (!existsSync(BAKE_TARGET)) {
      // No committed snapshot to fall back to — write an empty one so
      // the import resolves rather than crashing the build.
      const empty = { totalPublicConditions: 0, syncedAt: new Date().toISOString(), examples: [] };
      writeFileSync(BAKE_TARGET, JSON.stringify(empty, null, 2), 'utf-8');
      console.warn(`[sync-landing-examples] no committed snapshot existed; wrote empty placeholder.`);
    }
    return;
  }

  const tasksById = new Map((tasks?.tasks || []).map((t) => [t.id, t]));
  // Prefer the most recent successful execution per task.
  const latestExecByTask = new Map();
  for (const exec of feed) {
    if (!exec?.task_id || exec.status !== 'success') continue;
    const prior = latestExecByTask.get(exec.task_id);
    if (!prior || new Date(exec.started_at) > new Date(prior.started_at)) {
      latestExecByTask.set(exec.task_id, exec);
    }
  }

  const examples = [];
  for (const cfg of LANDING_EXAMPLES) {
    const task = tasksById.get(cfg.taskId);
    const exec = latestExecByTask.get(cfg.taskId);
    if (!task && !exec) {
      console.warn(`[sync-landing-examples] no public data for taskId=${cfg.taskId} (${cfg.displayPrompt}); dropping.`);
      continue;
    }

    const liveEvidence =
      exec?.result?.evidence ||
      task?.last_known_state?.evidence ||
      exec?.notification ||
      '';

    examples.push({
      taskId: cfg.taskId,
      displayPrompt: cfg.displayPrompt,
      tag: cfg.tag,
      surfaces: cfg.surfaces,
      startedAt: exec?.started_at || task?.state_changed_at || task?.updated_at || '',
      state: task?.state || 'unknown',
      evidence: trimEvidence(cfg.displayEvidenceOverride || liveEvidence),
      sources: topHosts(exec),
      activity: paraphraseActivity(exec),
    });
  }

  const snapshot = {
    totalPublicConditions,
    syncedAt: new Date().toISOString(),
    examples,
  };

  const serialized = JSON.stringify(snapshot, null, 2);
  // Bake target = the import the React tree resolves at module init.
  // Overwriting this makes the live fetch visible to vite build (and
  // therefore to prerender's baked HTML).
  writeFileSync(BAKE_TARGET, serialized, 'utf-8');
  // Debug mirror at repo root, gitignored. Inspect this to see what the
  // script saw without producing a noisy git diff on every CI run.
  writeFileSync(DEBUG_OUT, serialized, 'utf-8');
  console.log(
    `[sync-landing-examples] baked ${examples.length}/${LANDING_EXAMPLES.length} watches → ${BAKE_TARGET} (total public: ${totalPublicConditions}, origin: ${API_ORIGIN})`,
  );
}

main().catch((err) => {
  // Don't tear down the build on a partial failure — leave the committed
  // bake target alone so the React tree still has *something* to import.
  console.error(`[sync-landing-examples] FAIL: ${err.stack || err.message}`);
  console.warn(`[sync-landing-examples] leaving committed snapshot at ${BAKE_TARGET} untouched.`);
  process.exit(0);
});
