"""A file the scanner cannot read must not be reported as clean.

`scan_tf_files` / `scan_k8s_files` / `scan_gha_files` used to swallow
per-file failures with a bare `except: pass`. The file then contributed
zero findings while `files_scanned` still counted it, so the scan reported
"N files scanned, 0 findings" for a file it never actually read. For a
security scanner that is the worst failure mode available: a false negative
that is indistinguishable from a pass.
"""

from pathlib import Path

import pytest

from driftguard.services.scanner.engine import scan_directory


def _write_tf(tmp_path: Path, name: str = "main.tf") -> Path:
    f = tmp_path / name
    f.write_text('resource "aws_s3_bucket" "b" {\n  force_destroy = true\n}\n')
    return f


class TestPerFileScanErrors:
    @pytest.mark.asyncio
    async def test_unscannable_file_is_reported_not_silently_clean(self, tmp_path, monkeypatch):
        _write_tf(tmp_path)

        import driftguard.services.scanner.rules.terraform as tf

        def _boom(content: str, rel: str):
            raise ValueError("simulated parse failure")

        monkeypatch.setattr(tf, "_scan_single", _boom)

        result = await scan_directory(tmp_path)

        assert result.errors, "a failed file produced no error — it looked clean"
        assert any("simulated parse failure" in e for e in result.errors)

    @pytest.mark.asyncio
    async def test_failed_file_is_not_counted_as_scanned(self, tmp_path, monkeypatch):
        _write_tf(tmp_path)

        import driftguard.services.scanner.rules.terraform as tf

        monkeypatch.setattr(tf, "_scan_single", lambda content, rel: (_ for _ in ()).throw(ValueError("x")))

        result = await scan_directory(tmp_path)

        assert result.files_scanned == 0, (
            f"files_scanned={result.files_scanned} claims coverage of a file that failed to scan"
        )

    @pytest.mark.asyncio
    async def test_error_names_the_offending_file(self, tmp_path, monkeypatch):
        _write_tf(tmp_path, "broken.tf")

        import driftguard.services.scanner.rules.terraform as tf

        monkeypatch.setattr(tf, "_scan_single", lambda content, rel: (_ for _ in ()).throw(ValueError("x")))

        result = await scan_directory(tmp_path)
        assert any("broken.tf" in e for e in result.errors), result.errors

    @pytest.mark.asyncio
    async def test_healthy_scan_still_reports_no_errors(self, tmp_path):
        _write_tf(tmp_path)
        result = await scan_directory(tmp_path)
        assert result.errors == []
        assert result.files_scanned == 1
        assert result.findings, "fixture should still produce findings"

    @pytest.mark.asyncio
    async def test_one_bad_file_does_not_suppress_findings_in_good_files(self, tmp_path, monkeypatch):
        # Both files are scanned by the same call; a failure on one must not
        # abort the loop and lose the other's findings.
        _write_tf(tmp_path, "good.tf")
        _write_tf(tmp_path, "bad.tf")

        import driftguard.services.scanner.rules.terraform as tf

        real = tf._scan_single

        def _selective(content: str, rel: str):
            if "bad.tf" in rel:
                raise ValueError("simulated")
            return real(content, rel)

        monkeypatch.setattr(tf, "_scan_single", _selective)

        result = await scan_directory(tmp_path)
        assert result.findings, "a single bad file wiped out the whole scan"
        assert len(result.errors) == 1
        assert result.files_scanned == 1
