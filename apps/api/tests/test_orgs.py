import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from driftguard.core.db import get_db
from driftguard.db.models import Base, Organization, Repository
from driftguard.main import app


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        async with session_maker() as seed:
            org = Organization(github_installation_id=999, plan="pro")
            seed.add(org)
            await seed.flush()
            seed.add(Repository(org_id=org.id, github_repo_id=1, full_name="acme/api"))
            seed.add(Repository(org_id=org.id, github_repo_id=2, full_name="acme/infra"))
            await seed.commit()
            org_id = org.id
        yield org_id
    finally:
        app.dependency_overrides.pop(get_db, None)
        await engine.dispose()


@pytest.mark.asyncio
async def test_get_org_by_installation(db_session):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/v1/orgs/by-installation/999")
    assert r.status_code == 200
    body = r.json()
    assert body["installation_id"] == 999
    assert body["plan"] == "pro"
    assert body["has_stripe_customer"] is False


@pytest.mark.asyncio
async def test_get_org_not_found(db_session):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/v1/orgs/by-installation/404404")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_list_org_repos(db_session):
    org_id = db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get(f"/api/v1/orgs/{org_id}/repos")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 2
    assert {x["full_name"] for x in body} == {"acme/api", "acme/infra"}
