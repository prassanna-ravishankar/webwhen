// Helpers shared between the build-time snapshot script and the runtime
// LandingExamplesContext. Source of truth for tool→verb paraphrasing,
// host extraction, and evidence trimming. Keeping these here avoids the
// drift risk gemini flagged when the same constants lived in both
// scripts/sync-landing-examples.mjs (Node) and the React context (TS).
//
// This file is .ts so the React side gets types; the Node build script
// loads it via the existing esbuild-backed loadTsModule() helper.

/** Editorial paraphrase of the agent's tool sequence. */
export const TOOL_TO_VERB: Record<string, string> = {
  search_memories: 'remembered',
  perplexity_search: 'searched',
  add_memory: 'noted',
  final_result: 'settled',
  fetch_url: 'read',
  google_search: 'searched',
  web_search: 'searched',
};

export function paraphraseTool(tool: string | undefined): string {
  return TOOL_TO_VERB[tool ?? ''] || 'checked';
}

/**
 * Extract the host from a source entry. Accepts either `{url, title}`
 * objects (the documented feed shape) or bare URL strings (defensive
 * shim per gemini's #uR catch — if the API ever flattens its sources
 * shape, callers don't break).
 */
export function hostOf(source: string | { url?: string } | null | undefined): string {
  if (!source) return '';
  const raw = typeof source === 'string' ? source : source.url;
  if (!raw) return '';
  try {
    return new URL(raw).host.replace(/^www\./, '');
  } catch {
    return raw;
  }
}

/**
 * Trim evidence to a single sentence inside a 220-char budget. Prefers a
 * sentence-terminator break; falls back to soft truncation at the last
 * space with an ellipsis. Matches the build-time and runtime shape so a
 * post-hydration refresh swaps in a string of comparable length.
 */
export function trimEvidence(text: string | null | undefined): string {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 220) return cleaned;
  const slice = cleaned.slice(0, 220);
  const lastTerm = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (lastTerm > 80) return slice.slice(0, lastTerm + 1);
  const lastSpace = slice.lastIndexOf(' ');
  return slice.slice(0, lastSpace > 0 ? lastSpace : 220) + '…';
}
