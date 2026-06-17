# Prices in USD cents per month
EC2_PRICING: dict[str, int] = {
    "t3.nano": 379,      # $3.796/mo
    "t3.micro": 758,
    "t3.small": 1518,
    "t3.medium": 3037,
    "t3.large": 6074,
    "t3.xlarge": 12147,
    "t3.2xlarge": 24294,
    "t3a.micro": 681,
    "t3a.small": 1364,
    "t3a.medium": 2728,
    "t3a.large": 5457,
    "m5.large": 7008,
    "m5.xlarge": 14016,
    "m5.2xlarge": 28032,
    "m5.4xlarge": 56064,
    "m6i.large": 7008,
    "m6i.xlarge": 14016,
    "m6i.2xlarge": 28032,
    "m6i.4xlarge": 56064,
    "m6i.8xlarge": 112128,
    "c5.large": 6200,
    "c5.xlarge": 12400,
    "c5.2xlarge": 24800,
    "c6i.large": 6200,
    "c6i.xlarge": 12400,
    "c6i.2xlarge": 24800,
    "c6i.4xlarge": 49600,
    "r5.large": 9204,
    "r5.xlarge": 18408,
    "r5.2xlarge": 36816,
    "r6i.large": 9204,
    "r6i.xlarge": 18408,
    "r6i.2xlarge": 36816,
    "p3.2xlarge": 223400,
    "g4dn.xlarge": 52624,
    "g4dn.2xlarge": 90496,
}

RDS_PRICING: dict[str, int] = {
    "db.t3.micro": 1468,
    "db.t3.small": 2936,
    "db.t3.medium": 5872,
    "db.t3.large": 11743,
    "db.t4g.micro": 1321,
    "db.t4g.small": 2641,
    "db.t4g.medium": 5283,
    "db.m5.large": 14016,
    "db.m5.xlarge": 28032,
    "db.m5.2xlarge": 56064,
    "db.m6i.large": 14016,
    "db.m6i.xlarge": 28032,
    "db.m6i.2xlarge": 56064,
    "db.m6i.4xlarge": 112128,
    "db.r5.large": 18408,
    "db.r5.xlarge": 36816,
    "db.r5.2xlarge": 73632,
    "db.r6i.large": 18408,
    "db.r6i.xlarge": 36816,
    "db.r6i.2xlarge": 73632,
}

RDS_STORAGE_CENTS_PER_GB: int = 14   # gp2 $0.138/GB-month → ~14 cents

EBS_PRICING_CENTS_PER_GB: dict[str, int] = {
    "gp2": 10,   # $0.10/GB-month
    "gp3": 8,    # $0.08
    "io1": 13,   # $0.125 + IOPS
    "io2": 13,
    "st1": 5,
    "sc1": 3,
    "standard": 5,
}

NAT_GATEWAY_MONTHLY_CENTS: int = 3285   # $32.85/mo base (730 h × $0.045)
ALB_MONTHLY_CENTS: int = 1752           # $17.52/mo
NLB_MONTHLY_CENTS: int = 1168          # $11.68/mo
EKS_CONTROL_PLANE_MONTHLY_CENTS: int = 7300  # $73/mo
ELASTICACHE_PRICING: dict[str, int] = {
    "cache.t3.micro": 1752,
    "cache.t3.small": 3504,
    "cache.t3.medium": 5840,
    "cache.m6g.large": 10950,
    "cache.m6g.xlarge": 21900,
    "cache.r6g.large": 14600,
}
S3_CENTS_PER_GB: int = 2  # $0.023/GB-month

LAMBDA_FREE_REQUESTS: int = 1_000_000
LAMBDA_CENTS_PER_MILLION_REQUESTS: int = 20  # $0.20

def ec2_monthly_cents(instance_type: str) -> int:
    return EC2_PRICING.get(instance_type.lower(), 0)

def rds_monthly_cents(instance_class: str, storage_gb: int = 20) -> int:
    compute = RDS_PRICING.get(instance_class.lower(), 0)
    storage = storage_gb * RDS_STORAGE_CENTS_PER_GB
    return compute + storage

def ebs_monthly_cents(volume_type: str, size_gb: int) -> int:
    rate = EBS_PRICING_CENTS_PER_GB.get(volume_type.lower(), EBS_PRICING_CENTS_PER_GB["gp3"])
    return size_gb * rate

def eks_node_group_monthly_cents(instance_type: str, desired_size: int = 1) -> int:
    return ec2_monthly_cents(instance_type) * desired_size
