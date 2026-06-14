"""Policy engine — apply org PolicyRules to a list of findings.

Each rule has:
  conditions: {severity, resource_pattern, message_contains, rule_id_prefix}
  rule_type:  block | warn | alert

Returns a list of extra policy Finding objects (type="policy") and
the overall policy verdict ("block" | "warn" | "pass").
"""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.ai.findings import Finding
from driftguard.db.models import Organization, PolicyRule

if TYPE_CHECKING:
    pass

log = structlog.get_logger(__name__)

SEV_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}


def _matches(rule: PolicyRule, finding: Finding) -> bool:
    """Check if a PolicyRule conditions dict matches a Finding."""
    cond = rule.conditions or {}

    # Severity threshold: rule fires if finding severity >= condition severity
    if "severity" in cond:
        threshold = SEV_RANK.get(cond["severity"], 0)
        actual = SEV_RANK.get(finding.severity, 0)
        if actual < threshold:
            return False

    # Resource pattern
    if pat := cond.get("resource_pattern"):
        if not re.search(pat, finding.resource or "", re.IGNORECASE):
            return False

    # Message substring
    if needle := cond.get("message_contains"):
        if needle.lower() not in (finding.message or "").lower():
            return False

    # Rule ID prefix
    if prefix := cond.get("rule_id_prefix"):
        if not (finding.rule_id or "").upper().startswith(prefix.upper()):
            return False

    return True


async def apply_policies(
    db: AsyncSession,
    installation_id: int,
    findings: list[Finding],
) -> tuple[list[Finding], str]:
    """Apply org policies to findings.

    Returns (policy_findings, verdict) where verdict is "block" | "warn" | "pass".
    """
    org = (
        (await db.execute(
            select(Organization)
            .where(Organization.github_installation_id == installation_id)
            .order_by(Organization.created_at.desc())
        ))
        .scalars()
        .first()
    )
    if not org:
        return [], "pass"

    rules = (
        (await db.execute(select(PolicyRule).where(PolicyRule.org_id == org.id, PolicyRule.enabled.is_(True))))
        .scalars()
        .all()
    )
    if not rules:
        return [], "pass"

    policy_findings: list[Finding] = []
    verdict = "pass"

    for rule in rules:
        matched = [f for f in findings if _matches(rule, f)]
        if not matched:
            continue

        # Bump match_count (non-blocking — ignore failures)
        try:
            rule.match_count = (rule.match_count or 0) + len(matched)
            await db.flush()
        except Exception:  # noqa: S110
            pass

        for f in matched:
            policy_findings.append(
                Finding(
                    type="policy",
                    severity=rule.severity,
                    resource=f.resource,
                    message=f"Policy '{rule.name}' matched: {f.message[:120]}",
                    suggestion=rule.description,
                    rule_id=f"POLICY-{rule.name[:20].upper().replace(' ', '_')}",
                    controls=f.controls,
                    extra={"rule_type": rule.rule_type, "rule_id": rule.id},
                )
            )

        if rule.rule_type == "block" and verdict != "block":
            verdict = "block"
        elif rule.rule_type == "warn" and verdict == "pass":
            verdict = "warn"

    log.info(
        "policies_applied",
        installation_id=installation_id,
        rules=len(rules),
        policy_findings=len(policy_findings),
        verdict=verdict,
    )
    return policy_findings, verdict
