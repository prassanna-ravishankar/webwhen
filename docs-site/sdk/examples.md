---
description: webwhen Python SDK code examples. Real-world watch scenarios with complete code samples for common use cases and integration patterns.
---

# Examples

Practical examples using the webwhen Python SDK.

::: tip Naming during the transition
The package on PyPI is still `torale` and SDK methods still use `tasks`. The rename to `webwhen` is a later phase — code samples below use the current shipping names.
:::

## Product release watching

```python
from torale import Torale

client = Torale(api_key="sk_...")

# Watch the iPhone release
iphone_task = client.tasks.create(
    name="iPhone 17 Release Watch",
    search_query="When is the iPhone 17 being released?",
    condition_description="Apple has officially announced a specific release date",
    notifications=[{"type": "email", "address": "me@example.com"}],
)

# Watch the GPT-5 release
gpt5_task = client.tasks.create(
    name="GPT-5 Release Watch",
    search_query="When is GPT-5 being released by OpenAI?",
    condition_description="OpenAI has announced an official release date",
)

print(f"Watching {len([iphone_task, gpt5_task])} product releases")
```

## Price tracking

```python
# Track MacBook price
macbook_task = client.tasks.create(
    name="MacBook Pro Price Watch",
    search_query="What is the current price of MacBook Pro M3 14-inch at Best Buy?",
    condition_description="The price is $1799 or lower",
    notifications=[{"type": "webhook", "url": "https://myapp.com/price-alert"}],
)

# Track PS5 price
ps5_task = client.tasks.create(
    name="PS5 Price Tracker",
    search_query="What is the current price of PS5 at Amazon?",
    condition_description="Price is $449 or lower",
)
```

## Using the fluent builder

```python
from torale import Torale

client = Torale(api_key="sk_...")

# Readable chaining
task = (client.monitor("Is PlayStation 5 in stock at Target?")
    .when("PS5 is currently available for purchase")
    .notify(email="me@example.com", webhook="https://myapp.com/hook")
    .named("PS5 Stock Watch")
    .create())

# Trigger a manual check
client.tasks.execute(task.id)
```

## Bulk watch creation

```python
queries = [
    {
        "name": "iPhone Release",
        "search_query": "When is the next iPhone being released?",
        "condition_description": "A specific date has been announced",
    },
    {
        "name": "PS5 Stock",
        "search_query": "Is PS5 in stock at Best Buy?",
        "condition_description": "PS5 is available for purchase",
    },
    {
        "name": "MacBook Price",
        "search_query": "What is the MacBook Pro M3 price at Best Buy?",
        "condition_description": "Price is below $1800",
    },
]

tasks = []
for config in queries:
    task = client.tasks.create(**config)
    tasks.append(task)
    print(f"Created: {task.name}")

print(f"\nTotal watches created: {len(tasks)}")
```

## Async bulk creation

```python
import asyncio
from torale import ToraleAsync

async def create_all(configs):
    async with ToraleAsync(api_key="sk_...") as client:
        tasks = await asyncio.gather(*[
            client.tasks.create(**config)
            for config in configs
        ])
        return tasks

configs = [
    {"name": "Watch A", "search_query": "Query A", "condition_description": "Condition A"},
    {"name": "Watch B", "search_query": "Query B", "condition_description": "Condition B"},
    {"name": "Watch C", "search_query": "Query C", "condition_description": "Condition C"},
]

tasks = asyncio.run(create_all(configs))
for task in tasks:
    print(f"Created: {task.name} ({task.id})")
```

## Watch dashboard

```python
from torale import Torale

client = Torale(api_key="sk_...")

def display_dashboard():
    tasks = client.tasks.list()

    active = [t for t in tasks if t.state == "active"]
    paused = [t for t in tasks if t.state == "paused"]
    completed = [t for t in tasks if t.state == "completed"]

    print(f"Total: {len(tasks)} | Active: {len(active)} | Paused: {len(paused)} | Completed: {len(completed)}")
    print("-" * 60)

    for task in tasks:
        print(f"\n  {task.name}")
        print(f"    State: {task.state}")
        print(f"    Query: {task.search_query}")
        print(f"    Next run: {task.next_run or 'N/A'}")

        # Latest execution
        executions = client.tasks.executions(task.id, limit=1)
        if executions:
            latest = executions[0]
            print(f"    Last run: {latest.started_at} ({latest.status})")

display_dashboard()
```

## Trigger checker

```python
def check_triggers():
    tasks = client.tasks.list()

    for task in tasks:
        triggers = client.tasks.notifications(task.id, limit=5)

        if triggers:
            print(f"{task.name}: {len(triggers)} triggers")
            for trigger in triggers[:3]:
                print(f"  {trigger.started_at}: {trigger.notification[:100] if trigger.notification else 'N/A'}")
            print()

check_triggers()
```

## Automated watch cleanup

```python
from datetime import datetime, timedelta

def cleanup_old_watches():
    """Pause watches that haven't run in 30 days."""
    tasks = client.tasks.list(active=True)
    thirty_days_ago = datetime.now().astimezone() - timedelta(days=30)

    paused_count = 0

    for task in tasks:
        executions = client.tasks.executions(task.id, limit=1)

        if executions and executions[0].started_at < thirty_days_ago:
            client.tasks.update(task.id, state="paused")
            print(f"Paused: {task.name}")
            paused_count += 1

    print(f"\nPaused {paused_count} watches")

cleanup_old_watches()
```

## Execution health report

```python
def check_execution_health():
    tasks = client.tasks.list()

    for task in tasks:
        executions = client.tasks.executions(task.id, limit=20)

        if not executions:
            continue

        total = len(executions)
        success = sum(1 for e in executions if e.status == "success")
        failed = sum(1 for e in executions if e.status == "failed")

        success_rate = (success / total) * 100 if total > 0 else 0

        print(f"{task.name}")
        print(f"  Executions: {total} | Success: {success_rate:.0f}% | Failed: {failed}")

        if failed > 0:
            print(f"  WARNING: {failed} failed executions")

check_execution_health()
```

## Webhook configuration

```python
# Configure the default webhook
config = client.webhooks.update_config(
    url="https://myapp.com/webhooks/torale",
    enabled=True,
)
print(f"Webhook URL: {config['url']}")
print(f"Secret: {config['secret']}")  # Use this to verify webhook signatures

# Test webhook delivery
result = client.webhooks.test(
    url="https://myapp.com/webhooks/torale",
    secret=config["secret"],
)
print(f"Test result: {result['message']}")

# View delivery history
deliveries = client.webhooks.list_deliveries(limit=5)
for d in deliveries:
    print(f"  {d['created_at']}: {d['status']}")
```

## Next steps

- Handle [Errors](/sdk/errors)
- Learn about the [Async Client](/sdk/async)
- Read the [API Reference](/api/tasks)
