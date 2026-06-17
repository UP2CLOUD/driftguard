from __future__ import annotations
from ..parsers.terraform_diff import ResourceChange
from ..pricing import gcp as pricing


_GCP_RESOURCE_TYPES = {
    "google_compute_instance",
    "google_compute_disk",
    "google_sql_database_instance",
    "google_container_cluster",
    "google_container_node_pool",
    "google_storage_bucket",
    "google_cloud_run_service",
    "google_cloudfunctions_function",
    "google_compute_forwarding_rule",
}


def estimate(rc: ResourceChange) -> int:
    if rc.resource_type not in _GCP_RESOURCE_TYPES:
        return 0
    a = rc.attributes

    if rc.resource_type == "google_compute_instance":
        mtype = a.get("machine_type", "e2-medium")
        return pricing.compute_monthly_cents(str(mtype))

    if rc.resource_type == "google_compute_disk":
        dtype = a.get("type", "pd-standard")
        size = int(a.get("size", 50))
        return pricing.persistent_disk_monthly_cents(str(dtype), size)

    if rc.resource_type == "google_sql_database_instance":
        tier = a.get("tier", "db-n1-standard-1")
        storage = int(a.get("storage_size_gb", a.get("disk_size", 10)))
        return pricing.cloud_sql_monthly_cents(str(tier), storage)

    if rc.resource_type == "google_container_cluster":
        return pricing.GKE_CONTROL_PLANE_MONTHLY_CENTS

    if rc.resource_type == "google_container_node_pool":
        mtype = a.get("machine_type", "e2-standard-2")
        count = int(a.get("initial_node_count", a.get("node_count", 1)))
        return pricing.gke_node_pool_monthly_cents(str(mtype), count)

    if rc.resource_type == "google_storage_bucket":
        return 0  # usage-based

    if rc.resource_type in ("google_cloud_run_service", "google_cloudfunctions_function"):
        return 0  # usage-based

    if rc.resource_type == "google_compute_forwarding_rule":
        return 730  # $7.30/mo base

    return 0
