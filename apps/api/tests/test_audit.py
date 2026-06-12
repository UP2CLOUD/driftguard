"""Unit tests for driftguard.services.audit — immutable audit log writes."""

from __future__ import annotations

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from unittest.mock import AsyncMock, MagicMock, patch

from driftguard.db.models import AuditLog, Base
from driftguard.services.audit import record


@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        yield session
    await engine.dispose()


# ── Basic write ────────────────────────────────────────────────────────────────


class TestRecord:
    @pytest.mark.asyncio
    async def test_writes_audit_entry(self, db):
        await record(db, org_id="org-1", action="analysis.completed")
        result = await db.execute(select(AuditLog))
        rows = result.scalars().all()
        assert len(rows) == 1
        assert rows[0].org_id == "org-1"
        assert rows[0].action == "analysis.completed"

    @pytest.mark.asyncio
    async def test_action_stored_correctly(self, db):
        await record(db, org_id="org-1", action="policy.blocked")
        result = await db.execute(select(AuditLog).where(AuditLog.action == "policy.blocked"))
        row = result.scalar_one()
        assert row.action == "policy.blocked"

    @pytest.mark.asyncio
    async def test_actor_stored(self, db):
        await record(db, org_id="org-1", action="plan.updated", actor="github-user")
        result = await db.execute(select(AuditLog))
        row = result.scalar_one()
        assert row.actor == "github-user"

    @pytest.mark.asyncio
    async def test_target_stored(self, db):
        await record(db, org_id="org-1", action="repo.disabled", target="acme/infra")
        result = await db.execute(select(AuditLog))
        row = result.scalar_one()
        assert row.target == "acme/infra"

    @pytest.mark.asyncio
    async def test_payload_stored(self, db):
        payload = {"risk_score": 88, "pr_number": 42}
        await record(db, org_id="org-1", action="analysis.completed", payload=payload)
        result = await db.execute(select(AuditLog))
        row = result.scalar_one()
        assert row.payload["risk_score"] == 88
        assert row.payload["pr_number"] == 42

    @pytest.mark.asyncio
    async def test_none_payload_stored_as_empty_dict(self, db):
        await record(db, org_id="org-1", action="analysis.completed", payload=None)
        result = await db.execute(select(AuditLog))
        row = result.scalar_one()
        assert row.payload == {}

    @pytest.mark.asyncio
    async def test_id_is_uuid(self, db):
        await record(db, org_id="org-1", action="test.action")
        result = await db.execute(select(AuditLog))
        row = result.scalar_one()
        assert len(row.id) == 36  # UUID4 string length

    @pytest.mark.asyncio
    async def test_multiple_records_written(self, db):
        await record(db, org_id="org-1", action="a.b")
        await record(db, org_id="org-1", action="c.d")
        await record(db, org_id="org-2", action="e.f")
        result = await db.execute(select(AuditLog))
        rows = result.scalars().all()
        assert len(rows) == 3

    @pytest.mark.asyncio
    async def test_different_orgs_isolated(self, db):
        await record(db, org_id="org-A", action="x.y")
        await record(db, org_id="org-B", action="x.y")
        result = await db.execute(select(AuditLog).where(AuditLog.org_id == "org-A"))
        rows = result.scalars().all()
        assert len(rows) == 1


# ── Error resilience ──────────────────────────────────────────────────────────


class TestRecordErrorResilience:
    @pytest.mark.asyncio
    async def test_db_error_does_not_raise(self):
        """audit.record swallows exceptions — never raises to callers."""
        mock_db = AsyncMock()
        mock_db.add = MagicMock(side_effect=RuntimeError("DB is down"))
        mock_db.flush = AsyncMock()

        # Should not raise
        await record(mock_db, org_id="org-1", action="analysis.completed")

    @pytest.mark.asyncio
    async def test_flush_error_does_not_raise(self):
        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.flush = AsyncMock(side_effect=RuntimeError("flush failed"))

        await record(mock_db, org_id="org-1", action="analysis.completed")

    @pytest.mark.asyncio
    async def test_error_is_logged_not_raised(self):
        """Errors are logged at ERROR level, never propagated."""
        mock_db = AsyncMock()
        mock_db.add = MagicMock(side_effect=ValueError("unexpected"))

        with patch("driftguard.services.audit.log") as mock_log:
            await record(mock_db, org_id="org-1", action="test")
            mock_log.error.assert_called_once()
