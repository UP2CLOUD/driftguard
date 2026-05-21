import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.api.deps import require_internal_auth
from driftguard.core.config import settings
from driftguard.core.db import get_db
from driftguard.core.logging import log
from driftguard.db.models import Analysis, Organization, PullRequest, Repository
from driftguard.integrations.github import _app_jwt
from driftguard.services.onboarding import upsert_installation

router = APIRouter()

GITHUB_API = "https://api.github.com"


async def _bootstrap_installation(db: AsyncSession, installation_id: int) -> Organization | None:
    """Webhook may not have arrived (local dev / race). Pull repos directly from GitHub App API."""
    if not settings.github_app_id or not settings.github_app_private_key:
        log.warning("bootstrap_skipped", reason="github_app not configured")
        return None
    try:
        headers = {
            "Authorization": f"Bearer {_app_jwt()}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{GITHUB_API}/app/installations/{installation_id}/repositories",
                headers=headers,
            )
            if r.status_code != 200:
                log.warning("bootstrap_failed", status=r.status_code, body=r.text[:200])
                return None
            repos = r.json().get("repositories", [])
        log.info("bootstrap_from_github_api", installation_id=installation_id, repos=len(repos))
        return await upsert_installation(db, installation_id=installation_id, repositories=repos)
    except Exception as exc:
        log.warning("bootstrap_error", error=str(exc))
        return None


@router.get("/by-installation/{installation_id}")
async def get_org_by_installation(
    installation_id: int,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    result = await db.execute(select(Organization).where(Organization.github_installation_id == installation_id))
    org = result.scalar_one_or_none()

    if org is None:
        org = await _bootstrap_installation(db, installation_id)
    if org is None:
        raise HTTPException(404, "org not found")

    return {
        "id": org.id,
        "installation_id": org.github_installation_id,
        "plan": org.plan,
        "has_stripe_customer": org.stripe_customer_id is not None,
        "aws_role_arn": (org.settings or {}).get("aws_role_arn"),
        "aws_external_id": f"driftguard-{org.github_installation_id}",
    }


@router.get("/{org_id}/repos")
async def list_org_repos(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> list[dict]:
    result = await db.execute(select(Repository).where(Repository.org_id == org_id).order_by(Repository.full_name))
    return [
        {
            "id": r.id,
            "full_name": r.full_name,
            "default_branch": r.default_branch,
            "enabled": r.enabled,
        }
        for r in result.scalars()
    ]


@router.get("/{org_id}/analyses")
async def list_org_analyses(
    org_id: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> list[dict]:
    stmt = (
        select(Analysis, PullRequest, Repository)
        .join(PullRequest, Analysis.pr_id == PullRequest.id)
        .join(Repository, PullRequest.repo_id == Repository.id)
        .where(Repository.org_id == org_id)
        .order_by(desc(Analysis.id))
        .limit(min(limit, 100))
    )
    result = await db.execute(stmt)
    return [
        {
            "id": a.id,
            "status": a.status,
            "cost_delta_cents": a.cost_delta_cents,
            "risk_score": a.risk_score,
            "pr_number": p.github_pr_number,
            "head_sha": p.head_sha,
            "repo": r.full_name,
        }
        for a, p, r in result.all()
    ]


class AwsSettingsUpdate(BaseModel):
    aws_role_arn: str | None = None
    state_bucket: str | None = None
    state_key: str = "terraform.tfstate"


@router.patch("/{org_id}/aws")
async def update_aws_settings(
    org_id: str,
    body: AwsSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(404, "org not found")

    # Validate role ARN format
    if body.aws_role_arn and not body.aws_role_arn.startswith("arn:aws:iam::"):
        raise HTTPException(422, "invalid role ARN format")

    settings_patch = dict(org.settings or {})
    if body.aws_role_arn is not None:
        settings_patch["aws_role_arn"] = body.aws_role_arn
    if body.state_bucket is not None:
        settings_patch["state_bucket"] = body.state_bucket
    settings_patch["state_key"] = body.state_key

    org.settings = settings_patch
    await db.commit()

    return {"status": "ok", "aws_role_arn": body.aws_role_arn}


@router.get("/{org_id}/audit-log")
async def list_audit_log(
    org_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Return the last N audit records for an org. Used for DORA/NIS2 evidence export."""
    from sqlalchemy import text

    rows = (
        await db.execute(
            text("""
                SELECT id, actor, action, target, payload, created_at
                FROM audit_log
                WHERE org_id = :org_id
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"org_id": org_id, "limit": min(limit, 500)},
        )
    ).fetchall()

    return [
        {
            "id": r.id,
            "actor": r.actor,
            "action": r.action,
            "target": r.target,
            "payload": r.payload,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
