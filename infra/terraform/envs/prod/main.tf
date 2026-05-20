terraform {
  required_version = ">= 1.9"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
  backend "gcs" {}
}

provider "google" {
  project = var.gcp_project
  region  = var.region
}

# ── API — Cloud Run ───────────────────────────────────────────────────────────
module "api" {
  source = "../../modules/cloud-run"

  name          = "driftguard-api"
  image         = var.api_image
  region        = var.region
  min_instances = 1
  max_instances = 20
  cpu           = "2"
  memory        = "1Gi"

  env_vars = {
    ENVIRONMENT = "prod"
  }

  secret_env = {
    DATABASE_URL           = "driftguard-database-url"
    REDIS_URL              = "driftguard-redis-url"
    SECRET_KEY             = "driftguard-secret-key"
    GITHUB_APP_ID          = "driftguard-gh-app-id"
    GITHUB_APP_PRIVATE_KEY = "driftguard-gh-app-pk"
    GITHUB_WEBHOOK_SECRET  = "driftguard-gh-webhook-secret"
    ANTHROPIC_API_KEY      = "driftguard-anthropic-key"
    OPENAI_API_KEY         = "driftguard-openai-key"
    INFRACOST_API_KEY      = "driftguard-infracost-key"
    RESEND_API_KEY         = "driftguard-resend-key"
    SENTRY_DSN             = "driftguard-sentry-dsn"
    POSTHOG_API_KEY        = "driftguard-posthog-key"
    S3_ENDPOINT            = "driftguard-r2-endpoint"
    S3_ACCESS_KEY          = "driftguard-r2-access-key"
    S3_SECRET_KEY          = "driftguard-r2-secret-key"
    STRIPE_SECRET_KEY      = "driftguard-stripe-secret"
    STRIPE_WEBHOOK_SECRET  = "driftguard-stripe-webhook-secret"
  }
}

# ── Celery worker — Cloud Run Service (always-on) ────────────────────────────
module "worker" {
  source = "../../modules/cloud-run"

  name          = "driftguard-worker"
  image         = var.api_image
  region        = var.region
  min_instances = 1
  max_instances = 5
  cpu           = "2"
  memory        = "2Gi"

  command = ["celery", "-A", "driftguard.worker.app", "worker",
             "-Q", "analysis,notifications", "-c", "2", "--loglevel=info"]

  env_vars = {
    ENVIRONMENT = "prod"
  }

  secret_env = {
    DATABASE_URL           = "driftguard-database-url"
    REDIS_URL              = "driftguard-redis-url"
    SECRET_KEY             = "driftguard-secret-key"
    GITHUB_APP_ID          = "driftguard-gh-app-id"
    GITHUB_APP_PRIVATE_KEY = "driftguard-gh-app-pk"
    ANTHROPIC_API_KEY      = "driftguard-anthropic-key"
    OPENAI_API_KEY         = "driftguard-openai-key"
    INFRACOST_API_KEY      = "driftguard-infracost-key"
    RESEND_API_KEY         = "driftguard-resend-key"
    SENTRY_DSN             = "driftguard-sentry-dsn"
    POSTHOG_API_KEY        = "driftguard-posthog-key"
    S3_ENDPOINT            = "driftguard-r2-endpoint"
    S3_ACCESS_KEY          = "driftguard-r2-access-key"
    S3_SECRET_KEY          = "driftguard-r2-secret-key"
  }
}
