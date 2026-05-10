// Build-time fetch + bake of landing-page watch evidence.
//
// For each entry in src/data/landingExamples.ts, hits /api/v1/public/feed
// for the latest successful execution, joins it with the curated config,
// and writes .landing-examples-snapshot.json. The snapshot is consumed by
// LandingExamplesContext at module-init so prerender bakes real evidence
// into dist/index.html (and component first-paint matches hydration).
//
// Failure mode mirrors sync-changelog-fixture.mjs: if the fetch fails or
// returns an empty feed, fall back to the committed
// landingExamples.fallback.json so builds never break on an API blip. CI
// surfaces a warning so we know it happened.

import { writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadTsModule } from './_lib/load-ts.mjs';

const PROJECT_ROOT = join(import.meta.dirname, '..');
const CONFIG_TS = join(PROJECT_ROOT, 'src/data/landingExamples.ts');
const FALLBACK = join(PROJECT_ROOT, 'src/data/landingExamples.fallback.json');
const OUT = join(PROJECT_ROOT, '.landing-examples-snapshot.json');

const API_ORIGIN =
  process.env.LANDING_EXAMPLES_API_ORIGIN ||
  process.env.PRERENDER_ORIGIN?.replace('://', '://api.').replace('https://api.https://', 'https://') ||
  'https://api.webwhen.ai';

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

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
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
    console.warn(`[sync-landing-examples] live fetch failed (${err.message}); falling back to committed snapshot.`);
    if (existsSync(FALLBACK)) {
      copyFileSync(FALLBACK, OUT);
      console.warn(`[sync-landing-examples] copied ${FALLBACK} → ${OUT}`);
      return;
    }
    console.warn(`[sync-landing-examples] no fallback at ${FALLBACK}; writing empty snapshot.`);
    writeFileSync(
      OUT,
      JSON.stringify({ totalPublicConditions: 0, syncedAt: new Date().toISOString(), examples: [] }, null, 2),
      'utf-8',
    );
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

  writeFileSync(OUT, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(
    `[sync-landing-examples] baked ${examples.length}/${LANDING_EXAMPLES.length} watches → ${OUT} (total public: ${totalPublicConditions})`,
  );
}

main().catch((err) => {
  console.error(`[sync-landing-examples] FAIL: ${err.stack || err.message}`);
  if (existsSync(FALLBACK)) {
    copyFileSync(FALLBACK, OUT);
    console.warn(`[sync-landing-examples] copied fallback after fatal error.`);
    process.exit(0);
  }
  process.exit(1);
});
