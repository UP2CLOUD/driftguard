variable "gcp_project" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type    = string
  default = "europe-west1"
}

variable "github_repo" {
  type        = string
  description = "GitHub repo allowed to assume the deployer SA, in owner/repo form"
}
