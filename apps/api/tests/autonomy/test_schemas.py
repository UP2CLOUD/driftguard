from driftguard.autonomy.schemas import (
    AgentFinding,
    AutonomyConfig,
    severity_rank,
)


def test_dedup_key_stable_for_same_fields():
    a = AgentFinding(role="security", severity="high", area="apps/api", title="X", description="d")
    b = AgentFinding(role="security", severity="low", area="apps/api", title="X", description="different")
    assert a.dedup_key() == b.dedup_key()


def test_dedup_key_differs_by_role_area_title():
    base = AgentFinding(role="security", severity="high", area="apps/api", title="X", description="d")
    other_role = AgentFinding(role="qa", severity="high", area="apps/api", title="X", description="d")
    other_area = AgentFinding(role="security", severity="high", area="apps/web", title="X", description="d")
    other_title = AgentFinding(role="security", severity="high", area="apps/api", title="Y", description="d")
    assert base.dedup_key() != other_role.dedup_key()
    assert base.dedup_key() != other_area.dedup_key()
    assert base.dedup_key() != other_title.dedup_key()


def test_to_dict_from_dict_roundtrip():
    f = AgentFinding(
        role="performance",
        severity="medium",
        area="apps/api/driftguard/services",
        title="N+1 query",
        description="loads repos in a loop",
        suggestion="use selectinload",
    )
    assert AgentFinding.from_dict(f.to_dict()) == f


def test_severity_rank_orders_critical_highest():
    assert severity_rank("critical") > severity_rank("high") > severity_rank("medium")
    assert severity_rank("medium") > severity_rank("low") > severity_rank("info")


def test_autonomy_config_defaults():
    config = AutonomyConfig()
    assert "security" in config.enabled_roles
    assert config.max_findings_per_run >= config.max_findings_per_role


def test_autonomy_config_from_dict_partial():
    config = AutonomyConfig.from_dict({"max_findings_per_role": 2})
    assert config.max_findings_per_role == 2
    assert config.max_findings_per_run == 20  # untouched default
