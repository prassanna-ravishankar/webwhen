"""API key and URL resolution shared by the sync and async SDK clients."""

from __future__ import annotations

import json
import os
from json import JSONDecodeError
from pathlib import Path
from typing import Any

DEFAULT_API_URL = "https://api.webwhen.ai"
LOCAL_API_URL = "http://localhost:8000"


def config_path() -> Path:
    return Path.home() / ".webwhen" / "config.json"


def read_config() -> dict[str, Any]:
    """Read ~/.webwhen/config.json. The file is optional; missing or malformed reads as empty."""
    try:
        with open(config_path()) as f:
            config = json.load(f)
    except (OSError, JSONDecodeError):
        return {}
    return config if isinstance(config, dict) else {}


def env_flag(name: str) -> bool:
    return os.environ.get(name) == "1"


def resolve_api_key() -> str | None:
    """WEBWHEN_API_KEY, then the config file."""
    return os.environ.get("WEBWHEN_API_KEY") or read_config().get("api_key") or None


def resolve_api_url(local: bool) -> str:
    """WEBWHEN_API_URL, then localhost in dev/noauth mode, then the config file, then production."""
    if api_url := os.environ.get("WEBWHEN_API_URL"):
        return api_url
    if local:
        return LOCAL_API_URL
    return read_config().get("api_url") or DEFAULT_API_URL
