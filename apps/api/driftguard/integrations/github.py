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


def _marker_tag(marker: str) -> str:
    return f"<!-- driftguard:{marker} -->"


async def _find_marked_comment(token: str, repo_full_name: str, pr_number: int, marker: str) -> int | None:
    """Find DriftGuard's own prior comment on this PR carrying `marker`.

    Returns the comment id, or None if not found — including on any fetch
    error, so callers fall back to posting a new comment rather than failing
    the whole review. Capped at 3 pages (300 comments): DriftGuard's own
    comment is always recent relative to when it last ran, so an unbounded
    scan isn't worth the extra requests on a long-lived, heavily-discussed PR.
    """
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    needle = _marker_tag(marker)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            for page in range(1, 4):
                r = await client.get(
                    f"{GITHUB_API}/repos/{repo_full_name}/issues/{pr_number}/comments",
                    headers=headers,
                    params={"per_page": 100, "page": page},
                )
                if r.status_code != 200:
                    return None
                batch = r.json()
                if not batch:
                    return None
                for c in batch:
                    if needle in (c.get("body") or ""):
                        return c["id"]
                if len(batch) < 100:
                    return None
    except Exception as exc:  # noqa: BLE001
        log.warning("find_marked_comment_failed", repo=repo_full_name, pr=pr_number, error=str(exc))
    return None


async def post_pr_comment(
    token: str, repo_full_name: str, pr_number: int, body: str, *, marker: str | None = None
) -> None:
    """Post a PR comment, or update DriftGuard's own prior comment in place.

    Without `marker`, always posts a new comment (pre-existing behavior).
    With `marker`, embeds an invisible HTML-comment tag and looks for a
    prior DriftGuard comment carrying the same tag — if found, PATCHes it
    instead of posting a new one, so repeated pushes to the same PR update
    a single comment rather than stacking duplicates. Different call sites
    use different markers ("summary", "quota-blocked", "error", "finops")
    so they never clobber each other — a PR's state across runs can
    legitimately switch between these (e.g. quota-blocked on one push, a
    real summary on the next once quota resets).
    """
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }
    if marker:
        body = f"{_marker_tag(marker)}\n{body}"

    existing_id = await _find_marked_comment(token, repo_full_name, pr_number, marker) if marker else None

    async with httpx.AsyncClient(timeout=10) as client:
        if existing_id is not None:
            r = await client.patch(
                f"{GITHUB_API}/repos/{repo_full_name}/issues/comments/{existing_id}",
                headers=headers,
                json={"body": body},
            )
        else:
            r = await client.post(
                f"{GITHUB_API}/repos/{repo_full_name}/issues/{pr_number}/comments",
                headers=headers,
                json={"body": body},
            )
        r.raise_for_status()


def tarball_url(repo_full_name: str, ref: str | None = None) -> str:
    """Tarball URL; without a ref GitHub serves the repository's default branch."""
    base = f"{GITHUB_API}/repos/{repo_full_name}/tarball"
    return f"{base}/{ref}" if ref else base


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
