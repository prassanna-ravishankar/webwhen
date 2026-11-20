---
description: Install the webwhen Python SDK via pip. Requirements, virtual environment setup, and dependency management.
---

# Installation

Install the webwhen Python SDK.

::: tip Note on naming
The SDK ships as `webwhen`. The old `torale` package on PyPI (0.0.2) predates the rename and is no longer maintained, and the `torale` import, `TORALE_*` environment variable and `~/.torale/config.json` fallbacks were removed in November 2026. Until the first `webwhen` release reaches PyPI, install from source.
:::

## Requirements

- Python 3.9 or higher
- pip or uv package manager

## Installation

### Using pip

```bash
pip install webwhen
```

### Using uv

```bash
uv add webwhen
```

### From source

```bash
git clone https://github.com/prassanna-ravishankar/webwhen
cd webwhen/backend
uv sync
```

## Verify the install

```bash
python -c "import webwhen; print(webwhen.__version__)"
```

## Quick test

```python
from webwhen import Webwhen

# Initialize the client
client = Webwhen(api_key="sk_...")

# Test the connection by listing watches
tasks = client.tasks.list()
print(f"Connected. Found {len(tasks)} watches.")
```

## Next steps

- Walk through the [Quickstart Guide](/sdk/quickstart)
- Learn about the [Async Client](/sdk/async)
- See [Examples](/sdk/examples)
- Handle [Errors](/sdk/errors)
