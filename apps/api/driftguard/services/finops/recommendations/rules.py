from __future__ import annotations

from dataclasses import dataclass

from ..parsers.terraform_diff import ResourceChange

_COST_TAGS = {"environment", "owner", "service", "application", "cost_center", "team"}


@dataclass
class Recommendation:
    resource_label: str
    title: str
    detail: str
    severity: str  # "info" | "warning" | "critical"


def generate(rc: ResourceChange, monthly_cents: int) -> list[Recommendation]:
    recs: list[Recommendation] = []
    a = rc.attributes
    rtype = rc.resource_type

    # Missing cost allocation tags
    tags: dict = a.get("_tags", {})
    missing_tags = _COST_TAGS - set(k.lower() for k in tags.keys())
    if missing_tags and rtype not in ("aws_s3_bucket", "google_storage_bucket", "azurerm_storage_account"):
        recs.append(
            Recommendation(
                resource_label=rc.label,
                title="Missing cost allocation tags",
                detail=(
                    f"Add cost allocation tags ({', '.join(sorted(missing_tags))}) to improve "
                    "chargeback visibility and FinOps reporting accuracy."
                ),
                severity="warning",
            )
        )

    # NAT Gateway
    if rtype == "aws_nat_gateway":
        recs.append(
            Recommendation(
                resource_label=rc.label,
                title="NAT Gateway introduces fixed monthly cost",
                detail=(
                    "NAT Gateway introduces a fixed monthly charge (~$32/mo) plus data transfer fees. "
                    "Consider whether a NAT Instance or VPC endpoint redesign could reduce cost "
                    "for low-volume workloads."
                ),
                severity="warning",
            )
        )

    # Large database instance
    if rtype in ("aws_db_instance", "aws_rds_cluster"):
        cls = str(a.get("db_instance_class", ""))
        if any(tier in cls for tier in ("m5", "m6i", "r5", "r6i")):
            recs.append(
                Recommendation(
                    resource_label=rc.label,
                    title="Production-grade DB tier detected",
                    detail=(
                        f"Database class {cls!r} incurs significant monthly cost (~${monthly_cents // 100}/mo). "
                        "Validate workload requirements and evaluate whether reserved capacity or "
                        "right-sizing opportunities exist."
                    ),
                    severity="warning",
                )
            )

    # Kubernetes cluster
    if rtype in ("aws_eks_cluster", "google_container_cluster", "azurerm_kubernetes_cluster"):
        recs.append(
            Recommendation(
                resource_label=rc.label,
                title="Kubernetes cluster cost optimization",
                detail=(
                    "Consider Spot/Preemptible instances for non-critical workloads, "
                    "cluster autoscaling, node right-sizing, and workload scheduling "
                    "optimization to reduce cluster costs."
                ),
                severity="info",
            )
        )

    # Large EBS disk
    if rtype == "aws_ebs_volume":
        size = int(a.get("volume_size", a.get("disk_size_gb", 0)))
        if size > 500:
            recs.append(
                Recommendation(
                    resource_label=rc.label,
                    title="Large EBS volume",
                    detail=(
                        f"EBS volume of {size} GB will cost ~${(size * 8) // 100}/mo. "
                        "Review retention policies, lifecycle management, and whether S3 "
                        "could serve as a more cost-effective alternative for cold data."
                    ),
                    severity="warning",
                )
            )

    # Multi-AZ RDS
    if rtype == "aws_db_instance" and a.get("multi_az") is True:
        recs.append(
            Recommendation(
                resource_label=rc.label,
                title="Multi-AZ doubles RDS cost",
                detail=(
                    "Multi-AZ deployment doubles the RDS instance cost. "
                    "Confirm this is required for the current environment — "
                    "consider single-AZ for non-production workloads."
                ),
                severity="info",
            )
        )

    # High ASG desired capacity
    if rtype == "aws_autoscaling_group":
        desired = int(a.get("desired_capacity", 1))
        if desired >= 5:
            recs.append(
                Recommendation(
                    resource_label=rc.label,
                    title=f"ASG with {desired} instances",
                    detail=(
                        f"Auto Scaling Group desired capacity of {desired} introduces "
                        f"~${monthly_cents // 100}/mo. Validate whether this capacity "
                        "is required from launch or if autoscaling can start smaller."
                    ),
                    severity="warning",
                )
            )

    return recs
