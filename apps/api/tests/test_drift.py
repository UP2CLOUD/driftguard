from pathlib import Path

from driftguard.integrations.drift import DriftAnalyzer


def test_extract_resources_from_plan():
    plan = {
        "resource_changes": [
            {
                "address": "aws_s3_bucket.a",
                "change": {"actions": ["create"]},
            },
            {
                "address": "aws_instance.b",
                "change": {"actions": ["no-op"]},
            },
            {
                "address": "aws_rds_cluster.c",
                "change": {"actions": ["delete"]},
            },
        ]
    }
    resources = DriftAnalyzer.from_plan_json(plan)
    assert set(resources) == {"aws_rds_cluster.c", "aws_s3_bucket.a"}


def test_detect_drift_small():
    planned = {"aws_instance.app", "aws_s3_bucket.data"}
    state = {
        "aws_instance.app",
        "aws_s3_bucket.data",
        "aws_security_group.legacy",
    }
    drift = DriftAnalyzer.detect_drift(planned_resources=planned, state_resources=state)
    assert len(drift) == 1
    assert drift[0]["severity"] == "medium"
    assert drift[0]["resource"] == "aws_security_group.legacy"


def test_detect_drift_large_unmanaged():
    planned = {"aws_instance.app"}
    state = {"aws_instance.app"} | {f"aws_instance.orphaned_{i}" for i in range(5)}
    drift = DriftAnalyzer.detect_drift(planned_resources=planned, state_resources=state, sensitive_threshold=3)
    assert len(drift) == 5
    assert drift[0]["severity"] == "high"


def test_parse_state_file(tmp_path: Path):
    import json

    state_file = tmp_path / "terraform.tfstate"
    state_file.write_text(
        json.dumps(
            {
                "resources": [
                    {"type": "aws_s3_bucket", "name": "app"},
                    {"type": "aws_instance", "name": "web"},
                ]
            }
        )
    )
    resources = DriftAnalyzer.analyze_state_file(state_file)
    assert resources == {"aws_s3_bucket.app", "aws_instance.web"}


def test_parse_missing_state_file(tmp_path: Path):
    missing = tmp_path / "missing.tfstate"
    resources = DriftAnalyzer.analyze_state_file(missing)
    assert resources is None


def test_from_plan_json_empty_resource_changes():
    """Plan with no resource_changes must return an empty list."""
    resources = DriftAnalyzer.from_plan_json({})
    assert resources == []


def test_from_plan_json_all_no_ops():
    """Plan where every action is no-op must return an empty list."""
    plan = {
        "resource_changes": [
            {"address": "aws_s3_bucket.a", "change": {"actions": ["no-op"]}},
            {"address": "aws_instance.b", "change": {"actions": ["no-op"]}},
        ]
    }
    resources = DriftAnalyzer.from_plan_json(plan)
    assert resources == []


def test_detect_drift_no_unmanaged_resources():
    """When state matches planned exactly, detect_drift must return []."""
    resources = {"aws_instance.app", "aws_s3_bucket.data"}
    drift = DriftAnalyzer.detect_drift(planned_resources=resources, state_resources=resources)
    assert drift == []


def test_detect_drift_capped_at_ten():
    """When more than 10 resources are unmanaged, only first 10 (sorted) are returned."""
    planned: set[str] = set()
    state = {f"aws_instance.orphan_{i:02d}" for i in range(15)}
    drift = DriftAnalyzer.detect_drift(planned_resources=planned, state_resources=state, sensitive_threshold=3)
    assert len(drift) == 10
    # Results are sorted; first 10 of sorted 15 names
    expected_first = sorted(state)[:10]
    assert [f["resource"] for f in drift] == expected_first


def test_analyze_state_file_invalid_json(tmp_path: Path):
    """State file with invalid JSON must return None."""
    bad = tmp_path / "bad.tfstate"
    bad.write_text("not valid json {{{")
    assert DriftAnalyzer.analyze_state_file(bad) is None


def test_analyze_state_file_skips_entries_missing_type_or_name(tmp_path: Path):
    """Resources missing type or name fields must be silently skipped."""
    import json

    state_file = tmp_path / "terraform.tfstate"
    state_file.write_text(
        json.dumps(
            {
                "resources": [
                    {"type": "aws_s3_bucket", "name": "app"},
                    {"type": "", "name": "orphan"},  # empty type → skipped
                    {"type": "aws_instance"},  # missing name → skipped
                    {"name": "only-name"},  # missing type → skipped
                ]
            }
        )
    )
    resources = DriftAnalyzer.analyze_state_file(state_file)
    assert resources == {"aws_s3_bucket.app"}
