"""Tests for error classification and user-friendly message sanitization."""

import asyncpg.exceptions as asyncpg_ex
import pytest

from webwhen.scheduler.errors import (
    ErrorCategory,
    classify_error,
    get_user_friendly_message,
    should_retry,
)


class TestErrorClassification:
    """Tests for classify_error mapping."""

    @pytest.mark.parametrize(
        "error,expected_category",
        [
            (Exception("429 Rate limit exceeded"), ErrorCategory.RATE_LIMIT),
            (TimeoutError("Request timed out after 30s"), ErrorCategory.TIMEOUT),
            (ConnectionError("Connection refused"), ErrorCategory.NETWORK),
            (asyncpg_ex.PostgresConnectionError("connection lost"), ErrorCategory.NETWORK),
            (asyncpg_ex.OutOfMemoryError("out of memory"), ErrorCategory.SYSTEM_ERROR),
            (
                asyncpg_ex.InsufficientResourcesError("too many connections"),
                ErrorCategory.SYSTEM_ERROR,
            ),
        ],
        ids=[
            "rate_limit",
            "timeout",
            "connection_error",
            "asyncpg_connection",
            "asyncpg_oom",
            "asyncpg_resources",
        ],
    )
    def test_classification(self, error, expected_category):
        assert classify_error(error) == expected_category


class TestMessageSanitization:
    """Tests for get_user_friendly_message -- verifies no sensitive data leaks."""

    def test_user_error_sanitized_invalid(self):
        """USER_ERROR with 'invalid' keyword is sanitized."""
        error = ValueError("Invalid column 'secret_api_key' in database schema")
        category = classify_error(error)
        message = get_user_friendly_message(error, category)

        assert "secret_api_key" not in message.lower()
        assert "database" not in message.lower()
        assert "column" not in message.lower()
        assert "invalid data" in message.lower()

    def test_user_error_sanitized_malformed(self):
        """USER_ERROR with 'malformed' keyword is sanitized."""
        error = ValueError("Malformed JSON in field 'user_credentials'")
        category = classify_error(error)
        message = get_user_friendly_message(error, category)

        assert "user_credentials" not in message.lower()
        assert "json" not in message.lower()
        assert "malformed" in message.lower()

    def test_user_error_fallback(self):
        """USER_ERROR without specific keywords gets generic message."""
        error = ValueError("Something invalid but not matching patterns")
        category = ErrorCategory.USER_ERROR
        message = get_user_friendly_message(error, category)

        assert "something" not in message.lower()
        assert "unable to process" in message.lower() or "check your input" in message.lower()

    def test_network_error_message(self):
        """NETWORK errors do not leak internal hostnames/ports."""
        error = ConnectionError("Connection refused to internal-api.torale.local:8080")
        category = classify_error(error)
        message = get_user_friendly_message(error, category)

        assert "internal-api" not in message.lower()
        assert "8080" not in message
        assert "connection" in message.lower() or "retrying" in message.lower()


class TestBillingErrors:
    """Provider credit exhaustion is its own category (messages as seen in prod, Nov 2026)."""

    @pytest.mark.parametrize(
        "message",
        [
            "Agent task 3e67 upstream 402: status_code: 402, model_name: gemini-3.5-flash-lite, "
            "body: {'error': {'code': 402, 'message': 'Your prepayment credits are depleted.'}}",
            "Error code: 401 - {'error': {'message': 'You exceeded your current quota, add credits "
            "at https://console.perplexity.ai/project/billing.', 'type': 'insufficient_quota', "
            "'code': 401}}",
        ],
        ids=["gemini_402", "perplexity_insufficient_quota"],
    )
    def test_credit_exhaustion_is_billing_not_rate_limit(self, message):
        assert classify_error(RuntimeError(message)) == ErrorCategory.BILLING

    def test_free_tier_429_is_still_rate_limit(self):
        message = (
            "Agent task b4c4 upstream 429: status_code: 429, body: {'error': {'code': 429, "
            "'message': 'You exceeded your current quota, please check your plan and billing details.'}}"
        )
        assert classify_error(RuntimeError(message)) == ErrorCategory.RATE_LIMIT

    def test_billing_is_not_retried(self):
        assert should_retry(ErrorCategory.BILLING, 0) is False

    def test_billing_message_does_not_blame_the_user(self):
        message = get_user_friendly_message(RuntimeError("x"), ErrorCategory.BILLING)
        assert "next scheduled run" in message
