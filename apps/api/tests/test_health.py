import pytest
from httpx import ASGITransport, AsyncClient

from driftguard.main import app


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert "uptime_s" in r.json()


@pytest.mark.asyncio
async def test_ready_returns_json():
    """Ready may be 200 or 503 depending on DB availability in test env."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/ready")
    assert r.status_code in (200, 503)
    body = r.json()
    assert "status" in body
    assert "checks" in body
    assert "db" in body["checks"]
