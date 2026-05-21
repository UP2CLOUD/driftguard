import hashlib
import hmac

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.config import settings
from driftguard.core.db import get_db
from driftguard.core.logging import log
from driftguard.core.ratelimit import WebhookRateLimit
from driftguard.services.onboarding import (
    remove_installation,
    remove_repositories,
    upsert_installation,
)
from driftguard.workers.analyzer import enqueue_pr_analysis

router = APIRouter()


def _verify_signature(payload: bytes, signature: str | None) -> bool:
    if not signature or not settings.github_webhook_secret:
        return False
    digest = hmac.new(
        settings.github_webhook_secret.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    expected = f"sha256={digest}"
    return hmac.compare_digest(expected, signature)


@router.post("/github", dependencies=[WebhookRateLimit])
async def github_webhook(
    request: Request,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    x_github_event: str = Header(...),
    x_hub_signature_256: str | None = Header(None),
):
    body = await request.body()
    if not _verify_signature(body, x_hub_signature_256):
        raise HTTPException(401, "invalid signature")

    payload = await request.json()
    action = payload.get("action")
    log.info("github_event", gh_event=x_github_event, action=action)

    if x_github_event == "pull_request" and action in {"opened", "synchronize", "reopened"}:
        background.add_task(enqueue_pr_analysis, payload)
        return {"received": True}

    if x_github_event == "installation":
        installation_id = payload["installation"]["id"]
        repos = payload.get("repositories", [])
        account = payload.get("installation", {}).get("account")
        if action in {"created", "new_permissions_accepted", "unsuspend"}:
            await upsert_installation(db, installation_id=installation_id, repositories=repos, account=account)
        elif action in {"deleted", "suspend"}:
            await remove_installation(db, installation_id=installation_id)
        return {"received": True}

    if x_github_event == "installation_repositories":
        installation_id = payload["installation"]["id"]
        added = payload.get("repositories_added", [])
        removed = payload.get("repositories_removed", [])
        if added:
            await upsert_installation(db, installation_id=installation_id, repositories=added)
        if removed:
            await remove_repositories(
                db,
                installation_id=installation_id,
                repo_ids=[r["id"] for r in removed if "id" in r],
            )
        return {"received": True}

    return {"received": True}
