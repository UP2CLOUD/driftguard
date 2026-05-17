from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "dev"
    database_url: str = "postgresql+asyncpg://driftguard:driftguard@localhost:5432/driftguard"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "dev-only-change-me"

    github_app_id: str = ""
    github_app_private_key: str = ""
    github_webhook_secret: str = ""

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"

    infracost_api_key: str = ""

    s3_endpoint: str = ""
    s3_bucket: str = "driftguard-plans"
    s3_access_key: str = ""
    s3_secret_key: str = ""

    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()
