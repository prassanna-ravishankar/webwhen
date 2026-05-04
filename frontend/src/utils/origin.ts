const FALLBACK_ORIGIN = "https://webwhen.ai";

/**
 * Resolve the origin used in baked URLs (JSON-LD, RSS alternate links, etc.).
 * Runtime in the browser uses the document origin so any future domain
 * transition self-references correctly. Prerender time uses
 * `window.__PRERENDER_ORIGIN__` injected by `scripts/prerender.mjs` because
 * `window.location` is the local headless server. SSR / non-window contexts
 * fall back to webwhen.ai. See #261 + #246.
 */
export function getOrigin(): string {
  if (typeof window === "undefined") return FALLBACK_ORIGIN;
  const w = window as unknown as {
    __PRERENDER_ORIGIN__?: string;
    __PRERENDER__?: boolean;
  };
  if (w.__PRERENDER__ && w.__PRERENDER_ORIGIN__) return w.__PRERENDER_ORIGIN__;
  return window.location.origin || FALLBACK_ORIGIN;
}
