# GKE Cluster — production-grade
# Autopilot considered but rejected: no GPU support, limited DaemonSet control
# Standard cluster with managed node pools

terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 6.0" }
  }
}

resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region    # Regional for 3-AZ HA

  # Remove default node pool — managed below
  remove_default_node_pool = true
  initial_node_count       = 1

  # Private cluster — no public node IPs
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false  # Public API endpoint (access via OIDC)
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # VPC-native networking (alias IPs)
  networking_mode = "VPC_NATIVE"
  network         = var.vpc_id
  subnetwork      = var.subnet_id
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Cilium CNI (replaces kube-proxy)
  datapath_provider = "ADVANCED_DATAPATH"
  network_policy {
    enabled  = false   # Cilium handles NetworkPolicy
    provider = "CALICO"
  }

  # Workload Identity — no SA key files
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Binary Authorization (Cosign policy enforcement)
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Node security
  node_config {
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }

  # Addons
  addons_config {
    dns_cache_config {
      enabled = true   # NodeLocal DNSCache — reduces latency
    }
    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
    gcs_fuse_csi_driver_config {
      enabled = true   # GCS bucket mounts for model weights
    }
  }

  # Enable Cloud Logging + Monitoring with filter
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }
  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS", "DAEMONSET", "DEPLOYMENT", "STATEFULSET"]
    managed_prometheus { enabled = true }
  }

  # Maintenance window: Sundays 01-05 UTC
  maintenance_policy {
    recurring_window {
      start_time = "2024-01-07T01:00:00Z"
      end_time   = "2024-01-07T05:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SU"
    }
  }

  resource_labels = var.labels
}

# ── Node Pools ──────────────────────────────────────────────────────────────

resource "google_container_node_pool" "system" {
  name     = "system"
  cluster  = google_container_cluster.primary.name
  location = var.region

  # One node per AZ, autoscale 1-3
  autoscaling {
    total_min_node_count = 3
    total_max_node_count = 9
    location_policy      = "BALANCED"
  }

  node_config {
    machine_type = "n2d-standard-4"
    disk_size_gb = 100
    disk_type    = "pd-ssd"
    spot         = false  # System nodes: no spot

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"  # Workload Identity
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    taint = [{
      key    = "node-role"
      value  = "system"
      effect = "NO_SCHEDULE"
    }]

    labels = merge(var.labels, { "node-role" = "system" })
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
    strategy        = "SURGE"
  }
}

resource "google_container_node_pool" "app" {
  name     = "app"
  cluster  = google_container_cluster.primary.name
  location = var.region

  autoscaling {
    total_min_node_count = 3
    total_max_node_count = 60
    location_policy      = "BALANCED"
  }

  node_config {
    machine_type = "n2d-standard-8"
    disk_size_gb = 100
    disk_type    = "pd-balanced"
    spot         = true   # 60% spot for cost savings (~70% discount)

    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]

    workload_metadata_config { mode = "GKE_METADATA" }
    shielded_instance_config {
      enable_secure_boot = true
      enable_integrity_monitoring = true
    }

    labels = merge(var.labels, { "node-role" = "app" })
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

resource "google_container_node_pool" "infra" {
  name     = "infra"
  cluster  = google_container_cluster.primary.name
  location = var.region

  autoscaling {
    total_min_node_count = 3
    total_max_node_count = 9
    location_policy      = "BALANCED"
  }

  node_config {
    machine_type = "n2d-highmem-4"
    disk_size_gb = 200
    disk_type    = "pd-ssd"
    spot         = false   # DB nodes: no spot

    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    workload_metadata_config { mode = "GKE_METADATA" }
    shielded_instance_config { enable_secure_boot = true }

    taint = [{
      key    = "cloud.google.com/gke-nodepool"
      value  = "infra"
      effect = "NO_SCHEDULE"
    }]
    labels = merge(var.labels, { "cloud.google.com/gke-nodepool" = "infra" })
  }

  management { auto_repair = true; auto_upgrade = true }
}

resource "google_container_node_pool" "gpu" {
  name     = "gpu"
  cluster  = google_container_cluster.primary.name
  location = var.region

  autoscaling {
    total_min_node_count = 0   # Scale to zero when no embedding jobs
    total_max_node_count = 4
    location_policy      = "ANY"
  }

  node_config {
    machine_type = "a2-highgpu-1g"
    guest_accelerator = [{
      type  = "nvidia-tesla-t4"
      count = 1
      gpu_driver_installation_config = [{
        gpu_driver_version = "LATEST"
      }]
    }]
    disk_size_gb = 200
    disk_type    = "pd-ssd"
    spot         = true   # GPU spot: ~70% savings

    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    workload_metadata_config { mode = "GKE_METADATA" }

    taint = [{
      key    = "nvidia.com/gpu"
      value  = "present"
      effect = "NO_SCHEDULE"
    }]
    labels = merge(var.labels, { "cloud.google.com/gke-accelerator" = "nvidia-tesla-t4" })
  }

  management { auto_repair = true; auto_upgrade = false }  # Manual GPU upgrades
}

variable "cluster_name" {}
variable "region"       {}
variable "project_id"   {}
variable "vpc_id"       {}
variable "subnet_id"    {}
variable "labels"       { default = {} }
