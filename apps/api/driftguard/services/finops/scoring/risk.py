from __future__ import annotations

from dataclasses import dataclass

from ..parsers.terraform_diff import ResourceChange


@dataclass
class RiskResult:
    level: str          # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    score: int          # 0-100
    reasons: list[str]


def score(
    resource_changes: list[ResourceChange],
    total_delta_cents: int,
    cost_per_resource: dict[str, int],
) -> RiskResult:
    score_val = 0
    reasons: list[str] = []

    # Base cost threshold
    monthly_delta = total_delta_cents / 100
    if monthly_delta < 50:
        score_val += 10
    elif monthly_delta < 250:
        score_val += 30
        reasons.append(f"${monthly_delta:.0f}/mo cost increase (medium range)")
    elif monthly_delta < 1000:
        score_val += 60
        reasons.append(f"${monthly_delta:.0f}/mo cost increase (high range)")
    else:
        score_val += 80
        reasons.append(f"${monthly_delta:.0f}/mo cost increase (critical range)")

    rtypes = {rc.resource_type for rc in resource_changes}

    # NAT Gateway penalty
    if "aws_nat_gateway" in rtypes or "azurerm_nat_gateway" in rtypes:
        score_val += 20
        reasons.append("NAT Gateway added (+20)")

    # New database penalty
    db_types = {
        "aws_db_instance", "aws_rds_cluster",
        "google_sql_database_instance",
        "azurerm_postgresql_flexible_server",
        "azurerm_mysql_flexible_server",
    }
    if rtypes & db_types:
        score_val += 25
        reasons.append("New database resource (+25)")

    # New Kubernetes cluster penalty
    k8s_types = {
        "aws_eks_cluster", "google_container_cluster", "azurerm_kubernetes_cluster",
    }
    if rtypes & k8s_types:
        score_val += 25
        reasons.append("New Kubernetes cluster (+25)")

    # Missing tags on any resource
    has_missing_tags = any(
        _COST_TAGS - set(k.lower() for k in rc.attributes.get("_tags", {}).keys())
        for rc in resource_changes
        if rc.resource_type not in {"aws_s3_bucket", "google_storage_bucket"}
    )
    if has_missing_tags:
        score_val += 15
        reasons.append("Missing cost allocation tags (+15)")

    # Production environment
    envs = set()
    for rc in resource_changes:
        tags = rc.attributes.get("_tags", {})
        env = str(tags.get("environment", tags.get("Environment", ""))).lower()
        envs.add(env)
    if "production" in envs or "prod" in envs:
        score_val += 20
        reasons.append("Production environment detected (+20)")

    score_val = min(score_val, 100)
    level = (
        "CRITICAL" if score_val >= 80
        else "HIGH" if score_val >= 60
        else "MEDIUM" if score_val >= 30
        else "LOW"
    )
    return RiskResult(level=level, score=score_val, reasons=reasons)


_COST_TAGS = {"environment", "owner", "service", "application", "cost_center", "team"}
