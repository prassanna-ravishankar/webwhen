import { Helmet } from 'react-helmet-async';

/**
 * Self-canonical origin: emit URLs that match the document's own origin so
 * pages served from webwhen.ai declare webwhen.ai canonical, and pages served
 * from torale.ai declare torale.ai canonical. Replaces a hardcoded
 * `https://torale.ai` literal that polluted webwhen.ai pages with torale.ai
 * canonical/og:url after react-helmet hydration. Found via the soak smoke;
 * see #246.
 *
 * During prerender (`scripts/prerender.mjs` running headless against
 * `http://localhost:4567`), `window.location.origin` is the local server,
 * not the production domain. Skip the URL-shaped tags during prerender so
 * the static `<head>` in `index.html` (already correctly webwhen.ai-shaped)
 * survives into the baked HTML. At real runtime hydration on production,
 * react-helmet adds the runtime tags with the correct origin.
 */
const isPrerender =
  typeof window !== 'undefined' && (window as unknown as { __PRERENDER__?: boolean }).__PRERENDER__;

function getOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  if (isPrerender) return null;
  return window.location.origin;
}

const FALLBACK_IMAGE = '/og-image.webp';

interface DynamicMetaProps {
  /**
   * Path from site root (e.g. "/compare/visualping-alternative"). Used to
   * build canonical, og:url and twitter:url at runtime against the document
   * origin. Provide this for every public page; `url` is the escape hatch
   * for explicit non-self canonicals (rare).
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
  const resolvedUrl = url ?? (origin ? `${origin}${path ?? '/'}` : null);
  const resolvedImage = image ?? (origin ? `${origin}${FALLBACK_IMAGE}` : null);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />

      <meta property="og:type" content={type} />
      {resolvedUrl && <meta property="og:url" content={resolvedUrl} />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {resolvedImage && <meta property="og:image" content={resolvedImage} />}

      <meta name="twitter:card" content="summary_large_image" />
      {resolvedUrl && <meta name="twitter:url" content={resolvedUrl} />}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {resolvedImage && <meta name="twitter:image" content={resolvedImage} />}

      {resolvedUrl && <link rel="canonical" href={resolvedUrl} />}
    </Helmet>
  );
}
