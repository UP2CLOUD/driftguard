variable "name" { type = string }
variable "image" { type = string }
variable "region" { type = string }
variable "min_instances" {
  type    = number
  default = 0
}
variable "max_instances" {
  type    = number
  default = 10
}
variable "cpu" {
  type    = string
  default = "1"
}
variable "memory" {
  type    = string
  default = "512Mi"
}
variable "env_vars" {
  type    = map(string)
  default = {}
}
variable "secret_env" {
  type        = map(string)
  default     = {}
  description = "Map of env var name -> Secret Manager secret id (latest version)."
}
variable "command" {
  type        = list(string)
  default     = []
  description = "Override container CMD. Empty = use Dockerfile CMD."
}
variable "cpu_idle" {
  type        = bool
  default     = true
  description = "If true, CPU is throttled when no requests — cheap to keep min_instances>0 warm."
}
variable "startup_cpu_boost" {
  type        = bool
  default     = true
  description = "Boost CPU during instance startup — meaningful cold start reduction."
}
variable "container_port" {
  type    = number
  default = 8000
}

resource "google_cloud_run_v2_service" "this" {
  name     = var.name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      command = length(var.command) > 0 ? var.command : null

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        cpu_idle          = var.cpu_idle
        startup_cpu_boost = var.startup_cpu_boost
      }

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }

      ports {
        container_port = var.container_port
      }
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.this.name
  location = google_cloud_run_v2_service.this.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "url" {
  value = google_cloud_run_v2_service.this.uri
}
