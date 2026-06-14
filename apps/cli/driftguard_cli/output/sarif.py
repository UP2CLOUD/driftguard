"""SARIF v2.1.0 output — compatible with GitHub Code Scanning."""

from __future__ import annotations

import json
from typing import Any

from driftguard_cli.scanner.engine import ScanResult, Severity
from driftguard_cli import __version__

_SARIF_URI = "https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-schema-2.1.0.json"

_SEV_MAP = {
    Severity.CRITICAL: "error",
    Severity.HIGH: "error",
    Severity.MEDIUM: "warning",
    Severity.LOW: "note",
    Severity.INFO: "none",
}


def to_sarif(result: ScanResult) -> dict[str, Any]:
    rules: dict[str, dict[str, Any]] = {}
    results: list[dict[str, Any]] = []

    for f in result.findings:
        rule_id = f.rule_id

        if rule_id not in rules:
            rules[rule_id] = {
                "id": rule_id,
                "name": f.title.replace(" ", ""),
                "shortDescription": {"text": f.title},
                "fullDescription": {"text": f.message},
                "helpUri": f.docs_url or f"https://docs.driftguard.io/rules/{rule_id}",
                "help": {"text": f.suggestion or f.message},
                "properties": {
                    "tags": list(f.controls) if f.controls else [],
                    "category": str(f.category),
                },
                "defaultConfiguration": {
                    "level": _SEV_MAP.get(f.severity, "warning"),
                },
            }

        sarif_level = _SEV_MAP.get(f.severity, "warning")

        location: dict[str, Any] = {
            "physicalLocation": {
                "artifactLocation": {
                    "uri": f.file,
                    "uriBaseId": "%SRCROOT%",
                },
            }
        }
        if f.line:
            location["physicalLocation"]["region"] = {"startLine": f.line}

        if f.resource:
            location["logicalLocations"] = [{"name": f.resource, "kind": "resource"}]

        results.append({
            "ruleId": rule_id,
            "level": sarif_level,
            "message": {"text": f.message},
            "locations": [location],
        })

    return {
        "$schema": _SARIF_URI,
        "version": "2.1.0",
        "runs": [
            {
                "tool": {
                    "driver": {
                        "name": "DriftGuard",
                        "version": __version__,
                        "informationUri": "https://driftguard.io",
                        "rules": list(rules.values()),
                    }
                },
                "results": results,
                "artifacts": [
                    {"location": {"uri": result.directory, "uriBaseId": "%SRCROOT%"}}
                ],
            }
        ],
    }


def dump(sarif: dict[str, Any]) -> str:
    return json.dumps(sarif, indent=2)
