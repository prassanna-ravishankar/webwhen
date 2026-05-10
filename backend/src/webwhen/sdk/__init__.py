"""
webwhen SDK - Python client for the webwhen API.

Beautiful, Pythonic API for creating and managing monitoring tasks.
"""

from __future__ import annotations

from webwhen.sdk.async_client import WebwhenAsyncClient
from webwhen.sdk.builders import MonitorBuilder, monitor
from webwhen.sdk.client import WebwhenClient
from webwhen.sdk.exceptions import (
    APIError,
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    WebwhenError,
)
from webwhen.sdk.resources import TasksResource, WebhooksResource
from webwhen.sdk.resources.async_tasks import AsyncTasksResource
from webwhen.sdk.resources.async_webhooks import AsyncWebhooksResource


class Webwhen(WebwhenClient):
    """
    Main webwhen SDK client.

    Provides access to all webwhen API resources with both traditional
    resource-based API and fluent builder patterns.

    Example (Traditional API):
        >>> from webwhen import Webwhen
        >>> client = Webwhen(api_key="sk_...")
        >>> task = client.tasks.create(
        ...     name="iPhone watch",
        ...     search_query="When is iPhone 16 being released?",
        ...     condition_description="A specific release date is announced",
        ...     notifications=[{"type": "webhook", "url": "https://myapp.com/alert"}]
        ... )

    Example (Fluent API):
        >>> from webwhen import monitor
        >>> task = (monitor("When is iPhone 16 being released?")
        ...     .when("A specific release date is announced")
        ...     .notify(webhook="https://myapp.com/alert")
        ...     .create())
    """

    def __init__(
        self, api_key: str | None = None, api_url: str | None = None, timeout: float = 60.0
    ):
        """
        Initialize webwhen SDK client.

        Args:
            api_key: API key for authentication. If not provided, will try to load from:
                1. WEBWHEN_API_KEY environment variable (TORALE_API_KEY also accepted, deprecated)
                2. ~/.webwhen/config.json file (~/.torale/config.json also read, deprecated)
            api_url: Base URL for API. Defaults to http://localhost:8000 or value from config.
            timeout: Request timeout in seconds. Defaults to 60.

        Example:
            >>> # Using API key from environment
            >>> client = Webwhen()
            >>> # Or provide explicitly
            >>> client = Webwhen(api_key="sk_...")
            >>> # Or for local development without auth
            >>> import os
            >>> os.environ["WEBWHEN_NOAUTH"] = "1"
            >>> client = Webwhen()
        """
        super().__init__(api_key=api_key, api_url=api_url, timeout=timeout)

        # Initialize resources
        self.tasks = TasksResource(self)
        self.webhooks = WebhooksResource(self)

    def monitor(self, search_query: str) -> MonitorBuilder:
        """
        Create a monitoring task with fluent API.

        Args:
            search_query: Query to monitor

        Returns:
            MonitorBuilder for chaining

        Example:
            >>> client = Webwhen()
            >>> task = (client.monitor("Bitcoin price")
            ...     .when("price exceeds $50,000")
            ...     .check_every("5 minutes")
            ...     .notify(webhook="https://myapp.com/crypto-alert")
            ...     .create())
        """
        return MonitorBuilder(self, search_query)


class WebwhenAsync(WebwhenAsyncClient):
    """
    Async webwhen SDK client for non-blocking I/O.

    Provides access to all webwhen API resources with async/await support.
    Use this client in async contexts for better performance with concurrent operations.

    Example:
        >>> import asyncio
        >>> from webwhen import WebwhenAsync
        >>>
        >>> async def main():
        ...     async with WebwhenAsync(api_key="sk_...") as client:
        ...         # Create tasks concurrently
        ...         task1 = client.tasks.create(
        ...             name="watch 1",
        ...             search_query="Query 1",
        ...             condition_description="Condition 1"
        ...         )
        ...         task2 = client.tasks.create(
        ...             name="watch 2",
        ...             search_query="Query 2",
        ...             condition_description="Condition 2"
        ...         )
        ...         # Wait for both to complete
        ...         results = await asyncio.gather(task1, task2)
        ...
        >>> asyncio.run(main())
    """

    def __init__(
        self, api_key: str | None = None, api_url: str | None = None, timeout: float = 60.0
    ):
        """
        Initialize async webwhen SDK client.

        Args:
            api_key: API key for authentication
            api_url: Base URL for API (defaults to the webwhen production API)
            timeout: Request timeout in seconds
        """
        super().__init__(api_key=api_key, api_url=api_url, timeout=timeout)

        # Initialize async resources
        self.tasks = AsyncTasksResource(self)
        self.webhooks = AsyncWebhooksResource(self)


# Back-compat aliases. The lazy `torale` shim (phase 5) is what fires the
# DeprecationWarning. Inside the `webwhen` namespace these are silent — calling
# code that already imports from `webwhen` is on the new path.
Torale = Webwhen
ToraleAsync = WebwhenAsync
ToraleError = WebwhenError


__all__ = [
    "Webwhen",
    "WebwhenAsync",
    "WebwhenError",
    "Torale",
    "ToraleAsync",
    "ToraleError",
    "monitor",
    "MonitorBuilder",
    "TasksResource",
    "AsyncTasksResource",
    "WebhooksResource",
    "AsyncWebhooksResource",
    "AuthenticationError",
    "NotFoundError",
    "ValidationError",
    "RateLimitError",
    "APIError",
]
