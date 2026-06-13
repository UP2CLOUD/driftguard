"""Unit tests for driftguard.services.storage — pure key functions and dev fallback."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from driftguard.services.storage import (
    _dev_read,
    _dev_write,
    evidence_key,
    plan_key,
)

# ── plan_key ──────────────────────────────────────────────────────────────────


class TestPlanKey:
    def test_basic_key_format(self):
        key = plan_key("org-1", "acme/infra", 7, "abc123def456xxxx")
        assert key == "plans/org-1/acme_infra/pr-7/abc123def456.tar.gz"

    def test_repo_slash_replaced_with_underscore(self):
        key = plan_key("org-1", "my-org/my-repo", 1, "sha" * 5)
        assert "/" not in key.split("plans/org-1/")[1].split("/")[0]
        assert "my-org_my-repo" in key

    def test_sha_truncated_to_12_chars(self):
        sha = "a" * 40
        key = plan_key("org-1", "acme/infra", 1, sha)
        filename = key.split("/")[-1]
        assert filename == "a" * 12 + ".tar.gz"

    def test_short_sha_not_padded(self):
        key = plan_key("org-1", "acme/infra", 1, "abc")
        assert "abc.tar.gz" in key

    def test_pr_number_in_path(self):
        key = plan_key("org-xyz", "acme/infra", 42, "deadbeef0000")
        assert "pr-42" in key

    def test_starts_with_plans_prefix(self):
        key = plan_key("org-1", "acme/infra", 1, "sha")
        assert key.startswith("plans/")

    def test_ends_with_tar_gz(self):
        key = plan_key("org-1", "acme/infra", 1, "sha123456789")
        assert key.endswith(".tar.gz")

    def test_org_id_in_path(self):
        key = plan_key("org-special-99", "acme/infra", 1, "sha")
        assert "org-special-99" in key


# ── evidence_key ──────────────────────────────────────────────────────────────


class TestEvidenceKey:
    def test_basic_format(self):
        key = evidence_key("org-1", "ana-abc")
        assert key == "evidence/org-1/ana-abc/pack.zip"

    def test_starts_with_evidence_prefix(self):
        key = evidence_key("org-1", "ana-1")
        assert key.startswith("evidence/")

    def test_ends_with_pack_zip(self):
        key = evidence_key("org-1", "ana-1")
        assert key.endswith("pack.zip")

    def test_org_id_in_path(self):
        key = evidence_key("org-unique-42", "ana-1")
        assert "org-unique-42" in key

    def test_analysis_id_in_path(self):
        key = evidence_key("org-1", "analysis-xyz-789")
        assert "analysis-xyz-789" in key


# ── _dev_write / _dev_read ────────────────────────────────────────────────────


class TestDevWriteRead:
    def _key(self, name: str) -> str:
        return f"test_org/test_repo/pr-1/{name}.tar.gz"

    def test_roundtrip(self):
        key = self._key("roundtrip")
        data = b"hello driftguard"
        _dev_write(key, data)
        assert _dev_read(key) == data

    def test_returns_key(self):
        key = self._key("returns_key")
        result = _dev_write(key, b"data")
        assert result == key

    def test_overwrites_existing(self):
        key = self._key("overwrite")
        _dev_write(key, b"first")
        _dev_write(key, b"second")
        assert _dev_read(key) == b"second"

    def test_binary_data(self):
        key = self._key("binary")
        data = bytes(range(256))
        _dev_write(key, data)
        assert _dev_read(key) == data

    def test_empty_bytes(self):
        key = self._key("empty")
        _dev_write(key, b"")
        assert _dev_read(key) == b""

    def test_nested_key_creates_dirs(self):
        key = "deep/nested/path/file.tar.gz"
        _dev_write(key, b"nested")
        expected = Path(tempfile.gettempdir()) / "driftguard_dev" / key
        assert expected.exists()
        assert expected.read_bytes() == b"nested"

    def test_read_missing_key_raises(self):
        with pytest.raises(FileNotFoundError):
            _dev_read("nonexistent/key/that/does/not/exist.tar.gz")

    def test_plan_key_roundtrip(self):
        key = plan_key("org-1", "acme/infra", 99, "deadbeef0000ffff")
        payload = b"terraform plan output"
        _dev_write(key, payload)
        assert _dev_read(key) == payload

    def test_evidence_key_roundtrip(self):
        key = evidence_key("org-1", "ana-test-roundtrip")
        payload = b"evidence pack"
        _dev_write(key, payload)
        assert _dev_read(key) == payload
