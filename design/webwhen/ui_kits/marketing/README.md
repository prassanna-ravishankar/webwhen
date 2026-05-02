# webwhen.ai — Marketing UI kit

Hi-fi recreation of the webwhen marketing site, built for the rebrand from Torale.

## Files

- `index.html` — full page composition. Open in a browser.
- `marketing.css` — kit-local styles. Builds on `../../colors_and_type.css`.
- `Nav.jsx` — `Brand`, `Nav`
- `Hero.jsx` — `Hero`, `HeroComposer`, `HeroLog`
- `Steps.jsx` — `Steps` (the 3-step "how it works" grid)
- `Cases.jsx` — `Cases` (use case cards)
- `Manifesto.jsx` — `Manifesto`, `CTA`, `Footer`

## Composition

The page is a direct rebrand of the legacy Torale landing (`frontend/src/components/Landing.tsx`) with three deliberate departures:

1. **Hero is editorial.** The h1 is Instrument Serif italic, not Space Grotesk bold. The line breaks are typeset by hand.
2. **No brutalist offset shadows anywhere.** Cards and CTAs use `--ww-shadow-sm/md`.
3. **One ember moment per section.** The cursor in the composer, the word "when" in the h1, the trigger event in the log, "for" in the closing CTA. That's it.

## What's omitted vs. legacy

The legacy Torale landing had a "compare" section (vs VisualPing/Distill/ChangeTower) and a pricing tile. Both are intentionally cut from this kit — the rebrand brief calls for a calmer, more confident page, and a feature-grid comparison reads as defensive. They can be reintroduced later as their own pages.
