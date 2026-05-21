from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.auth import verify_api_key
from driftguard.core.db import get_db, get_session
from driftguard.db.models import Repository

router = APIRouter(prefix="/aws", tags=["aws"])


class AWSConfig(BaseModel):
    aws_role_arn: str
    aws_region: str = "eu-west-1"
    state_bucket: str | None = None
    state_key: str | None = None


class AWSValidation(BaseModel):
    valid: bool
    account_id: str | None = None
    arn: str | None = None
    error: str | None = None


@router.post("/repos/{repo_id}/configure")
async def configure_aws(
    repo_id: str,
    config: AWSConfig,
    session: AsyncSession = Depends(get_session),
    _: None = Depends(verify_api_key),
) -> dict:
    result = await session.execute(select(Repository).where(Repository.id == repo_id))
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="repo not found")

    repo.settings = {
        **(repo.settings or {}),
        "aws_role_arn": config.aws_role_arn,
        "aws_region": config.aws_region,
        "state_bucket": config.state_bucket,
        "state_key": config.state_key,
    }
    await session.commit()
    return {"status": "saved"}


@router.post("/repos/{repo_id}/validate")
async def validate_aws(
    repo_id: str,
    session: AsyncSession = Depends(get_session),
    _: None = Depends(verify_api_key),
) -> AWSValidation:
    result = await session.execute(select(Repository).where(Repository.id == repo_id))
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="repo not found")

    role_arn = (repo.settings or {}).get("aws_role_arn")
    if not role_arn:
        return AWSValidation(valid=False, error="aws_role_arn not configured")

    region = (repo.settings or {}).get("aws_region", "eu-west-1")
    try:
        import asyncio

        from driftguard.integrations.aws import validate_role

        identity = await asyncio.to_thread(validate_role, role_arn, region)
        return AWSValidation(valid=True, account_id=identity["account_id"], arn=identity["arn"])
    except PermissionError as exc:
        return AWSValidation(valid=False, error=str(exc))


@router.get("/verify")
async def verify_aws_connection(org_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    """Test that the stored IAM role can be assumed.

    Looks up org.settings.aws_role_arn, calls STS GetCallerIdentity.
    Returns account_id on success, error message on failure.
    """
    from driftguard.db.models import Organization

    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(404, "org not found")

    role_arn = (org.settings or {}).get("aws_role_arn")
    if not role_arn:
        return {"configured": False, "error": "No IAM role configured. Go to Settings → AWS Integration."}

    try:
        from driftguard.integrations.aws import assume_role

        creds = await __import__("asyncio").to_thread(assume_role, role_arn, f"driftguard-{org.github_installation_id}")
        return {
            "configured": True,
            "valid": True,
            "account_id": creds.get("AccountId"),
            "role_arn": role_arn,
        }
    except Exception as exc:
        return {
            "configured": True,
            "valid": False,
            "role_arn": role_arn,
            "error": str(exc)[:200],
        }
