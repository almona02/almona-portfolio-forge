from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional

from ai_services.part_detection.inference import PartDetector
from core.config import settings
import logging

from models.api_v1_models import PartDetectionResponse, GetModelsResponse

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/identify-part", response_model=PartDetectionResponse)
async def identify_part(
    image: UploadFile = File(...),
    confidence_threshold: float = Query(0.7, ge=0.0, le=1.0),
    model_version: Optional[str] = Query(None, alias="model_version")
):
    """
    Identify spare parts from an uploaded image using a YOLOv8 model.
    A specific model version can be selected via the `model_version` query parameter.
    """
    try:
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

        part_detector = PartDetector(version=model_version)
        
        result = await part_detector.detect_parts(
            image.file,
            confidence_threshold=confidence_threshold
        )
        
        logger.info(f"Successfully identified parts using model version: {model_version or 'default'}")
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result,
                "message": "Parts identified successfully"
            }
        )
        
    except Exception as e:
        logger.error(f"Error identifying part: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@router.get("/models", response_model=GetModelsResponse)
async def get_models():
    """Get information about available AI models and their versions.""" 
    default_detector = PartDetector()
    model_info = default_detector.get_model_info()

    available_versions = { "default": settings.MODEL_PATH }
    if settings.MODEL_VERSIONS:
        available_versions.update(settings.MODEL_VERSIONS)

    return {
        "default_model": "default",
        "models": {
            "part_detection": {
                "type": model_info.get("model_type"),
                "framework": model_info.get("framework"),
                "input_size": model_info.get("input_size"),
                "available_versions": available_versions
            }
        }
    }
