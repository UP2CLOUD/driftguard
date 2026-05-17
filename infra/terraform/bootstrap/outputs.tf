output "wif_provider" {
  description = "Set as GitHub Actions secret GCP_WIF_PROVIDER"
  value       = "projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/providers/${google_iam_workload_identity_pool_provider.github.workload_identity_pool_provider_id}"
}

output "deployer_sa" {
  description = "Set as GitHub Actions secret GCP_DEPLOYER_SA"
  value       = google_service_account.deployer.email
}

output "artifact_registry_url" {
  value = "${var.region}-docker.pkg.dev/${var.gcp_project}/driftguard"
}

output "tfstate_bucket" {
  description = "Pass to terraform init in envs/dev"
  value       = google_storage_bucket.tfstate.name
}

output "secrets_to_populate" {
  description = "Set values with: gcloud secrets versions add <id> --data-file=-"
  value       = [for s in google_secret_manager_secret.secrets : s.secret_id]
}
