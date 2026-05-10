// Curated set of public watches surfaced on the marketing landing page.
//
// `taskId` references a row in /api/v1/public/tasks. The build-time script
// scripts/sync-landing-examples.mjs joins each entry with the latest
// successful execution from /api/v1/public/feed and writes the result to
// src/data/landingExamples.fallback.json (the file the React tree imports),
// which prerender bakes into dist/index.html.
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
// `displayPrompt` is the bare topic the watch tracks. The composer chrome
// already says "new watch · plain english · no rules" so the prompt itself
// doesn't need an imperative wrapper. Lowercase sentence-style without
// trailing period, matching the "Topic of the watch" register.

export type LandingExampleSurface = 'hero' | 'cases';

export interface LandingExampleConfig {
  /** Public task id (UUID). */
  taskId: string;
  /** Bare topic shown inside the composer. No "Tell me X" prefix, no period. */
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
    displayPrompt: 'the multi-agent coding ecosystem',
    tag: 'frontier · ai',
    surfaces: ['hero'],
  },
  {
    taskId: 'bac2f3ac-2c7e-43a8-955b-3386303620a7',
    displayPrompt: "what's new in East London saunas",
    tag: 'lifestyle · london',
    surfaces: ['hero'],
  },
  {
    taskId: '33f03646-4097-4861-8aa8-0152f4808d5b',
    displayPrompt: 'public sentiment toward OpenAI',
    tag: 'sentiment · ai',
    surfaces: ['hero'],
  },
  {
    taskId: '197d62ff-b605-40eb-92f1-7b6018cf1ae6',
    displayPrompt: 'open-weight model releases',
    tag: 'open-source · ai',
    surfaces: ['hero'],
  },
  {
    taskId: 'd74456cd-e9cf-40d7-acb8-2a1606a55f4c',
    displayPrompt: 'new features shipped by webwhen',
    tag: 'self · changelog',
    surfaces: ['hero'],
  },

  // === Receipts cards ================================================
  // Three watches deliberately not in the hero rotation: two settled
  // (showing the agent retiring a watch) and one currently watching
  // (showing the agent actively reading the web).
  {
    taskId: '14d7792c-7b77-4781-8f85-d4980e631e43',
    displayPrompt: 'frontier AI lab model releases',
    tag: 'frontier · ai',
    surfaces: ['cases'],
  },
  {
    taskId: '369e9794-8971-4a21-be64-b9f18009ec55',
    displayPrompt: 'Claude Code developer sentiment',
    tag: 'sentiment · devtools',
    surfaces: ['cases'],
  },
  {
    taskId: '62f9774b-ccab-4d28-b5de-bb12f97339f2',
    displayPrompt: 'recent funding rounds for YC-backed companies',
    tag: 'funding · yc',
    surfaces: ['cases'],
  },

  // === Parked ========================================================
  // Public watches kept here for future rotation. Left out of `surfaces`
  // either because they don't yet have rich enough evidence or because
  // the curated slate is already full. To enable, add a surface and
  // redeploy.
  // {
  //   taskId: 'c3f20127-7319-49e1-b78a-d3767895c480',
  //   displayPrompt: 'European Central Bank rate decisions',
  //   tag: 'regulatory · finance',
  //   surfaces: [],
  // },
  // {
  //   taskId: '9302833f-2e54-4f2b-97dd-3a256e39603b',
  //   displayPrompt: 'YC dev-tools Series A raises',
  //   tag: 'funding · devtools',
  //   surfaces: [],
  // },
];

// === Snapshot shape ===================================================
//
// Written to src/data/landingExamples.fallback.json by the prebuild
// script and read at module init by LandingExamplesContext. Mirrors the
// shape the runtime fetch produces, so snapshot-vs-live merging is a
// simple keyed merge by taskId.

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
