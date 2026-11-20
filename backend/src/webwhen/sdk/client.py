"""webwhen SDK client."""

from __future__ import annotations

from typing import Any

import httpx

from webwhen.sdk.credentials import env_flag, resolve_api_key, resolve_api_url
from webwhen.sdk.exceptions import APIError, AuthenticationError, NotFoundError, ValidationError


class WebwhenClient:
    """
    Base client for interacting with the webwhen API.

    Handles authentication, request/response processing, and error handling.
    """

    def __init__(
        self,
        api_key: str | None = None,
        api_url: str | None = None,
        timeout: float = 60.0,
    ):
        """
        Initialize webwhen client.

        Args:
            api_key: API key for authentication. If not provided, will try to load from:
                1. WEBWHEN_API_KEY environment variable
                2. ~/.webwhen/config.json file
            api_url: Base URL for API. Defaults to the webwhen production API or value from config.
                     For local development, set WEBWHEN_DEV=1 to use http://localhost:8000.
            timeout: Request timeout in seconds. Defaults to 60.

        Raises:
            AuthenticationError: If no API key can be found and WEBWHEN_NOAUTH is not set.
        """
        # Check for no-auth mode (local development)
        self.noauth_mode = env_flag("WEBWHEN_NOAUTH")
        # Check for dev mode (local development with auth)
        self.dev_mode = env_flag("WEBWHEN_DEV")

        if not self.noauth_mode:
            # Try to get API key from various sources
            self.api_key = api_key or resolve_api_key()

            if not self.api_key:
                raise AuthenticationError(
                    "No API key provided. Set WEBWHEN_API_KEY environment variable "
                    "or pass api_key parameter."
                )
        else:
            self.api_key = None

        # Get API URL
        self.api_url = api_url or resolve_api_url(local=self.dev_mode or self.noauth_mode)

        # Create HTTP client
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        self.http_client = httpx.Client(
            base_url=self.api_url, headers=headers, timeout=timeout, follow_redirects=True
        )

    def _handle_response(self, response: httpx.Response) -> Any:
        """Handle HTTP response and raise appropriate exceptions."""
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            # Try to parse error response
            error_data = None  # Initialize to ensure it's always defined
            try:
                error_data = response.json()
                error_message = error_data.get("detail", str(e))
            except Exception:
                error_message = str(e)

            # Raise appropriate exception based on status code
            if response.status_code == 401:
                raise AuthenticationError(error_message) from e
            elif response.status_code == 404:
                raise NotFoundError(error_message) from e
            elif response.status_code == 400 or response.status_code == 422:
                raise ValidationError(error_message) from e
            else:
                raise APIError(
                    error_message, status_code=response.status_code, response=error_data
                ) from e

        # Return JSON response
        return response.json()

    def get(self, path: str, **kwargs) -> Any:
        """Make GET request."""
        response = self.http_client.get(path, **kwargs)
        return self._handle_response(response)

    def post(self, path: str, **kwargs) -> Any:
        """Make POST request."""
        response = self.http_client.post(path, **kwargs)
        return self._handle_response(response)

    def put(self, path: str, **kwargs) -> Any:
        """Make PUT request."""
        response = self.http_client.put(path, **kwargs)
        return self._handle_response(response)

    def delete(self, path: str, **kwargs) -> Any:
        """Make DELETE request."""
        response = self.http_client.delete(path, **kwargs)
        if response.status_code == 204:
            return None
        return self._handle_response(response)

    def close(self):
        """Close HTTP client."""
        self.http_client.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
