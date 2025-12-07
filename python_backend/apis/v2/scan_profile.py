from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    Request,
    status,
)
from pydantic import BaseModel, Field, validator

from ai_services.scanning import ProfileScanner
from ai_services.scanning.storage import upload_scan_artifacts
from ai_services.scanning.scale_detector import ScaleDetectorService
from apis.v2.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scan", tags=["SmartScan"])


class ReferenceLine(BaseModel):
    start: List[int] = Field(..., description="Start point [x, y]")
    end: List[int] = Field(..., description="End point [x, y]")

    @validator("start", "end")
    def _validate_coords(cls, v):
        if len(v) != 2:
            raise ValueError("Coordinates must be [x, y]")
        if not all(isinstance(i, int) for i in v):
            raise ValueError("Coordinates must be integers")
        return v


class ScaleDetectionResult(BaseModel):
    detected: bool
    scale_mm_per_px: Optional[float] = Field(
        None, description="Detected scale in mm/px", ge=0.001, le=1.0
    )
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    reference_line: Optional[ReferenceLine] = None
    detected_label: Optional[str] = None
    debug_info: Optional[Dict[str, Any]] = None
    suggestion_text: Optional[str] = None

    class Config:
        json_encoders = {
            ReferenceLine: lambda v: [v.start, v.end] if v else None
        }


def _svg_from_path(path: str, width: int, height: int) -> str:
    """Wrap a raw SVG path in a minimal SVG document."""
    safe_width = max(width, 1)
    safe_height = max(height, 1)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {safe_width} {safe_height}" '
        f'width="{safe_width}" height="{safe_height}">'
        f'<path d="{path}" fill="black" /></svg>'
    )


async def get_supabase_safe(request: Request):
    """Skip Supabase in dev/test to avoid failures when pool is unavailable."""
    return None


@router.post(
    "/profile",
    status_code=status.HTTP_200_OK,
    summary="Scan a catalog profile drawing into SVG + dimensions",
)
async def scan_profile(
    file: UploadFile = File(...),
    scale_factor: Optional[float] = Form(
        None, description="Manual scale factor (mm/px)", gt=0, le=1.0
    ),
    auto_detect_scale: bool = Form(
        False, description="Attempt automatic scale detection (AI)"
    ),
    user: Dict[str, Any] = Depends(get_current_user),
    supabase=Depends(get_supabase_safe),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Please upload an image.",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file upload.",
        )

    scale_service = ScaleDetectorService()

    detected_scale_info: Optional[ScaleDetectionResult] = None
    applied_scale = scale_factor

    if auto_detect_scale:
        try:
            det = scale_service.detect_scale(image_bytes)
            ref_line = None
            if det.get("reference_line") and len(det["reference_line"]) == 2:
                ref_line = ReferenceLine(
                    start=det["reference_line"][0],
                    end=det["reference_line"][1],
                )
            detected_scale_info = ScaleDetectionResult(
                detected=det.get("detected", False),
                scale_mm_per_px=det.get("scale_mm_per_px"),
                confidence=det.get("confidence"),
                reference_line=ref_line,
                detected_label=det.get("detected_label"),
                debug_info=det.get("debug_info"),
            )
            if det.get("detected") and det.get("confidence", 0) > 0.8:
                if applied_scale is None:
                    applied_scale = det.get("scale_mm_per_px")
            # Suggestion text for UI
            if detected_scale_info and detected_scale_info.detected:
                conf = detected_scale_info.confidence or 0
                val = detected_scale_info.scale_mm_per_px
                if val is not None:
                    if conf > 0.8:
                        detected_scale_info.suggestion_text = (
                            f"High confidence: {val:.4f} mm/px detected "
                            f"from '{det.get('detected_label')}'"
                        )
                    elif conf > 0.6:
                        detected_scale_info.suggestion_text = (
                            "Moderate confidence: "
                            f"{val:.4f} mm/px detected. Please verify."
                        )
                    else:
                        detected_scale_info.suggestion_text = (
                            "Low confidence: "
                            f"{val:.4f} mm/px detected. Manual check needed."
                        )
        except Exception as exc:  # pragma: no cover
            logger.warning("Scale detection failed: %s", exc)
            detected_scale_info = ScaleDetectionResult(
                detected=False,
                scale_mm_per_px=None,
                confidence=None,
                debug_info={"error": str(exc)},
            )

    # If auto-detected scale is available, use it even when confidence is
    # moderate/low so the client can decide whether to accept or override.
    # This avoids hard failure while still exposing confidence for the
    # "AI suggests, human verifies" flow.
    if (
        applied_scale is None
        and detected_scale_info
        and detected_scale_info.scale_mm_per_px is not None
    ):
        applied_scale = detected_scale_info.scale_mm_per_px

    if applied_scale is None:
        applied_scale = 0.1  # safe fallback to avoid hard failure
        if detected_scale_info:
            dbg = detected_scale_info.debug_info or {}
            dbg["fallback_scale_applied"] = True
            detected_scale_info.debug_info = dbg
            if not detected_scale_info.suggestion_text:
                detected_scale_info.suggestion_text = (
                    "Fallback scale applied: 0.1 mm/px; please verify."
                )
        else:
            detected_scale_info = ScaleDetectionResult(
                detected=False,
                scale_mm_per_px=applied_scale,
                confidence=0.0,
                suggestion_text=(
                    "Fallback scale applied: 0.1 mm/px; please verify."
                ),
                debug_info={"fallback_scale_applied": True},
            )

    try:
        scan_result = ProfileScanner.scan(
            image_bytes=image_bytes,
            scale_mm_per_px=applied_scale,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("SmartScan failed for user %s", user.get("sub"))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scan failed: {exc}",
        ) from exc

    svg_markup = _svg_from_path(
        scan_result.svg_path, scan_result.width_px, scan_result.height_px
    )

    storage_urls = {"photo_url": None, "svg_url": None}
    if supabase is not None:
        try:
            async with supabase:
                storage_urls = upload_scan_artifacts(
                    client=supabase,
                    bucket="profile-thumbnails",
                    image_bytes=image_bytes,
                    image_content_type=file.content_type or "image/png",
                    svg_text=svg_markup,
                    prefix="scans",
                )
        except Exception as exc:
            # Storage failures are non-fatal in this dev/test path.
            logger.warning("Storage upload failed: %s", exc)

    x, y, w, h = scan_result.bbox
    return {
        "svgPath": scan_result.svg_path,
        "dimensions": {
            "width_px": scan_result.width_px,
            "height_px": scan_result.height_px,
            "aspect_ratio": scan_result.aspect_ratio,
            "width_mm": scan_result.width_mm,
            "height_mm": scan_result.height_mm,
            "scale_used": applied_scale,
        },
        "bbox": {"x": x, "y": y, "width": w, "height": h},
        "quality": scan_result.quality,
        "vectorizer": scan_result.vectorizer,
        "scaleDetection": (
            detected_scale_info.dict() if detected_scale_info else None
        ),
        "storage": storage_urls,
    }
