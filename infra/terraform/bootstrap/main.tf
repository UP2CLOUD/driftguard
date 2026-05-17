terraform {
  required_version = ">= 1.9"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.gcp_project
  region  = var.region
}

data "google_project" "current" {}

locals {
  apis = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "compute.googleapis.com",
    "storage.googleapis.com",
  ]

  secret_ids = [
    "driftguard-database-url",
    "driftguard-redis-url",
    "driftguard-secret-key",
    "driftguard-gh-app-id",
    "driftguard-gh-app-pk",
    "driftguard-gh-webhook-secret",
    "driftguard-anthropic-key",
    "driftguard-infracost-key",
  ]

  deployer_roles = [
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/secretmanager.admin",
    "roles/iam.serviceAccountUser",
    "roles/storage.objectAdmin",
  ]

  cloud_run_sa = "${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  service            = each.value
  disable_on_destroy = false
}

resource "google_storage_bucket" "tfstate" {
  name                        = "${var.gcp_project}-tfstate"
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 10
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_artifact_registry_repository" "driftguard" {
  location      = var.region
  repository_id = "driftguard"
  format        = "DOCKER"
  description   = "Driftguard container images"

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "deployer" {
  account_id   = "driftguard-deployer"
  display_name = "Driftguard CI deployer"
  description  = "Used by GitHub Actions via WIF to deploy Cloud Run"
}

resource "google_project_iam_member" "deployer" {
  for_each = toset(local.deployer_roles)
  project  = var.gcp_project
  role     = each.value
  member   = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  depends_on                = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "assertion.repository == \"${var.github_repo}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = toset(local.secret_ids)
  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_iam_member" "runtime_access" {
  for_each  = google_secret_manager_secret.secrets
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.cloud_run_sa}"
}
