from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "prod"
    database_url: str = "postgresql+asyncpg://driftguard:driftguard@localhost:5432/driftguard"
    secret_key: str = "dev-only-change-me"

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

    # ── LLM router ─────────────────────────────────────────────
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    openai_api_key: str = ""  # fallback
    openai_model: str = "gpt-4o-mini"
    gemini_api_key: str = ""  # fallback when Anthropic unavailable
    llm_fallback_enabled: bool = True

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

    # ── AWS (STS cross-account) ────────────────────────────────
    aws_region: str = "eu-west-1"

    # ── App ────────────────────────────────────────────────────
    public_base_url: str = "http://localhost:3000"
    slack_webhook_url: str = ""

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "https://driftguard-blue.vercel.app",
        "https://driftguard.io",
    ]

    @property
    def celery_broker_url(self) -> str:
        return self.redis_url

    @property
    def celery_backend_url(self) -> str:
        return self.celery_result_backend or self.redis_url


settings = Settings()
