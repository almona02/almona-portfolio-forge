from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from typing import Optional
import logging

from ai_services.part_detection.inference import PartDetector
from core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Almona AI Services API",
    description="AI-powered spare parts identification and processing services",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize services
part_detector = PartDetector()

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Almona AI Services API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "almona-ai-api",
        "timestamp": "2024-01-01T00:00:00Z"
    }

@app.post("/api/v1/identify-part")
async def identify_part(
    image: UploadFile = File(...),
    confidence_threshold: float = 0.7
):
    """
    Identify spare parts from uploaded image using YOLOv8 model
    
    Args:
        image: Uploaded image file
        confidence_threshold: Minimum confidence threshold (0.0-1.0)
    
    Returns:
        JSON response with identified part information
    """
    try:
        # Validate file type
        if not image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload an image."
            )
        
        # Process image and detect parts
        result = await part_detector.detect_parts(
            image.file,
            confidence_threshold=confidence_threshold
        )
        
        logger.info(f"Successfully identified part: {result.get('part_id', 'unknown')}")
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": result,
                "message": "Part identified successfully"
            }
        )
        
    except Exception as e:
        logger.error(f"Error identifying part: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )

@app.post("/api/v1/preprocess-image")
async def preprocess_image(
    image: UploadFile = File(...),
    operation: str = "enhance"
):
    """
    Preprocess image for better AI model performance
    
    Args:
        image: Uploaded image file
        operation: Preprocessing operation (enhance, normalize, resize)
    
    Returns:
        Processed image data
    """
    try:
        from ai_services.preprocessing.image_processor import ImageProcessor
        
        processor = ImageProcessor()
        
        processed_image = await processor.preprocess(
            image.file,
            operation=operation
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "data": {
                    "processed": True,
                    "operation": operation,
                    "dimensions": processed_image.get("dimensions"),
                    "size": processed_image.get("size")
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error preprocessing image: {str(e)}"
        )

@app.get("/api/v1/models")
async def get_models():
    """Get information about available AI models"""
    return {
        "models": [
            {
                "name": "part_detection",
                "type": "object_detection",
                "framework": "YOLOv8",
                "classes": ["spare_parts", "machinery_components"],
                "version": "1.0.0"
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
