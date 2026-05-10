// Curated set of public watches surfaced on the marketing landing page.
//
// `taskId` references a row in /api/v1/public/tasks. The build-time script
// scripts/sync-landing-examples.mjs joins each entry with the latest
// successful execution from /api/v1/public/feed and writes the result to
// .landing-examples-snapshot.json, which prerender bakes into dist/index.html.
//
// At runtime, LandingExamplesContext reads the snapshot for first paint and
// re-fetches /api/v1/public/feed once after hydration to refresh evidence.
//
// `surfaces` controls which surface a watch lands on:
//   'hero'   — composer rotation in the landing hero (cycles every 4.5s)
//   'cases'  — three editorial Receipts cards mid-page
//
// Hero and cases sets are deliberately disjoint here so the page reads as
// breadth (hero cycle) followed by depth (Receipts).
//
// `displayPrompt` overrides the raw task name with imperative-voice copy
// fit for the composer ("Tell me when X..."). The real task names are
// noun-phrases ("Frontier AI Model Releases") and don't read in-character.

export type LandingExampleSurface = 'hero' | 'cases';

export interface LandingExampleConfig {
  /** Public task id (UUID). */
  taskId: string;
  /** Imperative-voice prompt rendered in the composer. */
  displayPrompt: string;
  /** Eyebrow tag rendered above the prompt; mono, dot-separated. */
  tag: string;
  /** Which surfaces this watch appears on. */
  surfaces: LandingExampleSurface[];
  /**
   * Pin a known-good evidence sentence for this watch. Used when the live
   * evidence text is too long, off-tone, or risks reading as embarrassing
   * on a marketing surface. When set, the snapshot script ignores the live
   * evidence and bakes this string instead.
   */
  displayEvidenceOverride?: string;
}

export const LANDING_EXAMPLES: LandingExampleConfig[] = [
  // === Hero rotation =================================================
  // Five evergreen-shaped watches that span category. Cycle order is
  // fixed; first entry renders at first paint to keep prerender HTML
  // deterministic and avoid hydration mismatch.
  {
    taskId: 'cfbf0275-77df-4fc2-adbe-c5fb7a6e8e38',
    displayPrompt: 'Tell me how the multi-agent coding ecosystem is evolving.',
    tag: 'frontier · ai',
    surfaces: ['hero'],
  },
  {
    taskId: 'bac2f3ac-2c7e-43a8-955b-3386303620a7',
    displayPrompt: "Tell me what's new in East London saunas.",
    tag: 'lifestyle · london',
    surfaces: ['hero'],
  },
  {
    taskId: '33f03646-4097-4861-8aa8-0152f4808d5b',
    displayPrompt: 'Tell me when public sentiment toward OpenAI shifts.',
    tag: 'sentiment · ai',
    surfaces: ['hero'],
  },
  {
    taskId: '197d62ff-b605-40eb-92f1-7b6018cf1ae6',
    displayPrompt: 'Tell me when a major open-weight model is released.',
    tag: 'open-source · ai',
    surfaces: ['hero'],
  },
  {
    taskId: 'd74456cd-e9cf-40d7-acb8-2a1606a55f4c',
    displayPrompt: 'Tell me when webwhen ships a new feature.',
    tag: 'self · changelog',
    surfaces: ['hero'],
  },

  // === Receipts cards ================================================
  // Three watches deliberately not in the hero rotation. Hand-picked
  // so the page reads as breadth (hero cycle) → depth (Receipts).
  {
    taskId: '14d7792c-7b77-4781-8f85-d4980e631e43',
    displayPrompt: 'Tell me when a frontier AI lab releases a new model.',
    tag: 'frontier · ai',
    surfaces: ['cases'],
  },
  {
    taskId: '369e9794-8971-4a21-be64-b9f18009ec55',
    displayPrompt: 'Tell me when Claude Code developer sentiment shifts.',
    tag: 'sentiment · devtools',
    surfaces: ['cases'],
  },
];

// Note: there are currently 7 public watches and we use 7 here (5 hero,
// 2 cases). The third Receipts card slot is intentionally empty until
// another high-quality public watch lands; Cases.tsx renders only the
// entries it finds rather than padding with invented copy.

// === Snapshot shape ===================================================
//
// Written to .landing-examples-snapshot.json by the prebuild script and
// read at module init by LandingExamplesContext. Mirrors the shape the
// runtime fetch produces, so snapshot-vs-live merging is a simple keyed
// merge by taskId.

export interface LandingExampleSnapshot {
  taskId: string;
  displayPrompt: string;
  tag: string;
  surfaces: LandingExampleSurface[];
  /** ISO timestamp of the latest execution. Empty if no executions found. */
  startedAt: string;
  /** Real task state at last sync. 'completed' shows ember dot. */
  state: 'active' | 'completed' | 'paused' | 'failed' | 'unknown';
  /** Trimmed evidence sentence. Italic-serif pull-quote on Receipts cards. */
  evidence: string;
  /** Top-3 source hosts (e.g. ['anthropic.com', 'openai.com']). */
  sources: string[];
  /**
   * Editorial paraphrase of the agent's tool sequence, per execution.
   * Three lines, terse verbs. Hero composer log.
   */
  activity: { verb: string; detail: string }[];
}

export interface LandingSnapshot {
  /** Total public watches running across all users. Powers the live counter. */
  totalPublicConditions: number;
  /** ISO timestamp the snapshot was generated. */
  syncedAt: string;
  examples: LandingExampleSnapshot[];
}
