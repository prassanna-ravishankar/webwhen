"""Tests for scheduler module (_make_job_store_url)."""

from unittest.mock import patch

import pytest


class TestMakeJobStoreUrl:
    @pytest.mark.parametrize(
        "input_url,expected",
        [
            (
                "postgresql+asyncpg://user:pass@host:5432/db",
                "postgresql+psycopg2://user:pass@host:5432/db",
            ),
            (
                "postgres://user:pass@host:5432/db",
                "postgresql+psycopg2://user:pass@host:5432/db",
            ),
            (
                "postgresql://user:pass@host:5432/db",
                "postgresql+psycopg2://user:pass@host:5432/db",
            ),
        ],
    )
    @patch("webwhen.scheduler.scheduler.settings")
    def test_converts_to_psycopg2(self, mock_settings, input_url, expected):
        mock_settings.database_url = input_url

        from webwhen.scheduler.scheduler import _make_job_store_url

        assert _make_job_store_url() == expected
