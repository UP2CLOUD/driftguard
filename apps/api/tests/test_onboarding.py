import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from driftguard.db.models import Base, Organization, Repository
from driftguard.services.onboarding import (
    remove_installation,
    remove_repositories,
    upsert_installation,
)


@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)
    async with session_maker() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_upsert_creates_org_and_repos(db):
    repos = [
        {"id": 1, "full_name": "acme/api", "default_branch": "main"},
        {"id": 2, "full_name": "acme/infra", "default_branch": "main"},
    ]
    org = await upsert_installation(db, installation_id=100, repositories=repos)
    assert org.github_installation_id == 100

    result = await db.execute(select(Repository))
    rows = result.scalars().all()
    assert len(rows) == 2
    assert all(r.enabled for r in rows)


@pytest.mark.asyncio
async def test_upsert_idempotent_reenables(db):
    await upsert_installation(db, installation_id=200, repositories=[{"id": 10, "full_name": "x/y"}])
    result = await db.execute(select(Repository))
    repo = result.scalar_one()
    repo.enabled = False
    await db.commit()

    await upsert_installation(db, installation_id=200, repositories=[{"id": 10, "full_name": "x/y"}])
    result = await db.execute(select(Repository))
    repo = result.scalar_one()
    assert repo.enabled is True


@pytest.mark.asyncio
async def test_remove_installation_disables_all(db):
    await upsert_installation(
        db,
        installation_id=300,
        repositories=[{"id": 1, "full_name": "a/b"}, {"id": 2, "full_name": "a/c"}],
    )
    await remove_installation(db, installation_id=300)
    result = await db.execute(select(Repository))
    rows = result.scalars().all()
    assert len(rows) == 2
    assert all(not r.enabled for r in rows)

    orgs = await db.execute(select(Organization))
    assert len(orgs.scalars().all()) == 1


@pytest.mark.asyncio
async def test_remove_repositories_disables_subset(db):
    await upsert_installation(
        db,
        installation_id=400,
        repositories=[
            {"id": 1, "full_name": "a/b"},
            {"id": 2, "full_name": "a/c"},
            {"id": 3, "full_name": "a/d"},
        ],
    )
    await remove_repositories(db, installation_id=400, repo_ids=[1, 3])

    result = await db.execute(select(Repository).order_by(Repository.github_repo_id))
    rows = result.scalars().all()
    state = {r.github_repo_id: r.enabled for r in rows}
    assert state == {1: False, 2: True, 3: False}
