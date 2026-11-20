---
name: lb-rollout-503
description: Google LB 503s on rollouts and idle keep-alive; how they were fixed for frontend/docs (#381) and why the api is still open (#382)
type: project
---

# Load balancer 503s

GKE Gateway (Google L7 LB, Envoy) returns `upstream connect error or disconnect/reset before headers` 503s in two cases:

- **Rollouts**: the old pod dies or the new pod is not yet LB-healthy while the Gateway still routes to it. Fixed for frontend + docs in #381 with `preStop` sleep 15, `minReadySeconds: 15` (outlasts the 2 x 5s HealthCheckPolicy) and a `GCPBackendPolicy` with `connectionDraining.drainingTimeoutSec: 10`. Staging rollout: 29 x 503 before, 1 in 5,737 after.
- **Idle keep-alive** (`connection termination`, any time): the LB keeps backend connections for 600s. Backends must outlive that: Next `KEEP_ALIVE_TIMEOUT=620000`, nginx `keepalive_timeout 620s`, uvicorn `--timeout-keep-alive 620`.

**Why the api is not covered:** the Cloud SQL proxy is a plain sidecar (it dies with the api), and the api runs APScheduler 3 on a shared jobstore with no execution claim, so a longer pod overlap risks duplicate runs. Tracked in #382.

**How to apply:** for any new service behind the Gateway, set the keep-alive and add the drain trio. Measure with parallel curl pollers during a staging rollout (deploy label + empty commit) and keep the 503 bodies; the `reset reason` names the cause.
