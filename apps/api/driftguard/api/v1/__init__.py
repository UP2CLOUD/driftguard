from fastapi import APIRouter, Depends

from driftguard.api.v1 import analyses, billing, health, orgs, repos, stripe_webhooks, webhooks
from driftguard.core.auth import verify_api_key

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
router.include_router(stripe_webhooks.router, prefix="/webhooks", tags=["webhooks"])
router.include_router(repos.router, prefix="/repos", tags=["repos"], dependencies=[Depends(verify_api_key)])
router.include_router(analyses.router, prefix="/analyses", tags=["analyses"], dependencies=[Depends(verify_api_key)])
router.include_router(orgs.router, prefix="/orgs", tags=["orgs"], dependencies=[Depends(verify_api_key)])
router.include_router(billing.router, prefix="/billing", tags=["billing"], dependencies=[Depends(verify_api_key)])
