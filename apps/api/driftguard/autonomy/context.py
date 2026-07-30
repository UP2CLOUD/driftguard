"""Deterministic repo context for autonomy agents.

Every role gets the same bounded snapshot of the repo — a directory tree,
key doc excerpts, and recent history — and applies its own lens via the
role system prompt. Keeping context shared (not per-role fetches) bounds
token cost linearly in roles, not in filesystem calls.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

_MAX_TREE_ENTRIES = 400
_MAX_DOC_CHARS = 4000
_SKIP_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".next",
    "dist",
    "build",
    ".venv",
    "graphify-out",
    ".pytest_cache",
    ".ruff_cache",
}
_DOC_FILES = ("README.md", "CLAUDE.md", "PRODUCT.md", "AGENTS.md")


def default_repo_root() -> Path:
    """Walk up from this file to find the repo root (contains .git)."""
    p = Path(__file__).resolve()
    for parent in p.parents:
        if (parent / ".git").exists():
            return parent
    return p.parents[4]  # apps/api/driftguard/autonomy/context.py -> repo root


def _build_tree(root: Path) -> str:
    lines: list[str] = []
    for path in sorted(root.rglob("*")):
        if any(part in _SKIP_DIRS for part in path.parts):
            continue
        if len(lines) >= _MAX_TREE_ENTRIES:
            lines.append("... (truncated)")
            break
        rel = path.relative_to(root)
        lines.append(str(rel) + ("/" if path.is_dir() else ""))
    return "\n".join(lines)


def _read_doc(root: Path, name: str) -> str:
    p = root / name
    if not p.exists():
        return ""
    text = p.read_text(errors="replace")
    if len(text) > _MAX_DOC_CHARS:
        text = text[:_MAX_DOC_CHARS] + "\n... (truncated)"
    return text


def _recent_log(root: Path, count: int = 20) -> str:
    try:
        result = subprocess.run(
            ["git", "log", f"-{count}", "--oneline"],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        return result.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def gather_context(repo_root: Path | None = None) -> str:
    root = repo_root or default_repo_root()

    sections = ["## Directory tree (skip-listed dirs omitted)\n" + _build_tree(root)]

    for name in _DOC_FILES:
        doc = _read_doc(root, name)
        if doc:
            sections.append(f"## {name}\n{doc}")

    log = _recent_log(root)
    if log:
        sections.append(f"## Recent commits\n{log}")

    return "\n\n".join(sections)
