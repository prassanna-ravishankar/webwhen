# CLAUDE.md - Torale Project Context

## Identity

Torale is a **grounded monitoring platform**. Users create tasks that watch for conditions using an LLM agent with web search and browser tools, then get notified when conditions are met. Think "alert me when the iPhone release date is announced."

**Scale**: Early-stage, small user base. This doc assumes single-developer velocity. Revisit if team or user scale increases significantly.

**Domain**: webwhen.ai (prod), staging.webwhen.ai (staging). The legacy `torale.ai` / `staging.torale.ai` hostnames 301-redirect for legacy clients.

**Memory**: `.claude/memory/` stores project context (design decisions, gotchas, legacy data notes) that doesn't belong in git commit history -- read it, keep it current, commit it with your changes.

**Rebrand in flight**: Torale is being rebranded to **webwhen.ai** on the `feat/webwhen-rebrand` branch. The canonical brand + UI system lives at `design/webwhen/` — see the [Design system](#design-system) section below. Existing `torale` strings, file paths, and aesthetic patterns will gradually disappear; don't reproduce them in new work.

## Codebase

**Stack**: Python FastAPI + React/TypeScript + GKE + APScheduler + Clerk Auth + Gemini (with tools: Perplexity, Parallel web systems, browser, MCP)

**Three services**:
- `backend/` — FastAPI + APScheduler. Entry: `backend/src/torale/api/main.py`
- `torale-agent/` — Pydantic AI monitoring agent (A2A server). Entry: `torale-agent/server.py`
- `frontend/` — React + Vite. Entry: `frontend/src/main.tsx`

Plus `helm/` (k8s charts), `docs-site/` (VitePress), `.github/workflows/` (CI).

**Architecture**: Frontend → FastAPI → APScheduler (cron) → Agent (Gemini + tools) → Notifications (Novu, webhooks)

**Tooling**: `uv` (backend), `npm` (frontend), `vite` (docs-site), `justfile` for commands:
- `just dev-noauth` — local dev without auth
- `just test` — run tests
- `just lint` — lint backend + frontend + TypeScript

For cross-cutting questions ("what touches X?", "where does data flow?"), use graphify. See `docs-site/architecture/` for human docs.

## Development Flow

**CI handles everything**: Build, test, deploy. Push to branch triggers checks, merge to main deploys to prod.

**Common workflow**:
1. Create branch
2. Build and iterate locally (`just dev-noauth`)
3. **Always run `just lint` before committing** - catches errors CI will catch
4. Push, let CI build
5. Gemini reviews PR automatically - address feedback
6. Merge when green

**Workflows**: `.github/workflows/` - `backend-pr.yml` + `frontend-pr.yml` (checks), `production.yml` (prod), `staging.yml` (staging)

## Design Principles

### Guiding Laws
- **Tesler's Law**: Complexity is conserved—move it into components, out of usage sites
- **Jakob's Law**: Developers expect familiar patterns. Boring beats brilliant.
- **Occam's Razor**: Simplest pattern that solves the problem wins

### From Software Engineering
- **"Make the change easy, then make the easy change"** (Kent Beck)
- **Principle of Least Astonishment**: Code should do what it looks like it does
- **Third time, extract**: Abstract after repetition, not before

### Application
- Absorb complexity into components, export simple interfaces
- Prefer composition over inheritance
- Design clean interfaces that support future extensions without current complexity

## Design system

The canonical brand + UI system for **webwhen** (rebrand in flight from Torale) lives at `design/webwhen/`. This was exported from Claude Design as a handoff bundle. **Read it before building or styling anything.**

- @design/webwhen/README.md — brand voice, vocabulary, visual foundations, anti-patterns. **Read top to bottom; treat as canonical.**
- @design/webwhen/colors_and_type.css — token surface (CSS vars + semantic classes). The single source of truth for colour, type, spacing, shadows, motion, radii.
- @design/webwhen/motion.css — motion tokens + the hourglass mark animation states.
- `design/webwhen/assets/` — `webwhen-mark.svg`, `webwhen-wordmark.svg`, `webwhen-mark-mono.svg`, `webwhen-mark-favicon.svg`. Plus `legacy-*` Torale artefacts kept for reference only (do not use).
- `design/webwhen/ui_kits/marketing/` and `design/webwhen/ui_kits/app/` — HTML/CSS/JSX prototypes. **These are design artefacts, not production code.** Recreate the *visual output* in our React + Vite + Tailwind stack; don't port the prototype structure wholesale. Don't render them in a browser unless asked — read source directly.
- `design/webwhen/preview/` — specimen cards (colour ramps, type, components). Visual reference only.

**Styling paradigm — direction**: rebrand-era components use **CSS Modules** (`*.module.css`) co-located with the component. Tokens still come from `--ww-*` CSS vars (defined globally in `frontend/src/index.css`) and Tailwind utilities for trivial layout. First instance: `frontend/src/components/landing/Landing.module.css`. End state: app-shell + dashboard surfaces will follow the same pattern as they get redesigned. Existing Tailwind-utility code stays in place until its surface is rebuilt.

**Deprecated** (do not build against, even if you find them in the codebase):
- The old "neo-brutalist Machine" system: `border-2`, `shadow-[4px_4px_0px_0px_*]`, `brand-orange` (`hsl(10, 90%, 55%)`), `font-grotesk` headings, brutalist offset shadows generally, 2px borders, "Deploy Monitor"/"Initialize"/"Terminate" copy.
- Vocabulary: "monitor" (noun) → use **"watch"**. "alert" → use **"trigger"** or **"the moment"**. "rule" → use **"condition"**. "data points/signals" → use **"evidence"**.
- Product name in flowing copy: lowercase `webwhen` (capital W only at sentence start). `.ai` lives in URLs only — never in the wordmark or mid-sentence.
- Migration is in progress on this branch (`feat/webwhen-rebrand`). Legacy patterns and `torale` strings will gradually disappear.

Workflow:
- `.claude/skills/tmux-playwright-dev/` — live UI dev workflow with tmux + Playwright.

## Critical Patterns

### Frontend Auth (common mistake)
```typescript
// WRONG - Breaks in local dev (VITE_WEBWHEN_NOAUTH=1)
import { useUser } from '@clerk/clerk-react'

// CORRECT - Works in both prod and local dev
import { useAuth } from '@/contexts/AuthContext'
const { user } = useAuth()
```

### Conventional Commits
```
feat: add new feature
fix: bug fix
docs: documentation
refactor: code change that neither fixes nor adds
```

### Agent-Backend Schema Contract
`MonitoringResponse` model is duplicated between `torale-agent/models.py` and `backend/src/torale/scheduler/models.py`. Keep them in sync manually when changing fields. Backend validates agent responses via Pydantic at runtime.

### Changelog Management

**Source of Truth**: `backend/static/changelog.json`

This file is:
- Served by backend as static file at `/static/changelog.json`
- Used by backend to generate RSS feed at `/changelog.xml`
- Fetched by frontend and displayed on `/changelog` page

**To update changelog**:
1. Edit `backend/static/changelog.json`
2. Commit
3. Deploy - all three endpoints update automatically:
   - https://api.webwhen.ai/static/changelog.json (JSON)
   - https://webwhen.ai/changelog.xml (RSS)
   - https://webwhen.ai/changelog (Frontend UI)

**Architecture**: Backend owns the data, frontend consumes it via fetch at runtime.

## Quick Pointers

| What | Where |
|------|-------|
| Agent service | `torale-agent/server.py` (A2A server entry); `torale-agent/agent.py` builds the Pydantic AI agent |
| Agent run | `just dev-noauth` (included in docker compose) or `cd torale-agent && uv run uvicorn server:app --host 0.0.0.0 --port 8001` |
| Agent call | `curl -X POST http://localhost:8001/ -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":"1","method":"message/send","params":{"message":{"kind":"message","messageId":"msg-001","role":"user","parts":[{"kind":"text","text":"YOUR PROMPT"}]}}}'` |
| Agent poll | `curl -X POST http://localhost:8001/ -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":"2","method":"tasks/get","params":{"id":"TASK_ID"}}'` |
| API endpoints | `backend/src/torale/api/routers/` |
| Migrations | `backend/alembic/versions/` |
| UI components | `frontend/src/components/torale/` |
| Changelog | `backend/static/changelog.json` (backend serves, frontend fetches) |
| Architecture | `docs-site/architecture/` |

## Commits

Use conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, etc.) with one-line messages.

## Issue Tracking

Issues live in **GitHub Issues** on `prassanna-ravishankar/webwhen`, organized via [Project #1 (webwhen)](https://github.com/users/prassanna-ravishankar/projects/1).

- Use `gh issue` / `gh project` for all task tracking
- Milestones group themed work (e.g. `Custom Connectors (Composio)`, `SEO`)
- Labels: `P0`–`P4` for priority, `type:bug|task|feature` for type
- Standalone bugs/chores don't need a milestone
