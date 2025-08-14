from fastapi import APIRouter

from . import part_detection

router = APIRouter()
router.include_router(part_detection.router, prefix="/part-detection", tags=["Part Detection"])
