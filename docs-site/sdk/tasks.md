---
description: Manage watches with the webwhen Python SDK. Create, list, update, and delete watches programmatically with fluent API examples.
---

# Watches

Create and manage watches with the Python SDK.

::: tip Naming during the transition
SDK methods and types still use `tasks` / `Task` / `TaskState`. The rename to `webwhen` is a later phase — code samples below use the current shipping names.
:::

## Create a watch

The `name`, `search_query`, and `condition_description` are the core parameters:

```python
task = client.tasks.create(
    name="iPhone Release Watch",
    search_query="When is the iPhone 17 being released?",
    condition_description="Apple has announced a specific release date",
)
```

**With every option:**

```python
from torale.tasks import TaskState

task = client.tasks.create(
    name="iPhone Release Watch",
    search_query="When is the iPhone 17 being released?",
    condition_description="Apple has announced a specific release date",
    notifications=[
        {"type": "email", "address": "me@example.com"},
        {"type": "webhook", "url": "https://myapp.com/alert"},
    ],
    state=TaskState.ACTIVE,  # or "active" (default)
)
```

### Create parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | `str` | Yes | — | Watch name |
| `search_query` | `str` | Yes | — | Query to watch |
| `condition_description` | `str` | Yes | — | Condition that triggers a notification |
| `notifications` | `list[dict]` | No | `[]` | Notification channels |
| `state` | `str` or `TaskState` | No | `"active"` | `"active"` or `"paused"` |

### Notification config

Each notification dict has a `type` field plus type-specific fields:

```python
# Email
{"type": "email", "address": "me@example.com"}

# Webhook
{"type": "webhook", "url": "https://myapp.com/alert", "method": "POST", "headers": {"X-Custom": "value"}}
```

## Fluent builder API

For a more readable syntax, use the fluent builder:

```python
# Via the client instance
task = (client.monitor("When is iPhone 17 being released?")
    .when("Apple has announced a specific release date")
    .notify(email="me@example.com", webhook="https://myapp.com/alert")
    .named("iPhone Release Watch")
    .create())

# Create in paused state
task = (client.monitor("Bitcoin price")
    .when("price exceeds $100,000")
    .paused()
    .create())
```

Or use the standalone `monitor()` function:

```python
from torale import monitor

task = (monitor("Bitcoin price")
    .when("price exceeds $100,000")
    .notify(webhook="https://myapp.com/crypto")
    .create())
```

The standalone `monitor()` creates a default `Torale` client automatically (using env vars or config file for authentication). The method names come from the current SDK surface and stay until the SDK rename.

### Builder methods

| Method | Description |
|--------|-------------|
| `.when(condition)` | Set the condition description (required) |
| `.notify(email=..., webhook=...)` | Add notification channels |
| `.named(name)` | Set a custom watch name |
| `.paused()` | Create the watch in paused state |
| `.create()` | Build and create the watch |

## List watches

```python
# Every watch
tasks = client.tasks.list()

# Active only
active_tasks = client.tasks.list(active=True)

# Paused only
paused_tasks = client.tasks.list(active=False)
```

## Get a watch

```python
task = client.tasks.get("task-id")

print(f"Name: {task.name}")
print(f"State: {task.state}")
print(f"Search Query: {task.search_query}")
print(f"Created: {task.created_at}")
print(f"Next Run: {task.next_run}")
```

### Watch fields

Key fields on the returned `Task` object:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `UUID` | Watch ID |
| `name` | `str` | Watch name |
| `state` | `TaskState` | `"active"`, `"paused"`, or `"completed"` |
| `search_query` | `str` | Search query |
| `condition_description` | `str` | Trigger condition |
| `notifications` | `list[NotificationConfig]` | Notification channels |
| `created_at` | `datetime` | Creation timestamp |
| `next_run` | `datetime` or `None` | Next scheduled execution |
| `last_execution` | `TaskExecution` or `None` | Most recent execution |

## Update a watch

Pass only the fields you want to change:

```python
# Pause
task = client.tasks.update("task-id", state="paused")

# Resume
task = client.tasks.update("task-id", state="active")

# Update query and condition
task = client.tasks.update(
    "task-id",
    search_query="New search query",
    condition_description="New condition",
)
```

## Delete a watch

```python
client.tasks.delete("task-id")
```

## Execute immediately

Trigger a manual execution (test run):

```python
execution = client.tasks.execute("task-id")
print(f"Status: {execution.status}")
```

## View executions

```python
# Execution history
executions = client.tasks.executions("task-id")

for execution in executions:
    print(f"Status: {execution.status}")
    print(f"Started: {execution.started_at}")
    if execution.notification:
        print(f"Trigger: {execution.notification}")

# Limit results
recent = client.tasks.executions("task-id", limit=5)
```

## View triggers

Get only the executions where the condition was met:

```python
triggers = client.tasks.notifications("task-id")

for trigger in triggers:
    print(f"Time: {trigger.started_at}")
    print(f"Trigger: {trigger.notification}")
    if trigger.grounding_sources:
        print(f"Sources: {len(trigger.grounding_sources)}")
```

## Next steps

- Use the [Async Client](/sdk/async) for concurrent operations
- Handle [Errors](/sdk/errors)
- See [Examples](/sdk/examples)
