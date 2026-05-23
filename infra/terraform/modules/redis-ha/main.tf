# Redis HA — Valkey (Redis OSS fork) via Sentinel, 1 primary + 2 replicas
# Alternative: Redis Operator (ot-container-kit) or Bitnami with Sentinel

resource "helm_release" "redis_ha" {
  name       = "driftguard-redis"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "redis"
  version    = "19.6.0"
  namespace  = var.namespace

  values = [yamlencode({
    architecture = "replication"

    auth = {
      enabled    = true
      existingSecret = "redis-auth"
      existingSecretPasswordKey = "password"
    }

    master = {
      count = 1
      resources = {
        requests = { cpu = "250m", memory = "512Mi" }
        limits   = { cpu = "1",    memory = "2Gi" }
      }
      persistence = {
        enabled      = true
        size         = "20Gi"
        storageClass = "premium-rwo"
      }
      affinity = {
        nodeAffinity = {
          requiredDuringSchedulingIgnoredDuringExecution = {
            nodeSelectorTerms = [{
              matchExpressions = [{
                key = "cloud.google.com/gke-nodepool"
                operator = "In"
                values = ["infra"]
              }]
            }]
          }
        }
      }
    }

    replica = {
      replicaCount = 2
      resources = {
        requests = { cpu = "250m", memory = "512Mi" }
        limits   = { cpu = "1",    memory = "2Gi" }
      }
      persistence = {
        enabled = true
        size    = "10Gi"
      }
      podAntiAffinityPreset = "hard"
    }

    sentinel = {
      enabled      = true
      masterSet    = "driftguard"
      quorum       = 2
      resources = {
        requests = { cpu = "50m",  memory = "64Mi" }
        limits   = { cpu = "200m", memory = "256Mi" }
      }
    }

    metrics = {
      enabled              = true
      serviceMonitor = {
        enabled = true
        namespace = "driftguard-observability"
      }
    }

    commonConfiguration = |
      # Persistence
      appendonly yes
      appendfsync everysec
      # Memory
      maxmemory 1500mb
      maxmemory-policy allkeys-lru
      # Latency
      hz 20
      aof-use-rdb-preamble yes
  })]
}

resource "kubectl_manifest" "redis_pdb" {
  yaml_body = yamlencode({
    apiVersion = "policy/v1"
    kind       = "PodDisruptionBudget"
    metadata   = { name = "redis-pdb", namespace = var.namespace }
    spec = {
      minAvailable = 2
      selector = {
        matchLabels = { "app.kubernetes.io/instance" = "driftguard-redis" }
      }
    }
  })
}

variable "namespace" { default = "driftguard-data" }
