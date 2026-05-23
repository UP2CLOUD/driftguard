# PostgreSQL HA — CloudNativePG operator on Kubernetes
# Patroni-based 3-node cluster with streaming replication
# pgvector extension for semantic memory
# PodDisruptionBudget: minAvailable=2

terraform {
  required_providers {
    kubernetes  = { source = "hashicorp/kubernetes", version = "~> 2.30" }
    helm        = { source = "hashicorp/helm",       version = "~> 2.14" }
    kubectl     = { source = "gavinbunney/kubectl",  version = "~> 1.14" }
    random      = { source = "hashicorp/random",     version = "~> 3.6" }
  }
}

# ── CloudNativePG operator ────────────────────────────────────────────────
resource "helm_release" "cnpg_operator" {
  name       = "cnpg"
  repository = "https://cloudnative-pg.github.io/charts"
  chart      = "cloudnative-pg"
  version    = "0.21.0"
  namespace  = "cnpg-system"
  create_namespace = true

  set {
    name  = "monitoring.enablePodMonitor"
    value = "true"
  }
}

# ── PostgreSQL cluster manifest ────────────────────────────────────────────
resource "kubectl_manifest" "postgres_cluster" {
  depends_on = [helm_release.cnpg_operator]

  yaml_body = yamlencode({
    apiVersion = "postgresql.cnpg.io/v1"
    kind       = "Cluster"
    metadata = {
      name      = "driftguard-postgres"
      namespace = var.namespace
      labels    = { "app.kubernetes.io/part-of" = "driftguard" }
    }
    spec = {
      instances = var.instances  # 3 primary + 2 replicas

      postgresql = {
        parameters = {
          max_connections            = "200"
          shared_buffers             = "2GB"
          effective_cache_size       = "6GB"
          work_mem                   = "64MB"
          maintenance_work_mem       = "256MB"
          wal_buffers                = "64MB"
          default_statistics_target  = "100"
          random_page_cost           = "1.1"
          effective_io_concurrency   = "200"
          # pgvector
          shared_preload_libraries   = "pg_stat_statements,vector"
          # Logging
          log_min_duration_statement = "1000"
          log_checkpoints            = "on"
          log_lock_waits             = "on"
        }
        pg_hba = [
          "local all all trust",
          "host all all 127.0.0.1/32 md5",
          "host all all ::1/128 md5",
          "hostssl all streaming_replica all md5",
          "hostssl all all all scram-sha-256",
        ]
      }

      # Superuser secret from External Secrets
      superuserSecret = { name = "postgres-superuser" }

      storage = {
        size         = var.storage_size  # 500Gi prod
        storageClass = "premium-rwo"    # SSD PVC
      }

      backup = {
        barmanObjectStore = {
          destinationPath = "gs://${var.backup_bucket}/postgres"
          googleCredentials = {
            applicationCredentials = {
              secret = { name = "postgres-gcs-credentials" }
            }
          }
          wal = {
            compression = "gzip"
            maxParallel = 4
          }
        }
        retentionPolicy = "30d"
      }

      monitoring = {
        enablePodMonitor = true
      }

      resources = {
        requests = { cpu = "1", memory = "4Gi" }
        limits   = { cpu = "4", memory = "8Gi" }
      }

      affinity = {
        topologyKey = "kubernetes.io/hostname"
        enablePodAntiAffinity = true
        nodeAffinity = {
          requiredDuringSchedulingIgnoredDuringExecution = {
            nodeSelectorTerms = [{
              matchExpressions = [{
                key      = "cloud.google.com/gke-nodepool"
                operator = "In"
                values   = ["infra"]
              }]
            }]
          }
        }
      }
    }
  })
}

# ── PodDisruptionBudget ────────────────────────────────────────────────────
resource "kubectl_manifest" "postgres_pdb" {
  yaml_body = yamlencode({
    apiVersion = "policy/v1"
    kind       = "PodDisruptionBudget"
    metadata   = { name = "postgres-pdb", namespace = var.namespace }
    spec = {
      minAvailable  = 2
      selector = {
        matchLabels = {
          "postgresql" = "driftguard-postgres"
        }
      }
    }
  })
}

# ── Scheduled backup CronJob ────────────────────────────────────────────────
resource "kubectl_manifest" "scheduled_backup" {
  yaml_body = yamlencode({
    apiVersion = "postgresql.cnpg.io/v1"
    kind       = "ScheduledBackup"
    metadata   = { name = "postgres-daily-backup", namespace = var.namespace }
    spec = {
      schedule          = "0 2 * * *"   # 2 AM UTC
      backupOwnerReference = "self"
      cluster = { name = "driftguard-postgres" }
    }
  })
}

variable "namespace"    { default = "driftguard-data" }
variable "instances"    { default = 3 }
variable "storage_size" { default = "100Gi" }
variable "backup_bucket" {}
