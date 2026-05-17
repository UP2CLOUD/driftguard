import json
import subprocess


def cost_breakdown(plan_json_path: str) -> dict:
    result = subprocess.run(
        ["infracost", "breakdown", "--path", plan_json_path, "--format", "json"],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"infracost breakdown failed: {result.stderr}")
    return json.loads(result.stdout)


def cost_diff(prior_path: str, plan_json_path: str) -> dict:
    result = subprocess.run(
        [
            "infracost",
            "diff",
            "--path",
            plan_json_path,
            "--compare-to",
            prior_path,
            "--format",
            "json",
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"infracost diff failed: {result.stderr}")
    return json.loads(result.stdout)
