"""Tests for the analyzer pipeline logic (unit-level, no external I/O)."""

from __future__ import annotations

from driftguard.workers.analyzer import _compute_risk


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
    from driftguard.ai.findings import Finding

    findings = [Finding(type="misc", severity="unknown", resource="r", message="x", suggestion=None, controls=())]
    assert _compute_risk(findings) == 0
