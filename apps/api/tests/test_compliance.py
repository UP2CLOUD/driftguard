from driftguard.compliance import (
    control_summary,
    enrich_finding_with_controls,
    summarize_frameworks,
)
from driftguard.compliance.controls import CATALOG
from driftguard.compliance.mappings import controls_for_rule


def test_catalog_has_expected_controls():
    expected = {
        "encryption_at_rest",
        "encryption_in_transit",
        "public_exposure",
        "logging_audit",
        "access_control",
        "backup_retention",
    }
    assert expected.issubset(CATALOG.keys())


def test_known_checkov_rule_maps():
    assert "public_exposure" in controls_for_rule("CKV_AWS_57")
    assert "encryption_at_rest" in controls_for_rule("CKV_AWS_19")
    assert "encryption_in_transit" in controls_for_rule("CKV_AWS_2")


def test_unknown_rule_returns_empty():
    assert controls_for_rule("CKV_AWS_999999") == ()
    assert controls_for_rule(None) == ()


def test_enrich_returns_control_objects():
    controls = enrich_finding_with_controls("CKV_AWS_57")
    assert len(controls) == 1
    assert controls[0].id == "public_exposure"
    assert any(r.framework == "DORA" for r in controls[0].refs)


def test_summarize_frameworks_counts():
    rule_ids = ["CKV_AWS_57", "CKV_AWS_19", "CKV_AWS_2", None, "CKV_AWS_999"]
    counts = summarize_frameworks(rule_ids)
    assert counts.get("DORA", 0) > 0
    assert counts.get("ISO27001", 0) > 0


def test_control_summary_returns_refs():
    summary = control_summary(["CKV_AWS_57"])
    assert "public_exposure" in summary
    frameworks = {r.framework for r in summary["public_exposure"]}
    assert "DORA" in frameworks
    assert "ISO27001" in frameworks
