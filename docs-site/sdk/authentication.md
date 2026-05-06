---
description: Authenticate with the webwhen API using the Python SDK. Initialize the client with API keys, manage credentials, and handle authentication errors.
---

# Authentication

Authenticate the SDK with your API key.

::: tip Naming during the transition
Environment variable names and the client class still use `torale` (`TORALE_API_KEY`, `Torale`). The rename to `webwhen` is a later phase.
:::

## Get an API key

1. Log in to [webwhen.ai](https://webwhen.ai)
2. Navigate to Settings → API Keys
3. Generate a new key
4. Copy and save it securely

## Initialize the client

```python
from torale import Torale

client = Torale(api_key="sk_...")
```

## API key resolution order

The client resolves the API key in this order:

1. `api_key` parameter passed to the constructor
2. `TORALE_API_KEY` environment variable
3. `~/.torale/config.json` file

If no key is found and `TORALE_NOAUTH` isn't set, an `AuthenticationError` is raised.

## Environment variables

Store your API key in an environment variable:

```bash
export TORALE_API_KEY=sk_...
```

The client reads it automatically:

```python
from torale import Torale

client = Torale()  # Reads from TORALE_API_KEY
```

## Using .env files

```python
from dotenv import load_dotenv
from torale import Torale

load_dotenv()
client = Torale()
```

## Config file

The SDK reads from `~/.torale/config.json` if it exists:

```json
{
  "api_key": "sk_...",
  "api_url": "https://api.webwhen.ai"
}
```

## Local development

For local development without authentication:

```python
import os
os.environ["TORALE_NOAUTH"] = "1"

from torale import Torale
client = Torale()  # Connects to http://localhost:8000, no API key required
```

For local development with authentication:

```python
import os
os.environ["TORALE_DEV"] = "1"

from torale import Torale
client = Torale(api_key="sk_...")  # Connects to http://localhost:8000
```

## API URL resolution

The base URL is resolved in this order:

1. `api_url` parameter passed to the constructor
2. `TORALE_API_URL` environment variable
3. `http://localhost:8000` if `TORALE_DEV=1` or `TORALE_NOAUTH=1`
4. `api_url` from `~/.torale/config.json`
5. `https://api.webwhen.ai` (default)

## Error handling

```python
from torale import Torale
from torale.sdk.exceptions import AuthenticationError

try:
    client = Torale(api_key="sk_invalid")
    tasks = client.tasks.list()
except AuthenticationError:
    print("Invalid API key")
```

## Next steps

- Create watches with the [Watches API](/sdk/tasks)
- Use the [Async Client](/sdk/async)
- Read the [Quickstart Guide](/sdk/quickstart)
