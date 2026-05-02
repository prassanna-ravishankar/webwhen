/**
 * Concept data for /concepts/:concept pages. Used by ConceptPage.tsx.
 */

export interface ConceptSection {
  heading: string;
  /** Rendered as <p> in order — plain strings, no markdown. */
  paragraphs: string[];
}

export interface ConceptRelated {
  path: string;
  kind: string;
  title: string;
}

export interface ConceptData {
  slug: string;
  name: string;
  tagline: string;
  metaTitle: string;
  metaDescription: string;
  title: string;
  /** Short lead paragraph rendered in the hero. */
  lede: string;
  /** Ordered long-form sections. */
  sections: ConceptSection[];
  related?: ConceptRelated[];
}

export const CONCEPTS: Record<string, ConceptData> = {
  'self-scheduling-agents': {
    slug: 'self-scheduling-agents',
    name: 'Self-Scheduling Agents',
    tagline: 'Watching that decides when to look next',
    metaTitle: 'Self-Scheduling Agents for Web Watching | webwhen',
    metaDescription:
      "A self-scheduling agent watches the web, reasons about what it finds, and decides when to look again. webwhen's agent loop replaces cron + scrape with grounded search and judgement.",
    title: 'Self-scheduling agents',
    lede: "You describe a condition in plain English. The agent decides what to search for, whether the condition is true, when to come back, and when it's seen enough to tell you. No cadence to configure. No diff thresholds to tune. No cron job to babysit.",
    sections: [
      {
        heading: 'What "self-scheduling" actually means',
        paragraphs: [
          'Most watching tools run on a fixed timer the human picked: every 15 minutes, every hour, every day. That timer is a guess. Guess too often and you waste compute on a page that never changes. Guess too rarely and you miss the announcement by a day.',
          'A self-scheduling agent picks its own cadence. Each run, it decides when to come back based on what it just saw. Heating up? Sooner. Quiet? Later. Permanently resolved? Never. The schedule is an output of the agent, not an input from you.',
          "It also decides when to tell you. Not every run produces a notification — only the runs where something is actually worth saying. The agent is the editor, not just the sensor.",
        ],
      },
      {
        heading: 'How it differs from cron + scrape',
        paragraphs: [
          'Traditional watching fires on a fixed cadence and compares two snapshots. Bytes change, alert fires. That breaks on dynamic pages, noisy layouts, A/B tests, cookie banners, and anything gated behind JavaScript the scraper can\'t execute. It also has no concept of the thing you actually care about — only "did the bytes move?"',
          'A self-scheduling agent grounds every run in live search. It looks for fresh evidence, reads the relevant pages, and reasons about whether your natural-language condition ("Apple announced a release date", "the API docs are public", "the price dropped below $40") is satisfied. Layout churn doesn\'t fool it. Neither does a page that loads its real content from JavaScript.',
          'The cadence adapts to what the agent finds. Clear evidence the moment is near earns an earlier next look. A long stretch of nothing earns a longer interval. You never tune a polling rate.',
        ],
      },
      {
        heading: "Inside webwhen's loop",
        paragraphs: [
          "Each watch is defined by a condition you write in plain English. When the scheduler fires it, the backend hands the condition to a Pydantic AI agent over an A2A protocol. The agent does grounded search, optionally fetches specific pages for more context, and produces a typed response.",
          "That response carries: whether the condition is met, a short human answer, the agent's reasoning, citations to the sources it actually read, and a `next_run` timestamp. The backend persists everything, sends a notification when the agent says one is warranted, and reschedules the watch for the time the agent picked.",
          "When the agent decides the condition is permanently resolved, `next_run` comes back null. The watch transitions to done and stops consuming compute. You hear about it once, when it matters, and then the watch quietly retires itself.",
        ],
      },
      {
        heading: 'Where this shape fits',
        paragraphs: [
          "Self-scheduling agents are the right shape when the question requires interpretation, when the answer might appear on pages you haven't enumerated in advance, and when checking too often would be wasteful or rate-limited. Release date watches, regulatory announcement watches, price-drop watches, exchange listing watches, \"did they finally publish the docs?\" — all of these fit.",
          "They are the wrong shape when you already know the exact URL and the exact DOM selector, the page is stable, and you want raw change detection with no judgement involved. A plain scraper is cheaper and simpler. Use the right tool.",
        ],
      },
    ],
    related: [
      { path: '/compare/visualping-alternative', kind: 'Compare', title: 'webwhen vs VisualPing' },
      { path: '/use-cases/crypto-exchange-listing-alert', kind: 'Use case', title: 'Crypto exchange listing watches' },
      { path: '/use-cases/steam-game-price-alerts', kind: 'Use case', title: 'Steam price-drop watches' },
    ],
  },
};
