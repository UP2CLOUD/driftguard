# Prices in USD cents per month (730 hours)
COMPUTE_PRICING: dict[str, int] = {
    "e2-micro": 613,
    "e2-small": 1226,
    "e2-medium": 2452,
    "e2-standard-2": 5330,
    "e2-standard-4": 10660,
    "e2-standard-8": 21320,
    "e2-standard-16": 42640,
    "e2-highcpu-2": 4234,
    "e2-highcpu-4": 8468,
    "e2-highmem-2": 6700,
    "e2-highmem-4": 13400,
    "n2-standard-2": 7786,
    "n2-standard-4": 15572,
    "n2-standard-8": 31144,
    "n2-standard-16": 62288,
    "n2-highcpu-2": 5840,
    "n2-highcpu-4": 11680,
    "n2-highmem-2": 10220,
    "n2-highmem-4": 20440,
    "n1-standard-1": 4749,
    "n1-standard-2": 9500,
    "n1-standard-4": 19000,
    "c2-standard-4": 19616,
    "c2-standard-8": 39232,
    "t2d-standard-2": 7009,
    "t2d-standard-4": 14018,
}

CLOUD_SQL_PRICING: dict[str, int] = {
    "db-f1-micro": 730,
    "db-g1-small": 2555,
    "db-n1-standard-1": 4380,
    "db-n1-standard-2": 8760,
    "db-n1-standard-4": 17520,
    "db-n1-highmem-2": 11680,
    "db-n1-highmem-4": 23360,
    "db-custom-2-7680": 14234,
    "db-custom-4-15360": 28468,
}

CLOUD_SQL_STORAGE_CENTS_PER_GB: int = 17  # SSD
GKE_CONTROL_PLANE_MONTHLY_CENTS: int = 7300  # $73/mo (non-autopilot)
PERSISTENT_DISK_CENTS_PER_GB: int = 4  # standard PD
SSD_DISK_CENTS_PER_GB: int = 17

CLOUD_RUN_CENTS_PER_MILLION_REQUESTS: int = 40
STORAGE_CENTS_PER_GB: int = 2  # $0.020/GB-month

def compute_monthly_cents(machine_type: str) -> int:
    return COMPUTE_PRICING.get(machine_type.lower(), 0)

def cloud_sql_monthly_cents(tier: str, storage_gb: int = 10) -> int:
    compute = CLOUD_SQL_PRICING.get(tier.lower(), 0)
    storage = storage_gb * CLOUD_SQL_STORAGE_CENTS_PER_GB
    return compute + storage

def persistent_disk_monthly_cents(disk_type: str, size_gb: int) -> int:
    if "ssd" in disk_type.lower() or "pd-ssd" in disk_type.lower():
        return size_gb * SSD_DISK_CENTS_PER_GB
    return size_gb * PERSISTENT_DISK_CENTS_PER_GB

def gke_node_pool_monthly_cents(machine_type: str, node_count: int = 1) -> int:
    return compute_monthly_cents(machine_type) * node_count
