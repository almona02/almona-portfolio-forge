"""
Scout Intelligence API - Human-Augmented Data Collection

Receives intelligence from:
- Browser extension (Maalem Scout)
- Telegram bot
- Mobile app (crowdsourced reports)
- Image uploads (OCR processing)
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import logging

from services.scout_intelligence import ScoutIntelligenceService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ydt/scout-intelligence", tags=["Scout Intelligence"])


class ScoutReportRequest(BaseModel):
    """Report from human scout (browser extension/Telegram bot)"""
    text: str
    source_name: str  # "Facebook Group: سوق الألومنيوم"
    source_url: Optional[str] = None
    post_date: Optional[str] = None
    author: Optional[str] = None  # Anonymized
    scout_id: Optional[str] = None  # Internal scout identifier
    metadata: Optional[Dict[str, Any]] = None


class PriceReportRequest(BaseModel):
    """Crowdsourced price report from workshop owner"""
    material: str  # "aluminum", "upvc", "steel", etc.
    price: float
    unit: str  # "EGP/ton", "EGP/kg", etc.
    location: str  # "Giza", "Cairo", "Alexandria"
    supplier_name: Optional[str] = None
    notes: Optional[str] = None
    workshop_id: Optional[str] = None


class ScoutReportResponse(BaseModel):
    """Response to scout report"""
    status: str
    message: str
    insight_id: str
    analysis: Optional[Dict[str, Any]] = None
    timestamp: str


class PriceReportResponse(BaseModel):
    """Response to price report"""
    status: str
    message: str
    report_id: str
    consensus_score: float  # 0-1, how well it matches other reports
    verified: bool
    timestamp: str


@router.post("/report", response_model=ScoutReportResponse)
async def submit_scout_report(request: ScoutReportRequest):
    """
    Submit intelligence report from human scout
    
    Used by:
    - Browser extension (right-click -> "Send to YDT")
    - Telegram bot
    - Manual entry tool
    """
    try:
        service = ScoutIntelligenceService()
        
        # Process the scout report
        result = await service.process_scout_report(
            text=request.text,
            source_name=request.source_name,
            source_url=request.source_url,
            post_date=request.post_date,
            author=request.author,
            scout_id=request.scout_id,
            metadata=request.metadata or {}
        )
        
        return ScoutReportResponse(
            status="success",
            message="شكراً للمساعدة! (Thank you for the report!)",
            insight_id=result["insight_id"],
            analysis=result.get("analysis"),
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error processing scout report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing report: {str(e)}")


@router.post("/report-price", response_model=PriceReportResponse)
async def submit_price_report(request: PriceReportRequest):
    """
    Submit crowdsourced price report (Waze model)
    
    Workshop owners report prices to unlock premium features
    """
    try:
        service = ScoutIntelligenceService()
        
        # Process price report with consensus verification
        result = await service.process_price_report(
            material=request.material,
            price=request.price,
            unit=request.unit,
            location=request.location,
            supplier_name=request.supplier_name,
            notes=request.notes,
            workshop_id=request.workshop_id
        )
        
        return PriceReportResponse(
            status="success",
            message="شكراً على التقرير! (Thank you for the report!)",
            report_id=result["report_id"],
            consensus_score=result["consensus_score"],
            verified=result["verified"],
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error processing price report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing price report: {str(e)}")


@router.post("/upload-image")
async def upload_price_list_image(
    file: UploadFile = File(...),
    source_name: str = Form(...),
    supplier_name: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    scout_id: Optional[str] = Form(None)
):
    """
    Upload image of price list for OCR processing
    
    Accepts images of:
    - Handwritten price lists
    - Printed supplier catalogs
    - Screenshots from Facebook/Telegram
    """
    try:
        service = ScoutIntelligenceService()
        
        # Read image file
        image_data = await file.read()
        
        # Process with OCR
        result = await service.process_price_list_image(
            image_data=image_data,
            filename=file.filename,
            source_name=source_name,
            supplier_name=supplier_name,
            location=location,
            scout_id=scout_id
        )
        
        return {
            "status": "success",
            "message": "تم معالجة الصورة بنجاح (Image processed successfully)",
            "insight_id": result["insight_id"],
            "extracted_data": result.get("extracted_data"),
            "confidence": result.get("confidence", 0.0),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error processing image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@router.get("/street-prices")
async def get_street_prices(
    material: Optional[str] = None,
    location: Optional[str] = None,
    days: int = 7
):
    """
    Get verified street prices from crowdsourced reports
    
    Returns consensus-verified prices for materials
    """
    try:
        service = ScoutIntelligenceService()
        
        prices = await service.get_verified_street_prices(
            material=material,
            location=location,
            days=days
        )
        
        return {
            "status": "success",
            "prices": prices,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching street prices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching prices: {str(e)}")


@router.get("/scout-stats")
async def get_scout_statistics(scout_id: Optional[str] = None):
    """
    Get statistics for scout contributions
    
    Used for gamification and rewards
    """
    try:
        service = ScoutIntelligenceService()
        
        stats = await service.get_scout_statistics(scout_id=scout_id)
        
        return {
            "status": "success",
            "stats": stats,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching scout stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")

