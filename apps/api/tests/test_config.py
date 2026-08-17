"""Regression tests for Settings() env-var parsing.

CORS_ORIGINS crashed the whole app at import time in production: pydantic
lists JSON-decode env vars by default, but docker-compose.yml's
CORS_ORIGINS is a plain comma-separated string, not JSON. Every service
imports driftguard.core.config, so this took the whole container down
before it ever bound a port -- confirmed live against a Hostman deploy
that never got past container startup.
"""

from driftguard.core.config import Settings


def test_cors_origins_accepts_comma_separated_string(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000,http://web:3000")
    settings = Settings()
    assert settings.cors_origins == ["http://localhost:3000", "http://web:3000"]


def test_cors_origins_strips_whitespace_around_commas(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", " http://a.example , http://b.example ")
    settings = Settings()
    assert settings.cors_origins == ["http://a.example", "http://b.example"]


def test_cors_origins_accepts_json_array_string(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", '["http://a.example", "http://b.example"]')
    settings = Settings()
    assert settings.cors_origins == ["http://a.example", "http://b.example"]


def test_cors_origins_default_when_unset(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    settings = Settings()
    assert "https://driftguard.io" in settings.cors_origins
    assert isinstance(settings.cors_origins, list)
