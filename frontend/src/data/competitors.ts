/**
 * Competitor comparison data for SEO landing pages.
 * Used by ComparePage.tsx. Editorial-voice rewrite for the webwhen rebrand —
 * no feature tables, no advantages arrays, no checkmark wars.
 */

export interface CompetitorData {
  slug: string;
  name: string;
  seoTitle: string;
  seoDescription: string;
  heroHeadline: string;
  heroLede: string;
  openingQuote: string;
  body: string[];
  differentiator: string;
}

export const COMPETITORS: Record<string, CompetitorData> = {
  'visualping-alternative': {
    slug: 'visualping-alternative',
    name: 'VisualPing',
    seoTitle: 'webwhen — a VisualPing alternative built for plain English',
    seoDescription:
      'VisualPing watches pixels. webwhen waits for answers. Skip the selectors and the screenshot diffs.',
    heroHeadline: 'A page changed. Now what?',
    heroLede:
      'VisualPing tells you something on a page is different. webwhen tells you when your specific question has an answer. Two different jobs.',
    openingQuote: 'Pixel changes are not the same as answers.',
    body: [
      "VisualPing watches the visual surface of a webpage. When something on the page is different from last time, it sends you a screenshot. That works when you know exactly which region you care about and you can see the change with your eyes.",
      "webwhen does a different job. You describe a condition in plain English, like 'tell me when the PS5 is back in stock at Best Buy', and the agent figures out how to check, what counts as evidence, and when the condition is actually met. No region selectors. No false positives from sidebar reflows.",
      "VisualPing is great if you already know the answer is on the page and you want to be told when the pixels move. webwhen is built for the messier case: the answer might appear anywhere, and you want to be told only when it actually appears.",
    ],
    differentiator:
      "VisualPing watches pixels. webwhen waits for answers. If your question can be expressed in English, you don't need either selectors or screenshots — just the question.",
  },
  'distill-alternative': {
    slug: 'distill-alternative',
    name: 'Distill',
    seoTitle: 'webwhen — a Distill alternative for questions, not pages',
    seoDescription:
      'Distill watches a page you point it at. webwhen watches the open web for an answer to your question. Different shape of problem.',
    heroHeadline: 'You picked a page. The answer was somewhere else.',
    heroLede:
      'Distill is a careful watcher of pages you already trust. webwhen is for the moments when you do not yet know which page will hold the answer.',
    openingQuote: 'A watcher needs a page. An agent needs a question.',
    body: [
      "Distill is a thoughtful tool. You install the extension, point it at a page, choose the region or text you care about, and it tells you when that piece changes. People use it well, for years, for things that live at a known URL.",
      "webwhen starts from the other end. You write the question first — 'when does the next Nintendo Direct get announced', 'when does this PhD program open applications', 'when does that conference release its schedule' — and the agent decides where to look, what counts as a real answer, and when to tell you. The page is an implementation detail.",
      "If you already have the URL and the selector, Distill is a fine companion. If you only have the question, webwhen is the shape of tool you want. Neither replaces the other; they answer different sentences.",
    ],
    differentiator:
      "Distill needs a page. webwhen needs a question. The difference shows up the moment you do not yet know which URL holds your answer.",
  },
  'changetower-alternative': {
    slug: 'changetower-alternative',
    name: 'ChangeTower',
    seoTitle: 'webwhen — a ChangeTower alternative without the dashboards',
    seoDescription:
      'ChangeTower logs every change on the pages you watch. webwhen stays quiet until your specific condition is met.',
    heroHeadline: 'Most page changes are not news.',
    heroLede:
      'ChangeTower keeps a careful record of everything that moves on a page. webwhen keeps quiet until the one thing you actually asked about happens.',
    openingQuote: 'A change log is not the same as an answer.',
    body: [
      "ChangeTower is built for teams that want a record. Every text edit, every layout shift, every section that appears or disappears — captured, archived, ready to audit. That is genuinely useful when the job is compliance, governance, or competitive observation at scale.",
      "webwhen is built for the smaller, sharper case: you have one question, and you want to be told once, when the answer arrives. You write the condition in English, the agent decides what counts, and the rest of the noise stays off your screen. There is no dashboard to keep up with because there is nothing to keep up with until something is actually true.",
      "Pick ChangeTower when you need the archive. Pick webwhen when you only need the moment.",
    ],
    differentiator:
      "ChangeTower remembers every change. webwhen waits for the one that matters. If your goal is to be notified, not to audit, the second shape is calmer.",
  },
};
