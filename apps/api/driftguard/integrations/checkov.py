import json
import subprocess


def scan(plan_json_path: str) -> list[dict]:
    result = subprocess.run(
        ["checkov", "-f", plan_json_path, "-o", "json", "--quiet", "--soft-fail"],
        capture_output=True,
        text=True,
        timeout=180,
    )
    if not result.stdout:
        return []
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        return []
    if isinstance(data, list):
        return data
    return [data]
