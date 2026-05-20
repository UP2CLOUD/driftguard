variable "gcp_project" { type = string }
variable "region" {
  type    = string
  default = "europe-west1"
}
variable "api_image" {
  type        = string
  description = "Container image tag (e.g. europe-west1-docker.pkg.dev/PROJECT/driftguard/api:sha)"
}
