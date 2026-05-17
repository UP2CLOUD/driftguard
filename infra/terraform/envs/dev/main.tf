terraform {
  required_version = ">= 1.9"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    bucket = "driftguard-tfstate-dev"
    prefix = "envs/dev"
  }
}

provider "google" {
  project = var.gcp_project
  region  = var.region
}

module "api" {
  source = "../../modules/cloud-run"

  name          = "driftguard-api"
  image         = var.api_image
  region        = var.region
  min_instances = 0
  max_instances = 10
  cpu           = "1"
  memory        = "512Mi"

  env_vars = {
    ENVIRONMENT = "dev"
  }

  secret_env = {
    DATABASE_URL          = "driftguard-database-url"
    REDIS_URL             = "driftguard-redis-url"
    SECRET_KEY            = "driftguard-secret-key"
    GITHUB_APP_ID         = "driftguard-gh-app-id"
    GITHUB_APP_PRIVATE_KEY = "driftguard-gh-app-pk"
    GITHUB_WEBHOOK_SECRET = "driftguard-gh-webhook-secret"
    ANTHROPIC_API_KEY     = "driftguard-anthropic-key"
    INFRACOST_API_KEY     = "driftguard-infracost-key"
  }
}
