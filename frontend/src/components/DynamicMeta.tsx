import { Helmet } from 'react-helmet-async';
import { getOrigin } from '@/utils/origin';

/**
 * Self-canonical origin: emit URLs that match the document's own origin so
 * pages served from webwhen.ai declare webwhen.ai canonical (#246). Uses the
 * shared `getOrigin()` helper, which reads `window.__PRERENDER_ORIGIN__`
 * during prerender (defaults to https://webwhen.ai, overridden via the
 * PRERENDER_ORIGIN env for staging/preview builds). Without this prerender
 * fallback, JS-less crawlers (Bing, Yandex, social card scrapers) saw the
 * baked HTML with no canonical at all. See #294.
 */

const FALLBACK_IMAGE = '/og-image.webp';

interface DynamicMetaProps {
  /**
   * Path from site root (e.g. "/compare/visualping-alternative"). Used to
   * build canonical, og:url and twitter:url against the resolved origin.
   * Provide this for every public page; `url` is the escape hatch for
   * explicit non-self canonicals (rare).
   */
  path?: string;
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
}

export function DynamicMeta({
  path,
  url,
  title = 'webwhen — the agent that waits for the web',
  description = 'Tell webwhen what to watch for in plain English. It will sit with the question, search the web on a schedule, and tell you the moment your condition is met.',
  image,
  type = 'website',
}: DynamicMetaProps) {
  const origin = getOrigin();
  const resolvedUrl = url ?? `${origin}${path ?? '/'}`;
  const resolvedImage = image ?? `${origin}${FALLBACK_IMAGE}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={resolvedUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={resolvedImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={resolvedUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />

      <link rel="canonical" href={resolvedUrl} />
    </Helmet>
  );
}
