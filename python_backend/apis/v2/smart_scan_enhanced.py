import logging
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from ai_services.vision.enhanced_scanner import EnhancedProfileScanner
from ai_services.vision.format_converter import FormatConverter, MAX_FILE_SIZE

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/smart-scan", tags=["SmartScan"])
enhanced_scanner = EnhancedProfileScanner()


@router.post("/enhanced")
async def enhanced_smart_scan(
    file: UploadFile = File(...),
    known_width_mm: Optional[float] = Form(None),
    enable_ocr: bool = Form(True),
    require_validation: bool = Form(True),  # kept for symmetry with base
):
    """
    Enhanced SmartScan endpoint: applies scale detector override and placeholder OCR hook.
    """
    try:
        # Validate format and size
        can_convert, error = FormatConverter.can_convert(file.filename or "")
        if not can_convert:
            raise HTTPException(status_code=400, detail=error)

        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        FormatConverter.validate_file_size(content, file.filename or "upload")

        # Convert to image bytes (supports PDF/DXF/images). Take first page/image.
        images = FormatConverter.convert_to_images(
            content, file.filename or "upload", max_images=1
        )
        if not images:
            raise HTTPException(status_code=400, detail="No images extracted")

        result = enhanced_scanner.scan_with_enhancements(
            image_bytes=images[0],
            known_width_mm=known_width_mm,
            enable_ocr=enable_ocr,
            filename=file.filename or "upload",
        )

        payload = {
            "success": True,
            "filename": file.filename,
            "file_size_bytes": len(content),
            "data": result,
            "metadata": {
                "enhancements_applied": [
                    "scale_detector" if enhanced_scanner.scale_detector else "scale_detector_unavailable",
                    "ocr_extraction" if enable_ocr else "ocr_disabled",
                ],
                "enable_ocr": enable_ocr,
            },
        }
        if require_validation and result.get("quality", {}).get("requires_verification"):
            payload["warnings"] = result.get("quality", {}).get("validation_errors", [])

        return JSONResponse(content=payload, status_code=200)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("Enhanced scan failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Enhanced scan failed: {exc}")

