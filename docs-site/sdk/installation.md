---
description: Install the webwhen Python SDK via pip. Requirements, virtual environment setup, and dependency management.
---

# Installation

Install the webwhen Python SDK.

::: tip Note on naming
The legacy `torale` package on PyPI is frozen at v0.1.0 as a deprecated shim. New releases ship as `webwhen` (`pip install webwhen`). If you have `torale` in requirements.txt, your import statements still work via a deprecation-warned shim, but you'll stop receiving updates until you migrate.
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
