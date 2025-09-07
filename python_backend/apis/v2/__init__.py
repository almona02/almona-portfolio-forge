from fastapi import APIRouter

from . import auth_fastapi, part_detection_fastapi, yilmaz_integration

router = APIRouter()
router.include_router(auth_fastapi.router, prefix="/auth", tags=["Authentication"])
router.include_router(part_detection_fastapi.router, prefix="/part-detection", tags=["Part Detection"])
router.include_router(yilmaz_integration.router, prefix="/", tags=["Yilmaz Integration"]) 