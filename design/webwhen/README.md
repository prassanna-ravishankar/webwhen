# webwhen Design System

> **webwhen.ai** — an AI agent that watches the web and tells you when something matters.

This is a brand + UI design system for **webwhen**, the rebrand of [Torale](https://torale.ai). Same product (AI-powered conditional web monitoring), sharper positioning. The new name foregrounds the *trigger* ("when") rather than the mechanism ("watch/poll").

---

## Brand position

**For** builders, operators, and curious people who don't want to keep refreshing tabs.

**The product is patient and watchful.** It runs quietly in the background and surfaces a single moment when your condition is met. The brand should feel that way too — calm, precise, confidence without hype.

**Reference points:** Linear, Vercel, Stripe (early), the Substack reading view.
**Anti-patterns to avoid:**
- "Monitoring tool" aesthetic — status pages, dashboards-first, uptime/SRE visual language
- AI-bro gradients, glowing orbs, "agent in motion" particle effects
- Heavy neo-brutalist offset shadows (the look the previous Torale brand leaned into)
- Pingdom/Zapier energy — busy dashboards with stat tiles everywhere

---

## Sources

- **Codebase**: `prassanna-ravishankar/torale` on GitHub (`main` branch)
  - `frontend/` — React 18 + Vite + Tailwind + shadcn/ui app (the previous Torale UI)
  - Reference files extracted: `tailwind.config.js`, `src/index.css`, `src/components/Logo.tsx`, `src/components/Landing.tsx`, `src/components/Dashboard.tsx`, `src/components/TaskCard.tsx`, `src/components/Header.tsx`
  - Self-hosted fonts (woff2) imported into `fonts/`
  - Legacy logos imported into `assets/legacy-*` for reference

The previous brand used **Space Grotesk + Inter + JetBrains Mono** with a single accent at `hsl(10, 90%, 55%)` (a saturated brand red) and **brutalist offset shadows**. The webwhen rebrand keeps the tri-font *idea* but swaps families and softens the visual system substantially.

---

## CONTENT FUNDAMENTALS

### Voice

**Calm, precise, confident.** webwhen never shouts. It doesn't say "BLAZING-FAST AI" or "10x your monitoring." It tells you, plainly, what it does and what just happened.

Think of the writing voice as a smart friend who's been watching something for you and is now leaning over to tell you the one thing you wanted to know. Not breathless. Not technical for its own sake.

### Tone rules

| Do | Don't |
|---|---|
| Short sentences. Two beats, then stop. | Run-on hype paragraphs. |
| Plain English. "Tell me when X happens." | "Leverage AI-powered intelligent monitoring." |
| Lowercase product name in flowing copy: *webwhen watches…* | "Webwhen" or "WEBWHEN" mid-sentence. |
| One idea per UI element. | Stacking three claims on one button. |
| Refer to the agent as "webwhen" or "the agent" — never "our AI" | "Our intelligent AI agent" |
| Use "you" — direct, second-person | "Users can configure their workflows…" |

### Casing

- **Product name**: lowercase `webwhen` everywhere except the start of a sentence. The TLD `.ai` belongs to the URL only — never in the logo lockup or as part of the brand mark.
- **Domain**: `webwhen.ai` is the URL. It does not appear in the wordmark/logo lockup.
- **Headlines**: sentence case. Never Title Case Marketing Headlines.
- **Buttons**: sentence case ("Start watching", "Create a watch"), never "START WATCHING".
- **Eyebrow labels** (the small mono labels above sections): UPPERCASE with wide tracking. This is the only place we shout.

### Pronouns

- **"You"** addresses the reader.
- **"webwhen"** does the watching. (Avoid "I" — webwhen is a tool, not a chat persona.)
- Avoid "we/us/our" except in legal copy and the about page.

### Emoji

**No.** Emoji in product copy reads as Slack-bro. The exception: a `·` or `→` or `—` is the closest webwhen gets to a flourish. Use Unicode punctuation deliberately.

### Specific examples

**Hero (good):**
> Tell webwhen what to watch for. \
> It will sit with the question and tell you when the answer arrives.

**Hero (bad):**
> 🚀 Supercharge your monitoring with AI! Get instant alerts the moment ANYTHING changes!

**Empty state (good):**
> Nothing yet. webwhen is watching.

**Empty state (bad):**
> Oops! Looks like you don't have any monitors yet. Let's create one!

**Notification (good):**
> The PS5 is back at Best Buy. \
> Confirmed 4 minutes ago.

**Notification (bad):**
> 🎉 ALERT! Your monitor "PS5 Stock" detected a CHANGE!

**Vocabulary**

| Use | Avoid |
|---|---|
| watch, watcher | monitor (noun), tracker, bot |
| trigger, the moment | alert, notification (overused) |
| condition | rule, criterion |
| evidence | data points, signals (cliché) |
| sit with, settle | run, execute, process (when describing the agent) |

---

## VISUAL FOUNDATIONS

### Color

**A near-monochrome system with one ember.** The page is warm off-white paper (`#FAFAF7`). Type is near-black (`#0B0B0C`). A single accent — **ember `#C9582A`** — appears at most once or twice per screen, marking the *moment* something matters: the indicator dot in the logo, the cursor, a triggered alert, the one word in a quote that carries weight.

The ember is deliberately not a saturated alert-red. It's terracotta — closer to dried clay than to a fire engine. It signals *something has settled into focus*, not *EMERGENCY*.

Semantic colors (success, warn, danger, info) are muted, paper-tone variants. They sit *inside* the editorial palette rather than fighting it.

See `colors_and_type.css` for the full token set.

#### Ember placement

The ember accent is reserved for *the one thing that matters at this moment*. Sanctioned uses:

- The indicator dot inside the wordmark mark
- The triggered StatusBadge on a Watch
- The "Default" pill on the user's primary email (the email that matters by default)
- An inline accent on a single key word inside a quote
- The cursor in the composer
- The left-border bar on a triggered MomentBlock

**Anti-pattern**: more than one ember per screen. If two things compete for "the moment that matters," one of them isn't. The Explore feed is the deliberate exception — every entry on the feed *is* a triggered moment, so each carries its own ember bar; that's the page's whole job.

### Typography

> **Italic restraint.** Italic for *named things in flowing copy* (watch titles, page-context titles in the topbar) and short accent flourishes. Upright for *sentences* (hero copy, body copy, display headings, composer inputs) **and the wordmark itself** — the mark + serif family already carry editorial voice; italic on top reads as ornament.
>
> **Worked examples**:
> - Hero "Get notified when it matters" → sentence → upright.
> - Watch title "summarize my notion activity" → named thing in flowing copy → italic.
> - Wordmark `webwhen` → upright (the rule's load-bearing exception).
> - Inline accent inside a quote ("the one word that *settles*") → flourish → italic.
> - Body paragraph or composer input → sentence → upright.

A three-family stack, used with restraint:

1. **Instrument Serif** — display only. One headline per screen, maximum. Upright by default; italic only for named things and short accents. Carries the editorial gravity.
2. **Instrument Sans** — everything else: headings, body, UI. Calm geometric sans, slightly softer than Inter. Weights 400/500/600.
3. **JetBrains Mono** — technical specimens: timestamps, code, conditions, eyebrow labels. Always smaller than the surrounding text.

**Never** use the serif for paragraphs of body copy. **Never** use mono for headings. The three faces have specific jobs.

Type scale is intentionally generous. Body is 16px with `line-height: 1.65`. Hero is 72px serif, upright.

### Spacing

A 4px base, but the system feels roomy because we *use the upper end*. Section padding is `--ww-space-24` (96px) or `--ww-space-32` (128px). Inside cards, padding is 24–32px. Don't crowd.

### Backgrounds

- **Default**: warm off-white `--ww-canvas` (`#FAFAF7`). Paper, not gray.
- **Cards**: pure white `--ww-paper` with a hairline border (1px, `--ww-ink-6`).
- **Footer / dark sections**: `--ww-ink-1` (`#1C1C1E`), used sparingly.
- **No gradients**, no full-bleed photos as decoration. The single decorative motif is a faint, optional dotted grid — same as Torale, but at half opacity (`0.18` not `0.4`).
- **No textures, no grain, no noise.**

### Imagery

- **Black-and-white or duotone** photography, when used. Cool tone. No warm-orange Instagram filters.
- **Editorial product screenshots** are framed in a thin browser chrome with no wallpaper behind them.
- We do not commission AI-generated illustration. Diagrams are line art at 1px stroke, in `--ww-ink-2`.

### Animation

- **Tone: settle, don't bounce.** Use `--ww-ease-out: cubic-bezier(0.22, 1, 0.36, 1)` — fast at the start, gently lands. No spring bounces.
- Standard duration is 220ms. Anything over 400ms feels languid; anything under 120ms feels nervous.
- Allowed: opacity fades, 4–8px translate-Y reveals, hairline drawing animations, the ember dot pulse (6s loop, low-amplitude).
- Forbidden: parallax, scroll-driven 3D, particle systems, "magic UI" sparkles, anything that says "AI-powered" visually.

### Hover & press states

- **Hover**: text darkens one step (`ink-3` → `ink-1`). Borders darken from `ink-6` → `ink-5`. Cards lift only via shadow change `--ww-shadow-sm` → `--ww-shadow-md`. **No translate-up.**
- **Press**: subtle inset, no shrink. Buttons get `transform: translateY(1px)` and lose their shadow. That's it.
- **Focus**: 3px soft ember ring (`--ww-shadow-focus`). Never blue browser default.

### Borders

- **Hairlines everywhere**: 1px, `--ww-ink-6`. We do not use 2px borders. The previous Torale brand's thick zinc-900 borders are explicitly deprecated.
- Where extra emphasis is needed, use a darker border (`--ww-ink-2`) at 1px — not a thicker one.

### Shadows

Two layers, both soft and low-contrast. **No offset shadows. No brutalist `4px 4px 0px 0px black`.**
- `--ww-shadow-sm` for resting cards
- `--ww-shadow-md` for hover/elevated states
- `--ww-shadow-lg` for modals and floating panels only
- `--ww-shadow-focus` is the only colored shadow, and it's reserved for focus rings

### Corner radii

- Inputs, buttons: `--ww-radius-sm` (6px)
- Cards, panels: `--ww-radius-md` (10px)
- Modals: `--ww-radius-lg` (14px)
- Pills and indicators: `--ww-radius-pill`
- We never use `--ww-radius-xl` (20px) on cards — it reads consumer / iOS-app, which we are not.

### Transparency & blur

Used in two places only:
1. Sticky nav: `backdrop-filter: blur(12px)` over the page background at 80% alpha. So content scrolls under, faintly visible.
2. Modal scrim: 60% black, no blur. We don't need both.

### Layout rules

- Max content width: 1200px (marketing) / 1280px (app).
- Reading column: 640–720px — for body paragraphs and editorial-flow surfaces (Watch detail, Settings, Explore feed, marketing article hero).
- 12-column grid with 24px gutters; we use it loosely.
- Sections are separated by **whitespace, not dividers**. A 1px hairline appears only where structure genuinely needs it (nav, footer, table rows).

#### Marketing Nav on mobile (`<768px`)

- Wordmark on the left.
- Single primary CTA on the right (`Start watching` for unauth, `Dashboard` for auth).
- The three in-page anchor links (How it works / Use cases / Approach) are hidden via `display: none`. Three scroll-anchors do not justify a hamburger drawer; users scroll past them anyway on mobile.
- The secondary auth action (`Sign in`) is hidden too. New visitors sign up; returning users deep-link from email/bookmark/search. The signed-in deep-link path is canonical.
- The remaining CTA gets nav proportions on mobile (`padding: 7px 12px; font-size: 13px; white-space: nowrap`), not hero-CTA proportions. Reusing hero proportions in a nav context crowds the row.

#### App Topbar on mobile (`<768px`)

- Stack vertically: hamburger + intermediate crumbs (small mono path) on row 1; italic-serif current page title on row 2; actions cluster wraps to row 3 right-aligned when present.
- Topbar grows from desktop's fixed 56px to ~80–130px on mobile depending on actions. Sticky positioning preserved.
- The italic-serif page title (`.crumbHere`) drops `white-space: nowrap` on mobile so long watch questions wrap to two lines instead of being truncated.
- Desktop (`≥768px`) layout is a single horizontal row, untouched.

#### Auth cluster pattern

When a context shows both a primary action (Sign up / Dashboard / Save / Continue) and a secondary action (Sign in / Cancel / Back), the *secondary* hides on mobile. The primary always survives. This applies to marketing surfaces; in-app modals are dense enough to keep both at smaller proportions.

#### CTA proportions

Hero CTAs on the page body (`.btn .btnLg`) carry hero proportions — generous padding, larger font, designed to be the page's center of gravity. **Nav CTAs do not.** A nav button reuses the same `.btn` shell at default proportions on desktop, and tightens further on mobile. Crowding a nav row with a hero-sized CTA is a recurring mobile anti-pattern.

### Cards

Cards are **paper on paper**: white surface on canvas, 1px hairline border, soft shadow. Internal padding 24–32px. They never have colored left borders or accent stripes.

---

## CONTENT RENDERING

### Constrained markdown for agent or user-supplied prose

Surfaces that render text from outside the editorial system (live agent output, historical executions, user-supplied content) pass that text through `react-markdown` with `rehypeSanitize` and a constrained components map. The map is the design contract — not the markdown library.

**Allowed at body scale**:
- `p`, `strong`, `em`, `ul`, `ol`, `li`

**Not allowed (collapsed or stripped)**:
- `h1`–`h6` collapse to `<p>` (no title-scale formatting from upstream content; the surrounding UI owns the title).
- `code`, `pre` strip to plain text (no monospace inline-code register inside editorial bodies).
- `img` strips entirely.
- `a` renders link text as `<span>` (inert) on surfaces that already carry a dedicated sources or citations cluster — the inline link would compete.

**Why**: the editorial register is the design system's job; markdown comes from elsewhere and can't dictate it. Constraining at the renderer is more reliable than asking every upstream producer to behave.

**Where this applies**:
- Watch detail `MomentBlock` body (the canonical implementation: `frontend/src/components/watch/MomentBlock.tsx` + `momentMarkdown` components map)
- Future surfaces rendering agent output: Explore feed entries, email digests, notification body previews

A new prompt (e.g. enforcing prose-only output) is *not* sufficient on its own; historical content already in the database keeps rendering forever. Constraining at render time covers both populations.

---

## ICONOGRAPHY

webwhen uses **Lucide** (https://lucide.dev) — same library Torale used (`lucide-react`). Lucide is calm, line-only, 1.5px stroke at 24px nominal. Its visual language matches our editorial tone: no fills, no decoration.

**Rules:**
- Icons are **always line, never filled**.
- Stroke weight: 1.5px at 16/20/24px.
- Color: inherit `currentColor` so they match the surrounding text. Default is `--ww-ink-3`. Hover: `--ww-ink-1`.
- Icons sit at 16×16 next to body text, 20×20 in nav, 24×24 in standalone cards.
- **Never** wrap icons in a colored circular badge with a different fill — that's the SaaS-marketing-page tic we're avoiding.

**The exception**: the webwhen mark itself uses a small filled ember dot. That dot is the ONE filled icon-like shape in the system. Its scarcity is the point.

**Loading from CDN** (preferred for static HTML mocks):
```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
<script>lucide.createIcons();</script>
```

**Emoji**: never used in UI. Never used in marketing copy. The legacy Torale codebase used `✓` checkmarks in some lists — replace those with a Lucide `Check` at 14px, `--ww-success`.

**Unicode glyphs we *do* use**:
- `→` for "next" / "learn more" affordances
- `·` as a separator in metadata strings (`Live · 4m ago`)
- `—` (em-dash) in editorial copy
- `…` for truncation

---

## Index — what's in this folder

| Path | What |
|---|---|
| `README.md` | This file. |
| `SKILL.md` | Agent-Skill descriptor for downloading + reuse. |
| `colors_and_type.css` | Canonical token surface. CSS vars + semantic classes. |
| `fonts/` | Self-hosted woff2s (Inter, JetBrains Mono, Space Grotesk legacy). |
| `assets/` | Logos, marks, legacy reference imagery. |
| `assets/webwhen-mark.svg` | New aperture mark. |
| `assets/webwhen-wordmark.svg` | Mark + wordmark. |
| `assets/webwhen-mark-mono.svg` | Single-color version (currentColor). |
| `assets/legacy-*` | Previous Torale brand artefacts (kept for reference, not for use). |
| `preview/` | Design-system specimen cards. |
| `ui_kits/marketing/` | UI kit: webwhen.ai marketing site. |
| `ui_kits/app/` | UI kit: the watching app (dashboard, watches, alerts). |

