from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from driftguard.api.v1 import router as v1_router
from driftguard.core.config import settings
from driftguard.core.db import engine
from driftguard.core.logging import setup_logging
from driftguard.db.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    if settings.environment == "dev":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        from sqlalchemy import select

        from driftguard.core.db import SessionLocal
        from driftguard.db.models import (
            Analysis,
            Finding,
            Organization,
            PullRequest,
            Repository,
        )

        async with SessionLocal() as session:
            result = await session.execute(select(Organization).where(Organization.github_installation_id == 999))
            if not result.scalar_one_or_none():
                org = Organization(
                    github_installation_id=999,
                    plan="pro",
                    stripe_customer_id="cus_mock123",
                )
                session.add(org)
                await session.flush()

                repo1 = Repository(
                    org_id=org.id,
                    github_repo_id=1,
                    full_name="acme/api",
                    enabled=True,
                )
                repo2 = Repository(
                    org_id=org.id,
                    github_repo_id=2,
                    full_name="acme/infra",
                    enabled=True,
                )
                session.add_all([repo1, repo2])
                await session.flush()

                pr = PullRequest(
                    repo_id=repo2.id,
                    github_pr_number=42,
                    head_sha="a1b2c3d4e5f6g7h8i9j0",
                    base_sha="0j9i8h7g6f5e4d3c2b1a",
                    status="open",
                )
                session.add(pr)
                await session.flush()

                summary_md = (
                    "### AI Review Summary\n\n"
                    "- **Cost Impact**: +$125.00/mo (Added RDS Instance)\n"
                    "- **Security**: 1 High severity finding (Unencrypted "
                    "database storage)\n"
                    "- **Compliance**: DORA reference affected by resource "
                    "deletion risk."
                )
                analysis = Analysis(
                    pr_id=pr.id,
                    status="completed",
                    cost_delta_cents=12500,
                    risk_score=75,
                    summary_md=summary_md,
                )
                session.add(analysis)
                await session.flush()

                finding1 = Finding(
                    analysis_id=analysis.id,
                    type="security",
                    severity="high",
                    resource_address="aws_db_instance.postgres",
                    message=("Database storage is not encrypted at rest. Violates ISO 27001 A.8.9."),
                    suggestion=("Add `storage_encrypted = true` to the resource block."),
                )
                finding2 = Finding(
                    analysis_id=analysis.id,
                    type="cost",
                    severity="info",
                    resource_address="aws_db_instance.postgres",
                    message=("Creating database aws_db_instance.postgres adds $125.00/mo to your AWS bill."),
                    suggestion=None,
                )
                session.add_all([finding1, finding2])
                await session.commit()
    yield


app = FastAPI(
    title="Driftguard API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment != "prod" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api/v1")
