# CSP audit checklist

Read this before changing `nginx.conf`'s `Content-Security-Policy` directive — adding allowlist entries, removing them, or flipping any directive between report-only and enforce. Skipping it has cost us two production CAPTCHA outages (#260 worker-src, #286 challenges.cloudflare.com).

The directive is allowlist-based. Every external origin loaded by a script, iframe, fetch, image, font, or worker has to be named explicitly in the right directive or the browser silently blocks it and the user sees a broken UI with no server-side error to triage.

## How CSP fails in production

CSP failures are silent. There is no 5xx, no Sentry alert, no agent log. The user just sees a stuck spinner or a blank section. That is the whole reason this checklist exists — diagnosis happens after a real user reports the breakage, hours or days late. The cost of a 30-second pre-deploy check is much smaller than a P0 incident.

## Third-party origin inventory

Every SaaS dependency loads more than its primary domain. The miss is always "I added the SaaS's main domain, but it loads telemetry/CAPTCHA/workers from a sibling origin I didn't realise existed." When adding or modifying a dependency, walk through every one of these.

### Clerk

- `*.clerk.accounts.dev`, `*.clerk.com` — primary auth flows, JS SDK, OAuth handoff
- `clerk.webwhen.ai` (and during cutover windows, `clerk.torale.ai`) — Clerk Frontend API on our subdomain
- `api.clerk.com` — server-side calls from the SDK
- `challenges.cloudflare.com` — Cloudflare Turnstile, used by Clerk Bot Protection on signup. **Required in both `script-src` and `frame-src`** (widget loads as a script and renders inside an iframe). Per Clerk's own docs, `connect-src` should also include this for telemetry; we currently only list it in `script-src` and `frame-src`. Add to `connect-src` if signup validation flakes.
- Web Worker origin — `worker-src 'self' blob:` is required for Clerk's session worker. `'self'` alone is not enough; the worker is loaded from a `blob:` URL.

### PostHog

- `eu.posthog.com`, `eu.i.posthog.com`, `eu-assets.i.posthog.com` — JS SDK, events ingest, asset CDN. All three regions (or the US equivalents) need entries in `script-src` (SDK) and `connect-src` (events ingest). EU vs US is a deployment decision — match the project's PostHog region.

### Cloudflare

- `static.cloudflareinsights.com` — Cloudflare Web Analytics beacon, loaded automatically when proxied through the orange cloud. `script-src` only.

### Our own services

- `*.torale.ai`, `*.webwhen.ai` — backend API, image CDN, custom Clerk subdomain. `img-src` + `connect-src` minimum; `script-src` + `frame-src` for the Clerk subdomain specifically.

## Pre-deploy smoke flows

A passing build does not mean CSP is right. The page renders fine until the first cross-origin asset is requested at runtime. Walk through each user-facing flow that touches a third party:

1. **Signup with CAPTCHA** — open `/sign-up` in a private window, fill in an email, hit submit, and watch the Turnstile widget render and verify. A blocked Turnstile shows as a stuck spinner with no server error. Check the browser console for `Refused to load … because it violates the following Content Security Policy directive`.
2. **Sign-in with OAuth** — if any OAuth provider is configured, run a sign-in with Google/GitHub/etc. The provider's own popup origin needs to be in `frame-src` (and sometimes `connect-src`).
3. **Authenticated session** — sign in, refresh, confirm the session persists. Clerk's Web Worker registering from a blob URL was the cause of #260; if `worker-src` regresses, sessions silently expire on every reload.
4. **PostHog telemetry** — open the dashboard, watch the network tab for a successful POST to `eu.i.posthog.com`. A blocked event shows up as an unsent request, never as a server error.
5. **Image and asset loads** — confirm the brand mark, OG images, and any user-uploaded content render.

A `curl -sSI https://webwhen.ai/ | grep -i content-security-policy` confirms the header reaches the edge but says nothing about whether the directives are correct. Only the browser flow checks coverage.

## Staged rollouts

When introducing a new directive (or a structurally different one):

1. Ship it as `Content-Security-Policy-Report-Only` first, with a report endpoint, and let real traffic exercise it for a week.
2. Read the reports. Real users hit flows nobody on the team thinks about, and unfamiliar third-party origins (browser extensions, A/B testing tools, embedded payment widgets) show up here that no inventory will predict.
3. Promote to enforce only after the report stream goes quiet.

Same protocol for HSTS — start with a short `max-age`, increase after confidence. We are already at the long max-age, so this only matters if we change the policy.

## When this checklist is not enough

It is not. The two production misses (#260 worker-src, #286 challenges.cloudflare.com) were both with documented Clerk dependencies that were missed because the audit was scoped to "Clerk's own primary domains" instead of "every origin Clerk loads at runtime." The mitigation is a Report-Only soak. If you cannot run one — small change, post-cutover hotfix, etc. — then read this file end to end before merging, and at minimum run smoke flow #1 against the deployed change in a private window before declaring it done.
