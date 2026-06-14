"""Integration tests for the DriftGuard CLI."""

from __future__ import annotations

import json
import textwrap
from pathlib import Path

import pytest
from typer.testing import CliRunner

from driftguard_cli.main import app

runner = CliRunner()


# ── helpers ───────────────────────────────────────────────────────────────────


def write_tf(tmp_path: Path, content: str, name: str = "main.tf") -> Path:
    f = tmp_path / name
    f.write_text(textwrap.dedent(content))
    return f


def write_k8s(tmp_path: Path, content: str, name: str = "deploy.yaml") -> Path:
    f = tmp_path / name
    f.write_text(textwrap.dedent(content))
    return f


def write_gha(tmp_path: Path, content: str, name: str = "ci.yml") -> Path:
    d = tmp_path / ".github" / "workflows"
    d.mkdir(parents=True, exist_ok=True)
    f = d / name
    f.write_text(textwrap.dedent(content))
    return f


# ── version / help ────────────────────────────────────────────────────────────


class TestMetaCommands:
    def test_version(self):
        result = runner.invoke(app, ["--version"])
        assert result.exit_code == 0
        assert "0.1.0" in result.output

    def test_help(self):
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        assert "scan" in result.output
        assert "analyze" in result.output
        assert "check" in result.output
        assert "rules" in result.output

    def test_scan_help(self):
        result = runner.invoke(app, ["scan", "--help"])
        assert result.exit_code == 0
        assert "--fail-on" in result.output

    def test_rules_all(self):
        result = runner.invoke(app, ["rules"])
        assert result.exit_code == 0
        assert "TF001" in result.output
        assert "K8S001" in result.output
        assert "GHA001" in result.output

    def test_rules_category_filter(self):
        result = runner.invoke(app, ["rules", "--category", "terraform"])
        assert result.exit_code == 0
        assert "TF001" in result.output
        assert "K8S001" not in result.output

    def test_rules_json_output(self):
        result = runner.invoke(app, ["rules", "-o", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert isinstance(data, list)
        assert len(data) == 33
        rule_ids = {r["id"] for r in data}
        assert "TF001" in rule_ids
        assert "GHA008" in rule_ids


# ── scan command ──────────────────────────────────────────────────────────────


class TestScanCommand:
    def test_empty_dir_exit_0(self, tmp_path):
        result = runner.invoke(app, ["scan", str(tmp_path)])
        assert result.exit_code == 0
        assert "No findings" in result.output

    def test_invalid_path_exit_2(self, tmp_path):
        result = runner.invoke(app, ["scan", str(tmp_path / "does_not_exist")])
        assert result.exit_code == 2

    def test_file_not_dir_exit_2(self, tmp_path):
        f = tmp_path / "file.txt"
        f.write_text("hello")
        result = runner.invoke(app, ["scan", str(f)])
        assert result.exit_code == 2

    def test_tf_finding_detected(self, tmp_path):
        write_tf(tmp_path, """
            resource "aws_s3_bucket" "logs" {
              force_destroy = true
            }
        """)
        result = runner.invoke(app, ["scan", str(tmp_path)])
        assert result.exit_code == 0
        assert "TF003" in result.output

    def test_json_output(self, tmp_path):
        write_tf(tmp_path, """
            resource "aws_s3_bucket" "logs" {
              force_destroy = true
            }
        """)
        result = runner.invoke(app, ["scan", str(tmp_path), "-o", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["summary"]["total"] >= 1
        rule_ids = {f["rule_id"] for f in data["findings"]}
        assert "TF003" in rule_ids

    def test_sarif_output_structure(self, tmp_path):
        write_tf(tmp_path, """
            resource "aws_s3_bucket" "logs" {
              force_destroy = true
            }
        """)
        result = runner.invoke(app, ["scan", str(tmp_path), "-o", "sarif"])
        assert result.exit_code == 0
        sarif = json.loads(result.output)
        assert sarif["version"] == "2.1.0"
        assert len(sarif["runs"]) == 1
        assert sarif["runs"][0]["tool"]["driver"]["name"] == "DriftGuard"

    def test_fail_on_exits_1_when_finding(self, tmp_path):
        write_tf(tmp_path, """
            resource "aws_s3_bucket" "logs" {
              force_destroy = true
            }
        """)
        result = runner.invoke(app, ["scan", str(tmp_path), "--fail-on", "high"])
        assert result.exit_code == 1

    def test_fail_on_exits_0_when_below_threshold(self, tmp_path):
        write_tf(tmp_path, """
            resource "aws_lambda_function" "worker" {
              function_name = "worker"
              runtime       = "python3.12"
            }
        """)
        # TF011 is LOW — should not trigger --fail-on high
        result = runner.invoke(app, ["scan", str(tmp_path), "--fail-on", "high"])
        assert result.exit_code == 0

    def test_min_severity_filters_low(self, tmp_path):
        write_tf(tmp_path, """
            resource "aws_lambda_function" "worker" {
              function_name = "worker"
              runtime       = "python3.12"
            }
        """)
        # TF011 is LOW — filtered out when min-severity is high
        result = runner.invoke(app, ["scan", str(tmp_path), "--min-severity", "high"])
        assert result.exit_code == 0
        assert "TF011" not in result.output

    def test_k8s_finding_detected(self, tmp_path):
        write_k8s(tmp_path, """
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: app
            spec:
              template:
                spec:
                  containers:
                    - name: app
                      image: app:latest
        """)
        result = runner.invoke(app, ["scan", str(tmp_path)])
        assert result.exit_code == 0
        assert "K8S006" in result.output

    def test_gha_finding_detected(self, tmp_path):
        write_gha(tmp_path, """
            on: push
            jobs:
              build:
                runs-on: ubuntu-latest
                steps:
                  - uses: actions/checkout@main
        """)
        result = runner.invoke(app, ["scan", str(tmp_path)])
        assert result.exit_code == 0
        assert "GHA001" in result.output

    def test_verbose_shows_suggestion(self, tmp_path):
        write_tf(tmp_path, """
            resource "aws_db_instance" "prod" {
              engine = "postgres"
            }
        """)
        result = runner.invoke(app, ["scan", str(tmp_path), "-v"])
        assert result.exit_code == 0
        assert "Fix:" in result.output

    def test_json_output_includes_metadata(self, tmp_path):
        result = runner.invoke(app, ["scan", str(tmp_path), "-o", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "files_scanned" in data
        assert "tf_files" in data
        assert "k8s_files" in data
        assert "gha_files" in data
        assert "risk_score" in data


# ── check command ─────────────────────────────────────────────────────────────


class TestCheckCommand:
    def test_clean_dir_exits_0(self, tmp_path):
        result = runner.invoke(app, ["check", str(tmp_path)])
        assert result.exit_code == 0
        assert "Safe to merge" in result.output

    def test_high_finding_exits_1(self, tmp_path):
        write_tf(tmp_path, """
            resource "aws_s3_bucket" "logs" {
              force_destroy = true
            }
        """)
        result = runner.invoke(app, ["check", str(tmp_path)])
        assert result.exit_code == 1

    def test_severity_critical_only_passes_high(self, tmp_path):
        write_tf(tmp_path, """
            resource "aws_s3_bucket" "logs" {
              force_destroy = true
            }
        """)
        # TF003 is HIGH, threshold is critical — should pass
        result = runner.invoke(app, ["check", str(tmp_path), "--severity", "critical"])
        assert result.exit_code == 0

    def test_invalid_path_exits_2(self, tmp_path):
        result = runner.invoke(app, ["check", str(tmp_path / "missing")])
        assert result.exit_code == 2

    def test_json_output_includes_check_metadata(self, tmp_path):
        result = runner.invoke(app, ["check", str(tmp_path), "-o", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "check" in data
        assert data["check"]["passed"] is True


# ── analyze command ───────────────────────────────────────────────────────────

_PLAN_CREATE = {
    "format_version": "1.2",
    "terraform_version": "1.7.0",
    "resource_changes": [
        {
            "address": "aws_s3_bucket.data",
            "type": "aws_s3_bucket",
            "name": "data",
            "provider_config_key": "registry.terraform.io/hashicorp/aws",
            "change": {
                "actions": ["create"],
                "before": None,
                "after": {"bucket": "my-data"},
                "after_unknown": {},
            },
        }
    ],
}

_PLAN_DELETE_RDS = {
    "format_version": "1.2",
    "terraform_version": "1.7.0",
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


class TestAnalyzeCommand:
    def test_analyze_create_plan(self, tmp_path):
        plan_file = tmp_path / "plan.json"
        plan_file.write_text(json.dumps(_PLAN_CREATE))
        result = runner.invoke(app, ["analyze", str(plan_file)])
        assert result.exit_code == 0
        assert "aws_s3_bucket" in result.output
        assert "CREATE" in result.output

    def test_analyze_json_output(self, tmp_path):
        plan_file = tmp_path / "plan.json"
        plan_file.write_text(json.dumps(_PLAN_CREATE))
        result = runner.invoke(app, ["analyze", str(plan_file), "-o", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "risk_score" in data
        assert "risk_level" in data
        assert data["summary"]["creates"] == 1

    def test_analyze_rds_delete_high_risk(self, tmp_path):
        plan_file = tmp_path / "plan.json"
        plan_file.write_text(json.dumps(_PLAN_DELETE_RDS))
        result = runner.invoke(app, ["analyze", str(plan_file), "-o", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["risk_score"] >= 70
        assert data["risk_level"] in ("high", "critical")

    def test_analyze_verbose_shows_factors(self, tmp_path):
        plan_file = tmp_path / "plan.json"
        plan_file.write_text(json.dumps(_PLAN_DELETE_RDS))
        result = runner.invoke(app, ["analyze", str(plan_file), "-v"])
        assert result.exit_code == 0
        assert "Risk factors" in result.output

    def test_analyze_fail_on_exits_1(self, tmp_path):
        plan_file = tmp_path / "plan.json"
        plan_file.write_text(json.dumps(_PLAN_DELETE_RDS))
        result = runner.invoke(app, ["analyze", str(plan_file), "--fail-on", "high"])
        assert result.exit_code == 1

    def test_analyze_fail_on_exits_0_below_threshold(self, tmp_path):
        plan_file = tmp_path / "plan.json"
        plan_file.write_text(json.dumps(_PLAN_CREATE))
        result = runner.invoke(app, ["analyze", str(plan_file), "--fail-on", "critical"])
        assert result.exit_code == 0

    def test_analyze_missing_file_exits_2(self, tmp_path):
        result = runner.invoke(app, ["analyze", str(tmp_path / "plan.json")])
        assert result.exit_code == 2

    def test_analyze_invalid_json_exits_2(self, tmp_path):
        plan_file = tmp_path / "plan.json"
        plan_file.write_text("not json!")
        result = runner.invoke(app, ["analyze", str(plan_file)])
        assert result.exit_code == 2

    def test_analyze_no_changes_zero_score(self, tmp_path):
        plan = {"format_version": "1.2", "terraform_version": "1.7.0", "resource_changes": []}
        plan_file = tmp_path / "plan.json"
        plan_file.write_text(json.dumps(plan))
        result = runner.invoke(app, ["analyze", str(plan_file), "-o", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["risk_score"] == 0
        assert data["risk_level"] == "low"

    def test_analyze_sarif_not_supported(self, tmp_path):
        plan_file = tmp_path / "plan.json"
        plan_file.write_text(json.dumps(_PLAN_CREATE))
        result = runner.invoke(app, ["analyze", str(plan_file), "-o", "sarif"])
        assert result.exit_code == 2
