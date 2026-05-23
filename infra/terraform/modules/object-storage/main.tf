# Object Storage — GCS (SaaS) + S3-compatible (self-hosted)
# Usage:
#   - Terraform plan artefacts (signed URLs, TTL 24h)
#   - Model weights for embedding workers (read-only, CSI mount)
#   - Audit log exports (write-once, retention lock)
#   - Velero cluster backups
#   - Barman WAL archives for Postgres

terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 6.0" }
  }
}

# ── Terraform plan artefacts ────────────────────────────────────────────────
resource "google_storage_bucket" "plans" {
  name          = "${var.project_id}-dg-plans"
  location      = var.region
  storage_class = "STANDARD"
  force_destroy = false

  versioning { enabled = false }

  # Auto-delete plan files after 24 hours
  lifecycle_rule {
    condition { age = 1 }
    action    { type = "Delete" }
  }

  # Encryption with CMEK
  encryption { default_kms_key_name = var.kms_key_id }

  # Block all public access
  public_access_prevention    = "enforced"
  uniform_bucket_level_access = true

  cors {
    origin          = ["https://*.driftguard.io"]
    method          = ["GET"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  labels = var.labels
}

# ── Audit log archive (WORM — Retention Lock) ────────────────────────────────
resource "google_storage_bucket" "audit_logs" {
  name          = "${var.project_id}-dg-audit-logs"
  location      = var.multi_region  # "EU" or "US"
  storage_class = "NEARLINE"
  force_destroy = false

  versioning { enabled = true }

  # Object retention: 7 years for compliance (GDPR/NIS2)
  retention_policy {
    retention_period = 220752000  # 7 years in seconds
    is_locked        = true       # WORM: cannot be reduced
  }

  encryption { default_kms_key_name = var.kms_key_id }
  public_access_prevention    = "enforced"
  uniform_bucket_level_access = true

  # Move to Coldline after 90 days
  lifecycle_rule {
    condition { age = 90 }
    action    { type = "SetStorageClass"; storage_class = "COLDLINE" }
  }

  labels = var.labels
}

# ── Model weights bucket (shared, read-only for workers) ────────────────────
resource "google_storage_bucket" "models" {
  name          = "${var.project_id}-dg-models"
  location      = var.region
  storage_class = "STANDARD"
  force_destroy = false

  versioning { enabled = true }
  public_access_prevention    = "enforced"
  uniform_bucket_level_access = true
  encryption { default_kms_key_name = var.kms_key_id }

  labels = merge(var.labels, { purpose = "model-weights" })
}

# ── Postgres WAL / Barman backups ────────────────────────────────────────────
resource "google_storage_bucket" "pg_backups" {
  name          = "${var.project_id}-dg-pg-backups"
  location      = var.multi_region
  storage_class = "NEARLINE"
  force_destroy = false

  versioning { enabled = true }
  public_access_prevention    = "enforced"
  uniform_bucket_level_access = true
  encryption { default_kms_key_name = var.kms_key_id }

  # Keep backups 30 days
  lifecycle_rule {
    condition { age = 30 }
    action    { type = "Delete" }
  }

  labels = var.labels
}

# ── Velero cluster state backups ─────────────────────────────────────────────
resource "google_storage_bucket" "velero" {
  name          = "${var.project_id}-dg-velero"
  location      = var.multi_region
  storage_class = "NEARLINE"
  force_destroy = false

  versioning { enabled = true }
  public_access_prevention    = "enforced"
  uniform_bucket_level_access = true

  lifecycle_rule {
    condition { age = 30 }
    action    { type = "Delete" }
  }

  labels = var.labels
}

# ── IAM bindings — Workload Identity ────────────────────────────────────────
resource "google_storage_bucket_iam_member" "api_plans_writer" {
  bucket = google_storage_bucket.plans.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${var.api_sa_email}"
}

resource "google_storage_bucket_iam_member" "api_plans_reader" {
  bucket = google_storage_bucket.plans.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${var.api_sa_email}"
}

resource "google_storage_bucket_iam_member" "api_audit_writer" {
  bucket = google_storage_bucket.audit_logs.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${var.api_sa_email}"
}

resource "google_storage_bucket_iam_member" "worker_models_reader" {
  bucket = google_storage_bucket.models.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${var.worker_sa_email}"
}

resource "google_storage_bucket_iam_member" "postgres_backup_writer" {
  bucket = google_storage_bucket.pg_backups.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.postgres_sa_email}"
}

# ── Outputs ──────────────────────────────────────────────────────────────────
output "plans_bucket"      { value = google_storage_bucket.plans.name }
output "audit_logs_bucket" { value = google_storage_bucket.audit_logs.name }
output "models_bucket"     { value = google_storage_bucket.models.name }
output "pg_backups_bucket" { value = google_storage_bucket.pg_backups.name }
output "velero_bucket"     { value = google_storage_bucket.velero.name }

variable "project_id"        {}
variable "region"            { default = "europe-west1" }
variable "multi_region"      { default = "EU" }
variable "kms_key_id"        {}
variable "api_sa_email"      {}
variable "worker_sa_email"   {}
variable "postgres_sa_email" {}
variable "labels"            { default = {} }
