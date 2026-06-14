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


# ── _compute_risk with plan ────────────────────────────────────────────────────


def test_compute_risk_uses_plan_scorer_when_plan_has_changes():
    """When a TerraformPlan with changes is provided, score_plan() is used instead of finding weights."""
    from driftguard.services.terraform.plan_parser import parse_plan

    raw = {
        "format_version": "1.2",
        "resource_changes": [
            {
                "address": "aws_rds_cluster.prod",
                "type": "aws_rds_cluster",
                "name": "prod",
                "provider_config_key": "registry.terraform.io/hashicorp/aws",
                "change": {
                    "actions": ["delete"],
                    "before": {"id": "prod"},
                    "after": None,
                    "after_unknown": {},
                },
            }
        ],
    }
    plan = parse_plan(raw)
    assert plan.changes  # guard: plan must have changes
    score = _compute_risk([], plan)
    # Deleting an RDS cluster is high-risk → score should be well above finding-fallback
    assert score >= 70


def test_compute_risk_plan_with_no_changes_falls_back_to_findings():
    """When plan.changes is empty, falls back to finding-severity weighted sum."""
    from driftguard.services.terraform.plan_parser import parse_plan

    plan = parse_plan({"format_version": "1.2", "resource_changes": []})
    assert plan.changes == []
    findings = [_f(None, "r", "critical")]
    score = _compute_risk(findings, plan)
    assert score == 40  # critical weight = 40


# ── _safe_infracost / _safe_checkov / _safe_drift ─────────────────────────────


class TestSafeHelpers:
    def test_safe_infracost_returns_none_on_error(self, tmp_path):
        from unittest.mock import patch

        from driftguard.workers.analyzer import _safe_infracost

        with patch("driftguard.workers.analyzer.infracost.cost_breakdown", side_effect=RuntimeError("no binary")):
            result = _safe_infracost(tmp_path / "plan.json")
        assert result is None

    def test_safe_infracost_returns_data_on_success(self, tmp_path):
        from unittest.mock import patch

        from driftguard.workers.analyzer import _safe_infracost

        data = {"totalMonthlyCost": "50.00"}
        with patch("driftguard.workers.analyzer.infracost.cost_breakdown", return_value=data):
            result = _safe_infracost(tmp_path / "plan.json")
        assert result == data

    def test_safe_checkov_returns_none_on_error(self, tmp_path):
        from unittest.mock import patch

        from driftguard.workers.analyzer import _safe_checkov

        with patch("driftguard.workers.analyzer.checkov.scan", side_effect=FileNotFoundError("checkov not found")):
            result = _safe_checkov(tmp_path / "plan.json")
        assert result is None

    def test_safe_checkov_returns_list_on_success(self, tmp_path):
        from unittest.mock import patch

        from driftguard.workers.analyzer import _safe_checkov

        data = [{"check_id": "CKV_AWS_19", "result": "FAILED"}]
        with patch("driftguard.workers.analyzer.checkov.scan", return_value=data):
            result = _safe_checkov(tmp_path / "plan.json")
        assert result == data

    def test_safe_drift_returns_empty_when_no_state(self, tmp_path):
        """When no state resources are found, _safe_drift returns []."""
        from unittest.mock import patch

        from driftguard.workers.analyzer import _safe_drift

        with patch("driftguard.integrations.drift.DriftAnalyzer.analyze_state_file", return_value=None):
            result = _safe_drift(tmp_path, plan_json={})
        assert result == []

    def test_safe_drift_returns_findings_for_orphan_resources(self, tmp_path):
        """Orphan resources in state but not in plan become drift Findings."""
        from unittest.mock import patch

        from driftguard.workers.analyzer import _safe_drift

        orphan_resource = "aws_instance.orphan"
        with (
            patch("driftguard.integrations.drift.DriftAnalyzer.analyze_state_file", return_value={orphan_resource}),
            patch("driftguard.integrations.drift.DriftAnalyzer.from_plan_json", return_value=[]),
        ):
            result = _safe_drift(tmp_path, plan_json={})
        assert any(f.resource == orphan_resource for f in result)

    def test_safe_drift_returns_empty_on_exception(self, tmp_path):
        """Any exception in drift detection is swallowed — never raises."""
        from unittest.mock import patch

        from driftguard.workers.analyzer import _safe_drift

        with patch("driftguard.integrations.drift.DriftAnalyzer.analyze_state_file", side_effect=RuntimeError("crash")):
            result = _safe_drift(tmp_path, plan_json={})
        assert result == []

    def test_safe_drift_uses_provided_real_state(self, tmp_path):
        """When real_state is passed in, analyze_state_file is NOT called."""
        from unittest.mock import patch

        from driftguard.workers.analyzer import _safe_drift

        provided_state = {"aws_s3_bucket.logs"}
        with (
            patch("driftguard.integrations.drift.DriftAnalyzer.analyze_state_file") as mock_analyze,
            patch("driftguard.integrations.drift.DriftAnalyzer.from_plan_json", return_value=[]),
        ):
            _safe_drift(tmp_path, plan_json={}, real_state=provided_state)
        mock_analyze.assert_not_called()
