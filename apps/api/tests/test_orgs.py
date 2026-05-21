"""Tests for org API PATCH /aws — uses dependency override for DB."""

from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.main import app

AUTH = {"Authorization": "Bearer dev-only-change-me"}


def _make_client(org_mock) -> TestClient:
    async def _override():
        yield org_mock

    app.dependency_overrides[get_db] = _override
    c = TestClient(app)
    return c


def _cleanup():
    app.dependency_overrides.pop(get_db, None)


def test_aws_patch_invalid_arn_format():
    session = AsyncMock()
    session.get = AsyncMock(return_value=MagicMock(settings={}))
    session.commit = AsyncMock()
    client = _make_client(session)
    try:
        r = client.patch(
            "/api/v1/orgs/fake-org/aws",
            json={"aws_role_arn": "not-an-arn"},
            headers=AUTH,
        )
        assert r.status_code == 422
    finally:
        _cleanup()


def test_aws_patch_org_not_found():
    session = AsyncMock()
    session.get = AsyncMock(return_value=None)
    client = _make_client(session)
    try:
        r = client.patch(
            "/api/v1/orgs/missing-org/aws",
            json={"aws_role_arn": "arn:aws:iam::123456789012:role/DriftGuardReadOnly"},
            headers=AUTH,
        )
        assert r.status_code == 404
    finally:
        _cleanup()


def test_aws_patch_valid():
    fake_org = MagicMock()
    fake_org.settings = {}
    session = AsyncMock()
    session.get = AsyncMock(return_value=fake_org)
    session.commit = AsyncMock()
    client = _make_client(session)
    try:
        r = client.patch(
            "/api/v1/orgs/real-org/aws",
            json={
                "aws_role_arn": "arn:aws:iam::123456789012:role/DriftGuardReadOnly",
                "state_bucket": "my-tfstate",
                "state_key": "prod/terraform.tfstate",
            },
            headers=AUTH,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert fake_org.settings["aws_role_arn"].startswith("arn:aws:iam::")
        assert fake_org.settings["state_bucket"] == "my-tfstate"
    finally:
        _cleanup()
