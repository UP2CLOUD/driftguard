import json

import pytest

from driftguard.autonomy import orchestrator
from driftguard.autonomy.schemas import AutonomyConfig


def test_parse_role_findings_valid_array():
    raw = json.dumps(
        [
            {
                "severity": "high",
                "area": "apps/api/driftguard/services/quota.py",
                "title": "Race in quota check",
                "description": "Two concurrent requests can both pass the quota check.",
                "suggestion": "Use a row lock.",
            }
        ]
    )
    findings = orchestrator.parse_role_findings("reliability", raw)
    assert len(findings) == 1
    assert findings[0].role == "reliability"
    assert findings[0].title == "Race in quota check"


def test_parse_role_findings_strips_markdown_fence():
    raw = '```json\n[{"severity": "low", "area": "x", "title": "t", "description": "d"}]\n```'
    findings = orchestrator.parse_role_findings("qa", raw)
    assert len(findings) == 1
    assert findings[0].suggestion is None


def test_parse_role_findings_empty_array():
    assert orchestrator.parse_role_findings("seo", "[]") == []


def test_parse_role_findings_malformed_json_returns_empty():
    assert orchestrator.parse_role_findings("qa", "not json at all") == []


def test_parse_role_findings_wrong_shape_returns_empty():
    assert orchestrator.parse_role_findings("qa", '{"not": "a list"}') == []


def test_parse_role_findings_skips_bad_items_keeps_good_ones():
    raw = json.dumps(
        [
            {"severity": "low", "area": "x", "title": "ok", "description": "d"},
            {"severity": "low", "title": "missing area and description"},
        ]
    )
    findings = orchestrator.parse_role_findings("qa", raw)
    assert len(findings) == 1
    assert findings[0].title == "ok"


def test_load_config_missing_file_returns_defaults(tmp_path):
    config = orchestrator.load_config(tmp_path)
    assert config == AutonomyConfig()


def test_load_config_reads_json(tmp_path):
    d = tmp_path / ".driftguard" / "autonomy"
    d.mkdir(parents=True)
    (d / "config.json").write_text(json.dumps({"max_findings_per_run": 3}))
    config = orchestrator.load_config(tmp_path)
    assert config.max_findings_per_run == 3


@pytest.mark.asyncio
async def test_run_role_returns_empty_on_llm_failure(monkeypatch):
    async def _boom(**kwargs):
        raise RuntimeError("api down")

    monkeypatch.setattr(orchestrator, "llm_complete", _boom)
    findings = await orchestrator.run_role("security", "some context")
    assert findings == []


def test_write_run_artifacts_creates_files(tmp_path):
    from driftguard.autonomy.schemas import AgentFinding, RunResult

    result = RunResult(
        findings=[AgentFinding(role="qa", severity="low", area="x", title="t", description="d")],
        suppressed_dedup_keys=["some:key"],
        roles_run=["qa"],
        roles_skipped=["seo"],
    )
    findings_path, runs_path = orchestrator.write_run_artifacts(tmp_path, "test-run", result)

    assert findings_path.exists()
    assert runs_path.exists()
    assert json.loads(findings_path.read_text())[0]["title"] == "t"
    assert json.loads(runs_path.read_text())["suppressed_dedup_keys"] == ["some:key"]
