"""Tests for the scanner engine: ScanResult properties and scan_directory integration."""

from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path

import pytest

from driftguard.services.scanner.engine import (
    Category,
    ScanFinding,
    ScanResult,
    Severity,
    scan_directory,
)


# ── ScanResult properties ─────────────────────────────────────────────────────


def _finding(severity: Severity, category: Category = Category.STORAGE) -> ScanFinding:
    return ScanFinding(
        rule_id="TEST001",
        severity=severity,
        category=category,
        title="Test finding",
        message="Test message",
        file="main.tf",
        line=1,
    )


class TestScanResultProperties:
    def test_risk_score_empty_is_zero(self):
        r = ScanResult(directory="/tmp")
        assert r.risk_score == 0

    def test_risk_score_single_critical(self):
        r = ScanResult(directory="/tmp", findings=[_finding(Severity.CRITICAL)])
        assert r.risk_score == 40

    def test_risk_score_single_high(self):
        r = ScanResult(directory="/tmp", findings=[_finding(Severity.HIGH)])
        assert r.risk_score == 20

    def test_risk_score_single_medium(self):
        r = ScanResult(directory="/tmp", findings=[_finding(Severity.MEDIUM)])
        assert r.risk_score == 8

    def test_risk_score_single_low(self):
        r = ScanResult(directory="/tmp", findings=[_finding(Severity.LOW)])
        assert r.risk_score == 2

    def test_risk_score_capped_at_100(self):
        many = [_finding(Severity.CRITICAL)] * 10
        r = ScanResult(directory="/tmp", findings=many)
        assert r.risk_score == 100

    def test_risk_score_additive(self):
        findings = [_finding(Severity.HIGH), _finding(Severity.MEDIUM)]
        r = ScanResult(directory="/tmp", findings=findings)
        assert r.risk_score == 28  # 20 + 8

    def test_critical_count(self):
        findings = [_finding(Severity.CRITICAL), _finding(Severity.HIGH), _finding(Severity.CRITICAL)]
        r = ScanResult(directory="/tmp", findings=findings)
        assert r.critical == 2

    def test_high_count(self):
        findings = [_finding(Severity.HIGH), _finding(Severity.CRITICAL)]
        r = ScanResult(directory="/tmp", findings=findings)
        assert r.high == 1

    def test_medium_count(self):
        findings = [_finding(Severity.MEDIUM), _finding(Severity.MEDIUM), _finding(Severity.LOW)]
        r = ScanResult(directory="/tmp", findings=findings)
        assert r.medium == 2

    def test_low_count(self):
        findings = [_finding(Severity.LOW)] * 5
        r = ScanResult(directory="/tmp", findings=findings)
        assert r.low == 5

    def test_no_findings_all_counts_zero(self):
        r = ScanResult(directory="/tmp")
        assert r.critical == 0
        assert r.high == 0
        assert r.medium == 0
        assert r.low == 0


# ── scan_directory integration ────────────────────────────────────────────────


class TestScanDirectoryIntegration:
    @pytest.mark.asyncio
    async def test_nonexistent_directory_returns_error(self):
        result = await scan_directory(Path("/nonexistent/path/to/nowhere"))
        assert result.files_scanned == 0
        assert len(result.errors) > 0

    @pytest.mark.asyncio
    async def test_empty_directory_returns_no_findings(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = await scan_directory(Path(tmpdir))
            assert result.files_scanned == 0
            assert result.findings == []
            assert result.errors == []

    @pytest.mark.asyncio
    async def test_scans_tf_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tf = Path(tmpdir) / "main.tf"
            tf.write_text("""
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}
""")
            result = await scan_directory(Path(tmpdir))
            assert result.tf_files == 1
            assert result.files_scanned >= 1

    @pytest.mark.asyncio
    async def test_insecure_tf_produces_findings(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tf = Path(tmpdir) / "bad.tf"
            tf.write_text('''
resource "aws_iam_policy" "admin" {
  policy = <<EOF
{"Statement": [{"Effect": "Allow", "Action": "s3:*", "Resource": "*"}]}
EOF
}
''')
            result = await scan_directory(Path(tmpdir))
            assert len(result.findings) > 0

    @pytest.mark.asyncio
    async def test_scans_k8s_yaml_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            k8s = Path(tmpdir) / "deployment.yaml"
            k8s.write_text("""
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: myapp:latest
""")
            result = await scan_directory(Path(tmpdir))
            assert result.k8s_files >= 1

    @pytest.mark.asyncio
    async def test_scans_gha_workflow_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            wf_dir = Path(tmpdir) / ".github" / "workflows"
            wf_dir.mkdir(parents=True)
            wf = wf_dir / "ci.yml"
            wf.write_text("""
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
""")
            result = await scan_directory(Path(tmpdir))
            assert result.gha_files == 1

    @pytest.mark.asyncio
    async def test_result_has_directory_set(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = await scan_directory(Path(tmpdir))
            assert result.directory == tmpdir

    @pytest.mark.asyncio
    async def test_files_scanned_counts_all_types(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            (root / "main.tf").write_text('resource "null_resource" "x" {}')
            (root / "deploy.yaml").write_text("apiVersion: v1\nkind: Pod")
            wf_dir = root / ".github" / "workflows"
            wf_dir.mkdir(parents=True)
            (wf_dir / "ci.yml").write_text("name: CI\non: push")
            result = await scan_directory(root)
            assert result.tf_files == 1
            assert result.k8s_files >= 1
            assert result.gha_files == 1
