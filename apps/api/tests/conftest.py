import pytest

from driftguard.core.config import settings


@pytest.fixture(autouse=True)
def _patch_secret_key(monkeypatch):
    """Tests use a fixed key so Authorization headers are predictable."""
    monkeypatch.setattr(settings, "secret_key", "dev-only-change-me")


@pytest.fixture(autouse=True)
def _patch_environment(monkeypatch):
    """Settings defaults to "dev", which main.py's lifespan hook treats as
    "connect to a real Postgres and seed demo data" -- any test that enters
    TestClient(app) as a context manager (required for websocket tests, and
    used by webhook tests for their standard startup/shutdown semantics)
    triggers that hook and fails with a raw connection error whenever no
    local Postgres is reachable, independent of get_db dependency overrides.
    "test" is already a recognized environment value (see
    services/analytics.py) that skips the dev-only seed block entirely.
    """
    monkeypatch.setattr(settings, "environment", "test")
