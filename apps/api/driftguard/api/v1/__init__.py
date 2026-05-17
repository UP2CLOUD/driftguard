from fastapi import APIRouter

from driftguard.api.v1 import analyses, health, repos, webhooks

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
router.include_router(repos.router, prefix="/repos", tags=["repos"])
router.include_router(analyses.router, prefix="/analyses", tags=["analyses"])
