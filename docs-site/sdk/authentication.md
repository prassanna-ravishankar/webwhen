---
description: Authenticate with the webwhen API using the Python SDK. Initialize the client with API keys, manage credentials, and handle authentication errors.
---

# Authentication

Authenticate the SDK with your API key.

## Get an API key

1. Log in to [webwhen.ai](https://webwhen.ai)
2. Navigate to Settings → API Keys
3. Generate a new key
4. Copy and save it securely

## Initialize the client

```python
from webwhen import Webwhen

client = Webwhen(api_key="sk_...")
```

## API key resolution order

The client resolves the API key in this order:

1. `api_key` parameter passed to the constructor
2. `WEBWHEN_API_KEY` environment variable
3. `~/.webwhen/config.json` file

If no key is found and `WEBWHEN_NOAUTH` isn't set, an `AuthenticationError` is raised.

## Environment variables

Store your API key in an environment variable:

```bash
export WEBWHEN_API_KEY=sk_...
```

The client reads it automatically:

```python
from webwhen import Webwhen

client = Webwhen()  # Reads from WEBWHEN_API_KEY
```

## Using .env files

```python
from dotenv import load_dotenv
from webwhen import Webwhen

load_dotenv()
client = Webwhen()
```

## Config file

The SDK reads from `~/.webwhen/config.json` if it exists:

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
os.environ["WEBWHEN_NOAUTH"] = "1"

from webwhen import Webwhen
client = Webwhen()  # Connects to http://localhost:8000, no API key required
```

For local development with authentication:

```python
import os
os.environ["WEBWHEN_DEV"] = "1"

from webwhen import Webwhen
client = Webwhen(api_key="sk_...")  # Connects to http://localhost:8000
```

## API URL resolution

The base URL is resolved in this order:

1. `api_url` parameter passed to the constructor
2. `WEBWHEN_API_URL` environment variable
3. `http://localhost:8000` if `WEBWHEN_DEV=1` or `WEBWHEN_NOAUTH=1`
4. `api_url` from `~/.webwhen/config.json`
5. `https://api.webwhen.ai` (default)

## Error handling

```python
from webwhen import Webwhen
from webwhen.sdk.exceptions import AuthenticationError

try:
    client = Webwhen(api_key="sk_invalid")
    tasks = client.tasks.list()
except AuthenticationError:
    print("Invalid API key")
```

## Next steps

- Create watches with the [Watches API](/sdk/tasks)
- Use the [Async Client](/sdk/async)
- Read the [Quickstart Guide](/sdk/quickstart)
