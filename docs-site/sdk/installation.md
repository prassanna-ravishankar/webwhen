---
description: Install the webwhen Python SDK via pip. Requirements, virtual environment setup, and dependency management.
---

# Installation

Install the webwhen Python SDK.

::: tip Naming during the transition
The PyPI package is still `torale` and the import is still `from torale import Torale`. The rename to `webwhen` is a later phase.
:::

## Requirements

- Python 3.9 or higher
- pip or uv package manager

## Installation

### Using pip

```bash
pip install torale
```

### Using uv

```bash
uv add torale
```

### From source

```bash
git clone https://github.com/prassanna-ravishankar/torale
cd torale/backend
uv sync
```

## Verify the install

```bash
python -c "import torale; print(torale.__version__)"
```

## Quick test

```python
from torale import Torale

# Initialize the client
client = Torale(api_key="sk_...")

# Test the connection by listing watches
tasks = client.tasks.list()
print(f"Connected. Found {len(tasks)} watches.")
```

## Next steps

- Walk through the [Quickstart Guide](/sdk/quickstart)
- Learn about the [Async Client](/sdk/async)
- See [Examples](/sdk/examples)
- Handle [Errors](/sdk/errors)
