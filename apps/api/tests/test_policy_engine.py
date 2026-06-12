"""Unit tests for driftguard.services.policy_engine.

Tests cover _matches() (pure function) and apply_policies() (async DB call).
"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock

from driftguard.ai.findings import Finding
from driftguard.db.models import Organization, PolicyRule
from driftguard.services.policy_engine import _matches, apply_policies


# ── Helpers ───────────────────────────────────────────────────────────────────


def _finding(
    severity: str = "high",
    resource: str = "aws_s3_bucket.logs",
    message: str = "S3 bucket is publicly accessible",
    rule_id: str = "CKV_AWS_57",
) -> Finding:
    return Finding(
        type="security",
        severity=severity,
        resource=resource,
        message=message,
        rule_id=rule_id,
    )


def _rule(
    rule_type: str = "block",
    severity: str = "high",
    conditions: dict | None = None,
    name: str = "Test Rule",
    match_count: int = 0,
) -> PolicyRule:
    return PolicyRule(
        id="rule-1",
        org_id="org-1",
        name=name,
        rule_type=rule_type,
        severity=severity,
        enabled=True,
        conditions=conditions,
        match_count=match_count,
    )


def _org() -> Organization:
    return Organization(id="org-1", github_installation_id=42, plan="team")


# ── _matches() ────────────────────────────────────────────────────────────────


class TestMatches:
    def test_no_conditions_always_matches(self):
        rule = _rule(conditions={})
        assert _matches(rule, _finding()) is True

    def test_null_conditions_always_matches(self):
        rule = _rule(conditions=None)
        assert _matches(rule, _finding()) is True

    def test_severity_threshold_exact_match(self):
        rule = _rule(conditions={"severity": "high"})
        assert _matches(rule, _finding(severity="high")) is True

    def test_severity_threshold_above_passes(self):
        rule = _rule(conditions={"severity": "high"})
        assert _matches(rule, _finding(severity="critical")) is True

    def test_severity_threshold_below_fails(self):
        rule = _rule(conditions={"severity": "high"})
        assert _matches(rule, _finding(severity="medium")) is False

    def test_severity_threshold_low_below_medium_fails(self):
        rule = _rule(conditions={"severity": "medium"})
        assert _matches(rule, _finding(severity="low")) is False

    def test_resource_pattern_matches(self):
        rule = _rule(conditions={"resource_pattern": r"aws_s3_bucket\."})
        assert _matches(rule, _finding(resource="aws_s3_bucket.logs")) is True

    def test_resource_pattern_no_match(self):
        rule = _rule(conditions={"resource_pattern": r"aws_rds_"})
        assert _matches(rule, _finding(resource="aws_s3_bucket.logs")) is False

    def test_resource_pattern_case_insensitive(self):
        rule = _rule(conditions={"resource_pattern": r"AWS_S3_BUCKET"})
        assert _matches(rule, _finding(resource="aws_s3_bucket.logs")) is True

    def test_message_contains_substring(self):
        rule = _rule(conditions={"message_contains": "publicly"})
        assert _matches(rule, _finding(message="S3 bucket is publicly accessible")) is True

    def test_message_contains_case_insensitive(self):
        rule = _rule(conditions={"message_contains": "PUBLICLY"})
        assert _matches(rule, _finding(message="S3 bucket is publicly accessible")) is True

    def test_message_contains_not_found(self):
        rule = _rule(conditions={"message_contains": "rds"})
        assert _matches(rule, _finding(message="S3 bucket is publicly accessible")) is False

    def test_rule_id_prefix_matches(self):
        rule = _rule(conditions={"rule_id_prefix": "CKV_AWS"})
        assert _matches(rule, _finding(rule_id="CKV_AWS_57")) is True

    def test_rule_id_prefix_case_insensitive(self):
        rule = _rule(conditions={"rule_id_prefix": "ckv_aws"})
        assert _matches(rule, _finding(rule_id="CKV_AWS_57")) is True

    def test_rule_id_prefix_no_match(self):
        rule = _rule(conditions={"rule_id_prefix": "CKV_GCP"})
        assert _matches(rule, _finding(rule_id="CKV_AWS_57")) is False

    def test_rule_id_prefix_with_none_rule_id(self):
        rule = _rule(conditions={"rule_id_prefix": "CKV_AWS"})
        assert _matches(rule, _finding(rule_id=None)) is False

    def test_all_conditions_must_pass(self):
        """All conditions are ANDed — one failure means no match."""
        rule = _rule(conditions={"severity": "high", "message_contains": "rds"})
        # severity passes (high >= high) but message doesn't contain "rds"
        assert _matches(rule, _finding(severity="high", message="S3 public")) is False

    def test_all_conditions_all_pass(self):
        rule = _rule(conditions={"severity": "high", "resource_pattern": r"s3_bucket"})
        assert _matches(rule, _finding(severity="high", resource="aws_s3_bucket.logs")) is True


# ── apply_policies() ──────────────────────────────────────────────────────────


def _mock_db(org=None, rules=None) -> AsyncMock:
    """Build a mock AsyncSession that returns org and rules in sequence."""
    mock = AsyncMock()
    org_result = MagicMock(scalar_one_or_none=MagicMock(return_value=org))
    rules_result = MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=rules or []))))
    mock.execute = AsyncMock(side_effect=[org_result, rules_result])
    mock.flush = AsyncMock()
    return mock


@pytest.mark.asyncio
async def test_no_org_returns_pass():
    db = _mock_db(org=None)
    policy_findings, verdict = await apply_policies(db, 9999, [_finding()])
    assert policy_findings == []
    assert verdict == "pass"


@pytest.mark.asyncio
async def test_no_rules_returns_pass():
    db = _mock_db(org=_org(), rules=[])
    policy_findings, verdict = await apply_policies(db, 42, [_finding()])
    assert policy_findings == []
    assert verdict == "pass"


@pytest.mark.asyncio
async def test_block_rule_matches_returns_block():
    rule = _rule(rule_type="block", severity="high", conditions={"severity": "high"})
    db = _mock_db(org=_org(), rules=[rule])
    policy_findings, verdict = await apply_policies(db, 42, [_finding(severity="high")])
    assert verdict == "block"
    assert len(policy_findings) == 1
    assert policy_findings[0].type == "policy"


@pytest.mark.asyncio
async def test_warn_rule_matches_returns_warn():
    rule = _rule(rule_type="warn", conditions={})
    db = _mock_db(org=_org(), rules=[rule])
    _, verdict = await apply_policies(db, 42, [_finding()])
    assert verdict == "warn"


@pytest.mark.asyncio
async def test_block_overrides_warn_verdict():
    """When both block and warn rules match, block wins."""
    block_rule = _rule(rule_type="block", name="Block", conditions={"severity": "critical"})
    warn_rule = _rule(rule_type="warn", name="Warn", conditions={})
    db = _mock_db(org=_org(), rules=[warn_rule, block_rule])
    _, verdict = await apply_policies(db, 42, [_finding(severity="critical")])
    assert verdict == "block"


@pytest.mark.asyncio
async def test_unmatched_rule_returns_pass():
    rule = _rule(conditions={"message_contains": "rds"})
    db = _mock_db(org=_org(), rules=[rule])
    policy_findings, verdict = await apply_policies(db, 42, [_finding(message="S3 public access")])
    assert policy_findings == []
    assert verdict == "pass"


@pytest.mark.asyncio
async def test_policy_finding_message_includes_rule_name():
    rule = _rule(name="Block Public S3", rule_type="block", conditions={})
    db = _mock_db(org=_org(), rules=[rule])
    policy_findings, _ = await apply_policies(db, 42, [_finding()])
    assert "Block Public S3" in policy_findings[0].message


@pytest.mark.asyncio
async def test_match_count_incremented():
    rule = _rule(rule_type="block", conditions={}, match_count=5)
    db = _mock_db(org=_org(), rules=[rule])
    findings = [_finding(), _finding(resource="aws_db_instance.prod")]
    await apply_policies(db, 42, findings)
    assert rule.match_count == 7  # 5 + 2 matched findings


@pytest.mark.asyncio
async def test_no_findings_no_policy_matches():
    rule = _rule(conditions={})
    db = _mock_db(org=_org(), rules=[rule])
    policy_findings, verdict = await apply_policies(db, 42, [])
    assert policy_findings == []
    assert verdict == "pass"


@pytest.mark.asyncio
async def test_multiple_findings_all_matched():
    rule = _rule(rule_type="block", conditions={"severity": "high"})
    db = _mock_db(org=_org(), rules=[rule])
    findings = [_finding(severity="high"), _finding(severity="critical"), _finding(severity="medium")]
    policy_findings, verdict = await apply_policies(db, 42, findings)
    # medium < high threshold → not matched; high + critical → 2 matched
    assert len(policy_findings) == 2
    assert verdict == "block"


@pytest.mark.asyncio
async def test_alert_rule_type_treated_as_warn_for_verdict():
    """alert rule_type doesn't bump verdict above warn."""
    rule = _rule(rule_type="alert", conditions={})
    db = _mock_db(org=_org(), rules=[rule])
    _, verdict = await apply_policies(db, 42, [_finding()])
    # alert is neither "block" nor "warn" in the policy engine's logic — stays "pass"
    assert verdict == "pass"
