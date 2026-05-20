import time

import httpx
import jwt

from driftguard.core.config import settings
from driftguard.core.logging import log

GITHUB_API = "https://api.github.com"


def _app_jwt() -> str:
    now = int(time.time())
    payload = {"iat": now - 60, "exp": now + 540, "iss": settings.github_app_id}
    return jwt.encode(payload, settings.github_app_private_key, algorithm="RS256")


async def installation_token(installation_id: int) -> str:
    headers = {
        "Authorization": f"Bearer {_app_jwt()}",
        "Accept": "application/vnd.github+json",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            f"{GITHUB_API}/app/installations/{installation_id}/access_tokens",
            headers=headers,
        )
        r.raise_for_status()
        return r.json()["token"]


async def post_pr_comment(token: str, repo_full_name: str, pr_number: int, body: str) -> None:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            f"{GITHUB_API}/repos/{repo_full_name}/issues/{pr_number}/comments",
            headers=headers,
            json={"body": body},
        )
        r.raise_for_status()


def tarball_url(repo_full_name: str, ref: str) -> str:
    return f"{GITHUB_API}/repos/{repo_full_name}/tarball/{ref}"


async def post_check_run(
    token: str,
    repo_full_name: str,
    head_sha: str,
    *,
    name: str = "DriftGuard",
    conclusion: str,  # success | failure | neutral | action_required
    title: str,
    summary: str,
    details_url: str | None = None,
) -> None:
    """Post a GitHub Check Run — appears as a status check in the PR.

    With branch protection rules requiring DriftGuard to pass, this gates merging.
    """
    import httpx

    url = f"https://api.github.com/repos/{repo_full_name}/check-runs"
    payload = {
        "name": name,
        "head_sha": head_sha,
        "status": "completed",
        "conclusion": conclusion,
        "output": {
            "title": title[:200],
            "summary": summary[:65535],
        },
    }
    if details_url:
        payload["details_url"] = details_url

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        if resp.status_code >= 400:
            log.warning(
                "check_run_failed",
                repo=repo_full_name,
                status=resp.status_code,
                body=resp.text[:200],
            )
