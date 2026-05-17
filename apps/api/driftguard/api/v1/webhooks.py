import hashlib
import hmac

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request

from driftguard.core.config import settings
from driftguard.core.logging import log
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


@router.post("/github")
async def github_webhook(
    request: Request,
    background: BackgroundTasks,
    x_github_event: str = Header(...),
    x_hub_signature_256: str | None = Header(None),
):
    body = await request.body()
    if not _verify_signature(body, x_hub_signature_256):
        raise HTTPException(401, "invalid signature")

    payload = await request.json()
    log.info("github_event", gh_event=x_github_event, action=payload.get("action"))

    if x_github_event == "pull_request" and payload.get("action") in {
        "opened",
        "synchronize",
        "reopened",
    }:
        background.add_task(enqueue_pr_analysis, payload)

    return {"received": True}
