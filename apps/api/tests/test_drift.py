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
    assert resources == ["aws_rds_cluster.c", "aws_s3_bucket.a"]


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
