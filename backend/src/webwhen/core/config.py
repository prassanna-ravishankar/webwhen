import os
import warnings
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root directory (used for locating static files, templates, etc.)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    The .env file is loaded by justfile/docker-compose, so we just
    read from the environment. This works in all environments.
    """

    model_config = SettingsConfigDict(extra="ignore")

    database_url: str = "postgresql://torale:torale@localhost:5432/torale"

    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""

    agent_url: str = "http://localhost:8001"  # Keep for backward compatibility
    agent_url_free: str = "http://localhost:8001"
    agent_url_paid: str = "http://localhost:8002"

    openai_api_key: str | None = None
    anthropic_api_key: str | None = None

    # Composio — hosted MCP gateway for custom connectors (Notion/Linear/GitHub).
    # See backend/src/webwhen/connectors/registry.py for the toolkit registry.
    composio_api_key: str | None = None

    # Novu Cloud configuration
    novu_secret_key: str | None = None
    novu_workflow_id: str = "torale-condition-met"
    novu_verification_workflow_id: str = "torale-email-verification"
    novu_welcome_workflow_id: str = "torale-task-welcome"
    novu_api_url: str = "https://eu.api.novu.co"

    gcp_project_id: str | None = None
    gcp_region: str = "us-central1"

    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_reload: bool = False

    # Frontend URL for SEO (sitemap, OpenGraph, etc.)
    frontend_url: str = "https://webwhen.ai"

    # Public API URL — used to build callback URLs for third-party redirects
    # (e.g. Composio OAuth callbacks). Populated from the API_URL env var in
    # k8s (see helm/torale/templates/configmap.yaml). Falls back to the local
    # dev default only when API_URL is unset.
    api_url: str = "http://localhost:8000"

    # Path to changelog.json file (relative to project root or absolute path)
    changelog_json_path: str = "static/changelog.json"

    # Development/testing mode - disable authentication.
    # Reads WEBWHEN_NOAUTH (preferred) or TORALE_NOAUTH (deprecated, see warning below).
    webwhen_noauth: bool = Field(
        default=False,
        validation_alias=AliasChoices("WEBWHEN_NOAUTH", "TORALE_NOAUTH"),
    )
    webwhen_noauth_email: str = Field(
        default="test@example.com",
        validation_alias=AliasChoices("WEBWHEN_NOAUTH_EMAIL", "TORALE_NOAUTH_EMAIL"),
    )

    # Platform capacity limits
    max_users: int = 100
    max_active_tasks_per_user: int = 50

    # Redis (optional — for async view counting)
    redis_host: str | None = None
    redis_port: int = 6379
    redis_password: str | None = None

    # PostHog analytics
    posthog_api_key: str | None = None
    posthog_host: str = "https://app.posthog.com"
    posthog_enabled: bool = True


settings = Settings()


def _warn_on_legacy_torale_env() -> None:
    """Emit a one-time DeprecationWarning when TORALE_* env vars are providing values
    that WEBWHEN_* could be providing instead.

    Pydantic's AliasChoices does not surface which alias was used, so we re-check
    os.environ at startup. Same once-per-process semantics as webwhen.core.env.
    """
    legacy_to_new = {
        "TORALE_NOAUTH": "WEBWHEN_NOAUTH",
        "TORALE_NOAUTH_EMAIL": "WEBWHEN_NOAUTH_EMAIL",
    }
    for legacy, new in legacy_to_new.items():
        if os.environ.get(new) is None and os.environ.get(legacy) is not None:
            warnings.warn(
                f"Environment variable {legacy!r} is deprecated, use {new!r} instead. "
                "The torale-prefixed env vars will be removed in a future release.",
                DeprecationWarning,
                stacklevel=2,
            )


_warn_on_legacy_torale_env()
