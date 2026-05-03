import type { Components } from 'react-markdown';

/**
 * Strict markdown allowlist for surfaces rendering agent output (currently
 * just the Explore moment feed; MomentBlock has its own co-located map).
 * Matches the design-system rule from `design/webwhen/README.md` →
 * "Content rendering / Constrained markdown for agent or user-supplied
 * prose":
 *  - p / strong / em / ul / ol / li render at body scale (Explore CSS in
 *    `explore/Explore.module.css` styles these via `.entryBody p`, `.entryBody ul`,
 *    `.entryBody strong`, etc — so we don't need per-tag classNames here).
 *  - h1-h6 collapse to a paragraph (no markdown at title scale).
 *  - code / pre lose mono formatting; pre collapses to a paragraph.
 *  - img is stripped.
 *  - a renders inert text — Explore entries carry a dedicated sources cluster
 *    underneath, so inline links would compete.
 *
 * Phase-7 design-system codification (#246 commit `58a2b31`) named Explore as
 * a target for this allowlist; #247 caught the wiring gap during pre-cutover
 * smoke and this commit closes it.
 */
export const markdownCompact: Components = {
  p: ({ children }) => <p>{children}</p>,
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul>{children}</ul>,
  ol: ({ children }) => <ol>{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  h1: ({ children }) => <p>{children}</p>,
  h2: ({ children }) => <p>{children}</p>,
  h3: ({ children }) => <p>{children}</p>,
  h4: ({ children }) => <p>{children}</p>,
  h5: ({ children }) => <p>{children}</p>,
  h6: ({ children }) => <p>{children}</p>,
  code: ({ children }) => <span>{children}</span>,
  pre: ({ children }) => <p>{children}</p>,
  img: () => null,
  a: ({ children }) => <span>{children}</span>,
};

/** Full markdown styling for detailed content (standard spacing + headings). */
export const markdownFull: Components = {
  p: ({ children }) => <p className="mb-3 leading-relaxed text-zinc-900">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
  li: ({ children }) => <li className="text-sm leading-relaxed text-zinc-700">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-zinc-900">{children}</strong>,
  h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 text-zinc-900">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 text-zinc-900">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-2 text-zinc-900">{children}</h3>,
};
