---
description: API authentication with API keys and bearer tokens. Generate keys, store credentials securely, and follow authentication best practices.
---

# Authentication

webwhen supports two authentication methods: Clerk OAuth for the web dashboard and API keys for programmatic access.

::: tip Naming during the transition
Endpoint paths and environment variable names still use `torale`. The rename to `webwhen` is a later phase.
:::

## Authentication methods

### 1. Clerk OAuth (web dashboard)

Used for browser-based authentication in the web dashboard.

**Supported providers:**
- Google OAuth
- GitHub OAuth
- Email + password

**How it works:**
1. User logs in via Clerk at webwhen.ai
2. Clerk issues a JWT
3. The frontend includes the token in API requests
4. The backend verifies the token with Clerk

**No manual setup required** — handled automatically by the web dashboard.

### 2. API keys (SDK)

Used for programmatic access via the Python SDK.

**Key format:**
```
sk_[32 random characters]
Example: sk_abc123def456ghi789jkl012mno345pq
```

**Security:**
- Keys are bcrypt hashed before storage
- Shown once during creation
- Revocable at any time
- One active key per user (revoke before creating a new one)

**Requires developer role:** API-key creation requires `"role": "developer"` or `"role": "admin"` in Clerk `publicMetadata`.

## Getting an API key

### Web dashboard

1. **Log in** to [webwhen.ai](https://webwhen.ai)
2. **Navigate** to Settings → API Keys
3. **Click** "Generate New Key"
4. **Enter** a key name (for example, "My API Key", "Production Script")
5. **Copy** the key immediately (shown only once)
6. **Save** it securely

### Key management

**List keys:**
- View all your API keys in the dashboard
- See last-used timestamps
- Identify keys by name and prefix

**Revoke a key:**
- Click "Revoke" next to the key
- Revocation is immediate
- Cannot be undone

## Using API keys

### HTTP requests

**Include in the `Authorization` header:**
```bash
curl -X GET https://api.webwhen.ai/api/v1/tasks \
  -H "Authorization: Bearer sk_..."
```

**Example with curl:**
```bash
API_KEY="sk_..."

curl -X POST https://api.webwhen.ai/api/v1/tasks \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone Release Watch",
    "search_query": "When is the next iPhone release?",
    "condition_description": "A specific date has been announced"
  }'
```

## Authentication endpoints

### Sync user (web dashboard only)

Create or update a user record after Clerk authentication. Called automatically by the frontend on login.

**Endpoint:** `POST /auth/sync-user`

**Headers:**
```
Authorization: Bearer {clerk_jwt_token}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clerk_user_id": "user_2abc...",
    "email": "user@example.com",
    "first_name": "Jane",
    "username": null,
    "is_active": true,
    "has_seen_welcome": false,
    "created_at": "2025-01-15T10:30:00Z"
  },
  "created": true
}
```

### Get current user

**Endpoint:** `GET /auth/me`

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "clerk_user_id": "user_2abc...",
  "email": "user@example.com",
  "first_name": "Jane",
  "username": "jane",
  "is_active": true,
  "has_seen_welcome": true,
  "created_at": "2025-01-15T10:30:00Z"
}
```

### Mark welcome seen

Mark that the user has completed the welcome flow.

**Endpoint:** `POST /auth/mark-welcome-seen`

**Response:** `200 OK`
```json
{
  "status": "success"
}
```

### Generate API key

Create a new API key. Requires the developer role.

**Endpoint:** `POST /auth/api-keys`

**Request body:**
```json
{
  "name": "My API Key"
}
```

**Response:** `200 OK`
```json
{
  "key": "sk_abc123def456ghi789jkl012mno345pq",
  "key_info": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "key_prefix": "sk_abc123def456...",
    "name": "My API Key",
    "created_at": "2025-01-15T10:30:00Z",
    "last_used_at": null,
    "is_active": true
  }
}
```

**Errors:**
- `400` if the user already has an active key (revoke first)
- `404` if the user is not synced yet

### List API keys

**Endpoint:** `GET /auth/api-keys`

**Response:** `200 OK`
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "key_prefix": "sk_abc123def456...",
    "name": "My API Key",
    "created_at": "2025-01-15T10:30:00Z",
    "last_used_at": "2025-01-20T15:45:00Z",
    "is_active": true
  }
]
```

### Revoke API key

**Endpoint:** `DELETE /auth/api-keys/{id}`

**Response:** `200 OK`
```json
{
  "status": "revoked"
}
```

Returns `404` if the key isn't found or doesn't belong to the user.

## Security best practices

### Protecting API keys

**Do:**
- Store keys in environment variables
- Use a secret manager (AWS Secrets Manager, 1Password, etc.)
- Rotate keys periodically
- Revoke unused keys

**Don't:**
- Commit keys to version control
- Share keys via email or chat
- Hard-code keys in source files
- Store keys in plain-text files

### Environment variables

```bash
# .env (add to .gitignore)
TORALE_API_KEY=sk_...
```

## Development mode (no auth)

For local development without authentication:

```bash
export TORALE_NOAUTH=1
```

Only works against the local development API (`localhost:8000`). The backend uses a test user for every request.

## Error responses

### Invalid API key

**Status:** `401 Unauthorized`
```json
{
  "detail": "Invalid API key"
}
```

### Missing authorization

**Status:** `401 Unauthorized`
```json
{
  "detail": "Authorization header missing"
}
```

### Expired token (Clerk)

**Status:** `401 Unauthorized`
```json
{
  "detail": "Token has expired"
}
```

## Next steps

- Create watches via the [Watches API](/api/tasks)
- See execution history with the [Executions API](/api/executions)
- Check the [Error Handling](/api/errors) guide
