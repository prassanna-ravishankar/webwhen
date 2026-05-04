---
layout: home
description: webwhen developer documentation. REST API and Python SDK for the agent that watches the open web and tells you when something matters.

hero:
  name: webwhen docs
  text: Build with the agent that waits.
  tagline: Tell webwhen what to watch for. It will sit with the question and tell you when the answer arrives.
  image:
    light: /logo.svg
    dark: /logo-dark.svg
    alt: webwhen
  actions:
    - theme: brand
      text: Quickstart
      link: /getting-started/
    - theme: alt
      text: API Reference
      link: /api/overview
---

## Overview

webwhen runs scheduled grounded-search executions, evaluates the results against a trigger condition, and stores the history. Grounded search combines live web search with LLM evaluation, so each answer is backed by sources.

## Example

The Python package and REST endpoints are still published under the `torale` name today; the rename to `webwhen` lands in a later phase.

```python
from torale import ToraleClient

client = ToraleClient()

# Create a watch
task = client.tasks.create(
    search_query="When is the iPhone 17 being released?",
    condition_description="Apple has announced a specific release date",
    schedule="0 9 * * *"  # Daily at 9 AM
)

# Check results
executions = client.tasks.get_executions(task.id)
if executions[0].notification:
    print(executions[0].result["answer"])
```

## Interfaces

- [Python SDK](/getting-started/sdk) — client library for Python applications
- [REST API](/api/overview) — HTTP API reference
