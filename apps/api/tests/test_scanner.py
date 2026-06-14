"""Tests for the static IaC scanner: engine + Terraform/K8s/GHA rules."""

from __future__ import annotations

import textwrap

import pytest

from driftguard.services.scanner.engine import (
    Category,
    ScanFinding,
    ScanResult,
    Severity,
    scan_directory,
    scan_directory_sync,
)
from driftguard.services.scanner.rules.github_actions import _scan_single as gha_scan
from driftguard.services.scanner.rules.kubernetes import _scan_single as k8s_scan
from driftguard.services.scanner.rules.terraform import _scan_single as tf_scan

# ── helpers ───────────────────────────────────────────────────────────────────


def _sf(rule_id: str, sev: Severity = Severity.HIGH) -> ScanFinding:
    return ScanFinding(
        rule_id=rule_id,
        severity=sev,
        category=Category.IAM,
        title="t",
        message="m",
        file="f.tf",
        line=1,
    )


def _ids(findings: list[ScanFinding]) -> set[str]:
    return {f.rule_id for f in findings}


# ── ScanResult properties ─────────────────────────────────────────────────────


class TestScanResult:
    def test_empty_result_has_zero_counts(self):
        r = ScanResult(directory="/tmp")
        assert r.critical == r.high == r.medium == r.low == 0
        assert r.risk_score == 0

    def test_severity_counters(self):
        r = ScanResult(
            directory="/tmp",
            findings=[
                _sf("A", Severity.CRITICAL),
                _sf("B", Severity.CRITICAL),
                _sf("C", Severity.HIGH),
                _sf("D", Severity.MEDIUM),
                _sf("E", Severity.LOW),
                _sf("F", Severity.INFO),
            ],
        )
        assert r.critical == 2
        assert r.high == 1
        assert r.medium == 1
        assert r.low == 1

    def test_risk_score_weights(self):
        r = ScanResult(
            directory="/tmp",
            findings=[
                _sf("A", Severity.CRITICAL),  # 40
                _sf("B", Severity.HIGH),  # 20
                _sf("C", Severity.MEDIUM),  # 8
                _sf("D", Severity.LOW),  # 2
            ],
        )
        assert r.risk_score == 70

    def test_risk_score_caps_at_100(self):
        r = ScanResult(
            directory="/tmp",
            findings=[_sf(f"C{i}", Severity.CRITICAL) for i in range(5)],  # 5×40=200
        )
        assert r.risk_score == 100

    def test_info_severity_not_counted(self):
        r = ScanResult(directory="/tmp", findings=[_sf("A", Severity.INFO)])
        assert r.risk_score == 0


# ── scan_directory engine ─────────────────────────────────────────────────────


class TestScanDirectory:
    @pytest.mark.asyncio
    async def test_nonexistent_dir_returns_error(self, tmp_path):
        missing = tmp_path / "does_not_exist"
        result = await scan_directory(missing)
        assert result.errors
        assert "not found" in result.errors[0].lower()
        assert result.files_scanned == 0

    @pytest.mark.asyncio
    async def test_empty_dir_scans_zero_files(self, tmp_path):
        result = await scan_directory(tmp_path)
        assert result.files_scanned == 0
        assert result.findings == []

    @pytest.mark.asyncio
    async def test_tf_file_detected_and_scanned(self, tmp_path):
        tf = tmp_path / "main.tf"
        tf.write_text('resource "aws_s3_bucket" "logs" {}\n')
        result = await scan_directory(tmp_path)
        assert result.tf_files == 1
        assert result.files_scanned == 1

    @pytest.mark.asyncio
    async def test_gha_workflow_detected(self, tmp_path):
        wf_dir = tmp_path / ".github" / "workflows"
        wf_dir.mkdir(parents=True)
        wf = wf_dir / "ci.yml"
        wf.write_text("on: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps: []\n")
        result = await scan_directory(tmp_path)
        assert result.gha_files == 1

    @pytest.mark.asyncio
    async def test_k8s_yaml_detected(self, tmp_path):
        k8s = tmp_path / "deploy.yaml"
        k8s.write_text("apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: app\n")
        result = await scan_directory(tmp_path)
        assert result.k8s_files == 1

    @pytest.mark.asyncio
    async def test_github_workflows_not_double_counted_as_k8s(self, tmp_path):
        wf_dir = tmp_path / ".github" / "workflows"
        wf_dir.mkdir(parents=True)
        (wf_dir / "ci.yml").write_text("on: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps: []\n")
        result = await scan_directory(tmp_path)
        assert result.gha_files == 1
        assert result.k8s_files == 0

    @pytest.mark.asyncio
    async def test_directory_stored_in_result(self, tmp_path):
        result = await scan_directory(tmp_path)
        assert result.directory == str(tmp_path)

    def test_scan_directory_sync_wrapper(self, tmp_path):
        result = scan_directory_sync(tmp_path)
        assert isinstance(result, ScanResult)
        assert result.files_scanned == 0

    @pytest.mark.asyncio
    async def test_findings_from_real_tf_file(self, tmp_path):
        tf = tmp_path / "main.tf"
        tf.write_text(
            textwrap.dedent("""
                resource "aws_s3_bucket" "logs" {
                  force_destroy = true
                }
            """)
        )
        result = await scan_directory(tmp_path)
        assert any(f.rule_id == "TF003" for f in result.findings)


# ── Terraform rules ───────────────────────────────────────────────────────────


TF_PATH = "infra/main.tf"


class TestTFRules:
    def test_tf001_wildcard_iam_resource(self):
        content = textwrap.dedent("""
            resource "aws_iam_policy" "admin" {
              policy = <<-EOF
                { "Action": ["s3:*"], "Resource": "*" }
              EOF
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF001" in _ids(findings)
        tf001 = next(f for f in findings if f.rule_id == "TF001")
        assert tf001.severity == Severity.CRITICAL
        assert tf001.category == Category.IAM

    def test_tf012_wildcard_iam_action(self):
        content = '"Action": "*"'
        findings = tf_scan(content, TF_PATH)
        assert "TF012" in _ids(findings)

    def test_tf006_plaintext_secret(self):
        content = textwrap.dedent("""
            resource "aws_db_instance" "prod" {
              password = "super-secret-pw"
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF006" in _ids(findings)

    def test_tf006_skips_variable_references(self):
        content = textwrap.dedent("""
            resource "aws_db_instance" "prod" {
              password = var.db_password
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF006" not in _ids(findings)

    def test_tf006_skips_interpolation(self):
        content = 'password = "${var.db_password}"'
        findings = tf_scan(content, TF_PATH)
        assert "TF006" not in _ids(findings)

    def test_tf007_security_group_open_ingress(self):
        content = textwrap.dedent("""
            resource "aws_security_group" "web" {
              ingress {
                cidr_blocks = "0.0.0.0/0"
              }
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF007" in _ids(findings)

    def test_tf013_public_acl(self):
        content = textwrap.dedent("""
            resource "aws_s3_bucket" "public" {
              acl = "public-read"
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF013" in _ids(findings)

    def test_tf002_s3_missing_public_access_block(self):
        content = textwrap.dedent("""
            resource "aws_s3_bucket" "data" {
              bucket = "my-data"
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF002" in _ids(findings)
        f = next(f for f in findings if f.rule_id == "TF002")
        assert f.resource == "aws_s3_bucket.data"

    def test_tf002_suppressed_when_public_access_block_present(self):
        content = textwrap.dedent("""
            resource "aws_s3_bucket" "data" { bucket = "x" }
            resource "aws_s3_bucket_public_access_block" "data" {
              bucket = aws_s3_bucket.data.id
              block_public_acls = true
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF002" not in _ids(findings)

    def test_tf003_force_destroy_flagged(self):
        content = textwrap.dedent("""
            resource "aws_s3_bucket" "logs" {
              force_destroy = true
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF003" in _ids(findings)

    def test_tf003_force_destroy_false_not_flagged(self):
        content = textwrap.dedent("""
            resource "aws_s3_bucket" "logs" {
              force_destroy = false
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF003" not in _ids(findings)

    def test_tf004_rds_skip_final_snapshot(self):
        content = textwrap.dedent("""
            resource "aws_db_instance" "prod" {
              skip_final_snapshot = true
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF004" in _ids(findings)

    def test_tf005_rds_missing_deletion_protection(self):
        content = textwrap.dedent("""
            resource "aws_db_instance" "prod" {
              engine = "postgres"
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF005" in _ids(findings)

    def test_tf005_deletion_protection_suppresses(self):
        content = textwrap.dedent("""
            resource "aws_db_instance" "prod" {
              deletion_protection = true
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF005" not in _ids(findings)

    def test_tf014_rds_publicly_accessible(self):
        content = textwrap.dedent("""
            resource "aws_db_instance" "prod" {
              publicly_accessible = true
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF014" in _ids(findings)

    def test_tf010_ebs_unencrypted(self):
        content = textwrap.dedent("""
            resource "aws_ebs_volume" "data" {
              size = 100
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF010" in _ids(findings)

    def test_tf010_encrypted_suppresses(self):
        content = textwrap.dedent("""
            resource "aws_ebs_volume" "data" {
              encrypted = true
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF010" not in _ids(findings)

    def test_tf008_kms_short_deletion_window(self):
        content = textwrap.dedent("""
            resource "aws_kms_key" "main" {
              deletion_window_in_days = 3
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF008" in _ids(findings)

    def test_tf008_kms_sufficient_deletion_window_not_flagged(self):
        content = textwrap.dedent("""
            resource "aws_kms_key" "main" {
              deletion_window_in_days = 30
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF008" not in _ids(findings)

    def test_tf009_missing_required_providers(self):
        content = textwrap.dedent("""
            provider "aws" {
              region = "us-east-1"
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF009" in _ids(findings)

    def test_tf009_suppressed_when_required_providers_present(self):
        content = textwrap.dedent("""
            terraform {
              required_providers {
                aws = { source = "hashicorp/aws", version = "~> 5.0" }
              }
            }
            provider "aws" { region = "us-east-1" }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF009" not in _ids(findings)

    def test_tf011_lambda_missing_concurrency(self):
        content = textwrap.dedent("""
            resource "aws_lambda_function" "worker" {
              function_name = "my-worker"
              runtime       = "python3.12"
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF011" in _ids(findings)

    def test_tf011_lambda_with_concurrency_not_flagged(self):
        content = textwrap.dedent("""
            resource "aws_lambda_function" "worker" {
              function_name                  = "worker"
              reserved_concurrent_executions = 10
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF011" not in _ids(findings)

    def test_tf015_secrets_manager_missing_rotation(self):
        content = textwrap.dedent("""
            resource "aws_secretsmanager_secret" "api_key" {
              name = "my-api-key"
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF015" in _ids(findings)

    def test_tf015_with_rotation_resource_not_flagged(self):
        content = textwrap.dedent("""
            resource "aws_secretsmanager_secret" "api_key" {
              name = "my-api-key"
            }
            resource "aws_secretsmanager_secret_rotation" "api_key" {
              secret_id = aws_secretsmanager_secret.api_key.id
            }
        """)
        findings = tf_scan(content, TF_PATH)
        assert "TF015" not in _ids(findings)

    def test_nearest_resource_returned(self):
        content = textwrap.dedent("""
            resource "aws_iam_policy" "admin" {
              policy = <<-EOF
                { "Action": ["s3:*"], "Resource": "*" }
              EOF
            }
        """)
        findings = tf_scan(content, TF_PATH)
        tf001 = next((f for f in findings if f.rule_id == "TF001"), None)
        assert tf001 is not None
        assert tf001.resource == "aws_iam_policy.admin"

    def test_empty_content_returns_no_findings(self):
        assert tf_scan("", TF_PATH) == []


# ── Kubernetes rules ──────────────────────────────────────────────────────────

K8S_PATH = "k8s/deploy.yaml"

_K8S_HEADER = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
"""


def _k8s_container(name: str = "app", extra: str = "") -> str:
    return _K8S_HEADER + f"        - name: {name}\n          image: app:1.0\n{extra}"


class TestK8SRules:
    def test_non_k8s_yaml_ignored(self):
        content = "foo: bar\nbaz: 123\n"
        assert k8s_scan(content, K8S_PATH) == []

    def test_yaml_without_kind_ignored(self):
        content = "apiVersion: apps/v1\nfoo: bar\n"
        assert k8s_scan(content, K8S_PATH) == []

    def test_non_workload_kind_ignored(self):
        content = "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: cfg\n"
        assert k8s_scan(content, K8S_PATH) == []

    def test_k8s008_missing_security_context(self):
        findings = k8s_scan(_k8s_container(), K8S_PATH)
        assert "K8S008" in _ids(findings)

    def test_k8s001_privileged_container(self):
        extra = "          securityContext:\n            privileged: true\n"
        findings = k8s_scan(_k8s_container(extra=extra), K8S_PATH)
        assert "K8S001" in _ids(findings)

    def test_k8s005_allow_privilege_escalation_default(self):
        extra = "          securityContext:\n            runAsNonRoot: true\n"
        findings = k8s_scan(_k8s_container(extra=extra), K8S_PATH)
        assert "K8S005" in _ids(findings)

    def test_k8s005_suppressed_when_explicitly_false(self):
        extra = textwrap.dedent("""\
                  securityContext:
                    runAsNonRoot: true
                    runAsUser: 1000
                    allowPrivilegeEscalation: false
                    readOnlyRootFilesystem: true
        """)
        content = _k8s_container(extra="          " + extra.replace("\n", "\n          "))
        findings = k8s_scan(content, K8S_PATH)
        assert "K8S005" not in _ids(findings)

    def test_k8s004_may_run_as_root(self):
        extra = "          securityContext:\n            readOnlyRootFilesystem: true\n"
        findings = k8s_scan(_k8s_container(extra=extra), K8S_PATH)
        assert "K8S004" in _ids(findings)

    def test_k8s004_suppressed_with_run_as_non_root(self):
        content = textwrap.dedent("""\
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: app
            spec:
              template:
                spec:
                  containers:
                    - name: app
                      image: app:1.0
                      resources:
                        limits:
                          cpu: "500m"
                          memory: "128Mi"
                      securityContext:
                        runAsNonRoot: true
                        runAsUser: 1000
                        allowPrivilegeEscalation: false
                        readOnlyRootFilesystem: true
                      readinessProbe:
                        httpGet:
                          path: /health
                          port: 8080
        """)
        findings = k8s_scan(content, K8S_PATH)
        assert "K8S004" not in _ids(findings)

    def test_k8s009_writable_root_filesystem(self):
        extra = "          securityContext:\n            runAsNonRoot: true\n"
        findings = k8s_scan(_k8s_container(extra=extra), K8S_PATH)
        assert "K8S009" in _ids(findings)

    def test_k8s002_missing_resource_limits(self):
        findings = k8s_scan(_k8s_container(), K8S_PATH)
        assert "K8S002" in _ids(findings)

    def test_k8s002_suppressed_with_limits(self):
        extra = textwrap.dedent("""\
                  resources:
                    limits:
                      cpu: "500m"
                      memory: "128Mi"
        """)
        content = _k8s_container(extra="          " + extra.replace("\n", "\n          "))
        findings = k8s_scan(content, K8S_PATH)
        assert "K8S002" not in _ids(findings)

    def test_k8s006_latest_image_tag(self):
        content = _K8S_HEADER + "        - name: app\n          image: myapp:latest\n"
        findings = k8s_scan(content, K8S_PATH)
        assert "K8S006" in _ids(findings)

    def test_k8s006_untagged_image_flagged(self):
        content = _K8S_HEADER + "        - name: app\n          image: myapp\n"
        findings = k8s_scan(content, K8S_PATH)
        assert "K8S006" in _ids(findings)

    def test_k8s006_digest_pinned_not_flagged(self):
        content = _K8S_HEADER + "        - name: app\n          image: myapp@sha256:abc123\n"
        findings = k8s_scan(content, K8S_PATH)
        assert "K8S006" not in _ids(findings)

    def test_k8s006_version_tagged_not_flagged(self):
        content = _K8S_HEADER + "        - name: app\n          image: myapp:1.2.3\n"
        findings = k8s_scan(content, K8S_PATH)
        assert "K8S006" not in _ids(findings)

    def test_k8s007_missing_readiness_probe(self):
        findings = k8s_scan(_k8s_container(), K8S_PATH)
        assert "K8S007" in _ids(findings)

    def test_k8s010_all_capabilities(self):
        extra = "          securityContext:\n            capabilities:\n              add:\n                - ALL\n"
        findings = k8s_scan(_k8s_container(extra=extra), K8S_PATH)
        assert "K8S010" in _ids(findings)

    def test_k8s003_host_pid(self):
        content = textwrap.dedent("""\
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: app
            spec:
              template:
                spec:
                  hostPID: true
                  containers:
                    - name: app
                      image: app:1.0
        """)
        findings = k8s_scan(content, K8S_PATH)
        assert "K8S003" in _ids(findings)
        host_pid = next(f for f in findings if f.rule_id == "K8S003" and "hostPID" in f.title)
        assert host_pid.severity == Severity.CRITICAL

    def test_k8s003_host_network(self):
        content = textwrap.dedent("""\
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: app
            spec:
              template:
                spec:
                  hostNetwork: true
                  containers:
                    - name: app
                      image: app:1.0
        """)
        findings = k8s_scan(content, K8S_PATH)
        host_net = [f for f in findings if f.rule_id == "K8S003" and "Network" in f.title]
        assert host_net

    def test_pod_kind_scanned(self):
        content = textwrap.dedent("""\
            apiVersion: v1
            kind: Pod
            metadata:
              name: debug
            spec:
              containers:
                - name: app
                  image: app:latest
        """)
        findings = k8s_scan(content, K8S_PATH)
        assert "K8S006" in _ids(findings)

    def test_cronjob_pod_spec_extracted(self):
        content = textwrap.dedent("""\
            apiVersion: batch/v1
            kind: CronJob
            metadata:
              name: cleanup
            spec:
              schedule: "0 * * * *"
              jobTemplate:
                spec:
                  template:
                    spec:
                      containers:
                        - name: cleaner
                          image: cleaner:latest
        """)
        findings = k8s_scan(content, K8S_PATH)
        assert "K8S006" in _ids(findings)

    def test_resource_name_in_finding(self):
        findings = k8s_scan(_k8s_container(), K8S_PATH)
        resources = {f.resource for f in findings if f.resource}
        assert any("app" in r for r in resources)


# ── GitHub Actions rules ──────────────────────────────────────────────────────

GHA_PATH = ".github/workflows/ci.yml"

_GHA_HEADER = "on: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n"


class TestGHARules:
    def test_non_workflow_ignored(self):
        content = "foo: bar\n"
        assert gha_scan(content, GHA_PATH) == []

    def test_gha001_unpinned_action_main(self):
        content = _GHA_HEADER + "      - uses: actions/checkout@main\n"
        findings = gha_scan(content, GHA_PATH)
        assert "GHA001" in _ids(findings)

    def test_gha001_unpinned_action_master(self):
        content = _GHA_HEADER + "      - uses: actions/checkout@master\n"
        findings = gha_scan(content, GHA_PATH)
        assert "GHA001" in _ids(findings)

    def test_gha001_unpinned_action_semver(self):
        content = _GHA_HEADER + "      - uses: actions/checkout@v4\n"
        findings = gha_scan(content, GHA_PATH)
        assert "GHA001" in _ids(findings)

    def test_gha001_pinned_sha_not_flagged(self):
        sha = "a" * 40
        content = _GHA_HEADER + f"      - uses: actions/checkout@{sha}\n"
        findings = gha_scan(content, GHA_PATH)
        assert "GHA001" not in _ids(findings)

    def test_gha002_unsecure_commands(self):
        content = _GHA_HEADER + "      - env:\n          ACTIONS_ALLOW_UNSECURE_COMMANDS: true\n"
        findings = gha_scan(content, GHA_PATH)
        assert "GHA002" in _ids(findings)

    def test_gha003_script_injection_in_run(self):
        content = _GHA_HEADER + ("      - run: echo ${{ github.event.pull_request.title }}\n")
        findings = gha_scan(content, GHA_PATH)
        assert "GHA003" in _ids(findings)

    def test_gha003_env_indirection_not_flagged(self):
        content = _GHA_HEADER + textwrap.dedent("""\
              - env:
                  PR_TITLE: ${{ github.event.pull_request.title }}
                run: echo "$PR_TITLE"
        """)
        findings = gha_scan(content, GHA_PATH)
        assert "GHA003" not in _ids(findings)

    def test_gha004_missing_permissions(self):
        content = _GHA_HEADER + "      - run: echo hello\n"
        findings = gha_scan(content, GHA_PATH)
        assert "GHA004" in _ids(findings)

    def test_gha004_present_permissions_not_flagged(self):
        content = textwrap.dedent("""\
            on: push
            permissions: read-all
            jobs:
              b:
                runs-on: ubuntu-latest
                steps:
                  - run: echo hi
        """)
        findings = gha_scan(content, GHA_PATH)
        assert "GHA004" not in _ids(findings)

    def test_gha005_pull_request_target_unsafe_checkout(self):
        content = textwrap.dedent("""\
            on: pull_request_target
            jobs:
              build:
                runs-on: ubuntu-latest
                steps:
                  - uses: actions/checkout@main
                    with:
                      ref: ${{ github.event.pull_request.head.ref }}
        """)
        findings = gha_scan(content, GHA_PATH)
        assert "GHA005" in _ids(findings)

    def test_gha005_pull_request_target_safe_checkout_not_flagged(self):
        content = textwrap.dedent("""\
            on: pull_request_target
            jobs:
              build:
                runs-on: ubuntu-latest
                steps:
                  - uses: actions/checkout@main
        """)
        findings = gha_scan(content, GHA_PATH)
        assert "GHA005" not in _ids(findings)

    def test_gha006_secret_in_run_step(self):
        content = _GHA_HEADER + ("      - run: curl -H 'Authorization: ${{ secrets.API_TOKEN }}' https://example.com\n")
        findings = gha_scan(content, GHA_PATH)
        assert "GHA006" in _ids(findings)

    def test_gha006_secret_in_env_not_flagged(self):
        content = _GHA_HEADER + textwrap.dedent("""\
              - env:
                  API_TOKEN: ${{ secrets.API_TOKEN }}
                run: curl -H "Authorization: $API_TOKEN" https://example.com
        """)
        findings = gha_scan(content, GHA_PATH)
        assert "GHA006" not in _ids(findings)

    def test_gha007_curl_bash(self):
        content = _GHA_HEADER + "      - run: curl https://install.sh | bash\n"
        findings = gha_scan(content, GHA_PATH)
        assert "GHA007" in _ids(findings)

    def test_gha007_curl_without_pipe_not_flagged(self):
        content = _GHA_HEADER + "      - run: curl https://example.com -o file.txt\n"
        findings = gha_scan(content, GHA_PATH)
        assert "GHA007" not in _ids(findings)

    def test_gha008_untrusted_input_in_if(self):
        content = _GHA_HEADER + ("      - if: ${{ github.event.issue.title == 'deploy' }}\n        run: deploy.sh\n")
        findings = gha_scan(content, GHA_PATH)
        assert "GHA008" in _ids(findings)

    def test_gha001_resource_is_action_name(self):
        content = _GHA_HEADER + "      - uses: actions/checkout@main\n"
        findings = gha_scan(content, GHA_PATH)
        gha001 = next(f for f in findings if f.rule_id == "GHA001")
        assert gha001.resource == "actions/checkout"

    def test_gha001_line_number_correct(self):
        content = "on: push\njobs:\n  b:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@main\n"
        findings = gha_scan(content, GHA_PATH)
        gha001 = next(f for f in findings if f.rule_id == "GHA001")
        assert gha001.line == 6
