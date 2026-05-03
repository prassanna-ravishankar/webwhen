# Connector Trust Model

webwhen uses [Composio](https://composio.dev) as a managed OAuth broker for third-party connectors (Notion, Linear, GitHub). This page documents what that means for user data, what the operator can technically do, and what commitments we make.

## What Composio stores on your behalf

When you connect a third-party account, Composio stores:

- OAuth access and refresh tokens for that account
- Connection metadata (account ID, status, last-used timestamp)
- Arguments passed to tool calls during agent runs (for example, a Notion search query)

Composio holds these under the webwhen operator's project-scoped API key. webwhen does not receive or store raw OAuth tokens.

## What the operator can technically do

The webwhen operator (currently a single developer — me) holds the Composio API key. That key can:

- List all connected accounts for any user
- Generate MCP server URLs that proxy tool calls on a user's behalf
- Delete connected accounts

This is the standard trust model for managed OAuth brokers. Other services that broker OAuth (Zapier, Make, Notion integrations) work the same way.

## What we commit not to do

- We will not use connector access outside the context of running your watches
- We will not share the Composio API key or project credentials with third parties
- We will not execute tool calls against your connected accounts outside of scheduled or manually-triggered agent runs

## How you can audit usage

Every agent run that uses a connector produces an activity trail visible on the watch detail page. Each step shows which tool was called and what input was passed.

The `/settings/connectors` page shows all your connected accounts and lets you revoke any of them at any time.

## Future path

- If Composio offers per-user scoped keys or RBAC on an enterprise tier, we will migrate to that model
- If webwhen incorporates, the Composio org will move to a company-owned account with a second admin
- Tool-call provenance (user-triggered vs scheduler-triggered) is planned as a future addition to the activity trail
