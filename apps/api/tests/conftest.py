import pytest

from driftguard.core.config import settings


@pytest.fixture(autouse=True)
def _patch_secret_key(monkeypatch):
    """Tests use a fixed key so Authorization headers are predictable."""
    monkeypatch.setattr(settings, "secret_key", "dev-only-change-me")
