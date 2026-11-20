"""SDK API key / URL resolution reads only webwhen names."""

import json

import pytest

from webwhen.sdk.credentials import DEFAULT_API_URL, LOCAL_API_URL, resolve_api_key, resolve_api_url


@pytest.fixture
def home(tmp_path, monkeypatch):
    monkeypatch.setenv("HOME", str(tmp_path))
    for name in ("WEBWHEN_API_KEY", "WEBWHEN_API_URL", "TORALE_API_KEY", "TORALE_API_URL"):
        monkeypatch.delenv(name, raising=False)
    return tmp_path


def write_config(directory, **config):
    directory.mkdir()
    (directory / "config.json").write_text(json.dumps(config))


def test_env_wins_over_config(home, monkeypatch):
    write_config(home / ".webwhen", api_key="sk_file", api_url="https://file.example")
    monkeypatch.setenv("WEBWHEN_API_KEY", "sk_env")
    monkeypatch.setenv("WEBWHEN_API_URL", "https://env.example")

    assert resolve_api_key() == "sk_env"
    assert resolve_api_url(local=False) == "https://env.example"


def test_config_file_fallback(home):
    write_config(home / ".webwhen", api_key="sk_file", api_url="https://file.example")

    assert resolve_api_key() == "sk_file"
    assert resolve_api_url(local=False) == "https://file.example"
    assert resolve_api_url(local=True) == LOCAL_API_URL


def test_legacy_torale_names_are_ignored(home, monkeypatch):
    write_config(home / ".torale", api_key="sk_legacy", api_url="https://legacy.example")
    monkeypatch.setenv("TORALE_API_KEY", "sk_legacy_env")
    monkeypatch.setenv("TORALE_API_URL", "https://legacy-env.example")

    assert resolve_api_key() is None
    assert resolve_api_url(local=False) == DEFAULT_API_URL


def test_malformed_config_reads_as_empty(home):
    (home / ".webwhen").mkdir()
    (home / ".webwhen" / "config.json").write_text("{not json")

    assert resolve_api_key() is None
    assert resolve_api_url(local=False) == DEFAULT_API_URL
