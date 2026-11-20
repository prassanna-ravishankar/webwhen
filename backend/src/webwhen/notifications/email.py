"""Email verification service to prevent spam and validate email ownership."""

import hmac
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

# Verification sends are logged in notification_sends (append-only). Counting
# email_verifications rows instead let a resend to the same address, which
# replaces its pending row, slip under the hourly limit indefinitely.
VERIFICATION_NOTIFICATION_TYPE = "email_verification"


class EmailVerificationService:
    """Handle email verification to prevent spam."""

    VERIFICATION_CODE_LENGTH = 6
    VERIFICATION_EXPIRY_MINUTES = 15
    MAX_VERIFICATION_ATTEMPTS = 5
    RATE_LIMIT_WINDOW_MINUTES = 60
    MAX_VERIFICATIONS_PER_HOUR = 3
    MAX_VERIFICATIONS_PER_RECIPIENT_PER_HOUR = 3

    @staticmethod
    def generate_code() -> str:
        """Generate 6-digit verification code."""
        return f"{secrets.randbelow(10**6):06d}"

    @staticmethod
    async def can_send_verification(conn, user_id: str, email: str) -> tuple[bool, str | None]:
        """
        Check if user can request another verification email.

        Limits sends per user and per recipient address, so neither one
        account nor several accounts can flood an inbox.

        Returns: (can_send, error_message)
        """
        window_start = datetime.now(UTC) - timedelta(
            minutes=EmailVerificationService.RATE_LIMIT_WINDOW_MINUTES
        )
        counts = await conn.fetchrow(
            """
            SELECT
                COUNT(*) FILTER (WHERE user_id = $1) AS by_user,
                COUNT(*) FILTER (WHERE recipient_email = $2) AS by_recipient
            FROM notification_sends
            WHERE notification_type = $3
              AND created_at > $4
              AND (user_id = $1 OR recipient_email = $2)
            """,
            UUID(user_id),
            email,
            VERIFICATION_NOTIFICATION_TYPE,
            window_start,
        )

        if counts["by_user"] >= EmailVerificationService.MAX_VERIFICATIONS_PER_HOUR:
            return False, "Too many verification requests. Please try again later."
        if (
            counts["by_recipient"]
            >= EmailVerificationService.MAX_VERIFICATIONS_PER_RECIPIENT_PER_HOUR
        ):
            return False, "Too many verification emails to this address. Please try again later."

        return True, None

    @staticmethod
    async def create_verification(conn, user_id: str, email: str) -> tuple[bool, str, str | None]:
        """
        Create email verification record.

        Returns: (success, code_or_error, error_message)
        """
        async with conn.transaction():
            # Serialize sends per user so concurrent requests can't both pass the limit.
            await conn.execute(
                "SELECT pg_advisory_xact_lock(hashtext('email-verification:' || $1))",
                user_id,
            )

            can_send, error = await EmailVerificationService.can_send_verification(
                conn, user_id, email
            )
            if not can_send:
                return False, "", error

            # Only one pending code per address; a resend replaces it.
            await conn.execute(
                """
                DELETE FROM email_verifications
                WHERE user_id = $1 AND email = $2 AND verified = false
                """,
                UUID(user_id),
                email,
            )

            code = EmailVerificationService.generate_code()
            expires_at = datetime.now(UTC) + timedelta(
                minutes=EmailVerificationService.VERIFICATION_EXPIRY_MINUTES
            )

            await conn.execute(
                """
                INSERT INTO email_verifications (user_id, email, verification_code, expires_at)
                VALUES ($1, $2, $3, $4)
                """,
                UUID(user_id),
                email,
                code,
                expires_at,
            )
            await conn.execute(
                """
                INSERT INTO notification_sends (user_id, recipient_email, notification_type)
                VALUES ($1, $2, $3)
                """,
                UUID(user_id),
                email,
                VERIFICATION_NOTIFICATION_TYPE,
            )

        return True, code, None

    @staticmethod
    async def verify_code(conn, user_id: str, email: str, code: str) -> tuple[bool, str | None]:
        """
        Verify email with code.

        Returns: (success, error_message)
        """
        # Use transaction and row-level locking to prevent race conditions
        async with conn.transaction():
            # Get verification record and lock the row
            record = await conn.fetchrow(
                """
                SELECT * FROM email_verifications
                WHERE user_id = $1 AND email = $2 AND verified = false
                ORDER BY created_at DESC
                LIMIT 1
                FOR UPDATE
                """,
                UUID(user_id),
                email,
            )

            if not record:
                return False, "No verification pending for this email"

            # Check if expired
            if datetime.now(UTC) > record["expires_at"]:
                return False, "Verification code expired. Request a new one."

            # Check attempts
            if record["attempts"] >= EmailVerificationService.MAX_VERIFICATION_ATTEMPTS:
                return False, "Too many failed attempts. Request a new code."

            # Check code
            if not hmac.compare_digest(record["verification_code"].encode(), code.encode()):
                # Increment attempts
                await conn.execute(
                    "UPDATE email_verifications SET attempts = attempts + 1 WHERE id = $1",
                    record["id"],
                )
                remaining = (
                    EmailVerificationService.MAX_VERIFICATION_ATTEMPTS - record["attempts"] - 1
                )
                return False, f"Invalid code. {remaining} attempts remaining."

            # Mark as verified
            await conn.execute(
                """
                UPDATE email_verifications
                SET verified = true, verified_at = NOW()
                WHERE id = $1
                """,
                record["id"],
            )

            # Add to user's verified emails list
            await conn.execute(
                """
                UPDATE users
                SET verified_notification_emails =
                    array_append(
                        COALESCE(verified_notification_emails, ARRAY[]::TEXT[]),
                        $1
                    )
                WHERE id = $2 AND NOT ($1 = ANY(COALESCE(verified_notification_emails, ARRAY[]::TEXT[])))
                """,
                email,
                UUID(user_id),
            )

            return True, None

    @staticmethod
    async def is_email_verified(conn, user_id: str, email: str) -> bool:
        """
        Check if email is verified for user.

        Auto-verifies Clerk email (from users.email field).
        Also checks verified_notification_emails array for custom emails.
        """
        result = await conn.fetchrow(
            """
            SELECT
                email AS clerk_email,
                $1 = ANY(COALESCE(verified_notification_emails, ARRAY[]::TEXT[]))
                    AS in_verified_array
            FROM users
            WHERE id = $2
            """,
            email,
            UUID(user_id),
        )

        if not result:
            return False

        # Clerk email is always verified
        if email == result["clerk_email"]:
            return True

        # Check verified array for custom emails
        return result["in_verified_array"] or False

    @staticmethod
    async def check_spam_limits(conn, user_id: str, email: str) -> tuple[bool, str | None]:
        """
        Check if user is within spam limits.

        Limits:
        - Max 100 notifications per day per user
        - Max 10 notifications per hour to same email address

        Returns: (allowed, error_message)
        """
        # Check daily limit per user
        day_ago = datetime.now(UTC) - timedelta(days=1)
        daily_count = await conn.fetchval(
            """
            SELECT COUNT(*) FROM notification_sends
            WHERE user_id = $1 AND created_at > $2
            """,
            UUID(user_id),
            day_ago,
        )

        if daily_count >= 100:
            return False, "Daily notification limit reached (100/day)"

        # Check hourly limit per email
        hour_ago = datetime.now(UTC) - timedelta(hours=1)
        hourly_count = await conn.fetchval(
            """
            SELECT COUNT(*) FROM notification_sends
            WHERE recipient_email = $1 AND created_at > $2
            """,
            email,
            hour_ago,
        )

        if hourly_count >= 10:
            return False, f"Too many notifications to {email} (max 10/hour)"

        return True, None
