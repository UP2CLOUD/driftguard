from fastapi import APIRouter, Depends

from driftguard.api.v1 import (
    analyses,
    aws,
    billing,
    dashboard,
    events,
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
)
from driftguard.core.auth import verify_api_key

router = APIRouter()
router.include_router(health.router, tags=["health"])
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
