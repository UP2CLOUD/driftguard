"""Unit tests for checkov, infracost, and terraform integrations."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch


# ── checkov.scan ──────────────────────────────────────────────────────────────


class TestCheckovScan:
    def _run(self, stdout: str = "", returncode: int = 0):
        result = MagicMock()
        result.stdout = stdout
        result.returncode = returncode
        return result

    def test_empty_stdout_returns_empty_list(self):
        from driftguard.integrations.checkov import scan

        with patch("subprocess.run", return_value=self._run(stdout="")):
            assert scan("/tmp/plan.json") == []

    def test_invalid_json_returns_empty_list(self):
        from driftguard.integrations.checkov import scan

        with patch("subprocess.run", return_value=self._run(stdout="not json {{{}")):
            assert scan("/tmp/plan.json") == []

    def test_list_response_returned_as_is(self):
        from driftguard.integrations.checkov import scan

        data = [{"check_id": "CKV_AWS_19", "result": "FAILED"}]
        with patch("subprocess.run", return_value=self._run(stdout=json.dumps(data))):
            result = scan("/tmp/plan.json")
            assert result == data

    def test_dict_response_wrapped_in_list(self):
        from driftguard.integrations.checkov import scan

        data = {"check_id": "CKV_AWS_57", "result": "PASSED"}
        with patch("subprocess.run", return_value=self._run(stdout=json.dumps(data))):
            result = scan("/tmp/plan.json")
            assert result == [data]

    def test_calls_checkov_with_correct_args(self):
        from driftguard.integrations.checkov import scan

        with patch("subprocess.run", return_value=self._run()) as mock_run:
            scan("/tmp/plan.json")
            cmd = mock_run.call_args[0][0]
            assert cmd[0] == "checkov"
            assert "-f" in cmd
            assert "/tmp/plan.json" in cmd
            assert "-o" in cmd
            assert "json" in cmd


# ── infracost ─────────────────────────────────────────────────────────────────


class TestInfracostCostBreakdown:
    def test_nonzero_returncode_raises_runtime_error(self):
        import pytest

        from driftguard.integrations.infracost import cost_breakdown

        result = MagicMock()
        result.returncode = 1
        result.stderr = "No plan file found"
        result.stdout = ""
        with patch("subprocess.run", return_value=result):
            with pytest.raises(RuntimeError, match="infracost breakdown failed"):
                cost_breakdown("/tmp/plan.json")

    def test_successful_run_returns_parsed_json(self):
        from driftguard.integrations.infracost import cost_breakdown

        payload = {"totalMonthlyCost": "42.00", "currency": "USD"}
        result = MagicMock()
        result.returncode = 0
        result.stdout = json.dumps(payload)
        with patch("subprocess.run", return_value=result):
            data = cost_breakdown("/tmp/plan.json")
            assert data["totalMonthlyCost"] == "42.00"


class TestInfracostCostDiff:
    def test_nonzero_returncode_raises_runtime_error(self):
        import pytest

        from driftguard.integrations.infracost import cost_diff

        result = MagicMock()
        result.returncode = 2
        result.stderr = "comparison failed"
        with patch("subprocess.run", return_value=result):
            with pytest.raises(RuntimeError, match="infracost diff failed"):
                cost_diff("/tmp/prior.json", "/tmp/plan.json")

    def test_successful_diff_returns_parsed_json(self):
        from driftguard.integrations.infracost import cost_diff

        payload = {"diffTotalMonthlyCost": "10.00"}
        result = MagicMock()
        result.returncode = 0
        result.stdout = json.dumps(payload)
        with patch("subprocess.run", return_value=result):
            data = cost_diff("/tmp/prior.json", "/tmp/plan.json")
            assert data["diffTotalMonthlyCost"] == "10.00"


# ── terraform integration ─────────────────────────────────────────────────────


class TestTerraformError:
    def test_is_subclass_of_runtime_error(self):
        from driftguard.integrations.terraform import TerraformError

        err = TerraformError("plan failed")
        assert isinstance(err, RuntimeError)
        assert str(err) == "plan failed"


class TestPathEnv:
    def test_returns_path_env_variable(self, monkeypatch):
        from driftguard.integrations.terraform import _path_env

        monkeypatch.setenv("PATH", "/custom/bin:/usr/bin")
        assert _path_env() == "/custom/bin:/usr/bin"

    def test_returns_default_when_path_not_set(self, monkeypatch):
        from driftguard.integrations.terraform import _path_env

        monkeypatch.delenv("PATH", raising=False)
        assert _path_env() == "/usr/local/bin:/usr/bin:/bin"


class TestBinary:
    def test_raises_when_neither_binary_found(self):
        import pytest

        from driftguard.integrations.terraform import TerraformError, _binary

        with patch("shutil.which", return_value=None):
            with pytest.raises(TerraformError, match="neither tofu nor terraform"):
                _binary()

    def test_returns_tofu_when_available(self):
        from driftguard.integrations.terraform import _binary

        def _which(cmd):
            return "/usr/bin/tofu" if cmd == "tofu" else None

        with patch("shutil.which", side_effect=_which):
            assert _binary() == "tofu"

    def test_falls_back_to_terraform_when_tofu_missing(self):
        from driftguard.integrations.terraform import _binary

        def _which(cmd):
            return "/usr/bin/terraform" if cmd == "terraform" else None

        with patch("shutil.which", side_effect=_which):
            assert _binary() == "terraform"


class TestAnalyzeDirectory:
    @staticmethod
    def _fake_run(returncode: int = 0, out: str = "{}", err: str = ""):
        async def _run(*args, **kwargs):
            return returncode, out, err

        return _run

    import pytest

    @pytest.mark.asyncio
    async def test_returns_none_when_init_fails(self, monkeypatch):
        from driftguard.integrations import terraform

        monkeypatch.setattr(terraform, "_binary", lambda: "terraform")
        monkeypatch.setattr(terraform, "_run", self._fake_run(returncode=1, err="init failed"))

        result = await terraform.analyze_directory(Path("/tmp/tf"))
        assert result is None

    @pytest.mark.asyncio
    async def test_returns_plan_json_on_success(self, monkeypatch):
        from driftguard.integrations import terraform

        plan_data = {"resource_changes": [], "format_version": "1.2"}
        run_calls = [
            (0, "", ""),  # init
            (0, "", ""),  # plan (exit 0)
            (0, json.dumps(plan_data), ""),  # show
        ]
        call_idx = [0]

        async def _fake_run(*args, **kwargs):
            idx = call_idx[0]
            call_idx[0] += 1
            return run_calls[idx]

        monkeypatch.setattr(terraform, "_binary", lambda: "terraform")
        monkeypatch.setattr(terraform, "_run", _fake_run)

        result = await terraform.analyze_directory(Path("/tmp/tf"))
        assert result is not None
        assert "resource_changes" in result
