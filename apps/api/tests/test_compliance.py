from driftguard.compliance import (
    control_summary,
    enrich_finding_with_controls,
    summarize_frameworks,
)
from driftguard.compliance.controls import CATALOG, all_controls
from driftguard.compliance.controls import get as get_control
from driftguard.compliance.mappings import controls_for_rule, coverage_stats


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


def test_azure_rule_maps_to_encryption():
    assert "encryption_at_rest" in controls_for_rule("CKV_AZURE_2")


def test_gcp_rule_maps_to_public_exposure():
    assert "public_exposure" in controls_for_rule("CKV_GCP_2")


def test_k8s_rule_maps_to_container_security():
    assert "container_security" in controls_for_rule("CKV_K8S_1")


def test_rule_with_multiple_controls():
    """CKV_AWS_273 maps to both public_exposure and access_control."""
    controls = controls_for_rule("CKV_AWS_273")
    assert "public_exposure" in controls
    assert "access_control" in controls


def test_controls_get_known_id():
    c = get_control("encryption_at_rest")
    assert c is not None
    assert c.id == "encryption_at_rest"


def test_controls_get_unknown_id_returns_none():
    assert get_control("nonexistent_control") is None


def test_all_controls_returns_full_catalog():
    controls = all_controls()
    assert len(controls) >= 6
    ids = {c.id for c in controls}
    assert "encryption_at_rest" in ids
    assert "container_security" in ids


def test_coverage_stats_has_all_providers():
    stats = coverage_stats()
    assert stats["aws"] > 0
    assert stats["azure"] > 0
    assert stats["gcp"] > 0
    assert stats["k8s"] > 0
    assert stats["native"] > 0
    assert stats["total"] == stats["aws"] + stats["azure"] + stats["gcp"] + stats["k8s"] + stats["native"]


def test_native_terraform_rule_maps_to_access_control():
    """TF001 (IAM Resource: "*") is DriftGuard's own scanner, not Checkov."""
    assert "access_control" in controls_for_rule("TF001")


def test_native_terraform_rule_maps_to_public_exposure():
    assert "public_exposure" in controls_for_rule("TF007")


def test_native_terraform_rule_maps_to_encryption_at_rest():
    assert "encryption_at_rest" in controls_for_rule("TF010")


def test_native_kubernetes_rule_maps_to_container_security():
    assert "container_security" in controls_for_rule("K8S001")


def test_native_github_actions_rule_maps_to_access_control():
    """GHA004: missing permissions: block defaults to write-all."""
    assert "access_control" in controls_for_rule("GHA004")


def test_native_rule_without_compliance_scope_stays_unmapped():
    """K8S002 (missing resource limits) is reliability, not a CATALOG control — must not be forced."""
    assert controls_for_rule("K8S002") == ()


def test_native_rule_enriches_to_real_citations():
    controls = enrich_finding_with_controls("TF013")
    assert len(controls) == 1
    assert controls[0].id == "public_exposure"
    assert any(r.framework == "DORA" for r in controls[0].refs)


def test_summarize_frameworks_empty_list():
    assert summarize_frameworks([]) == {}


def test_control_summary_empty_list():
    assert control_summary([]) == {}
