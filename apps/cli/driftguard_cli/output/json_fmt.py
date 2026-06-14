"""JSON output formatter."""

from __future__ import annotations

import json
from typing import Any

from driftguard_cli.scanner.engine import ScanResult
from driftguard_cli.plan import PlanSummary


def scan_to_dict(result: ScanResult) -> dict[str, Any]:
    return {
        "directory": result.directory,
        "files_scanned": result.files_scanned,
        "tf_files": result.tf_files,
        "k8s_files": result.k8s_files,
        "gha_files": result.gha_files,
        "risk_score": result.risk_score,
        "summary": {
            "critical": result.critical,
            "high": result.high,
            "medium": result.medium,
            "low": result.low,
            "total": len(result.findings),
        },
        "findings": [
            {
                "rule_id": f.rule_id,
                "severity": str(f.severity),
                "category": str(f.category),
                "title": f.title,
                "message": f.message,
                "resource": f.resource,
                "file": f.file,
                "line": f.line,
                "suggestion": f.suggestion,
                "docs_url": f.docs_url,
                "controls": f.controls,
            }
            for f in result.findings
        ],
        "errors": result.errors,
    }


def plan_to_dict(summary: PlanSummary) -> dict[str, Any]:
    return {
        "tf_version": summary.tf_version,
        "risk_score": summary.risk_score,
        "risk_level": summary.risk_level,
        "risk_factors": summary.risk_factors,
        "summary": {
            "creates": summary.creates,
            "updates": summary.updates,
            "deletes": summary.deletes,
            "replaces": summary.replaces,
            "total": len(summary.changes),
        },
        "changes": [
            {
                "address": c.address,
                "type": c.type,
                "name": c.name,
                "action": c.action.value,
                "provider": c.provider,
                "module": c.module,
                "is_destructive": c.is_destructive,
                "replace_paths": c.replace_paths,
            }
            for c in summary.changes
        ],
    }


def dump(data: dict[str, Any]) -> str:
    return json.dumps(data, indent=2, default=str)
