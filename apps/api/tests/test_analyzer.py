"""Tests for the analyzer pipeline logic (unit-level, no external I/O)."""

from __future__ import annotations

from driftguard.ai.findings import Finding
from driftguard.workers.analyzer import _compute_risk, _merge_findings

# ── Helpers ───────────────────────────────────────────────────────────────────


def _f(rule_id: str | None, resource: str = "r", severity: str = "high") -> Finding:
    return Finding(
        type="security",
        severity=severity,
        resource=resource,
        message="x",
        suggestion=None,
        rule_id=rule_id,
        controls=(),
    )


def test_compute_risk_empty():
    assert _compute_risk([]) == 0


def test_compute_risk_single_critical():
    from driftguard.ai.findings import Finding

    findings = [
        Finding(
            type="security",
            severity="critical",
            resource="aws_s3_bucket.public",
            message="Public access enabled",
            suggestion=None,
            controls=(),
        )
    ]
    assert _compute_risk(findings) == 40


def test_compute_risk_caps_at_100():
    from driftguard.ai.findings import Finding

    findings = [
        Finding(type="security", severity="critical", resource=f"r{i}", message="x", suggestion=None, controls=())
        for i in range(10)
    ]
    assert _compute_risk(findings) == 100


def test_compute_risk_mixed():
    from driftguard.ai.findings import Finding

    findings = [
        Finding(type="cost", severity="high", resource="ec2", message="x", suggestion=None, controls=()),
        Finding(type="security", severity="medium", resource="s3", message="x", suggestion=None, controls=()),
        Finding(type="drift", severity="low", resource="vpc", message="x", suggestion=None, controls=()),
    ]
    # 20 + 8 + 2 = 30
    assert _compute_risk(findings) == 30


def test_compute_risk_unknown_severity():
    findings = [Finding(type="misc", severity="unknown", resource="r", message="x", suggestion=None, controls=())]
    assert _compute_risk(findings) == 0


# ── _merge_findings ────────────────────────────────────────────────────────────


class TestMergeFindings:
    def test_empty_plan_returns_static(self):
        static = [_f("TF001", "aws_s3_bucket.b"), _f("K8S001", "pod")]
        result = _merge_findings(static, [])
        assert result == static

    def test_plan_findings_always_included(self):
        plan = [_f("TF001", "aws_rds_cluster.db")]
        result = _merge_findings([], plan)
        assert plan[0] in result

    def test_static_tf_deduped_when_plan_covers_resource(self):
        # Plan covers aws_s3_bucket.b → static TF finding for same resource dropped
        plan = [_f("TF100", "aws_s3_bucket.b")]
        static = [_f("TF001", "aws_s3_bucket.b")]
        result = _merge_findings(static, plan)
        assert _f("TF001", "aws_s3_bucket.b") not in result
        assert plan[0] in result

    def test_k8s_findings_always_kept(self):
        plan = [_f("TF100", "aws_s3_bucket.b")]
        static = [_f("K8S001", "my_deployment"), _f("TF001", "aws_s3_bucket.b")]
        result = _merge_findings(static, plan)
        rule_ids = [f.rule_id for f in result]
        assert "K8S001" in rule_ids

    def test_gha_findings_always_kept(self):
        plan = [_f("TF100", "aws_rds.db")]
        static = [_f("GHA001", "ci_workflow")]
        result = _merge_findings(static, plan)
        assert _f("GHA001", "ci_workflow") in result

    def test_static_tf_for_uncovered_resource_kept(self):
        # Plan covers resource_a but NOT resource_b — static TF for resource_b stays
        plan = [_f("TF100", "resource_a")]
        static = [_f("TF001", "resource_b")]
        result = _merge_findings(static, plan)
        assert _f("TF001", "resource_b") in result

    def test_no_rule_id_static_treated_as_tf(self):
        # Static finding with no rule_id shouldn't survive if plan covers its resource
        plan = [_f("TF100", "aws_s3_bucket.x")]
        static = [_f(None, "aws_s3_bucket.x")]
        result = _merge_findings(static, plan)
        # The None rule_id is NOT a non-TF rule so it should be deduped
        assert _f(None, "aws_s3_bucket.x") not in result

    def test_ordering_plan_first(self):
        plan = [_f("TF100", "resource_a")]
        static = [_f("K8S001", "pod")]
        result = _merge_findings(static, plan)
        assert result[0].rule_id == "TF100"

    def test_empty_both_returns_empty(self):
        assert _merge_findings([], []) == []

    def test_all_static_kept_when_no_plan(self):
        static = [_f("TF001", "r1"), _f("K8S001", "r2"), _f("GHA001", "r3")]
        result = _merge_findings(static, [])
        assert len(result) == 3
