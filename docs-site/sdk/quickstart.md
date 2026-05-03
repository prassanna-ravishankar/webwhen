---
description: webwhen Python SDK quickstart. Install the SDK, authenticate, and create watches in minutes with code examples.
---

# Quickstart

Get started with the webwhen Python SDK in minutes.

::: tip Naming during the transition
The package on PyPI is still `torale` and the client classes are still `Torale` / `ToraleAsync`. The rename to `webwhen` is a later phase — code samples below use the current shipping names.
:::

## Installation

```bash
pip install torale
```

## Get an API key

1. Log in to [torale.ai](https://torale.ai)
2. Navigate to Settings → API Keys
3. Generate a new key
4. Copy the key (shown only once)

## Basic usage

### Initialize the client

```python
from torale import Torale

client = Torale(api_key="sk_...")
```

### Create a watch

::: code-group

```python [Sync]
from torale import Torale

client = Torale(api_key="sk_...")

task = client.tasks.create(
    name="iPhone Release Watch",                                       # [!code highlight]
    search_query="When is the iPhone 17 being released?",              # [!code highlight]
    condition_description="Apple has announced a specific release date" # [!code highlight]
)

print(f"Created: {task.id}")
```

```python [Async]
import asyncio
from torale import ToraleAsync

async def create_task():
    async with ToraleAsync(api_key="sk_...") as client:
        task = await client.tasks.create(
            name="iPhone Release Watch",                                       # [!code highlight]
            search_query="When is the iPhone 17 being released?",              # [!code highlight]
            condition_description="Apple has announced a specific release date" # [!code highlight]
        )
        print(f"Created: {task.id}")

asyncio.run(create_task())
```

:::

### Fluent builder API

The SDK provides a fluent builder for a more readable syntax:

```python
from torale import Torale

client = Torale(api_key="sk_...")

task = (client.monitor("When is the iPhone 17 being released?")
    .when("Apple has announced a specific release date")
    .notify(email="me@example.com", webhook="https://myapp.com/alert")
    .named("iPhone Release Watch")
    .create())
```

Or use the standalone `monitor()` function (creates a default client automatically):

```python
from torale import monitor

task = (monitor("When is the iPhone 17 being released?")
    .when("Apple has announced a specific release date")
    .notify(webhook="https://myapp.com/alert")
    .create())
```

The builder method names (`monitor`, `when`, `notify`) come from the current SDK surface and stay until the SDK rename.

### List watches

```python
# Every watch
tasks = client.tasks.list()

for task in tasks:
    print(f"{task.name}: {task.state}")

# Filter to active watches only
active_tasks = client.tasks.list(active=True)
```

### Get watch details

```python
task = client.tasks.get("task-id")

print(f"Name: {task.name}")
print(f"Query: {task.search_query}")
print(f"Condition: {task.condition_description}")
print(f"State: {task.state}")
```

### Update a watch

```python
# Pause
task = client.tasks.update("task-id", state="paused")

# Update the search query
task = client.tasks.update("task-id", search_query="New search query")
```

### Delete a watch

```python
client.tasks.delete("task-id")
```

### Trigger a manual execution

```python
execution = client.tasks.execute("task-id")
print(f"Status: {execution.status}")
```

### View executions

```python
executions = client.tasks.executions("task-id")

for execution in executions:
    print(f"Status: {execution.status}")
    print(f"Started: {execution.started_at}")
    if execution.notification:
        print(f"Trigger: {execution.notification}")
```

### View triggers

```python
# Only executions where the condition was met
triggers = client.tasks.notifications("task-id")

for trigger in triggers:
    print(f"Time: {trigger.started_at}")
    print(f"Trigger: {trigger.notification}")
```

## Complete example

```python
from torale import Torale

# Initialize
client = Torale(api_key="sk_...")

# Create a watch
task = client.tasks.create(
    name="PS5 Price Tracker",
    search_query="What is the current price of PS5 at Best Buy?",
    condition_description="Price is $449 or lower",
    notifications=[{"type": "webhook", "url": "https://myapp.com/alert"}],
)

print(f"Created watch: {task.id}")
print(f"State: {task.state}")

# Trigger a manual execution
execution = client.tasks.execute(task.id)
print(f"Execution status: {execution.status}")

# Check execution history
executions = client.tasks.executions(task.id, limit=5)
for ex in executions:
    print(f"  {ex.started_at}: {ex.status}")

# List every watch
print("\nAll watches:")
for t in client.tasks.list():
    print(f"  - {t.name}: {t.state}")
```

## Environment variables

```python
import os
from torale import Torale

# Set the environment variable
os.environ["TORALE_API_KEY"] = "sk_..."

# The client reads it automatically
client = Torale()  # No api_key needed
```

Or use a `.env` file:

```bash
# .env
TORALE_API_KEY=sk_...
```

```python
from dotenv import load_dotenv
from torale import Torale

load_dotenv()
client = Torale()
```

## Error handling

```python
from torale import Torale
from torale.sdk.exceptions import (
    AuthenticationError,
    ValidationError,
    NotFoundError,
)

client = Torale(api_key="sk_...")

try:
    task = client.tasks.create(
        name="My Watch",
        search_query="...",
        condition_description="...",
    )
except ValidationError as e:
    print(f"Validation error: {e}")
except AuthenticationError:
    print("Invalid API key")
except NotFoundError:
    print("Resource not found")
```

## Next steps

- Learn about the [Async Client](/sdk/async)
- See more [Examples](/sdk/examples)
- Handle [Errors](/sdk/errors)
- Read the [API Reference](/api/tasks)
