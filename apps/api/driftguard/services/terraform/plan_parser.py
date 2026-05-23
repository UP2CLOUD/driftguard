"""
Terraform JSON Plan Parser.

Parses the output of `terraform show -json` (plan format ≥ 1.0).
Returns typed ResourceChange objects — no LLM, no subprocess here.

Handles:
  - create / update / delete / replace / no-op actions
  - module.* resource addresses
  - Sensitive value detection (before_sensitive / after_sensitive)
  - Computed / unknown after values
  - Replace paths (forced replacement triggers)
  - Provider attribution
  - Data source reads (excluded from risk scoring by default)
  - Nested module resource unwinding

Reference:
  https://developer.hashicorp.com/terraform/internals/json-format
"""

from __future__ import annotations

import logging
import re
from typing import Any

from driftguard.events.schemas import ChangeAction, ResourceChange

log = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

DESTRUCTIVE_ACTIONS = {ChangeAction.DELETE, ChangeAction.REPLACE}

# Attributes that, if changed, have outsized blast radius
_HIGH_BLAST_ATTRS = frozenset(
    {
        "deletion_protection",
        "protect_from_scale_in",
        "prevent_destroy",
        "skip_final_snapshot",
        "force_destroy",
        "backup_retention_period",
        "multi_az",
        "instance_class",
        "engine_version",
        "cluster_identifier",
        "db_subnet_group_name",
        "vpc_id",
        "subnet_ids",
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
}

# Regex to detect common secret attribute names
_SENSITIVE_PATTERN = re.compile(
    r"(password|secret|token|key|credential|private|auth|cert|tls|ssl|api_key|access_key)",
    re.IGNORECASE,
)


class TerraformPlan:
    """Parsed Terraform JSON plan."""

    __slots__ = (
        "tf_version",
        "format_version",
        "changes",
        "outputs",
        "prior_state",
        "configuration",
        "raw",
    )

    def __init__(
        self,
        tf_version: str | None,
        format_version: str | None,
        changes: list[ResourceChange],
        outputs: dict[str, Any],
        raw: dict[str, Any],
    ) -> None:
        self.tf_version = tf_version
        self.format_version = format_version
        self.changes = changes
        self.outputs = outputs
        self.raw = raw

    @property
    def creates(self) -> int:
        return sum(1 for c in self.changes if c.action == ChangeAction.CREATE)

    @property
    def updates(self) -> int:
        return sum(1 for c in self.changes if c.action == ChangeAction.UPDATE)

    @property
    def deletes(self) -> int:
        return sum(1 for c in self.changes if c.action == ChangeAction.DELETE)

    @property
    def replaces(self) -> int:
        return sum(1 for c in self.changes if c.action == ChangeAction.REPLACE)

    @property
    def has_destructive(self) -> bool:
        return any(c.is_destructive for c in self.changes)

    @property
    def destructive_count(self) -> int:
        return sum(1 for c in self.changes if c.is_destructive)


def parse_plan(plan_json: dict[str, Any]) -> TerraformPlan:
    """
    Parse a terraform plan JSON dict into a TerraformPlan.
    Raises ValueError on malformed input.
    """
    if not isinstance(plan_json, dict):
        raise ValueError("plan_json must be a dict")

    format_version = plan_json.get("format_version")
    tf_version = plan_json.get("terraform_version")

    raw_changes: list[dict] = plan_json.get("resource_changes", [])
    changes = [_parse_change(rc) for rc in raw_changes if _should_include(rc)]

    outputs = plan_json.get("output_changes", {})

    log.info(
        "plan.parsed",
        extra={
            "tf_version": tf_version,
            "total_changes": len(changes),
            "creates": sum(1 for c in changes if c.action == ChangeAction.CREATE),
            "deletes": sum(1 for c in changes if c.action == ChangeAction.DELETE),
        },
    )

    return TerraformPlan(
        tf_version=tf_version,
        format_version=format_version,
        changes=changes,
        outputs=outputs,
        raw=plan_json,
    )


def _should_include(rc: dict) -> bool:
    """Exclude no-ops and pure reads by default."""
    change = rc.get("change", {})
    actions = change.get("actions", ["no-op"])
    if actions == ["no-op"] or actions == ["read"]:
        return False
    return True


def _parse_change(rc: dict) -> ResourceChange:
    address = rc.get("address", "")
    rtype = rc.get("type", "")
    name = rc.get("name", "")
    module = rc.get("module_address")
    provider = rc.get("provider_config_key", "")

    change = rc.get("change", {})
    actions = change.get("actions", ["no-op"])
    before = change.get("before")
    after = change.get("after")
    after_unknown = change.get("after_unknown", {})
    replace_paths = _extract_replace_paths(change.get("action_reasons", []))

    action = _classify_action(actions)

    before_sensitive = change.get("before_sensitive", {})
    after_sensitive = change.get("after_sensitive", {})
    sensitive_paths = _extract_sensitive_paths(before, after, before_sensitive, after_sensitive)
    touches_sensitive = bool(sensitive_paths)

    is_destructive = action in DESTRUCTIVE_ACTIONS

    # Detect high-blast-radius attribute changes
    if action == ChangeAction.UPDATE and before and after:
        changed_keys = {k for k in (set(before) | set(after)) if before.get(k) != after.get(k)}
        if changed_keys & _HIGH_BLAST_ATTRS:
            is_destructive = True  # Treat as operationally destructive even if not a replace

    return ResourceChange(
        address=address,
        type=rtype,
        name=name,
        module=module,
        action=action,
        provider=_normalise_provider(provider),
        before=_redact_sensitive(before, before_sensitive) if before else None,
        after=_redact_sensitive(after, after_sensitive) if after else None,
        after_unknown=after_unknown,
        replace_paths=replace_paths,
        is_destructive=is_destructive,
        touches_sensitive=touches_sensitive,
        sensitive_paths=sensitive_paths,
    )


def _classify_action(actions: list[str]) -> ChangeAction:
    if actions == ["create"]:
        return ChangeAction.CREATE
    if actions == ["delete"]:
        return ChangeAction.DELETE
    if actions == ["update"]:
        return ChangeAction.UPDATE
    if set(actions) == {"delete", "create"} or actions == ["delete", "create"]:
        return ChangeAction.REPLACE
    if actions == ["read"]:
        return ChangeAction.READ
    return ChangeAction.NO_OP


def _extract_replace_paths(action_reasons: list[dict]) -> list[str]:
    paths = []
    for reason in action_reasons:
        if reason.get("code") == "replacement_by_request":
            pass  # lifecycle.replace_triggered_by
        attr = reason.get("attribute")
        if attr:
            paths.append(attr)
    return paths


def _extract_sensitive_paths(
    before: dict | None,
    after: dict | None,
    before_sensitive: dict | bool,
    after_sensitive: dict | bool,
) -> list[str]:
    """
    Collect attribute paths that are marked sensitive by Terraform
    OR match common secret naming patterns.
    """
    paths: set[str] = set()

    # Terraform-marked sensitive
    if isinstance(before_sensitive, dict):
        paths.update(_flatten_sensitive(before_sensitive))
    if isinstance(after_sensitive, dict):
        paths.update(_flatten_sensitive(after_sensitive))
    if before_sensitive is True or after_sensitive is True:
        paths.add("(entire resource)")

    # Pattern-based detection
    for obj in (before, after):
        if isinstance(obj, dict):
            for k in obj:
                if _SENSITIVE_PATTERN.search(k):
                    paths.add(k)

    return sorted(paths)


def _flatten_sensitive(d: dict, prefix: str = "") -> list[str]:
    result = []
    for k, v in d.items():
        full = f"{prefix}.{k}" if prefix else k
        if v is True:
            result.append(full)
        elif isinstance(v, dict):
            result.extend(_flatten_sensitive(v, full))
    return result


def _redact_sensitive(
    obj: dict | None,
    sensitive_map: dict | bool,
) -> dict | None:
    """Replace sensitive attribute values with '[REDACTED]'."""
    if obj is None:
        return None
    if sensitive_map is True:
        return {k: "[REDACTED]" for k in obj}
    if not isinstance(sensitive_map, dict):
        return obj

    result = dict(obj)
    for k, v in sensitive_map.items():
        if v is True and k in result:
            result[k] = "[REDACTED]"
        elif isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k] = _redact_sensitive(result[k], v)
    return result


def _normalise_provider(raw: str) -> str:
    """Normalise provider config key to registry format."""
    if raw.startswith("registry.terraform.io/"):
        return raw
    if "hashicorp/" in raw:
        name = raw.split("/")[-1].split(".")[0]
        return f"registry.terraform.io/hashicorp/{name}"
    return raw
