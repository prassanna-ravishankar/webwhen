import { ChangelogEntry } from "@/types/changelog";

const FALLBACK_ORIGIN = "https://webwhen.ai";

/**
 * Resolve the origin used in JSON-LD URL fields. At runtime in the browser we
 * use the document origin so torale.ai-served pages self-reference correctly
 * during any future domain transition. At prerender time `window.location` is
 * the local headless server, so `scripts/prerender.mjs` injects
 * `__PRERENDER_ORIGIN__` with the production origin to bake into static HTML.
 * SSR / non-window contexts fall back to webwhen.ai.
 */
function getOrigin(): string {
  if (typeof window === "undefined") return FALLBACK_ORIGIN;
  const w = window as unknown as {
    __PRERENDER_ORIGIN__?: string;
    __PRERENDER__?: boolean;
  };
  if (w.__PRERENDER__ && w.__PRERENDER_ORIGIN__) return w.__PRERENDER_ORIGIN__;
  return window.location.origin || FALLBACK_ORIGIN;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export function generateFAQStructuredData(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function generateChangelogStructuredData(entries: ChangelogEntry[]) {
  const origin = getOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "webwhen Changelog",
    "description": "Product updates and releases for webwhen, the AI agent that watches the open web and tells you when something matters.",
    "url": `${origin}/changelog`,
    "publisher": {
      "@type": "Organization",
      "name": "webwhen",
      "url": origin,
      "logo": {
        "@type": "ImageObject",
        "url": `${origin}/brand/webwhen-mark.svg`,
        "width": 512,
        "height": 512
      },
      "sameAs": [
        "https://github.com/prassanna-ravishankar/torale"
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": entries.length,
      "itemListElement": entries.slice(0, 50).map((entry, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "item": {
          "@type": "TechArticle",
          "headline": entry.title,
          "datePublished": entry.date,
          "dateModified": entry.date,
          "articleSection": entry.category,
          "description": entry.description,
          "author": {
            "@type": "Organization",
            "name": "webwhen"
          },
          "publisher": {
            "@type": "Organization",
            "name": "webwhen"
          }
        }
      }))
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": origin
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Changelog",
          "item": `${origin}/changelog`
        }
      ]
    }
  };
}
