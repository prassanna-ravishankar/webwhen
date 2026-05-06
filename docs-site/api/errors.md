---
description: API error responses and status codes. HTTP error codes, error formats, common errors, and troubleshooting.
---

# Error Handling

Understand and handle errors returned by the webwhen API.

::: tip Naming during the transition
Endpoint paths and JSON shapes still use `tasks`. The rename to `webwhen` is a later phase.
:::

## HTTP status codes

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Request successful |
| 204 | No Content | Successful deletion |
| 400 | Bad Request | Invalid request (bad state transition, invalid notification, etc.) |
| 401 | Unauthorized | Missing or invalid authentication |
| 404 | Not Found | Resource doesn't exist or isn't accessible |
| 409 | Conflict | Resource conflict (watch already running, duplicate entry, etc.) |
| 422 | Unprocessable Entity | Validation error (missing or invalid fields) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Dependency unavailable (for example, Clerk client) |

## Error response format

All errors use FastAPI's standard format:

```json
{
  "detail": "Error message"
}
```

For validation errors (422), FastAPI returns field-level details:

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "search_query"],
      "msg": "Field required",
      "input": {}
    }
  ]
}
```

## Common errors

### Authentication errors

#### Invalid API key

**Status:** `401 Unauthorized`

```json
{
  "detail": "Invalid API key"
}
```

**Causes:** the key doesn't exist, was revoked, or is malformed.

#### Missing authorization

**Status:** `401 Unauthorized`

```json
{
  "detail": "Authorization header missing"
}
```

**Fix:** include the `Authorization: Bearer {key}` header.

### Resource errors

#### Not found

**Status:** `404 Not Found`

```json
{
  "detail": "Task not found"
}
```

Returned when a resource doesn't exist or when a non-owner tries to access a private watch. webwhen returns 404 (not 403) for private resources to avoid leaking existence.

#### Conflict

**Status:** `409 Conflict`

```json
{
  "detail": "Task is already running or pending. Use force=true to override."
}
```

Returned when trying to execute a watch that already has a running or pending execution, or when a waitlist email already exists.

### Validation errors

#### Missing required fields

**Status:** `422 Unprocessable Entity`

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "search_query"],
      "msg": "Field required",
      "input": {}
    }
  ]
}
```

Required fields for watch creation: `search_query`.

#### Invalid field values

**Status:** `422 Unprocessable Entity`

```json
{
  "detail": [
    {
      "type": "enum",
      "loc": ["body", "state"],
      "msg": "Input should be 'active', 'paused' or 'completed'",
      "input": "invalid"
    }
  ]
}
```

### Business logic errors

#### Invalid state transition

**Status:** `400 Bad Request`

```json
{
  "detail": "Invalid state transition: paused -> completed"
}
```

Valid state transitions:
- `active` ↔ `paused`
- `active` → `completed`
- `completed` → `active`

#### Invalid notification configuration

**Status:** `400 Bad Request`

```json
{
  "detail": "Invalid notification: ..."
}
```

#### Duplicate notification types

**Status:** `400 Bad Request`

```json
{
  "detail": "Multiple notifications of the same type are not supported. Please provide at most one email and one webhook notification."
}
```

#### Username already set

**Status:** `400 Bad Request`

```json
{
  "detail": "Username cannot be changed once set. This protects your public task URLs from breaking."
}
```

#### Missing username for public watches

**Status:** `400 Bad Request`

```json
{
  "detail": "You must set a username before making tasks public"
}
```

### Rate limit errors

**Status:** `429 Too Many Requests`

Rate limits are applied per-IP on public endpoints:
- Public watches listing: 10/minute
- Public watch by ID: 20/minute
- Watch RSS feed: 10/minute
- Waitlist join: 5/minute

### Server errors

#### Internal server error

**Status:** `500 Internal Server Error`

```json
{
  "detail": "Failed to change task state: ... Task update rolled back."
}
```

When a state transition fails after other fields were updated, the entire update is rolled back and the error is returned.

#### Service unavailable

**Status:** `503 Service Unavailable`

```json
{
  "detail": "Clerk client not initialized"
}
```

Returned when an external dependency (such as Clerk) is unavailable.

## Debugging

### Check the response status

```bash
# Verbose curl output shows status code and headers
curl -v -X GET https://api.webwhen.ai/api/v1/tasks \
  -H "Authorization: Bearer sk_..."
```

### Common mistakes

1. **Sending `schedule` in create or update.** Schedule isn't user-settable; the agent decides cadence.
2. **Expecting a pagination wrapper on list endpoints.** `GET /api/v1/tasks` and the executions endpoint return bare arrays.
3. **Using `GET /api/v1/notifications`.** This endpoint doesn't exist. Use `/api/v1/notifications/sends` for send history or `/api/v1/tasks/{id}/notifications` for per-watch trigger feed.
4. **Trying to access private watches without auth.** Returns 404, not 403.

## Next steps

- Review [Authentication](/api/authentication) for auth setup
- See the [Watches API](/api/tasks) for endpoint details
- Read the [API Overview](/api/overview) for the full endpoint listing
