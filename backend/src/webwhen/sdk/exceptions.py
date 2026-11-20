"""webwhen SDK exceptions."""


class WebwhenError(Exception):
    """Base exception for all webwhen SDK errors."""


class AuthenticationError(WebwhenError):
    """Raised when authentication fails."""


class NotFoundError(WebwhenError):
    """Raised when a resource is not found."""


class ValidationError(WebwhenError):
    """Raised when request validation fails."""


class RateLimitError(WebwhenError):
    """Raised when rate limit is exceeded."""


class APIError(WebwhenError):
    """Raised when an API request fails."""

    def __init__(self, message: str, status_code: int | None = None, response: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response
