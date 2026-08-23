import json
from typing import Annotated

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "dev"
    database_url: str = "postgresql+asyncpg://driftguard:driftguard@localhost:5432/driftguard"
    secret_key: str = "dev-only-change-me"
    debug_endpoint_token: str = ""  # prod-only: unlocks /debug/* with matching X-Debug-Token

    # ── GitHub App ─────────────────────────────────────────────
    github_app_id: str = ""
    github_app_private_key: str = ""
    github_webhook_secret: str = ""

    @model_validator(mode="after")
    def _normalize_pem(self) -> "Settings":
        # Render/env stores PEM with literal \n — convert to real newlines
        if "\\n" in self.github_app_private_key:
            self.github_app_private_key = self.github_app_private_key.replace("\\n", "\n")
        return self

    @model_validator(mode="after")
    def _fail_fast_insecure_prod(self) -> "Settings":
        if self.environment == "prod" and self.secret_key == "dev-only-change-me":
            raise ValueError(
                "SECRET_KEY is using the insecure default in prod. "
                "Set a strong SECRET_KEY env var before starting the service."
            )
        return self

    def missing_github_config(self) -> list[str]:
        """Env var names of unset GitHub App settings.

        Any one of these missing disables the core PR review flow: an empty
        webhook secret rejects every delivery with 401, and missing App
        credentials make installation token fetches fail.
        """
        missing = []
        if not self.github_app_id:
            missing.append("GITHUB_APP_ID")
        if not self.github_app_private_key:
            missing.append("GITHUB_APP_PRIVATE_KEY")
        if not self.github_webhook_secret:
            missing.append("GITHUB_WEBHOOK_SECRET")
        return missing

    # ── LLM router ─────────────────────────────────────────────
    gemini_api_key: str = ""  # primary
    gemini_model: str = "gemini-2.5-flash"
    anthropic_api_key: str = ""  # fallback
    anthropic_model: str = "claude-sonnet-4-6"
    openai_api_key: str = ""  # fallback
    openai_model: str = "gpt-4o-mini"
    llm_fallback_enabled: bool = True
    # Voyage AI is a separate provider from Anthropic, with its own API and
    # key format (`pa-...`), despite Anthropic recommending it as an
    # embeddings partner. services/embeddings.py used to send
    # `anthropic_api_key` as the Bearer token to api.voyageai.com — that
    # call always fails auth, so every deployment silently fell back to the
    # non-semantic hash-based dev embedding, in production, indefinitely.
    voyage_api_key: str = ""

    # ── Infracost ──────────────────────────────────────────────
    infracost_api_key: str = ""

    # ── Redis / Upstash (Celery broker + cache) ────────────────
    redis_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = ""  # defaults to redis_url
    celery_enabled: bool = False  # set True only when a worker is deployed

    # ── Object storage (R2 / S3-compat) ───────────────────────
    s3_endpoint: str = ""  # e.g. https://<id>.r2.cloudflarestorage.com
    s3_bucket: str = "driftguard-plans"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_region: str = "auto"

    # ── Stripe ─────────────────────────────────────────────────
    stripe_api_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_pro: str = ""
    stripe_price_team: str = ""

    # ── Email (Resend) ─────────────────────────────────────────
    resend_api_key: str = ""
    resend_from: str = "DriftGuard <noreply@driftguard.io>"

    # ── Observability ──────────────────────────────────────────
    posthog_api_key: str = ""
    posthog_host: str = "https://eu.posthog.com"
    sentry_dsn: str = ""
    release: str = ""  # set from GIT_SHA in CI
    otel_exporter_otlp_endpoint: str = ""  # e.g. http://otel-collector:4318 — empty = disabled
    otel_service_name: str = "driftguard-api"

    # ── AWS (STS cross-account) ────────────────────────────────
    aws_region: str = "eu-west-1"

    # ── Plan limits ────────────────────────────────────────────────────────────
    free_repository_limit: int = 3
    premium_monthly_pr_limit: int = 50
    free_monthly_scan_limit: int = 20  # manual scans (/scans/upload, /scans/trigger) for free orgs

    # ── App ────────────────────────────────────────────────────
    public_base_url: str = "http://localhost:3000"
    slack_webhook_url: str = ""

    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "https://driftguard-blue.vercel.app",
        "https://driftguard.io",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_comma_separated(cls, v: object) -> object:
        # pydantic-settings JSON-decodes list-typed env vars by default, but
        # docker-compose.yml's CORS_ORIGINS (and any dashboard-style "comma
        # separated list" input, e.g. Hostman/Render/Railway env var UIs) is
        # a plain comma-separated string, not a JSON array -- that mismatch
        # crashes Settings() at import time before the app ever starts (see
        # the incident this fixes: every service imports this module, so a
        # non-JSON CORS_ORIGINS took down the whole container instantly).
        # NoDecode above is required for this validator to even see the raw
        # string -- without it, pydantic-settings JSON-decodes list-typed
        # env vars BEFORE any field_validator runs, so the crash happens one
        # layer beneath where a plain "mode=before" validator could catch it.
        # That also means WE now own JSON decoding for the array-string case,
        # since NoDecode opts out of pydantic-settings doing it for us.
        if isinstance(v, str):
            stripped = v.strip()
            if stripped.startswith("["):
                return json.loads(stripped)
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return v

    @property
    def celery_broker_url(self) -> str:
        return self.redis_url

    @property
    def celery_backend_url(self) -> str:
        return self.celery_result_backend or self.redis_url


settings = Settings()
