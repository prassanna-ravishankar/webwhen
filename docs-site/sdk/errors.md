---
description: Handle errors in the webwhen Python SDK. Exception types, error responses, retry logic, and best practices for robust error handling.
---

# Error Handling

Handle errors gracefully in the webwhen Python SDK.

## Exception hierarchy

```
WebwhenError (base)
├── AuthenticationError (401)
├── NotFoundError (404)
├── ValidationError (400, 422)
├── RateLimitError
└── APIError (all other HTTP errors)
    ├── status_code: int
    └── response: dict | None
```

All exceptions live in `webwhen.sdk.exceptions`.

## Basic error handling

```python
from webwhen import Webwhen
from webwhen.sdk.exceptions import WebwhenError

client = Webwhen(api_key="sk_...")

try:
    task = client.tasks.create(
        name="My Watch",
        search_query="...",
        condition_description="...",
    )
except WebwhenError as e:
    print(f"API error: {e}")
```

## Specific exceptions

### AuthenticationError

Raised when the API key is missing, invalid, or expired (HTTP 401). Also raised at client init if no API key can be resolved.

```python
from webwhen.sdk.exceptions import AuthenticationError

try:
    client = Webwhen(api_key="sk_invalid")
    tasks = client.tasks.list()
except AuthenticationError as e:
    print(f"Auth failed: {e}")
```

### ValidationError

Raised for invalid request data (HTTP 400 or 422).

```python
from webwhen.sdk.exceptions import ValidationError

try:
    task = client.tasks.create(
        name="",  # Invalid
        search_query="...",
        condition_description="...",
    )
except ValidationError as e:
    print(f"Validation failed: {e}")
```

### NotFoundError

Raised when a resource doesn't exist (HTTP 404).

```python
from webwhen.sdk.exceptions import NotFoundError

try:
    task = client.tasks.get("non-existent-id")
except NotFoundError:
    print("Watch not found")
```

### RateLimitError

Raised when rate limits are exceeded.

```python
from webwhen.sdk.exceptions import RateLimitError

try:
    task = client.tasks.create(...)
except RateLimitError:
    print("Rate limited. Try again later.")
```

### APIError

Catch-all for other HTTP errors. Has `status_code` and `response` attributes.

```python
from webwhen.sdk.exceptions import APIError

try:
    task = client.tasks.create(...)
except APIError as e:
    print(f"HTTP {e.status_code}: {e}")
    if e.response:
        print(f"Response body: {e.response}")
```

## Retry logic

### Simple retry

```python
import time
from webwhen.sdk.exceptions import APIError

def create_task_with_retry(client, max_retries=3, **kwargs):
    retry_delay = 1

    for attempt in range(max_retries):
        try:
            return client.tasks.create(**kwargs)
        except APIError as e:
            if e.status_code and e.status_code < 500:
                raise  # Don't retry client errors
            if attempt == max_retries - 1:
                raise
            print(f"Retry {attempt + 1}/{max_retries} after {retry_delay}s...")
            time.sleep(retry_delay)
            retry_delay *= 2

task = create_task_with_retry(
    client,
    name="My Watch",
    search_query="...",
    condition_description="...",
)
```

### Using tenacity

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)
from webwhen.sdk.exceptions import APIError

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(APIError),
)
def create_task(client, **kwargs):
    return client.tasks.create(**kwargs)
```

## Async error handling

```python
import asyncio
from webwhen import WebwhenAsync
from webwhen.sdk.exceptions import ValidationError, APIError

async def safe_create_task(client, max_retries=3, **kwargs):
    retry_delay = 1

    for attempt in range(max_retries):
        try:
            return await client.tasks.create(**kwargs)
        except ValidationError:
            raise  # Don't retry
        except APIError as e:
            if attempt == max_retries - 1:
                raise
            print(f"Retrying in {retry_delay}s...")
            await asyncio.sleep(retry_delay)
            retry_delay *= 2

async def main():
    async with WebwhenAsync(api_key="sk_...") as client:
        task = await safe_create_task(
            client,
            name="My Watch",
            search_query="...",
            condition_description="...",
        )

asyncio.run(main())
```

## Logging errors

```python
import logging
from webwhen import Webwhen
from webwhen.sdk.exceptions import WebwhenError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = Webwhen(api_key="sk_...")

try:
    task = client.tasks.create(
        name="My Watch",
        search_query="...",
        condition_description="...",
    )
    logger.info(f"Created watch: {task.id}")
except WebwhenError as e:
    logger.error(f"Watch creation failed: {e}")
    raise
```

## Best practices

**Catch specific exceptions first.** Handle each error type differently:

```python
from webwhen.sdk.exceptions import (
    AuthenticationError,
    ValidationError,
    NotFoundError,
    APIError,
)

try:
    task = client.tasks.create(...)
except AuthenticationError:
    # Re-authenticate or fail fast
    raise
except ValidationError:
    # Fix input, don't retry
    raise
except NotFoundError:
    # Resource missing
    raise
except APIError as e:
    # Retry only server errors (5xx)
    if e.status_code and e.status_code >= 500:
        # retry logic here
        pass
    else:
        raise
```

**Don't retry non-transient errors.** `AuthenticationError`, `ValidationError`, and `NotFoundError` won't succeed on retry.

**Use exponential backoff** for retries to avoid overwhelming the server.

## Next steps

- See [Examples](/sdk/examples)
- Read the [API Reference](/api/errors)
- Learn about the [Async Client](/sdk/async)
