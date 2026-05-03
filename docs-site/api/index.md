---
description: webwhen REST API reference. HTTP endpoints, authentication, request and response formats, and usage patterns.
---

# REST API Reference

Direct HTTP API access for the webwhen platform.

::: tip Naming during the transition
The API host is still `api.torale.ai` and watches are still addressed as `tasks` in URLs (`/api/v1/tasks`). The rename to `webwhen` is a later phase — endpoint paths below reflect the current shipping API.
:::

## Getting started

**[API Overview](./overview)** — base URLs, authentication methods, and the full endpoint listing.

**[Authentication](./authentication)** — API keys, Clerk JWT, and user-management endpoints.

## Endpoints

**[Watches API](./tasks)** — create, list, update, delete, fork, and execute watches.

**[Executions API](./executions)** — execution history, results, and per-watch trigger feed.

**[Notifications API](./notifications)** — notification send history and delivery tracking.

## Reference

**[Error responses](./errors)** — HTTP status codes, error formats, and common mistakes.

## Interactive documentation

webwhen ships interactive API documentation at:

- ReDoc: `https://api.torale.ai/redoc`
- OpenAPI JSON: `https://api.torale.ai/openapi.json`

Note: admin endpoints are intentionally hidden from the OpenAPI schema.

Start with the [API Overview](./overview) to understand authentication and endpoints.
