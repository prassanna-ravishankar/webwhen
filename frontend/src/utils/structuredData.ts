import { ChangelogEntry } from "@/types/changelog";

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
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "webwhen Changelog",
    "description": "Product updates and releases for webwhen — the AI agent that watches the open web and tells you when something matters.",
    "url": "https://webwhen.ai/changelog",
    "publisher": {
      "@type": "Organization",
      "name": "webwhen",
      "url": "https://webwhen.ai",
      "logo": {
        "@type": "ImageObject",
        "url": "https://webwhen.ai/brand/webwhen-mark.svg",
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
          "item": "https://webwhen.ai"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Changelog",
          "item": "https://webwhen.ai/changelog"
        }
      ]
    }
  };
}
