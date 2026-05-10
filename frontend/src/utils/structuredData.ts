import { ChangelogEntry } from "@/types/changelog";
import { getOrigin } from "@/utils/origin";

export interface FAQItem {
  question: string;
  answer: string;
}

export function generateOrganizationStructuredData() {
  const origin = getOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "webwhen",
    "url": origin,
    "logo": `${origin}/brand/webwhen-mark.svg`,
    "description":
      "The agent that waits for the web. Tell webwhen what to watch for in plain English; it sits with the question and tells you the moment your condition is met.",
    "foundingDate": "2025",
  };
}

/**
 * One step in a breadcrumb trail. `path` is a site-root path
 * (e.g. "/compare/visualping-alternative") — the helper resolves it to a
 * full URL using the prerender-time origin via getOrigin().
 *
 * Keep the trail in nav-hierarchy order, leaf last. Last item's path can be
 * the page itself (Google accepts that and treats it as the current page).
 */
export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function generateBreadcrumbStructuredData(items: BreadcrumbItem[]) {
  const origin = getOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: `${origin}${item.path}`,
    })),
  };
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
        "https://github.com/prassanna-ravishankar/webwhen"
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
