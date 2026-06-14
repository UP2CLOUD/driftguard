"""Lightweight Terraform plan analyser — no LLM, no external calls."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from enum import StrEnum
from pathlib import Path
from typing import Any


class ChangeAction(StrEnum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    REPLACE = "replace"
    NO_OP = "no-op"
    READ = "read"


@dataclass(frozen=True)
class ResourceChange:
    address: str
    type: str
    name: str
    action: ChangeAction
    provider: str
    module: str | None = None
    before: dict[str, Any] | None = None
    after: dict[str, Any] | None = None
    is_destructive: bool = False
    replace_paths: list[str] = field(default_factory=list)

    @property
    def short_provider(self) -> str:
        return self.provider.split("/")[-1] if self.provider else "unknown"


@dataclass
class PlanSummary:
    tf_version: str
    changes: list[ResourceChange]
    creates: int = 0
    updates: int = 0
    deletes: int = 0
    replaces: int = 0
    risk_score: int = 0
    risk_level: str = "low"
    risk_factors: list[str] = field(default_factory=list)


_ACTION_MAP: dict[frozenset[str], ChangeAction] = {
    frozenset(["no-op"]): ChangeAction.NO_OP,
    frozenset(["create"]): ChangeAction.CREATE,
    frozenset(["read"]): ChangeAction.READ,
    frozenset(["update"]): ChangeAction.UPDATE,
    frozenset(["delete"]): ChangeAction.DELETE,
    frozenset(["delete", "create"]): ChangeAction.REPLACE,
    frozenset(["create", "delete"]): ChangeAction.REPLACE,
}

# Risk weights per resource action (0-100 range)
_RESOURCE_WEIGHTS: dict[str, tuple[int, int, int]] = {
    # (create, update, delete) weights
    "aws_rds_cluster": (20, 40, 85),
    "aws_rds_instance": (20, 35, 80),
    "aws_db_instance": (20, 35, 80),
    "aws_dynamodb_table": (15, 25, 75),
    "aws_s3_bucket": (10, 20, 70),
    "google_sql_database_instance": (20, 35, 80),
    "azurerm_sql_server": (20, 35, 80),
    "aws_efs_file_system": (15, 20, 75),
    "aws_elasticache_cluster": (15, 25, 65),
    "aws_iam_role": (15, 25, 30),
    "aws_iam_policy": (15, 30, 25),
    "aws_eks_cluster": (25, 40, 80),
    "google_container_cluster": (25, 40, 80),
    "aws_vpc": (20, 30, 60),
    "aws_subnet": (15, 20, 50),
    "aws_security_group": (10, 25, 30),
    "aws_kms_key": (10, 20, 60),
    "aws_secretsmanager_secret": (10, 20, 50),
    "aws_lambda_function": (10, 20, 25),
}
_DEFAULT_WEIGHTS = (5, 10, 30)

_HIGH_BLAST_ATTRS = frozenset(
    {
        "deletion_protection",
        "skip_final_snapshot",
        "force_destroy",
        "backup_retention_period",
        "instance_class",
        "engine_version",
        "vpc_id",
        "subnet_ids",
    }
)


def parse_plan(path: Path) -> PlanSummary:
    """Parse a terraform plan JSON file and return a PlanSummary."""
    raw = json.loads(path.read_text())
    return parse_plan_dict(raw)


def parse_plan_dict(raw: dict[str, Any]) -> PlanSummary:
    tf_version = raw.get("terraform_version", "unknown")
    changes: list[ResourceChange] = []

    for rc in raw.get("resource_changes", []):
        change = rc.get("change", {})
        raw_actions = change.get("actions", ["no-op"])
        action = _ACTION_MAP.get(frozenset(raw_actions), ChangeAction.NO_OP)

        if action in (ChangeAction.NO_OP, ChangeAction.READ):
            continue

        address = rc.get("address", "")
        res_type = rc.get("type", "")
        name = rc.get("name", "")
        provider = rc.get("provider_config_key", "")
        module = rc.get("module_address")

        # Detect forced-replace paths
        after_unknown = change.get("after_unknown", {})
        replace_paths: list[str] = []
        if isinstance(after_unknown, dict):
            replace_paths = [k for k, v in after_unknown.items() if v is True]

        changes.append(
            ResourceChange(
                address=address,
                type=res_type,
                name=name,
                action=action,
                provider=provider,
                module=module,
                before=change.get("before"),
                after=change.get("after"),
                is_destructive=action in (ChangeAction.DELETE, ChangeAction.REPLACE),
                replace_paths=replace_paths,
            )
        )

    summary = PlanSummary(tf_version=tf_version, changes=changes)
    summary.creates = sum(1 for c in changes if c.action == ChangeAction.CREATE)
    summary.updates = sum(1 for c in changes if c.action == ChangeAction.UPDATE)
    summary.deletes = sum(1 for c in changes if c.action == ChangeAction.DELETE)
    summary.replaces = sum(1 for c in changes if c.action == ChangeAction.REPLACE)
    _score(summary)
    return summary


def _score(summary: PlanSummary) -> None:
    total = 0
    factors: list[str] = []

    for ch in summary.changes:
        weights = _RESOURCE_WEIGHTS.get(ch.type, _DEFAULT_WEIGHTS)
        if ch.action == ChangeAction.CREATE:
            w = weights[0]
        elif ch.action == ChangeAction.UPDATE:
            w = weights[1]
        else:  # DELETE or REPLACE
            w = weights[2]

        # Blast-radius multiplier: sensitive attribute changes
        if ch.action == ChangeAction.UPDATE and ch.before and ch.after:
            changed = {
                k
                for k in ch.before
                if k in ch.after and ch.before.get(k) != ch.after.get(k) and k in _HIGH_BLAST_ATTRS
            }
            if changed:
                w = min(100, int(w * 1.5))
                factors.append(f"High-blast attribute change: {ch.address} ({', '.join(sorted(changed))})")

        if w >= 50:
            action_label = ch.action.value
            factors.append(f"{action_label.capitalize()} {ch.address} (weight {w})")

        total += w

    score = min(100, total)
    summary.risk_score = score
    summary.risk_factors = factors

    if score >= 80:
        summary.risk_level = "critical"
    elif score >= 60:
        summary.risk_level = "high"
    elif score >= 30:
        summary.risk_level = "medium"
    else:
        summary.risk_level = "low"
