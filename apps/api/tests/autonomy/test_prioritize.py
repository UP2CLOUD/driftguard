from driftguard.autonomy.prioritize import prioritize
from driftguard.autonomy.schemas import AgentFinding, AutonomyConfig


def _finding(role: str, severity: str, title: str) -> AgentFinding:
    return AgentFinding(role=role, severity=severity, area="apps/api", title=title, description="d")


def test_sorts_by_severity_desc():
    findings = [
        _finding("qa", "low", "a"),
        _finding("qa", "critical", "b"),
        _finding("qa", "medium", "c"),
    ]
    result = prioritize(findings, AutonomyConfig())
    assert [f.title for f in result] == ["b", "c", "a"]


def test_caps_per_role_before_overall():
    config = AutonomyConfig(max_findings_per_role=1, max_findings_per_run=20)
    findings = [
        _finding("qa", "high", "qa-1"),
        _finding("qa", "critical", "qa-2"),
        _finding("security", "medium", "sec-1"),
    ]
    result = prioritize(findings, config)
    titles = [f.title for f in result]
    assert "qa-1" not in titles  # qa capped to its single highest-severity finding
    assert "qa-2" in titles
    assert "sec-1" in titles


def test_caps_overall_after_per_role():
    config = AutonomyConfig(max_findings_per_role=5, max_findings_per_run=2)
    findings = [
        _finding("qa", "critical", "qa-1"),
        _finding("security", "high", "sec-1"),
        _finding("performance", "low", "perf-1"),
    ]
    result = prioritize(findings, config)
    assert len(result) == 2
    assert result[0].title == "qa-1"


def test_empty_input():
    assert prioritize([], AutonomyConfig()) == []
