"""
Host-aware behavior for SEO endpoints (audit V2 B4).

The same FastAPI app serves the marketing-zone HTTPRoute (webwhen.ai) and
the API zone HTTPRoute (api.webwhen.ai). Without host discrimination the
api host mirrors the marketing sitemap and robots — a cross-host
sitemap-declaration anti-pattern flagged by SEO_AUDIT_V2.

We test the boundary: marketing host serves SEO content; non-marketing
hosts get a blanket Disallow (robots) or 404 (sitemap/changelog).
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from webwhen.api.routers.sitemap import router as sitemap_router


@pytest.fixture
def client_marketing_host():
    """Client whose Host header matches settings.frontend_url (default: webwhen.ai)."""
    app = FastAPI()
    app.include_router(sitemap_router)
    return TestClient(app, base_url="https://webwhen.ai")


@pytest.fixture
def client_api_host():
    """Client posing as api.webwhen.ai — same FastAPI app, different host header."""
    app = FastAPI()
    app.include_router(sitemap_router)
    return TestClient(app, base_url="https://api.webwhen.ai")


class TestApiHostDoesNotLeakSeoEndpoints:
    """B4: api.webwhen.ai must not mirror the marketing sitemap/changelog."""

    def test_robots_on_api_host_is_blanket_disallow(self, client_api_host):
        resp = client_api_host.get("/robots.txt")
        assert resp.status_code == 200
        assert resp.text.strip() == "User-agent: *\nDisallow: /"

    def test_sitemap_index_on_api_host_returns_404(self, client_api_host):
        resp = client_api_host.get("/sitemap.xml")
        assert resp.status_code == 404

    def test_sitemap_dynamic_on_api_host_returns_404(self, client_api_host):
        resp = client_api_host.get("/sitemap-dynamic.xml")
        assert resp.status_code == 404

    def test_changelog_rss_on_api_host_returns_404(self, client_api_host):
        resp = client_api_host.get("/changelog.xml")
        assert resp.status_code == 404


class TestMarketingHostStillServes:
    """Regression guard: the marketing host must keep serving SEO endpoints."""

    def test_robots_on_marketing_host_lists_sitemap(self, client_marketing_host):
        resp = client_marketing_host.get("/robots.txt")
        assert resp.status_code == 200
        assert "Sitemap: https://webwhen.ai/sitemap.xml" in resp.text
        assert "Disallow: /dashboard" in resp.text
        # The marketing robots is NOT blanket-disallow.
        assert "Allow: /" in resp.text
