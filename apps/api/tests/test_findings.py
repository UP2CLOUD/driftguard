from driftguard.ai.findings import (
    aggregate_cost_cents,
    from_checkov,
    from_infracost,
    from_plan_changes,
    risk_score,
)


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
