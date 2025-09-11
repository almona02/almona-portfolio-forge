from fastapi import APIRouter

from . import auth_fastapi, yilmaz_integration
# Temporarily disabled - requires mlflow and AI dependencies
# from . import part_detection_fastapi

router = APIRouter()
router.include_router(
    auth_fastapi.router, prefix="/auth", tags=["Authentication"]
)
# Temporarily disabled - requires mlflow and AI dependencies
# router.include_router(
#     part_detection_fastapi.router,
#     prefix="/part-detection",
#     tags=["Part Detection"]
# )
# Root-level integration (no trailing slash prefix)
router.include_router(
    yilmaz_integration.router,
    prefix="",
    tags=["Yilmaz Integration"],
)
