from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Header
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime
import os
import tempfile

from ai_services.part_detection.inference import PartDetector
from core.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key not in settings.VALID_API_KEYS.split(','):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")
    return x_api_key

@router.post("/detect", dependencies=[Depends(verify_api_key)])
async def detect_parts(
    image: UploadFile = File(...),
    confidence_threshold: float = Query(0.7, ge=0.0, le=1.0),
    model_version: Optional[str] = Query(None, alias="model_version")
):
    """
    Enhanced part detection endpoint with security.
    """
    try:
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

        part_detector = PartDetector(version=model_version)
        
        result = await part_detector.detect_parts(
            image.file,
            confidence_threshold=confidence_threshold
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result,
                "timestamp": datetime.utcnow().isoformat(),
                "api_version": "2.0.0"
            }
        )
        
    except Exception as e:
        logger.error(f"Error identifying part: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@router.post("/batch-detect", dependencies=[Depends(verify_api_key)])
async def batch_detect_parts(
    images: List[UploadFile] = File(...),
    confidence_threshold: float = Query(0.7, ge=0.0, le=1.0),
    model_version: Optional[str] = Query(None, alias="model_version")
):
    """
    Batch processing endpoint for multiple images.
    """
    try:
        if len(images) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 images allowed")

        part_detector = PartDetector(version=model_version)
        
        results = await part_detector.batch_detect(
            [image.file for image in images],
            confidence_threshold=confidence_threshold
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": results,
                "processed_count": len(results),
                "timestamp": datetime.utcnow().isoformat(),
                "api_version": "2.0.0"
            }
        )
        
    except Exception as e:
        logger.error(f"Error identifying part: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/model-info")
async def model_info(model_version: Optional[str] = Query(None, alias="model_version")):
    """Get model information."""
    part_detector = PartDetector(version=model_version)
    return {
        "success": True,
        "data": part_detector.get_model_info()
    }
