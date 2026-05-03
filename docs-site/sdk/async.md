---
description: Use async/await patterns with the webwhen Python SDK. Async watch management, concurrent execution, and asynchronous notification handling.
---

# Async Client

Use the webwhen SDK with asyncio for concurrent operations.

::: tip Naming during the transition
The async client class is still `ToraleAsync` and the package is still `torale`. The rename to `webwhen` is a later phase.
:::

## Installation

Same package — the async client is included:

```bash
pip install torale
```

## Basic usage

```python
import asyncio
from torale import ToraleAsync

async def main():
    async with ToraleAsync(api_key="sk_...") as client:
        task = await client.tasks.create(
            name="iPhone Release Watch",
            search_query="When is the next iPhone release?",
            condition_description="A specific date has been announced",
        )
        print(f"Created: {task.id}")

asyncio.run(main())
```

`ToraleAsync` supports the same resources and methods as the sync `Torale` client, with `await` on every call.

## Context manager

Always use `async with` so the HTTP client is closed properly:

```python
async with ToraleAsync(api_key="sk_...") as client:
    tasks = await client.tasks.list()
```

Or close manually:

```python
client = ToraleAsync(api_key="sk_...")
try:
    tasks = await client.tasks.list()
finally:
    await client.close()
```

## Concurrent operations

### Create multiple watches

```python
async def create_tasks():
    async with ToraleAsync(api_key="sk_...") as client:
        tasks = await asyncio.gather(
            client.tasks.create(
                name="iPhone Watch",
                search_query="iPhone release date?",
                condition_description="Date announced",
            ),
            client.tasks.create(
                name="PS5 Stock Watch",
                search_query="PS5 in stock at Target?",
                condition_description="Available for purchase",
            ),
            client.tasks.create(
                name="MacBook Price Watch",
                search_query="MacBook Pro price at Best Buy?",
                condition_description="Price below $1800",
            ),
        )

        for task in tasks:
            print(f"Created: {task.name}")

asyncio.run(create_tasks())
```

### Fetch multiple watch details

```python
async def get_task_details(task_ids):
    async with ToraleAsync(api_key="sk_...") as client:
        tasks = await asyncio.gather(*[
            client.tasks.get(task_id)
            for task_id in task_ids
        ])
        return tasks

task_ids = ["task-id-1", "task-id-2", "task-id-3"]
tasks = asyncio.run(get_task_details(task_ids))

for task in tasks:
    print(f"{task.name}: {task.state}")
```

## Available methods

`ToraleAsync` has the same interface as the sync client. Every method is async:

| Resource | Method | Description |
|----------|--------|-------------|
| `client.tasks` | `create(...)` | Create a watch |
| `client.tasks` | `list(active=...)` | List watches |
| `client.tasks` | `get(task_id)` | Get a watch |
| `client.tasks` | `update(task_id, ...)` | Update a watch |
| `client.tasks` | `delete(task_id)` | Delete a watch |
| `client.tasks` | `execute(task_id)` | Trigger a manual execution |
| `client.tasks` | `executions(task_id, limit=100)` | Get execution history |
| `client.tasks` | `notifications(task_id, limit=100)` | Get the trigger feed |
| `client.webhooks` | `get_config()` | Get webhook config |
| `client.webhooks` | `update_config(url=..., enabled=...)` | Update webhook config |
| `client.webhooks` | `test(url, secret)` | Test webhook delivery |
| `client.webhooks` | `list_deliveries(task_id=..., limit=...)` | List webhook deliveries |

## With FastAPI

```python
import os

from fastapi import FastAPI, Depends
from torale import ToraleAsync

app = FastAPI()

async def get_torale_client():
    client = ToraleAsync(api_key=os.getenv("TORALE_API_KEY"))
    try:
        yield client
    finally:
        await client.close()

@app.post("/create-watch")
async def create_watch(
    query: str,
    condition: str,
    client: ToraleAsync = Depends(get_torale_client),
):
    task = await client.tasks.create(
        name=f"Watch: {query[:50]}",
        search_query=query,
        condition_description=condition,
    )
    return {"task_id": str(task.id)}

@app.get("/watches")
async def list_watches(
    client: ToraleAsync = Depends(get_torale_client),
):
    tasks = await client.tasks.list()
    return {"tasks": [t.model_dump() for t in tasks]}

@app.get("/watches/{task_id}/executions")
async def get_executions(
    task_id: str,
    client: ToraleAsync = Depends(get_torale_client),
):
    executions = await client.tasks.executions(task_id)
    return {"executions": [e.model_dump() for e in executions]}
```

## Batch operations with rate limiting

```python
from asyncio import Semaphore

async def create_watches_with_limit(task_configs):
    async with ToraleAsync(api_key="sk_...") as client:
        semaphore = Semaphore(5)  # Max 5 concurrent requests

        async def create_with_semaphore(config):
            async with semaphore:
                return await client.tasks.create(**config)

        tasks = await asyncio.gather(*[
            create_with_semaphore(config)
            for config in task_configs
        ])
        return tasks
```

## Error handling

```python
from torale import ToraleAsync
from torale.sdk.exceptions import ValidationError, RateLimitError, APIError
import asyncio

async def safe_create_task(client, max_retries=3, **kwargs):
    for attempt in range(max_retries):
        try:
            return await client.tasks.create(**kwargs)
        except ValidationError as e:
            print(f"Validation error: {e}")
            raise  # Don't retry validation errors
        except APIError as e:
            if attempt == max_retries - 1:
                raise
            wait = 2 ** attempt
            print(f"API error, retrying in {wait}s...")
            await asyncio.sleep(wait)

async def main():
    async with ToraleAsync(api_key="sk_...") as client:
        task = await safe_create_task(
            client,
            name="My Watch",
            search_query="...",
            condition_description="...",
        )

asyncio.run(main())
```

## Next steps

- See [Examples](/sdk/examples)
- Handle [Errors](/sdk/errors)
- Read the [API Reference](/api/tasks)
