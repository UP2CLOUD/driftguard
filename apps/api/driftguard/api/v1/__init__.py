from fastapi import APIRouter

from driftguard.api.v1 import analyses, billing, health, orgs, repos, stripe_webhooks, webhooks

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
router.include_router(stripe_webhooks.router, prefix="/webhooks", tags=["webhooks"])
router.include_router(repos.router, prefix="/repos", tags=["repos"])
router.include_router(analyses.router, prefix="/analyses", tags=["analyses"])
router.include_router(orgs.router, prefix="/orgs", tags=["orgs"])
router.include_router(billing.router, prefix="/billing", tags=["billing"])
