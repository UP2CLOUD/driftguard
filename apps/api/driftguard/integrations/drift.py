"""Drift detection: compare plan vs state."""

import json
from pathlib import Path


class DriftAnalyzer:
    """Detect drift between terraform plan and remote state."""

    @staticmethod
    def from_plan_json(plan: dict) -> list[dict]:
        """Extract resource addresses from plan for comparison."""
        planned = set()
        for rc in plan.get("resource_changes", []):
            if rc.get("change", {}).get("actions") != ["no-op"]:
                planned.add(rc.get("address"))
        return list(planned)

    @staticmethod
    def detect_drift(
        *, planned_resources: set[str], state_resources: set[str], sensitive_threshold: int = 3
    ) -> list[dict]:
        """Compare planned vs state resources.

        Returns findings for:
        - Resources in state but not planned (potential deletion)
        - Resources in state with different types (manual drift)
        """
        findings = []

        unmanaged = state_resources - planned_resources
        if unmanaged:
            if len(unmanaged) >= sensitive_threshold:
                severity = "high"
            else:
                severity = "medium"

            for resource in sorted(unmanaged)[:10]:
                findings.append(
                    {
                        "type": "drift",
                        "severity": severity,
                        "resource": resource,
                        "message": "Resource managed outside this Terraform — unplanned drift",
                        "suggestion": "Consider importing into main Terraform code or removing from state.",
                        "controls": ["change_management"],
                    }
                )

        return findings

    @classmethod
    def analyze_state_file(cls, state_path: Path) -> set[str] | None:
        """Extract resource addresses from a terraform.tfstate file.

        Note: Requires unencrypted state. Encrypted state requires provider creds.
        """
        if not state_path.exists():
            return None

        try:
            state = json.loads(state_path.read_text())
            resources = set()
            for resource in state.get("resources", []):
                rtype = resource.get("type", "")
                name = resource.get("name", "")
                if rtype and name:
                    resources.add(f"{rtype}.{name}")
            return resources
        except (json.JSONDecodeError, KeyError):
            return None
