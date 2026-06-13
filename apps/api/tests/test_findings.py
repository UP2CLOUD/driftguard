from __future__ import annotations

from driftguard.ai.findings import (
    Finding,
    aggregate_cost_cents,
    from_checkov,
    from_infracost,
    from_plan_changes,
    from_static_scan,
    risk_score,
)
from driftguard.services.scanner.engine import Category, ScanFinding, Severity


def test_from_plan_changes_skips_noop():
    plan = {
        "resource_changes": [
            {"address": "aws_s3_bucket.a", "type": "aws_s3_bucket", "change": {"actions": ["no-op"]}},
            {"address": "aws_db_instance.b", "type": "aws_db_instance", "change": {"actions": ["create"]}},
            {"address": "aws_iam_role.c", "type": "aws_iam_role", "change": {"actions": ["delete"]}},
        ]
    }
    findings = from_plan_changes(plan)
    assert len(findings) == 2
    assert {f.resource for f in findings} == {"aws_db_instance.b", "aws_iam_role.c"}
    delete = next(f for f in findings if f.resource == "aws_iam_role.c")
    assert delete.severity == "high"


def test_from_infracost_severity_buckets():
    diff = {
        "projects": [
            {
                "diff": {
                    "resources": [
                        {"name": "small", "monthlyCost": "1.50"},
                        {"name": "medium", "monthlyCost": "25"},
                        {"name": "big", "monthlyCost": "150"},
                        {"name": "huge", "monthlyCost": "800"},
                    ]
                }
            }
        ]
    }
    findings = from_infracost(diff)
    sev = {f.resource: f.severity for f in findings}
    assert sev["small"] == "info"
    assert sev["medium"] == "medium"
    assert sev["big"] == "high"
    assert sev["huge"] == "critical"
    assert aggregate_cost_cents(findings) == 150 + 2500 + 15000 + 80000


def test_from_checkov_maps_severity():
    raw = [
        {
            "results": {
                "failed_checks": [
                    {
                        "check_id": "CKV_AWS_1",
                        "check_name": "S3 versioning",
                        "resource": "aws_s3_bucket.a",
                        "severity": "HIGH",
                    },
                    {
                        "check_id": "CKV_AWS_2",
                        "check_name": "No encryption",
                        "resource": "aws_s3_bucket.b",
                        "severity": "CRITICAL",
                    },
                ]
            }
        }
    ]
    findings = from_checkov(raw)
    assert len(findings) == 2
    assert findings[0].rule_id == "CKV_AWS_1"
    assert findings[1].severity == "critical"


def test_risk_score_caps_at_100():
    big = [type("F", (), {"severity": "critical"})() for _ in range(10)]
    assert risk_score(big) == 100


# ── from_static_scan ──────────────────────────────────────────────────────────


def _sf(
    rule_id: str = "TF001",
    severity: Severity = Severity.HIGH,
    category: Category = Category.IAM,
    resource: str = "aws_iam_policy.admin",
    file: str = "main.tf",
    line: int = 5,
    title: str = "IAM wildcard",
    message: str = "Overly permissive",
    suggestion: str | None = "Restrict to ARNs",
) -> ScanFinding:
    return ScanFinding(
        rule_id=rule_id,
        severity=severity,
        category=category,
        title=title,
        message=message,
        suggestion=suggestion,
        resource=resource,
        file=file,
        line=line,
    )


class TestFromStaticScan:
    def test_empty_returns_empty(self):
        assert from_static_scan([]) == []

    def test_iam_category_maps_to_security(self):
        findings = from_static_scan([_sf(category=Category.IAM)])
        assert findings[0].type == "security"

    def test_network_category_maps_to_security(self):
        findings = from_static_scan([_sf(category=Category.NETWORK)])
        assert findings[0].type == "security"

    def test_storage_category_maps_to_security(self):
        findings = from_static_scan([_sf(category=Category.STORAGE)])
        assert findings[0].type == "security"

    def test_severity_preserved(self):
        findings = from_static_scan([_sf(severity=Severity.CRITICAL)])
        assert findings[0].severity == "critical"

    def test_rule_id_preserved(self):
        findings = from_static_scan([_sf(rule_id="GHA006")])
        assert findings[0].rule_id == "GHA006"

    def test_suggestion_preserved(self):
        findings = from_static_scan([_sf(suggestion="Move secrets to env:")])
        assert findings[0].suggestion == "Move secrets to env:"

    def test_file_and_line_preserved(self):
        findings = from_static_scan([_sf(file="infra/main.tf", line=42)])
        assert findings[0].file == "infra/main.tf"
        assert findings[0].line == 42

    def test_resource_falls_back_to_file_when_none(self):
        sf = _sf(resource=None, file="k8s/deploy.yaml")  # type: ignore[arg-type]
        findings = from_static_scan([sf])
        assert findings[0].resource == "k8s/deploy.yaml"

    def test_controls_populated_for_known_rule(self):
        # CKV_AWS_3 → encryption_at_rest per mappings.py
        findings = from_static_scan([_sf(rule_id="CKV_AWS_3")])
        assert "encryption_at_rest" in findings[0].controls

    def test_no_controls_for_unknown_rule(self):
        findings = from_static_scan([_sf(rule_id="UNKNOWN_RULE_XYZ")])
        assert findings[0].controls == ()

    def test_multiple_findings(self):
        findings = from_static_scan(
            [
                _sf(rule_id="TF001"),
                _sf(rule_id="K8S001", category=Category.NETWORK),
            ]
        )
        assert len(findings) == 2
        assert {f.rule_id for f in findings} == {"TF001", "K8S001"}


# ── aggregate_cost_cents edge cases ──────────────────────────────────────────


class TestAggregateCostCents:
    def test_empty_list_is_zero(self):
        assert aggregate_cost_cents([]) == 0

    def test_non_cost_findings_excluded(self):
        f = Finding(type="security", severity="high", resource="r", message="m", suggestion=None, controls=())
        assert aggregate_cost_cents([f]) == 0

    def test_cost_finding_with_cents_included(self):
        f = Finding(
            type="cost",
            severity="medium",
            resource="r",
            message="m",
            suggestion=None,
            controls=(),
            extra={"cents": 500},
        )
        assert aggregate_cost_cents([f]) == 500

    def test_mixed_types_only_cost_summed(self):
        findings = [
            Finding(
                type="cost",
                severity="high",
                resource="r1",
                message="m",
                suggestion=None,
                controls=(),
                extra={"cents": 300},
            ),
            Finding(
                type="security",
                severity="high",
                resource="r2",
                message="m",
                suggestion=None,
                controls=(),
                extra={"cents": 999},
            ),
        ]
        assert aggregate_cost_cents(findings) == 300
