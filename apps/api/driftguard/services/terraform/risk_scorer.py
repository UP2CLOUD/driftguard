"""
Deterministic risk scoring — no LLM, no randomness.

Risk score: 0–100
  0–29:  LOW      (safe to merge)
  30–59: MEDIUM   (review recommended)
  60–79: HIGH     (human approval required)
  80+:   CRITICAL (blocked by default)

Scoring model:
  Base score = sum of weighted resource change scores
  Multipliers applied: environment, blast_radius, recurrence
  Hard ceilings: delete/replace of production data = minimum 70

Designed to be:
  - Deterministic (same input → same score)
  - Explainable (score_factors dict shows each contribution)
  - Configurable (thresholds via org policy)
  - Fast (no I/O)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import NamedTuple

from driftguard.events.schemas import ChangeAction, ResourceChange, Severity

# ── Resource type risk weights ─────────────────────────────────────────────────


class _Weight(NamedTuple):
    create: int  # Risk weight when creating
    update: int  # Risk weight when updating
    delete: int  # Risk weight when deleting / replacing
    label: str  # Human-readable label


_RESOURCE_WEIGHTS: dict[str, _Weight] = {
    # Databases — highest risk
    "aws_rds_instance": _Weight(20, 35, 80, "RDS instance"),
    "aws_rds_cluster": _Weight(20, 40, 85, "RDS cluster"),
    "aws_db_instance": _Weight(20, 35, 80, "DB instance"),
    "aws_dynamodb_table": _Weight(15, 25, 75, "DynamoDB table"),
    "google_sql_database_instance": _Weight(20, 35, 80, "Cloud SQL"),
    "azurerm_sql_server": _Weight(20, 35, 80, "Azure SQL"),
    "google_bigtable_instance": _Weight(20, 35, 75, "Bigtable"),
    # Storage — high risk on delete
    "aws_s3_bucket": _Weight(10, 20, 70, "S3 bucket"),
    "aws_s3_bucket_public_access_block": _Weight(5, 30, 25, "S3 public access"),
    "google_storage_bucket": _Weight(10, 20, 70, "GCS bucket"),
    "azurerm_storage_account": _Weight(10, 20, 70, "Azure storage"),
    "aws_efs_file_system": _Weight(15, 20, 75, "EFS"),
    # IAM — high risk on permissive grants
    "aws_iam_role": _Weight(15, 25, 30, "IAM role"),
    "aws_iam_policy": _Weight(15, 30, 25, "IAM policy"),
    "aws_iam_role_policy_attachment": _Weight(10, 20, 15, "IAM attachment"),
    "aws_iam_user": _Weight(10, 15, 20, "IAM user"),
    "google_project_iam_member": _Weight(15, 30, 20, "GCP IAM member"),
    "google_project_iam_binding": _Weight(20, 35, 25, "GCP IAM binding"),
    # Networking — high blast radius
    "aws_vpc": _Weight(20, 25, 60, "VPC"),
    "aws_subnet": _Weight(15, 20, 50, "subnet"),
    "aws_security_group": _Weight(15, 30, 40, "security group"),
    "aws_security_group_rule": _Weight(10, 25, 20, "SG rule"),
    "aws_route_table": _Weight(15, 25, 50, "route table"),
    "aws_lb": _Weight(15, 25, 55, "load balancer"),
    "aws_lb_target_group": _Weight(10, 20, 45, "target group"),
    "aws_cloudfront_distribution": _Weight(15, 30, 50, "CloudFront"),
    "aws_wafv2_web_acl": _Weight(15, 30, 40, "WAF"),
    "google_compute_network": _Weight(20, 25, 60, "GCP network"),
    # Compute — medium risk
    "aws_instance": _Weight(10, 15, 30, "EC2 instance"),
    "aws_launch_template": _Weight(10, 20, 25, "launch template"),
    "aws_autoscaling_group": _Weight(15, 25, 35, "ASG"),
    "aws_eks_cluster": _Weight(20, 30, 60, "EKS cluster"),
    "aws_eks_node_group": _Weight(15, 25, 45, "EKS node group"),
    "google_container_cluster": _Weight(20, 30, 60, "GKE cluster"),
    "google_compute_instance": _Weight(10, 15, 30, "GCE instance"),
    # Secrets + KMS
    "aws_secretsmanager_secret": _Weight(10, 20, 40, "Secrets Manager"),
    "aws_kms_key": _Weight(15, 25, 55, "KMS key"),
    "aws_kms_alias": _Weight(5, 10, 30, "KMS alias"),
    "google_kms_key_ring": _Weight(15, 25, 55, "KMS key ring"),
    "google_secret_manager_secret": _Weight(10, 20, 40, "Secret Manager"),
    # Kubernetes
    "kubernetes_deployment": _Weight(10, 15, 25, "K8s deployment"),
    "kubernetes_stateful_set": _Weight(15, 25, 45, "K8s StatefulSet"),
    "kubernetes_persistent_volume_claim": _Weight(10, 20, 60, "K8s PVC"),
    "kubernetes_ingress_v1": _Weight(10, 20, 30, "K8s Ingress"),
    "kubernetes_service": _Weight(8, 15, 25, "K8s Service"),
    "helm_release": _Weight(12, 20, 35, "Helm release"),
}

_DEFAULT_WEIGHT = _Weight(5, 10, 25, "resource")

# Attributes whose change is always high-risk regardless of resource type
_HIGH_RISK_ATTR_CHANGES = frozenset(
    {
        "deletion_protection",
        "skip_final_snapshot",
        "force_destroy",
        "backup_retention_period",
        "multi_az",
        "publicly_accessible",
        "storage_encrypted",
        "kms_key_id",
    }
)


# Known providers + their risk weight (relative to aws baseline)
_PROVIDER_WEIGHTS: dict[str, float] = {
    "registry.terraform.io/hashicorp/aws": 1.0,
    "registry.terraform.io/hashicorp/google": 1.0,
    "registry.terraform.io/hashicorp/azurerm": 1.0,
    "registry.terraform.io/hashicorp/kubernetes": 0.8,
    "registry.terraform.io/hashicorp/helm": 0.6,
    "registry.terraform.io/hashicorp/random": 0.0,
    "registry.terraform.io/hashicorp/null": 0.0,
    "registry.terraform.io/hashicorp/local": 0.0,
    "registry.terraform.io/hashicorp/time": 0.0,
    "aws": 1.0,
    "google": 1.0,
    "azurerm": 1.0,
}


@dataclass
class ScoredChange:
    resource: ResourceChange
    raw_score: int
    factors: dict[str, int] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


@dataclass
class RiskResult:
    score: int  # 0-100
    level: Severity
    blocked: bool
    block_reasons: list[str]
    scored_changes: list[ScoredChange]
    score_factors: dict[str, int]  # aggregated contributions

    @property
    def total_changes(self) -> int:
        return len(self.scored_changes)


def score(
    changes: list[ResourceChange],
    *,
    block_threshold: int = 70,
    env_label: str = "unknown",
) -> RiskResult:
    """
    Score a list of resource changes and produce a RiskResult.

    Args:
        changes:         List of ResourceChange from plan_parser
        block_threshold: Score at or above this → blocked (default 70)
        env_label:       "prod" | "staging" | "dev" | "unknown"
                         Multiplies score for production environments
    """
    if not changes:
        return RiskResult(
            score=0,
            level=Severity.INFO,
            blocked=False,
            block_reasons=[],
            scored_changes=[],
            score_factors={},
        )

    env_multiplier = _env_multiplier(env_label)
    scored: list[ScoredChange] = [_score_change(c) for c in changes]

    # Aggregate
    total_raw = sum(sc.raw_score for sc in scored)
    aggregated_factors: dict[str, int] = {}
    for sc in scored:
        for factor, val in sc.factors.items():
            aggregated_factors[factor] = aggregated_factors.get(factor, 0) + val

    # Apply environment multiplier
    total = min(100, round(total_raw * env_multiplier))

    # Hard floors — some changes always carry minimum risk
    destructive = [c for c in changes if c.is_destructive]
    if destructive:
        floor = max(40, len(destructive) * 15)
        if env_label == "prod":
            floor = max(65, floor)
        total = max(total, floor)

    # Sensitive floor
    sensitive = [c for c in changes if c.touches_sensitive]
    if sensitive:
        total = max(total, 40)

    total = min(100, total)

    level = _severity_from_score(total)
    blocked = total >= block_threshold
    reasons: list[str] = []

    if blocked:
        if destructive:
            reasons.append(
                f"{len(destructive)} destructive change(s): " + ", ".join(c.address for c in destructive[:3])
            )
        if sensitive:
            reasons.append(f"{len(sensitive)} resource(s) touch sensitive attributes")
        if total >= block_threshold and env_label == "prod":
            reasons.append("Production environment — threshold lowered")

    return RiskResult(
        score=total,
        level=level,
        blocked=blocked,
        block_reasons=reasons,
        scored_changes=scored,
        score_factors=aggregated_factors,
    )


def _score_change(c: ResourceChange) -> ScoredChange:
    w = _RESOURCE_WEIGHTS.get(c.type, _DEFAULT_WEIGHT)
    factors: dict[str, int] = {}
    warnings: list[str] = []

    # Base score from action
    if c.action == ChangeAction.CREATE:
        base = w.create
        factors["create"] = base
    elif c.action == ChangeAction.UPDATE:
        base = w.update
        factors["update"] = base
    elif c.action == ChangeAction.DELETE:
        base = w.delete
        factors["delete"] = base
    elif c.action == ChangeAction.REPLACE:
        base = w.delete + 10  # Replace is delete + create — higher risk
        factors["replace"] = base
    else:
        base = 0

    # Sensitive data bonus
    if c.touches_sensitive:
        bonus = 15
        factors["sensitive_attrs"] = bonus
        base += bonus
        warnings.append(f"Touches sensitive paths: {c.sensitive_paths[:3]}")

    # High-risk attribute change detection
    if c.action == ChangeAction.UPDATE and c.before and c.after:
        changed = {k for k in (set(c.before) | set(c.after)) if c.before.get(k) != c.after.get(k)}
        risky = changed & _HIGH_RISK_ATTR_CHANGES
        if risky:
            bonus = 20
            factors["high_risk_attrs"] = bonus
            base += bonus
            warnings.append(f"Changes high-risk attributes: {sorted(risky)}")

    # Detect S3 public access removal (critical)
    if c.type == "aws_s3_bucket_public_access_block" and c.action == ChangeAction.UPDATE:
        if c.before and c.after:
            if c.before.get("block_public_acls") and not c.after.get("block_public_acls"):
                bonus = 35
                factors["public_exposure"] = bonus
                base += bonus
                warnings.append("CRITICAL: S3 public access block being removed")

    # Provider weight
    provider_w = _PROVIDER_WEIGHTS.get(c.provider, 0.9)
    base = round(base * provider_w)

    return ScoredChange(
        resource=c,
        raw_score=min(100, base),
        factors=factors,
        warnings=warnings,
    )


def _env_multiplier(env: str) -> float:
    return {"prod": 1.4, "production": 1.4, "staging": 1.1, "dev": 0.8, "test": 0.7}.get(env.lower(), 1.0)


def _severity_from_score(score: int) -> Severity:
    if score >= 80:
        return Severity.CRITICAL
    if score >= 60:
        return Severity.HIGH
    if score >= 30:
        return Severity.MEDIUM
    if score >= 10:
        return Severity.LOW
    return Severity.INFO
