"""Tests for policies + memory endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.db.models import Organization, PolicyRule
from driftguard.main import app

AUTH = {"Authorization": "Bearer dev-only-change-me"}


def _org():
    return Organization(
        id="org-1",
        github_installation_id=999,
        plan="team",
    )


def _rule(name="Block S3 public", rule_type="block"):
    return PolicyRule(
        id="rule-1",
        org_id="org-1",
        name=name,
        rule_type=rule_type,
        severity="critical",
        enabled=True,
        conditions={"event_type": "security_finding"},
        actions={"block_merge": True},
        match_count=3,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def _override(session):
    async def _dep():
        yield session

    app.dependency_overrides[get_db] = _dep


def _cleanup():
    app.dependency_overrides.pop(get_db, None)


def _mock_session(org=None, rules=None, get_return=None):
    mock = AsyncMock()
    mock.execute = AsyncMock(
        return_value=MagicMock(
            scalar_one_or_none=MagicMock(return_value=org),
            scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=rules or []))),
        )
    )
    mock.get = AsyncMock(return_value=get_return)
    mock.flush = AsyncMock()
    mock.commit = AsyncMock()
    mock.refresh = AsyncMock()
    mock.add = MagicMock()
    mock.delete = AsyncMock()
    return mock


AUTH = {"Authorization": "Bearer dev-only-change-me"}

# ── Policies ──────────────────────────────────────────────────────────────────


class TestListPolicies:
    def test_no_org_returns_empty(self):
        _override(_mock_session(org=None))
        try:
            r = TestClient(app).get("/api/v1/policies?installation_id=9999", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_returns_policy_list(self):
        _override(_mock_session(org=_org(), rules=[_rule()]))
        try:
            r = TestClient(app).get("/api/v1/policies?installation_id=999", headers=AUTH)
            assert r.status_code == 200
            body = r.json()
            assert len(body) == 1
            assert body[0]["name"] == "Block S3 public"
            assert body[0]["match_count"] == 3
        finally:
            _cleanup()


class TestCreatePolicy:
    def test_valid_rule_creates_and_returns_201(self):
        mock = _mock_session(org=_org())
        created_rule = _rule("Test rule", "warn")

        async def _refresh(obj):
            obj.id = "new-id"
            obj.created_at = created_rule.created_at
            obj.updated_at = created_rule.updated_at

        mock.refresh = AsyncMock(side_effect=_refresh)
        _override(mock)
        try:
            r = TestClient(app).post(
                "/api/v1/policies?installation_id=999",
                json={"name": "Test rule", "rule_type": "warn", "severity": "high"},
                headers=AUTH,
            )
            assert r.status_code == 201
        finally:
            _cleanup()

    def test_invalid_rule_type_rejected(self):
        org = _org()
        mock = _mock_session(org=org)
        _override(mock)
        try:
            r = TestClient(app).post(
                "/api/v1/policies?installation_id=999",
                json={"name": "Bad rule", "rule_type": "invalid"},
                headers=AUTH,
            )
            assert r.status_code == 422
        finally:
            _cleanup()

    def test_missing_installation_returns_422(self):
        r = TestClient(app).post("/api/v1/policies", json={"name": "X"}, headers=AUTH)
        assert r.status_code == 422


class TestPatchPolicy:
    def test_update_enabled_state(self):
        rule = _rule()
        _override(_mock_session(get_return=rule))
        try:
            r = TestClient(app).patch(
                "/api/v1/policies/rule-1",
                json={"enabled": False},
                headers=AUTH,
            )
            assert r.status_code == 200
            assert rule.enabled is False
        finally:
            _cleanup()

    def test_not_found(self):
        _override(_mock_session(get_return=None))
        try:
            r = TestClient(app).patch(
                "/api/v1/policies/nonexistent",
                json={"enabled": False},
                headers=AUTH,
            )
            assert r.status_code == 404
        finally:
            _cleanup()


class TestDeletePolicy:
    def test_delete_existing(self):
        _override(_mock_session(get_return=_rule()))
        try:
            r = TestClient(app).delete("/api/v1/policies/rule-1", headers=AUTH)
            assert r.status_code == 204
        finally:
            _cleanup()

    def test_delete_missing(self):
        _override(_mock_session(get_return=None))
        try:
            r = TestClient(app).delete("/api/v1/policies/nope", headers=AUTH)
            assert r.status_code == 404
        finally:
            _cleanup()


# ── Memory endpoints ──────────────────────────────────────────────────────────


class TestMemoryList:
    def test_no_org_returns_empty(self):
        _override(_mock_session(org=None))
        try:
            r = TestClient(app).get("/api/v1/memory?installation_id=9999", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_returns_list(self):
        _override(_mock_session(org=_org(), rules=[]))
        try:
            r = TestClient(app).get("/api/v1/memory?installation_id=999", headers=AUTH)
            assert r.status_code == 200
        finally:
            _cleanup()


class TestMemoryStats:
    def test_no_org_returns_zero_stats(self):
        mock = _mock_session(org=None)
        mock.execute = AsyncMock(
            return_value=MagicMock(
                scalar_one_or_none=MagicMock(return_value=None),
                scalar_one=MagicMock(return_value=0),
                all=MagicMock(return_value=[]),
            )
        )
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/memory/stats?installation_id=9999", headers=AUTH)
            assert r.status_code == 200
            assert r.json()["total"] == 0
        finally:
            _cleanup()
