---
name: compatibility-retirement
description: Torale rebrand shims (imports, TORALE_* env, ~/.torale config) were retired in Nov 2026; do not reintroduce
type: project
---

# Compatibility retirement

The `torale`/`torale.sdk` import shims, `Torale*` class aliases, `TORALE_*`
environment fallbacks and `~/.torale/config.json` fallback were removed on
2026-11-20 ([#364](https://github.com/prassanna-ravishankar/webwhen/issues/364)).

**Why it was safe:** nothing published ever carried the shims. PyPI `torale`
0.0.2 (Nov 2025) predates the rename, and `webwhen` had not been published, so
only git-source installs could have used them.

**How to apply:** SDK code, docs and deployment config use only `webwhen`,
`WEBWHEN_*` and `~/.webwhen`. Internal infra names (k8s namespace, `torale-agent`
service dir, DB name, Novu workflow ids, the OpenClaw skill's `TORALE_API_KEY`)
are separate and were deliberately left alone.
