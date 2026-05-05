---
description: Integrate webwhen with OpenClaw to add web watching to your AI assistant. Watch for conditions and trigger actions when they're met.
---

# OpenClaw Integration

Use webwhen as a web-watching backend for [OpenClaw](https://openclaw.ai). webwhen watches for conditions on the web; OpenClaw acts when they're met.

::: tip Naming during the transition
The API host is still `api.torale.ai` and watches are still addressed as `tasks` in URLs. The rename to `webwhen` is a later phase — endpoint paths below reflect the current shipping API.
:::

## How it works

```
You (via chat) → OpenClaw → webwhen API (create watch)
                                  ↓
                    webwhen checks periodically
                                  ↓
                    Condition met → webhook → OpenClaw acts
```

1. You tell OpenClaw to watch for something
2. OpenClaw creates a webwhen watch via the API
3. webwhen checks the web on a schedule
4. When the condition is met, webwhen sends a webhook to OpenClaw
5. OpenClaw receives the trigger and takes action

## Setup

### 1. Get a webwhen API key

Sign up at [webwhen.ai](https://webwhen.ai) and create an API key in Settings.

### 2. Install the skill

For Claude Code:
```bash
/plugin marketplace add prassanna-ravishankar/torale-openclaw
/plugin install torale@torale
```

For OpenClaw:
```bash
openclaw skills install torale
```

### 3. Configure the API key

```bash
openclaw config set skills.entries.torale.apiKey "sk_your_key_here"
```

### 4. Enable webhooks in OpenClaw

Make sure hooks are enabled in your `~/.openclaw/openclaw.json`:

```json5
{
  hooks: {
    enabled: true,
    token: "your-hook-secret",
    path: "/hooks",
  },
}
```

## Usage

Once configured, tell OpenClaw what to watch for:

- "Watch for when Apple announces iPhone 17"
- "Watch when Bitcoin crosses $100k and let me know"
- "Tell me when the Next.js 15 release notes are published, then summarize the changelog"

OpenClaw creates the watch and webwhen handles the rest.

## API reference

All requests go to `https://api.torale.ai/api/v1` with `Authorization: Bearer sk_...`.

### Create a watch

```bash
curl -X POST https://api.torale.ai/api/v1/tasks \
  -H "Authorization: Bearer sk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone 17 Announcement",
    "search_query": "Apple iPhone 17 announcement",
    "condition_description": "Apple officially announces iPhone 17",
    "notifications": [{
      "type": "webhook",
      "url": "https://your-openclaw:18789/hooks/agent",
      "headers": {"Authorization": "Bearer your-hook-token"}
    }],
    "context": {
      "source": "openclaw",
      "action": "notify me with key details"
    }
  }'
```

### List watches

```bash
curl https://api.torale.ai/api/v1/tasks \
  -H "Authorization: Bearer sk_..."
```

### Delete a watch

```bash
curl -X DELETE https://api.torale.ai/api/v1/tasks/{task_id} \
  -H "Authorization: Bearer sk_..."
```

## Webhook payload

When the condition is met, webwhen POSTs to your OpenClaw webhook:

```json
{
  "event_type": "task.condition_met",
  "data": {
    "task": {
      "id": "uuid",
      "name": "iPhone 17 Announcement",
      "search_query": "Apple iPhone 17 announcement",
      "condition_description": "Apple officially announces iPhone 17"
    },
    "execution": {
      "notification": "Apple has officially announced the iPhone 17..."
    },
    "result": {
      "answer": "Detailed analysis with evidence...",
      "grounding_sources": [
        {"url": "https://apple.com/...", "title": "Apple Newsroom"}
      ]
    },
    "context": {
      "source": "openclaw",
      "action": "notify me with key details"
    }
  }
}
```

The `context` object is passed through from watch creation, so OpenClaw knows what action to take.

## HTTPS requirement

webwhen requires webhook URLs to use HTTPS. If your OpenClaw instance runs locally on HTTP, expose it via [Tailscale](https://docs.openclaw.ai/gateway/tailscale) or a reverse proxy with TLS.

## Authentication

webwhen uses HMAC-SHA256 signing (Stripe-compatible) on every webhook delivery. The signature is in the `X-Webwhen-Signature` header. OpenClaw authenticates via the `Authorization: Bearer` header you configure in the notification.

## Rate limits

- Watch creation: 10 per minute
- Maximum active watches: 50 per user
