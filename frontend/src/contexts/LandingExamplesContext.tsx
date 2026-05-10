// Single source of post-hydration revalidated landing-page watch state.
//
// First paint: returns the build-time snapshot baked by
// scripts/sync-landing-examples.mjs (committed fallback at
// src/data/landingExamples.fallback.json). This keeps prerender HTML and
// React first paint structurally identical, avoiding hydration mismatches.
//
// Post-hydration: the provider fires a single fetch against
// /api/v1/public/feed and merges fresher executions into the in-memory
// snapshot keyed by taskId. Both Hero (rotation) and Cases (Receipts)
// read from this context so a rogue task on /explore can't surface twice.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANDING_EXAMPLES, type LandingSnapshot, type LandingExampleSnapshot } from '@/data/landingExamples';
import fallbackJson from '@/data/landingExamples.fallback.json';
import { api } from '@/lib/api';

const FALLBACK = fallbackJson as LandingSnapshot;

type ExampleBySurface = {
  hero: LandingExampleSnapshot[];
  cases: LandingExampleSnapshot[];
};

interface LandingExamplesContextValue {
  snapshot: LandingSnapshot;
  hero: LandingExampleSnapshot[];
  cases: LandingExampleSnapshot[];
}

const LandingExamplesContext = createContext<LandingExamplesContextValue | null>(null);

function partition(snapshot: LandingSnapshot): ExampleBySurface {
  return {
    hero: snapshot.examples.filter((e) => e.surfaces.includes('hero')),
    cases: snapshot.examples.filter((e) => e.surfaces.includes('cases')),
  };
}

const TOOL_TO_VERB: Record<string, string> = {
  search_memories: 'remembered',
  perplexity_search: 'searched',
  add_memory: 'noted',
  final_result: 'settled',
  fetch_url: 'read',
  google_search: 'searched',
  web_search: 'searched',
};

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function trimEvidence(text: string | undefined): string {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 220) return cleaned;
  const slice = cleaned.slice(0, 220);
  const lastTerm = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (lastTerm > 80) return slice.slice(0, lastTerm + 1);
  const lastSpace = slice.lastIndexOf(' ');
  return slice.slice(0, lastSpace > 0 ? lastSpace : 220) + '…';
}

/**
 * Merge a fresh execution into a baked snapshot entry. Mirrors the field
 * extraction the build script does so live + baked entries have identical
 * shape. Returns the original entry untouched if the live fetch yielded
 * nothing useful.
 */
interface FeedExecutionLike {
  task_id: string;
  status?: string;
  started_at?: string;
  notification?: string;
  result?: {
    evidence?: string;
    activity?: { tool?: string; detail?: string }[];
    sources?: { url: string; title?: string }[];
    grounding_sources?: { url: string; title?: string }[];
  };
  grounding_sources?: { url: string; title?: string }[];
}

function mergeExecution(
  baked: LandingExampleSnapshot,
  exec: FeedExecutionLike,
): LandingExampleSnapshot {
  const cfg = LANDING_EXAMPLES.find((c) => c.taskId === baked.taskId);
  const liveEvidence = exec.result?.evidence || exec.notification || '';
  const evidence = trimEvidence(cfg?.displayEvidenceOverride || liveEvidence) || baked.evidence;

  const activity = (exec.result?.activity || [])
    .filter((a) => a.tool)
    .slice(0, 3)
    .map((a) => ({
      verb: TOOL_TO_VERB[a.tool || ''] || 'checked',
      detail: (a.detail || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    }));

  const sourceList = exec.result?.sources || exec.grounding_sources || exec.result?.grounding_sources || [];
  const seen = new Set<string>();
  const sources: string[] = [];
  for (const s of sourceList) {
    const h = hostOf(s.url);
    if (h && !seen.has(h)) {
      seen.add(h);
      sources.push(h);
      if (sources.length >= 3) break;
    }
  }

  return {
    ...baked,
    startedAt: exec.started_at || baked.startedAt,
    evidence,
    activity: activity.length > 0 ? activity : baked.activity,
    sources: sources.length > 0 ? sources : baked.sources,
  };
}

export function LandingExamplesProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<LandingSnapshot>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    api
      .getPublicFeed(100)
      .then((feed) => {
        if (cancelled || !Array.isArray(feed)) return;
        const latestByTask = new Map<string, FeedExecutionLike>();
        for (const exec of feed as unknown as FeedExecutionLike[]) {
          if (!exec?.task_id || exec.status !== 'success') continue;
          const prior = latestByTask.get(exec.task_id);
          if (!prior || new Date(exec.started_at || 0) > new Date(prior.started_at || 0)) {
            latestByTask.set(exec.task_id, exec);
          }
        }
        setSnapshot((prev) => ({
          ...prev,
          examples: prev.examples.map((entry) => {
            const exec = latestByTask.get(entry.taskId);
            return exec ? mergeExecution(entry, exec) : entry;
          }),
        }));
      })
      .catch(() => {
        // Swallow: snapshot stays as the build-time fallback. The marketing
        // page must never throw or render an error state.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<LandingExamplesContextValue>(() => {
    const { hero, cases } = partition(snapshot);
    return { snapshot, hero, cases };
  }, [snapshot]);

  return <LandingExamplesContext.Provider value={value}>{children}</LandingExamplesContext.Provider>;
}

export function useLandingExamples(): LandingExamplesContextValue {
  const ctx = useContext(LandingExamplesContext);
  if (!ctx) {
    // Defensive: components rendered outside the provider get the baked
    // snapshot directly so first paint is still meaningful (e.g. for
    // tests that render Hero in isolation).
    const { hero, cases } = partition(FALLBACK);
    return { snapshot: FALLBACK, hero, cases };
  }
  return ctx;
}
