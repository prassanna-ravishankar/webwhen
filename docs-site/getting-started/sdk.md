---
description: Python SDK guide for programmatic webwhen integration. Create watches, manage executions, and build automated workflows in Python.
---

# Python SDK

Integrate webwhen into your Python applications.

## Installation

```bash
pip install webwhen
```

## Get an API key

1. Log in to [webwhen.ai](https://webwhen.ai)
2. Go to Settings → API Keys
3. Generate a new key
4. Copy and save it securely

## Create your first watch

```python
from webwhen import Webwhen

client = Webwhen(api_key="sk_...")

task = client.tasks.create(
    search_query="When is the iPhone 17 being released?",
    condition_description="Apple has announced a specific release date",
    schedule="0 9 * * *"
)

print(f"Created watch: {task.id}")
```


## Check results

```python
# Execution history
executions = client.tasks.get_executions(task.id)

for execution in executions:
    if execution.notification:
        print(f"Answer: {execution.result['answer']}")
        print(f"Sources: {execution.grounding_sources}")
```

## Environment variables

Store your API key in an environment variable:

```bash
export WEBWHEN_API_KEY=sk_...
```

```python
from webwhen import Webwhen

# Client reads the key from the environment automatically
client = Webwhen()
```

## Async client

For async applications:

```python
from webwhen import WebwhenAsync
import asyncio

async def main():
    client = WebwhenAsync(api_key="sk_...")

    task = await client.tasks.create(
        search_query="When is the iPhone 17 being released?",
        condition_description="Apple has announced a specific release date",
        schedule="0 9 * * *"
    )

    print(f"Created: {task.id}")

asyncio.run(main())
```

## Next steps

- Read the [SDK Quickstart](/sdk/quickstart) for detailed examples
- Learn about the [Async Client](/sdk/async)
- See [Error Handling](/sdk/errors)
