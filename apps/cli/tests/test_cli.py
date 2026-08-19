"""Integration tests for the DriftGuard CLI."""

from __future__ import annotations

import json
import re
import textwrap
from pathlib import Path

from typer.testing import CliRunner

from driftguard_cli.main import app

runner = CliRunner()

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


def strip_ansi(text: str) -> str:
    """Strip SGR escape codes so plain-text assertions don't depend on the
    runner's terminal/colour detection. NO_COLOR (set in conftest.py) isn't
    enough on its own: it suppresses colour but Rich still emits bold/dim
    style codes, which split option names like "--fail-on" into separate
    spans (e.g. "-", "-fail", "-on") and break a naive substring check on
    whichever CI runner happens to make Typer/Rich think it's a terminal.
    """
    return _ANSI_RE.sub("", text)


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
        assert "0.1.0" in strip_ansi(result.output)

    def test_help(self):
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        assert "scan" in strip_ansi(result.output)
        assert "analyze" in strip_ansi(result.output)
        assert "check" in strip_ansi(result.output)
        assert "rules" in strip_ansi(result.output)

    def test_scan_help(self):
        result = runner.invoke(app, ["scan", "--help"])
        assert result.exit_code == 0
        assert "--fail-on" in strip_ansi(result.output)

    def test_rules_all(self):
        result = runner.invoke(app, ["rules"])
        assert result.exit_code == 0
        assert "TF001" in strip_ansi(result.output)
        assert "K8S001" in strip_ansi(result.output)
        assert "GHA001" in strip_ansi(result.output)

    def test_rules_category_filter(self):
        result = runner.invoke(app, ["rules", "--category", "terraform"])
        assert result.exit_code == 0
        assert "TF001" in strip_ansi(result.output)
        assert "K8S001" not in strip_ansi(result.output)

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
        assert "No findings" in strip_ansi(result.output)

    def test_invalid_path_exit_2(self, tmp_path):
        result = runner.invoke(app, ["scan", str(tmp_path / "does_not_exist")])
        assert result.exit_code == 2

    def test_file_not_dir_exit_2(self, tmp_path):
        f = tmp_path / "file.txt"
        f.write_text("hello")
        result = runner.invoke(app, ["scan", str(f)])
        assert result.exit_code == 2

    def test_tf_finding_detected(self, tmp_path):
        write_tf(
            tmp_path,
            """
            resource "aws_s3_bucket" "logs" {
              force_destroy = true
            }
        """,
        )
        result = runner.invoke(app, ["scan", str(tmp_path)])
        assert result.exit_code == 0
        assert "TF003" in strip_ansi(result.output)

    def test_json_output(self, tmp_path):
        write_tf(
            tmp_path,
            """
            resource "aws_s3_bucket" "logs" {
              force_destroy = true
            }
        """,
        )
        result = runner.invoke(app, ["scan", str(tmp_path), "-o", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert data["summary"]["total"] >= 1
        rule_ids = {f["rule_id"] for f in data["findings"]}
        assert "TF003" in rule_ids

    def test_sarif_output_structure(self, tmp_path):
        write_tf(
            tmp_path,
            """
            resource "aws_s3_bucket" "logs" {
              force_destroy = true
            }
        """,
        )
        result = runner.invoke(app, ["scan", str(tmp_path), "-o", "sarif"])
        assert result.exit_code == 0
        sarif = json.loads(result.output)
        assert sarif["version"] == "2.1.0"
        assert len(sarif["runs"]) == 1
        assert sarif["runs"][0]["tool"]["driver"]["name"] == "DriftGuard"

    def test_fail_on_exits_1_when_finding(self, tmp_path):
        write_tf(
            tmp_path,
            """
            resource "aws_s3_bucket" "logs" {
              force_destroy = true
            }
        """,
        )
        result = runner.invoke(app, ["scan", str(tmp_path), "--fail-on", "high"])
        assert result.exit_code == 1

    def test_fail_on_exits_0_when_below_threshold(self, tmp_path):
        write_tf(
            tmp_path,
            """
            resource "aws_lambda_function" "worker" {
              function_name = "worker"
              runtime       = "python3.12"
            }
        """,
        )
        # TF011 is LOW — should not trigger --fail-on high
        result = runner.invoke(app, ["scan", str(tmp_path), "--fail-on", "high"])
        assert result.exit_code == 0

    def test_min_severity_filters_low(self, tmp_path):
        write_tf(
            tmp_path,
            """
            resource "aws_lambda_function" "worker" {
              function_name = "worker"
              runtime       = "python3.12"
            }
        """,
        )
        # TF011 is LOW — filtered out when min-severity is high
        result = runner.invoke(app, ["scan", str(tmp_path), "--min-severity", "high"])
        assert result.exit_code == 0
        assert "TF011" not in strip_ansi(result.output)

    def test_k8s_finding_detected(self, tmp_path):
        write_k8s(
            tmp_path,
            """
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
        """,
        )
        result = runner.invoke(app, ["scan", str(tmp_path)])
        assert result.exit_code == 0
        assert "K8S006" in strip_ansi(result.output)

    def test_gha_finding_detected(self, tmp_path):
        write_gha(
            tmp_path,
            """
            on: push
            jobs:
              build:
                runs-on: ubuntu-latest
                steps:
                  - uses: actions/checkout@main
        """,
        )
        result = runner.invoke(app, ["scan", str(tmp_path)])
        assert result.exit_code == 0
        assert "GHA001" in strip_ansi(result.output)

    def test_verbose_shows_suggestion(self, tmp_path):
        write_tf(
            tmp_path,
            """
            resource "aws_db_instance" "prod" {
              engine = "postgres"
            }
        """,
        )
        result = runner.invoke(app, ["scan", str(tmp_path), "-v"])
        assert result.exit_code == 0
        assert "Fix:" in strip_ansi(result.output)

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
        assert "Safe to merge" in strip_ansi(result.output)

    def test_high_finding_exits_1(self, tmp_path):
        write_tf(
            tmp_path,
            """
            resource "aws_s3_bucket" "logs" {
              force_destroy = true
            }
        """,
        )
        result = runner.invoke(app, ["check", str(tmp_path)])
        assert result.exit_code == 1

    def test_severity_critical_only_passes_high(self, tmp_path):
        write_tf(
            tmp_path,
            """
            resource "aws_s3_bucket" "logs" {
              force_destroy = true
            }
        """,
        )
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
        assert "aws_s3_bucket" in strip_ansi(result.output)
        assert "CREATE" in strip_ansi(result.output)

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
        assert "Risk factors" in strip_ansi(result.output)

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


class TestEncryptionAndPublicAccessRules:
    """TF016 / TF017 — gaps found by scanning a deliberately insecure fixture.

    TF016: RDS storage_encrypted defaults to false, so an unset attribute is a
    real unencrypted-at-rest finding (SOC 2 / PCI-DSS / HIPAA / DORA control),
    but only EBS encryption was covered before.

    TF017: TF002 fires only when aws_s3_bucket_public_access_block is absent
    entirely, so a block that exists with its guards flipped to false passed
    silently -- the configuration behind most real S3 exposure incidents.
    """

    def test_tf016_flags_unencrypted_rds(self, tmp_path):
        write_tf(
            tmp_path,
            """
            resource "aws_db_instance" "postgres" {
              engine            = "postgres"
              storage_encrypted = false
            }
        """,
        )
        result = runner.invoke(app, ["scan", str(tmp_path)])
        assert "TF016" in strip_ansi(result.output)

    def test_tf016_flags_rds_with_attribute_absent(self, tmp_path):
        # storage_encrypted defaults to false in AWS, so omitting it is a finding
        write_tf(
            tmp_path,
            """
            resource "aws_db_instance" "postgres" {
              engine = "postgres"
            }
        """,
        )
        assert "TF016" in strip_ansi(runner.invoke(app, ["scan", str(tmp_path)]).output)

    def test_tf016_silent_when_encrypted(self, tmp_path):
        write_tf(
            tmp_path,
            """
            resource "aws_db_instance" "postgres" {
              engine            = "postgres"
              storage_encrypted = true
            }
        """,
        )
        assert "TF016" not in strip_ansi(runner.invoke(app, ["scan", str(tmp_path)]).output)

    def test_tf017_flags_disabled_public_access_guard(self, tmp_path):
        write_tf(
            tmp_path,
            """
            resource "aws_s3_bucket_public_access_block" "pab" {
              bucket              = "b"
              block_public_acls   = false
              block_public_policy = true
            }
        """,
        )
        out = strip_ansi(runner.invoke(app, ["scan", str(tmp_path)]).output)
        assert "TF017" in out

    def test_tf017_silent_when_all_guards_enabled(self, tmp_path):
        write_tf(
            tmp_path,
            """
            resource "aws_s3_bucket_public_access_block" "pab" {
              bucket                  = "b"
              block_public_acls       = true
              block_public_policy     = true
              ignore_public_acls      = true
              restrict_public_buckets = true
            }
        """,
        )
        assert "TF017" not in strip_ansi(runner.invoke(app, ["scan", str(tmp_path)]).output)


class TestWorkflowClassificationByScanRoot:
    """GitHub Actions files must be recognised regardless of the scan root.

    Classification used to be computed relative to the scan root, so
    `dg scan .github` and `dg scan .github/workflows` -- both natural CI
    invocations -- saw path parts like ("workflows",) instead of
    (".github", "workflows"). Every workflow was then classified as
    Kubernetes, the whole GHA ruleset never ran, and the scan printed
    "No findings ... Safe to merge". Scanning the repo root happened to
    work, which is exactly what hid it.
    """

    @staticmethod
    def _workflow_repo(tmp_path):
        wf = tmp_path / ".github" / "workflows"
        wf.mkdir(parents=True)
        # GHA002: ACTIONS_ALLOW_UNSECURE_COMMANDS is an unambiguous finding.
        (wf / "ci.yml").write_text(
            "name: ci\n"
            "on: push\n"
            "permissions: read-all\n"
            "jobs:\n"
            "  build:\n"
            "    runs-on: ubuntu-latest\n"
            "    env:\n"
            "      ACTIONS_ALLOW_UNSECURE_COMMANDS: true\n"
            "    steps:\n"
            "      - run: echo hi\n"
        )
        return tmp_path

    def _counts(self, path):
        result = runner.invoke(app, ["scan", str(path), "-o", "json"])
        assert result.exit_code == 0, result.output
        return json.loads(result.output)

    def test_repo_root_classifies_workflows_as_gha(self, tmp_path):
        repo = self._workflow_repo(tmp_path)
        d = self._counts(repo)
        assert d["gha_files"] == 1
        assert d["k8s_files"] == 0

    def test_dot_github_root_classifies_workflows_as_gha(self, tmp_path):
        repo = self._workflow_repo(tmp_path)
        d = self._counts(repo / ".github")
        assert d["gha_files"] == 1, "workflows misclassified when scanning .github"
        assert d["k8s_files"] == 0

    def test_workflows_dir_root_classifies_workflows_as_gha(self, tmp_path):
        repo = self._workflow_repo(tmp_path)
        d = self._counts(repo / ".github" / "workflows")
        assert d["gha_files"] == 1, "workflows misclassified when scanning .github/workflows"
        assert d["k8s_files"] == 0

    def test_gha_rules_actually_fire_from_a_narrow_root(self, tmp_path):
        """The point of the fix: the rules run, not merely that a count is right."""
        repo = self._workflow_repo(tmp_path)
        d = self._counts(repo / ".github" / "workflows")
        rule_ids = {f["rule_id"] for f in d["findings"]}
        assert "GHA002" in rule_ids, f"GHA ruleset did not run; got {rule_ids}"

    def test_real_kubernetes_yaml_is_still_scanned_as_k8s(self, tmp_path):
        (tmp_path / "deploy.yaml").write_text("apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: x\n")
        d = self._counts(tmp_path)
        assert d["k8s_files"] == 1
        assert d["gha_files"] == 0

    def test_non_workflow_github_config_is_not_scanned_as_k8s(self, tmp_path):
        gh = tmp_path / ".github"
        gh.mkdir()
        (gh / "dependabot.yml").write_text("version: 2\nupdates: []\n")
        d = self._counts(tmp_path)
        assert d["k8s_files"] == 0, "dependabot.yml is neither Kubernetes nor a workflow"
        assert d["gha_files"] == 0
