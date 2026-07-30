"""CLI entrypoint: uv run python -m driftguard.autonomy.cli [run_id]

Runs the Phase 1 findings-generation orchestrator and writes
.driftguard/autonomy/findings/<run_id>.json + runs/<run_id>.json.
"""

from __future__ import annotations

import asyncio
import sys
from datetime import UTC, datetime

from driftguard.autonomy import orchestrator
from driftguard.autonomy.context import default_repo_root


async def main() -> None:
    run_id = sys.argv[1] if len(sys.argv) > 1 else datetime.now(UTC).strftime("%Y-%m-%d")
    root = default_repo_root()

    result = await orchestrator.run(repo_root=root, run_id=run_id)
    findings_path, runs_path = orchestrator.write_run_artifacts(root, run_id, result)

    print(f"✓ {len(result.findings)} findings ({len(result.suppressed_dedup_keys)} suppressed)")
    print(f"  wrote {findings_path.relative_to(root)}")
    print(f"  wrote {runs_path.relative_to(root)}")


if __name__ == "__main__":
    asyncio.run(main())
