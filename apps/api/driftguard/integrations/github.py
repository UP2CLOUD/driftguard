import time

import httpx
import jwt

from driftguard.core.config import settings

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
