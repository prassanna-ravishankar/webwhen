/**
 * Use case data for editorial landing pages
 * Used by UseCasePage.tsx
 */

export interface UseCaseData {
  slug: string;
  name: string;
  shortTag: string;
  composerPrompt: string;
  heroHeadline: string;
  heroLede: string;
  openingQuote: string;
  body: string[];
  seoTitle?: string;
  seoDescription?: string;
  relatedUseCases?: string[];
}

export const USE_CASES: Record<string, UseCaseData> = {
  'steam-game-price-alerts': {
    slug: 'steam-game-price-alerts',
    name: 'Steam game price watches',
    shortTag: 'availability · steam',
    composerPrompt: "Tell me when Baldur's Gate 3 drops below $40 on Steam.",
    heroHeadline: "Wait for the price to drop, not for a sale to start.",
    heroLede: "Steam sales are unpredictable. Tell webwhen the game and the price you'd pay; it tells you when both line up.",
    openingQuote: "Wishlists send you everything. Webwhen sends you the moment that matters.",
    body: [
      "A wishlist is a museum. You walk past it. You add things. You forget. Then a sale arrives, the email is too long, and the one game you actually wanted is buried under three you don't.",
      "Webwhen reads the store the way you would, except it doesn't get tired. You name a game, you name a price, and the agent watches the page until both meet. No daily checks, no second-guessing whether the discount is the real one or a teaser for a deeper cut next week.",
      "When the moment arrives, you hear about it once, with the link in hand. Buy it or don't. Either way, you didn't have to refresh anything.",
    ],
    seoTitle: "Steam price watches — webwhen",
    seoDescription: "Tell webwhen the game and the price you'd pay. Hear about the moment they meet, not before, not after.",
    relatedUseCases: ['crypto-exchange-listing-alert', 'competitor-price-change-monitor'],
  },
  'competitor-price-change-monitor': {
    slug: 'competitor-price-change-monitor',
    name: 'Competitor pricing watches',
    shortTag: 'competitive intel',
    composerPrompt: "Tell me when Linear changes its Enterprise tier pricing.",
    heroHeadline: "Know when a competitor changes their pricing — within hours, not after sales calls.",
    heroLede: "Pricing pages move quietly. webwhen reads them, weighs the change, and tells you when something real happened.",
    openingQuote: "Most pricing 'updates' are noise. The agent only speaks when something actually moved.",
    body: [
      "Pricing pages are written to look stable. They aren't. A tier shifts, a feature migrates up a plan, an annual discount appears for one quarter and vanishes the next. By the time it surfaces in a sales call, you're already losing the deal.",
      "Webwhen reads the page semantically. It knows the difference between a layout refresh and a real number change, between a footnote and a new floor. You describe the page and the kind of move you care about; the agent does the rest.",
      "What you get back is a small, specific note: this changed, here's the before, here's the after, here's the link. No dashboards to learn, no diff feeds to wade through.",
    ],
    seoTitle: "Competitor pricing watches — webwhen",
    seoDescription: "webwhen reads competitor pricing pages and tells you when something real moved — not when the CSS did.",
    relatedUseCases: ['steam-game-price-alerts', 'crypto-exchange-listing-alert'],
  },
  'crypto-exchange-listing-alert': {
    slug: 'crypto-exchange-listing-alert',
    name: 'Crypto listing watches',
    shortTag: 'launches · crypto',
    composerPrompt: "Tell me when Coinbase lists $TOKEN.",
    heroHeadline: "Hear about a listing on launch day — not three days into the rally.",
    heroLede: "Exchange announcements bury launch dates in PR. webwhen reads them, corroborates with on-chain signals, and tells you when the listing actually goes live.",
    openingQuote: "Listings get announced once. The agent reads everything so you don't have to refresh anything.",
    body: [
      "A listing is a single moment, surrounded by a week of rumour. Twitter has it half-right, the official blog buries the date in the third paragraph, and the trading pair appears before the announcement does.",
      "Webwhen watches the announcement page, the official blog, and the trading-pair feed at the same time. It corroborates, it waits for the signal that's actually load-bearing, and only then does it speak.",
      "The note arrives the way a friend would send it: the token, the exchange, the link, and nothing else. You decide what to do next. The agent has already moved on to the next watch.",
    ],
    seoTitle: "Crypto listing watches — webwhen",
    seoDescription: "webwhen reads exchange announcements and on-chain signals and tells you when a listing actually goes live.",
    relatedUseCases: ['steam-game-price-alerts', 'competitor-price-change-monitor'],
  },
};
