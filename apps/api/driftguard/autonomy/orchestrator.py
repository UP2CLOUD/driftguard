"""Autonomy orchestrator — Phase 1: read-only findings generation.

Runs each enabled role agent against a shared repo context, filters out
human-rejected findings via memory, prioritizes, and returns a RunResult.
Callers (CLI entrypoint, CI workflow) persist findings/runs JSON to
.driftguard/autonomy/.

Phase 1 explicitly does NOT write code or open PRs — see
.driftguard/autonomy/README.md for what's built vs. deferred.
"""

from __future__ import annotations

import json
from pathlib import Path

import structlog

from driftguard.ai.llm_router import llm_complete
from driftguard.autonomy.context import default_repo_root, gather_context
from driftguard.autonomy.memory import (
    default_memory_path,
    filter_rejected,
    load_memory,
    record_run,
    save_memory,
)
from driftguard.autonomy.prioritize import prioritize
from driftguard.autonomy.roles import ROLE_PROMPTS
from driftguard.autonomy.schemas import ALL_ROLES, AgentFinding, AgentRole, AutonomyConfig, RunResult

log = structlog.get_logger(__name__)

CONFIG_RELATIVE_PATH = ".driftguard/autonomy/config.json"
FINDINGS_DIR = ".driftguard/autonomy/findings"
RUNS_DIR = ".driftguard/autonomy/runs"


def load_config(repo_root: Path) -> AutonomyConfig:
    path = repo_root / CONFIG_RELATIVE_PATH
    if not path.exists():
        return AutonomyConfig()
    return AutonomyConfig.from_dict(json.loads(path.read_text()))


def _strip_fence(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    return text.strip()


def parse_role_findings(role: AgentRole, raw: str) -> list[AgentFinding]:
    text = _strip_fence(raw)
    if not text:
        return []
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        log.warning("autonomy.role.unparseable", role=role, raw_prefix=raw[:200])
        return []
    if not isinstance(data, list):
        log.warning("autonomy.role.bad_shape", role=role)
        return []

    findings: list[AgentFinding] = []
    for item in data:
        try:
            findings.append(
                AgentFinding(
                    role=role,
                    severity=item["severity"],
                    area=item["area"],
                    title=item["title"],
                    description=item["description"],
                    suggestion=item.get("suggestion"),
                )
            )
        except (KeyError, TypeError) as exc:
            log.warning("autonomy.role.bad_item", role=role, error=str(exc))
    return findings


async def run_role(role: AgentRole, context: str) -> list[AgentFinding]:
    try:
        raw = await llm_complete(
            system=ROLE_PROMPTS[role],
            user=f"Repo context:\n\n{context}",
            max_tokens=2048,
            tag=f"autonomy:{role}",
        )
    except Exception as exc:  # a single role's LLM failure must not abort the run
        log.warning("autonomy.role.failed", role=role, error=str(exc))
        return []
    return parse_role_findings(role, raw)


async def run(repo_root: Path | None = None, run_id: str = "manual") -> RunResult:
    root = repo_root or default_repo_root()
    config = load_config(root)
    context = gather_context(root)

    memory_path = default_memory_path(root)
    memory = load_memory(memory_path)

    all_findings: list[AgentFinding] = []
    roles_run: list[AgentRole] = []
    for role in config.enabled_roles:
        all_findings.extend(await run_role(role, context))
        roles_run.append(role)

    roles_skipped = [r for r in ALL_ROLES if r not in config.enabled_roles]

    kept, suppressed = filter_rejected(memory, all_findings)
    prioritized = prioritize(kept, config)

    memory = record_run(memory, run_id, prioritized)
    save_memory(memory_path, memory)

    result = RunResult(
        findings=prioritized,
        suppressed_dedup_keys=suppressed,
        roles_run=roles_run,
        roles_skipped=list(roles_skipped),
    )
    log.info(
        "autonomy.run.done",
        run_id=run_id,
        findings=len(result.findings),
        suppressed=len(suppressed),
        roles_run=len(roles_run),
    )
    return result


def write_run_artifacts(root: Path, run_id: str, result: RunResult) -> tuple[Path, Path]:
    findings_dir = root / FINDINGS_DIR
    runs_dir = root / RUNS_DIR
    findings_dir.mkdir(parents=True, exist_ok=True)
    runs_dir.mkdir(parents=True, exist_ok=True)

    findings_path = findings_dir / f"{run_id}.json"
    runs_path = runs_dir / f"{run_id}.json"

    findings_path.write_text(json.dumps([f.to_dict() for f in result.findings], indent=2) + "\n")
    runs_path.write_text(json.dumps(result.to_dict(), indent=2) + "\n")

    return findings_path, runs_path
