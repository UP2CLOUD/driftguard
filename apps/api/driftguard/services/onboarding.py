from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.logging import log
from driftguard.db.models import Organization, Repository


async def upsert_installation(db: AsyncSession, *, installation_id: int, repositories: list[dict]) -> Organization:
    """Idempotent. Called on `installation.created` and `installation_repositories` events."""
    result = await db.execute(select(Organization).where(Organization.github_installation_id == installation_id))
    org = result.scalar_one_or_none()

    if org is None:
        org = Organization(github_installation_id=installation_id, plan="free")
        db.add(org)
        await db.flush()
        log.info("org_created", installation_id=installation_id, org_id=org.id)

    existing = await db.execute(select(Repository).where(Repository.org_id == org.id))
    existing_by_gh_id = {r.github_repo_id: r for r in existing.scalars()}

    for repo in repositories:
        gh_id = repo.get("id")
        if gh_id is None:
            continue
        if gh_id in existing_by_gh_id:
            existing_by_gh_id[gh_id].enabled = True
            continue
        db.add(
            Repository(
                org_id=org.id,
                github_repo_id=gh_id,
                full_name=repo.get("full_name", ""),
                default_branch=repo.get("default_branch", "main"),
                enabled=True,
            )
        )

    await db.commit()
    log.info(
        "installation_upserted",
        installation_id=installation_id,
        org_id=org.id,
        repos=len(repositories),
    )
    return org


async def remove_installation(db: AsyncSession, *, installation_id: int) -> None:
    """Soft-disable. Don't delete history."""
    result = await db.execute(select(Organization).where(Organization.github_installation_id == installation_id))
    org = result.scalar_one_or_none()
    if org is None:
        return

    repos = await db.execute(select(Repository).where(Repository.org_id == org.id))
    for repo in repos.scalars():
        repo.enabled = False

    await db.commit()
    log.info("installation_disabled", installation_id=installation_id, org_id=org.id)


async def remove_repositories(db: AsyncSession, *, installation_id: int, repo_ids: list[int]) -> None:
    result = await db.execute(select(Organization).where(Organization.github_installation_id == installation_id))
    org = result.scalar_one_or_none()
    if org is None:
        return

    repos = await db.execute(
        select(Repository).where(
            Repository.org_id == org.id,
            Repository.github_repo_id.in_(repo_ids),
        )
    )
    for repo in repos.scalars():
        repo.enabled = False

    await db.commit()
