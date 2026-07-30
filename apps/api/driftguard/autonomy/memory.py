"""Cross-run memory: permanently-rejected findings + oscillation tracking.

Persisted as .driftguard/autonomy/memory.json. All functions here are pure
(dict in, dict out) so they're unit-testable without touching disk; load_memory
/ save_memory are the only I/O.
"""

from __future__ import annotations

import json
from pathlib import Path

from driftguard.autonomy.schemas import AgentFinding

_EMPTY_MEMORY = {"rejected": [], "history": {}}


def default_memory_path(repo_root: Path) -> Path:
    return repo_root / ".driftguard" / "autonomy" / "memory.json"


def load_memory(path: Path) -> dict:
    if not path.exists():
        return json.loads(json.dumps(_EMPTY_MEMORY))
    data = json.loads(path.read_text())
    data.setdefault("rejected", [])
    data.setdefault("history", {})
    return data


def save_memory(path: Path, memory: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(memory, indent=2, sort_keys=True) + "\n")


def is_rejected(memory: dict, dedup_key: str) -> bool:
    return dedup_key in memory.get("rejected", [])


def reject(memory: dict, dedup_key: str) -> dict:
    """Human-curated: permanently silence a finding. Idempotent."""
    rejected = set(memory.get("rejected", []))
    rejected.add(dedup_key)
    memory["rejected"] = sorted(rejected)
    return memory


def filter_rejected(memory: dict, findings: list[AgentFinding]) -> tuple[list[AgentFinding], list[str]]:
    """Split findings into (kept, suppressed dedup_keys)."""
    kept: list[AgentFinding] = []
    suppressed: list[str] = []
    for f in findings:
        key = f.dedup_key()
        if is_rejected(memory, key):
            suppressed.append(key)
        else:
            kept.append(f)
    return kept, suppressed


def record_run(memory: dict, run_id: str, findings: list[AgentFinding]) -> dict:
    """Bump consecutive-appearance counts for findings present this run;
    reset counts for keys that were seen before but didn't reappear."""
    history: dict = memory.setdefault("history", {})
    seen_keys = {f.dedup_key() for f in findings}

    for key in seen_keys:
        entry = history.get(key, {"first_run": run_id, "consecutive_runs": 0})
        entry["consecutive_runs"] = entry.get("consecutive_runs", 0) + 1
        entry["last_run"] = run_id
        history[key] = entry

    for key, entry in history.items():
        if key not in seen_keys:
            entry["consecutive_runs"] = 0

    return memory


def oscillating_keys(memory: dict, window: int) -> list[str]:
    """dedup_keys that have appeared in `window` or more consecutive runs —
    candidates for either escalation or human review, surfaced but not acted on."""
    history = memory.get("history", {})
    return sorted(k for k, v in history.items() if v.get("consecutive_runs", 0) >= window)
