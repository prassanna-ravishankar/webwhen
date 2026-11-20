"""Tests for email verification service."""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from webwhen.notifications import EmailVerificationService

from .conftest import MockTransaction


@pytest.fixture
def mock_conn():
    """Mock database connection."""
    return AsyncMock()


def _make_verification_record(sample_user, *, expires_delta=timedelta(minutes=10), attempts=0):
    """Build a verification record dict with sensible defaults."""
    return {
        "id": uuid4(),
        "user_id": sample_user.id,
        "email": "test@example.com",
        "verification_code": "123456",
        "expires_at": datetime.now(UTC) + expires_delta,
        "attempts": attempts,
        "verified": False,
    }


class TestCanSendVerification:
    """Tests for can_send_verification method."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "by_user,by_user_to_recipient,by_others,expected_error",
        [
            (0, 0, 0, None),
            (2, 2, 4, None),
            (3, 0, 0, "Too many verification requests"),
            (0, 0, 50, None),
            (1, 1, 5, "Too many verification emails to this address"),
        ],
        ids=[
            "first_request",
            "under_limits",
            "user_at_limit",
            "first_send_to_flooded_address_allowed",
            "repeat_send_to_flooded_address_refused",
        ],
    )
    async def test_rate_limit_enforcement(
        self, mock_conn, sample_user, by_user, by_user_to_recipient, by_others, expected_error
    ):
        """3 sends/hour per user; repeat sends refused once others sent 5 to the address."""
        mock_conn.fetchrow = AsyncMock(
            return_value={
                "by_user": by_user,
                "by_user_to_recipient": by_user_to_recipient,
                "by_others_to_recipient": by_others,
            }
        )

        can_send, error = await EmailVerificationService.can_send_verification(
            mock_conn, str(sample_user.id), "test@example.com"
        )

        assert can_send is (expected_error is None)
        if expected_error is None:
            assert error is None
        else:
            assert expected_error in error

    @pytest.mark.asyncio
    async def test_counts_the_append_only_send_log(self, mock_conn, sample_user):
        """Counting replaced pending rows let resends to one address bypass the limit."""
        mock_conn.fetchrow = AsyncMock(
            return_value={"by_user": 0, "by_user_to_recipient": 0, "by_others_to_recipient": 0}
        )

        await EmailVerificationService.can_send_verification(
            mock_conn, str(sample_user.id), "test@example.com"
        )

        sql = mock_conn.fetchrow.call_args.args[0]
        assert "FROM notification_sends" in sql
        assert "email_verifications" not in sql
        # The recipient counts ignore letter case.
        assert "lower(recipient_email) = lower($2)" in sql


class TestCreateVerification:
    """Tests for create_verification method."""

    def _mock_allowed(self, mock_conn):
        mock_conn.transaction = MagicMock(return_value=MockTransaction())
        mock_conn.fetchrow = AsyncMock(
            return_value={"by_user": 0, "by_user_to_recipient": 0, "by_others_to_recipient": 0}
        )
        mock_conn.execute = AsyncMock()

    @pytest.mark.asyncio
    async def test_creates_verification_record_and_logs_the_send(self, mock_conn, sample_user):
        self._mock_allowed(mock_conn)

        success, code, error = await EmailVerificationService.create_verification(
            mock_conn, str(sample_user.id), "test@example.com"
        )

        assert success is True
        assert len(code) == 6
        assert code.isdigit()
        assert error is None
        statements = [call.args[0] for call in mock_conn.execute.call_args_list]
        assert "pg_advisory_xact_lock" in statements[0]
        assert any("INSERT INTO email_verifications" in sql for sql in statements)
        assert any("INSERT INTO notification_sends" in sql for sql in statements)

    @pytest.mark.asyncio
    async def test_rejected_send_writes_nothing(self, mock_conn, sample_user):
        self._mock_allowed(mock_conn)
        mock_conn.fetchrow = AsyncMock(
            return_value={"by_user": 3, "by_user_to_recipient": 0, "by_others_to_recipient": 0}
        )

        success, code, error = await EmailVerificationService.create_verification(
            mock_conn, str(sample_user.id), "test@example.com"
        )

        assert success is False
        assert code == ""
        statements = [call.args[0] for call in mock_conn.execute.call_args_list]
        assert not any("INSERT" in sql or "DELETE" in sql for sql in statements)

    def test_codes_are_six_digits_from_a_csprng(self):
        codes = {EmailVerificationService.generate_code() for _ in range(200)}
        assert all(len(c) == 6 and c.isdigit() for c in codes)
        assert len(codes) > 190

    def test_expiry_is_15_minutes(self):
        assert EmailVerificationService.VERIFICATION_EXPIRY_MINUTES == 15


class TestVerifyCode:
    """Tests for verify_code method."""

    @pytest.mark.asyncio
    async def test_successful_verification(self, mock_conn, sample_user):
        """Test successful code verification."""
        mock_conn.transaction = MagicMock(return_value=MockTransaction())
        mock_conn.fetchrow = AsyncMock(return_value=_make_verification_record(sample_user))
        mock_conn.execute = AsyncMock()

        success, error = await EmailVerificationService.verify_code(
            mock_conn, str(sample_user.id), "test@example.com", "123456"
        )

        assert success is True
        assert error is None

    @pytest.mark.asyncio
    async def test_invalid_code(self, mock_conn, sample_user):
        """Test verification with wrong code."""
        mock_conn.transaction = MagicMock(return_value=MockTransaction())
        mock_conn.fetchrow = AsyncMock(return_value=_make_verification_record(sample_user))
        mock_conn.execute = AsyncMock()

        success, error = await EmailVerificationService.verify_code(
            mock_conn, str(sample_user.id), "test@example.com", "999999"
        )

        assert success is False
        assert "Invalid code" in error

    @pytest.mark.asyncio
    async def test_expired_code(self, mock_conn, sample_user):
        """Test verification with expired code."""
        mock_conn.transaction = MagicMock(return_value=MockTransaction())
        mock_conn.fetchrow = AsyncMock(
            return_value=_make_verification_record(sample_user, expires_delta=timedelta(minutes=-1))
        )

        success, error = await EmailVerificationService.verify_code(
            mock_conn, str(sample_user.id), "test@example.com", "123456"
        )

        assert success is False
        assert "expired" in error.lower()

    @pytest.mark.asyncio
    async def test_no_attempts_left(self, mock_conn, sample_user):
        """Test verification when no attempts remaining."""
        mock_conn.transaction = MagicMock(return_value=MockTransaction())
        mock_conn.fetchrow = AsyncMock(
            return_value=_make_verification_record(sample_user, attempts=5)
        )

        success, error = await EmailVerificationService.verify_code(
            mock_conn, str(sample_user.id), "test@example.com", "123456"
        )

        assert success is False
        assert "Too many" in error

    @pytest.mark.asyncio
    async def test_verification_not_found(self, mock_conn, sample_user):
        """Test verification when record doesn't exist."""
        mock_conn.transaction = MagicMock(return_value=MockTransaction())
        mock_conn.fetchrow = AsyncMock(return_value=None)

        success, error = await EmailVerificationService.verify_code(
            mock_conn, str(sample_user.id), "test@example.com", "123456"
        )

        assert success is False
        assert "No verification pending" in error


class TestIsEmailVerified:
    """Tests for is_email_verified method."""

    @pytest.mark.asyncio
    async def test_clerk_email_always_verified(self, mock_conn, sample_user):
        """Test that Clerk email is automatically verified."""
        mock_conn.fetchrow = AsyncMock(
            return_value={"clerk_email": sample_user.email, "in_verified_array": False}
        )

        result = await EmailVerificationService.is_email_verified(
            mock_conn, str(sample_user.id), sample_user.email
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_verified_custom_email(self, mock_conn, sample_user):
        """Test that verified custom email returns True."""
        mock_conn.fetchrow = AsyncMock(
            return_value={"clerk_email": sample_user.email, "in_verified_array": True}
        )

        result = await EmailVerificationService.is_email_verified(
            mock_conn, str(sample_user.id), "custom@example.com"
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_unverified_custom_email(self, mock_conn, sample_user):
        """Test that unverified custom email returns False."""
        mock_conn.fetchrow = AsyncMock(
            return_value={"clerk_email": sample_user.email, "in_verified_array": False}
        )

        result = await EmailVerificationService.is_email_verified(
            mock_conn, str(sample_user.id), "custom@example.com"
        )

        assert result is False


class TestCheckSpamLimits:
    """Tests for check_spam_limits method."""

    @pytest.mark.asyncio
    async def test_allows_within_daily_limit(self, mock_conn, sample_user):
        """Test that notifications under daily limit are allowed."""
        mock_conn.fetchval = AsyncMock(side_effect=[50, 5])

        allowed, error = await EmailVerificationService.check_spam_limits(
            mock_conn, str(sample_user.id), "test@example.com"
        )

        assert allowed is True
        assert error is None

    @pytest.mark.asyncio
    async def test_blocks_at_daily_limit(self, mock_conn, sample_user):
        """Test that notifications at daily limit (100) are blocked."""
        mock_conn.fetchval = AsyncMock(return_value=100)

        allowed, error = await EmailVerificationService.check_spam_limits(
            mock_conn, str(sample_user.id), "test@example.com"
        )

        assert allowed is False
        assert "Daily notification limit" in error

    @pytest.mark.asyncio
    async def test_blocks_at_hourly_limit(self, mock_conn, sample_user):
        """Test that notifications at hourly limit (10) are blocked."""
        mock_conn.fetchval = AsyncMock(side_effect=[50, 10])

        allowed, error = await EmailVerificationService.check_spam_limits(
            mock_conn, str(sample_user.id), "test@example.com"
        )

        assert allowed is False
        assert "Too many notifications" in error
