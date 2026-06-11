import time

import httpx
import jwt

from driftguard.core.config import settings
from driftguard.core.logging import log

GITHUB_API = "https://api.github.com"


def _app_jwt() -> str:
    now = int(time.time())
    payload = {"iat": now - 60, "exp": now + 540, "iss": settings.github_app_id}
    # Normalize literal \n sequences (Render/env stores PEM as single line)
    pem = settings.github_app_private_key.replace("\\n", "\n")
    return jwt.encode(payload, pem, algorithm="RS256")


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


async def request_pr_review(token: str, repo_full_name: str, pr_number: int) -> None:
    """Request a review from the DriftGuard bot — appears in the Reviewers sidebar."""
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            f"{GITHUB_API}/repos/{repo_full_name}/pulls/{pr_number}/requested_reviewers",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            json={"reviewers": [], "team_reviewers": []},
        )
        # 422 = already requested or can't self-review — both are fine
        if r.status_code not in (200, 201, 422):
            log.warning("request_review_failed", repo=repo_full_name, status=r.status_code)


async def submit_pr_review(
    token: str,
    repo_full_name: str,
    pr_number: int,
    commit_id: str,
    *,
    event: str,  # APPROVE | REQUEST_CHANGES | COMMENT
    body: str,
    inline_comments: list[dict] | None = None,
) -> None:
    """Submit a formal GitHub PR review (appears in Reviews section, not just comments)."""
    payload: dict = {"commit_id": commit_id, "event": event, "body": body}
    if inline_comments:
        payload["comments"] = inline_comments
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            f"{GITHUB_API}/repos/{repo_full_name}/pulls/{pr_number}/reviews",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
            json=payload,
        )
        if r.status_code == 422 and "comments" in payload:
            payload.pop("comments")
            r = await client.post(
                f"{GITHUB_API}/repos/{repo_full_name}/pulls/{pr_number}/reviews",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
                json=payload,
            )
        if r.status_code not in (200, 201):
            log.warning("submit_review_failed", repo=repo_full_name, status=r.status_code, body=r.text[:200])


async def fetch_pr_files(token: str, repo_full_name: str, pr_number: int) -> list[dict]:
    """Fetch files changed in a PR (includes per-file unified diff patch)."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }
    files: list[dict] = []
    page = 1
    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            r = await client.get(
                f"{GITHUB_API}/repos/{repo_full_name}/pulls/{pr_number}/files",
                headers=headers,
                params={"per_page": 100, "page": page},
            )
            if r.status_code != 200:
                log.warning("fetch_pr_files_failed", repo=repo_full_name, status=r.status_code)
                break
            batch = r.json()
            if not batch:
                break
            files.extend(batch)
            if len(batch) < 100:
                break
            page += 1
    return files


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
