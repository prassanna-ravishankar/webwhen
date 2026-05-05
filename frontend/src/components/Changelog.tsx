import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { DynamicMeta } from "@/components/DynamicMeta";
import { ChangelogEntry } from "@/types/changelog";
import { formatChangelogDate } from "@/utils/changelog";
import { generateChangelogStructuredData } from "@/utils/structuredData";
import { escapeForScriptTag } from "@/utils/jsonLd";
import { getOrigin } from "@/utils/origin";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import landingStyles from "@/components/landing/Landing.module.css";
import marketingStyles from "@/components/marketing/marketing.module.css";

const CATEGORY_LABELS: Record<ChangelogEntry["category"], string> = {
  feature: "new",
  improvement: "improvement",
  fix: "fix",
  infra: "infrastructure",
  research: "research",
};

// At prerender time `scripts/prerender.mjs` seeds the changelog fixture on
// `window` so the very first render emits the article-level JSON-LD into the
// baked HTML. Real users still get the runtime fetch below.
function readPrerenderEntries(): ChangelogEntry[] {
  if (typeof window === "undefined") return [];
  const seeded = (window as unknown as { __PRERENDER_CHANGELOG__?: ChangelogEntry[] })
    .__PRERENDER_CHANGELOG__;
  return Array.isArray(seeded) ? seeded : [];
}

export default function Changelog() {
  const rssHref = `${getOrigin()}/changelog.xml`;
  const seeded = readPrerenderEntries();
  const [entries, setEntries] = useState<ChangelogEntry[]>(seeded);
  const [structuredData, setStructuredData] = useState<string>(() =>
    seeded.length ? JSON.stringify(generateChangelogStructuredData(seeded)) : "",
  );
  const [loading, setLoading] = useState(seeded.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Runtime fetch refreshes the prerender-seeded entries with fresh data.
  // Crawlers read the baked JSON-LD from raw HTML pre-hydration; users see no
  // visible JSON-LD either way, so the brief window where DOM holds the
  // fixture-shape script tag before this resolves is benign. See #261.
  useEffect(() => {
    const fetchChangelog = async () => {
      try {
        const response = await fetch(`${api.getBaseUrl()}/static/changelog.json`);
        if (response.ok) {
          const data = await response.json();
          setEntries(data);
          const schema = generateChangelogStructuredData(data);
          setStructuredData(JSON.stringify(schema));
        } else {
          setError("Couldn't load the changelog right now.");
        }
      } catch (err) {
        console.error("Failed to fetch changelog:", err);
        setError("Couldn't load the changelog right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchChangelog();
  }, []);

  return (
    <MarketingLayout activePath="/changelog">
      <DynamicMeta
        path="/changelog"
        title="Changelog — webwhen"
        description="What webwhen has been up to. Built in the open."
      />
      <Helmet>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="webwhen changelog"
          href={rssHref}
        />
      </Helmet>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: escapeForScriptTag(structuredData),
          }}
        />
      )}

      <section
        className={cn(landingStyles.section, marketingStyles.articleHero)}
      >
        <div className={landingStyles.container}>
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <div className={marketingStyles.articleHeroEyebrow}>Changelog</div>
            <h1 className={marketingStyles.articleHeading}>
              What webwhen has been{" "}
              <span className={marketingStyles.articleHeroEmber}>up to</span>.
            </h1>
            <p className={marketingStyles.articleLede}>
              Built in the open. New since you last looked.
            </p>
          </div>
        </div>
      </section>

      <section className={landingStyles.section} style={{ paddingTop: 0 }}>
        <div className={landingStyles.container}>
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            {loading && (
              <p className={marketingStyles.stamp}>loading…</p>
            )}
            {error && !loading && (
              <p className={marketingStyles.stamp}>{error}</p>
            )}
            {!loading && !error && entries.length === 0 && (
              <p className={marketingStyles.stamp}>No entries yet.</p>
            )}

            <div className={marketingStyles.feed}>
              {entries.map((entry) => {
                const tagLabel = CATEGORY_LABELS[entry.category];
                const highlight = entry.category === "feature";
                const formattedDate = formatChangelogDate(entry.date, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <article
                    key={entry.id}
                    className={marketingStyles.feedEntry}
                  >
                    <div className={marketingStyles.feedEntryDate}>
                      {formattedDate}
                    </div>
                    <div className={marketingStyles.feedEntryBody}>
                      {tagLabel && (
                        <div
                          className={cn(
                            marketingStyles.feedEntryTag,
                            highlight && marketingStyles.feedEntryTagEmber
                          )}
                        >
                          {tagLabel}
                        </div>
                      )}
                      <h2>{entry.title}</h2>
                      {entry.description && <p>{entry.description}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
