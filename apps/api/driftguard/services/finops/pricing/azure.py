# Prices in USD cents per month (730 hours)
VM_PRICING: dict[str, int] = {
    # B-series burstable
    "standard_b1s": 730,
    "standard_b1ms": 1460,
    "standard_b2s": 4015,
    "standard_b2ms": 6570,
    "standard_b4ms": 13140,
    "standard_b8ms": 26280,
    # D-series general purpose
    "standard_d2s_v3": 7008,
    "standard_d4s_v3": 14016,
    "standard_d8s_v3": 28032,
    "standard_d2s_v5": 7008,
    "standard_d4s_v5": 14016,
    "standard_d8s_v5": 28032,
    "standard_d2as_v5": 6570,
    "standard_d4as_v5": 13140,
    "standard_d8as_v5": 26280,
    # E-series memory optimized
    "standard_e2s_v5": 10220,
    "standard_e4s_v5": 20440,
    "standard_e8s_v5": 40880,
    "standard_e2as_v5": 9490,
    "standard_e4as_v5": 18980,
    # F-series compute optimized
    "standard_f2s_v2": 6132,
    "standard_f4s_v2": 12264,
}

MANAGED_DISK_PRICING: dict[str, int] = {
    # Standard HDD
    "standard_lrs_s4": 146,   # 32 GB
    "standard_lrs_s6": 292,   # 64 GB
    "standard_lrs_s10": 730,  # 128 GB
    # Standard SSD
    "standardssd_lrs_e4": 300,
    "standardssd_lrs_e6": 600,
    "standardssd_lrs_e10": 1200,
    # Premium SSD
    "premium_lrs_p4": 584,
    "premium_lrs_p6": 1022,
    "premium_lrs_p10": 1752,
    "premium_lrs_p20": 3504,
    "premium_lrs_p30": 5840,
}

MANAGED_DISK_CENTS_PER_GB: dict[str, int] = {
    "standard_lrs": 5,    # ~$0.05/GB
    "standardssd_lrs": 8, # ~$0.075/GB
    "premium_lrs": 15,    # ~$0.15/GB
    "ultrassd_lrs": 30,   # ~$0.30/GB
}

AKS_CONTROL_PLANE_MONTHLY_CENTS: int = 7300  # $73/mo (non-free tier)
POSTGRESQL_FLEXIBLE_PRICING: dict[str, int] = {
    "standard_d2s_v3": 11678,
    "standard_d4s_v3": 23356,
    "standard_d8s_v3": 46712,
    "burstable_b1ms": 1825,
    "burstable_b2s": 3650,
    "burstable_b2ms": 7300,
    "memoryo_e2ds_v4": 18250,
    "memoryo_e4ds_v4": 36500,
}
POSTGRESQL_STORAGE_CENTS_PER_GB: int = 12
MYSQL_FLEXIBLE_PRICING = POSTGRESQL_FLEXIBLE_PRICING  # similar tier pricing

STORAGE_ACCOUNT_CENTS_PER_GB: int = 2   # LRS hot tier
APP_SERVICE_PLAN: dict[str, int] = {
    "free": 0,
    "shared": 730,
    "b1": 4015,
    "b2": 8030,
    "b3": 16060,
    "s1": 5840,
    "s2": 11680,
    "p1v3": 11680,
    "p2v3": 23360,
}
NAT_GATEWAY_MONTHLY_CENTS: int = 3650   # $36.50/mo base

def vm_monthly_cents(size: str) -> int:
    return VM_PRICING.get(size.lower().replace("-", "_"), 0)

def managed_disk_monthly_cents(sku: str, size_gb: int) -> int:
    rate = MANAGED_DISK_CENTS_PER_GB.get(sku.lower().replace("-", "_"), 8)
    return size_gb * rate

def aks_node_monthly_cents(vm_size: str, node_count: int = 1) -> int:
    return vm_monthly_cents(vm_size) * node_count

def postgresql_flexible_monthly_cents(sku: str, storage_gb: int = 32) -> int:
    compute = POSTGRESQL_FLEXIBLE_PRICING.get(sku.lower().replace("-", "_"), 0)
    storage = storage_gb * POSTGRESQL_STORAGE_CENTS_PER_GB
    return compute + storage
