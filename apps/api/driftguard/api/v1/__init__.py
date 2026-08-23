from fastapi import APIRouter, Depends

from driftguard.api.v1 import (
    analyses,
    aws,
    billing,
    dashboard,
    events,
    finops,
    health,
    incidents,
    ingest,
    memory,
    orgs,
    policies,
    repos,
    scans,
    stripe_webhooks,
    tokens,
    webhooks,
    ws,
)
from driftguard.core.auth import verify_api_key
from driftguard.core.config import settings

router = APIRouter()
router.include_router(health.router, tags=["health"])

# Debug routes are never mounted in production. /debug/run-migrations shells
# out to alembic and /debug/run-analyze returns a raw traceback; neither should
# be reachable on a production deployment even with a valid token, so the
# routes are simply not registered there. They are then absent from the route
# table and from the OpenAPI schema, not merely rejected.
if settings.environment != "prod":
    router.include_router(health.debug_router, tags=["debug"])
router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
router.include_router(stripe_webhooks.router, prefix="/webhooks", tags=["webhooks"])
router.include_router(repos.router, prefix="/repos", tags=["repos"], dependencies=[Depends(verify_api_key)])
router.include_router(analyses.router, prefix="/analyses", tags=["analyses"], dependencies=[Depends(verify_api_key)])
router.include_router(orgs.router, prefix="/orgs", tags=["orgs"], dependencies=[Depends(verify_api_key)])
router.include_router(billing.router, prefix="/billing", tags=["billing"], dependencies=[Depends(verify_api_key)])
router.include_router(aws.router, dependencies=[Depends(verify_api_key)])
router.include_router(memory.router, dependencies=[Depends(verify_api_key)])
router.include_router(dashboard.router, dependencies=[Depends(verify_api_key)])
router.include_router(ingest.router)
router.include_router(incidents.router, dependencies=[Depends(verify_api_key)])
router.include_router(events.router, dependencies=[Depends(verify_api_key)])
router.include_router(policies.router, dependencies=[Depends(verify_api_key)])
router.include_router(scans.router, tags=["scans"], dependencies=[Depends(verify_api_key)])
router.include_router(tokens.router, tags=["tokens"])
router.include_router(ws.router, tags=["ws"])
router.include_router(finops.router, dependencies=[Depends(verify_api_key)])
