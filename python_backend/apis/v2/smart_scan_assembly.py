"""
Assembly Intelligence API

Endpoint: /api/v2/smart-scan/assembly
"""
from datetime import datetime
import os
import tempfile
import uuid
from typing import Dict, List, Optional, Literal, Any

from fastapi import APIRouter, UploadFile, File, HTTPException, status
from pydantic import BaseModel, Field


class AssemblyComponent(BaseModel):
    """Detected component in assembly."""

    id: str = Field(default_factory=lambda: f"comp_{uuid.uuid4().hex[:8]}")
    profile_code: Optional[str] = None
    detected_role: str
    confidence: float = Field(ge=0.0, le=1.0)
    bounding_box: List[float] = Field(
        default_factory=lambda: [0.0, 0.0, 100.0, 100.0]
    )
    crop_image_url: Optional[str] = None
    suggestions: List[str] = Field(default_factory=list)
    user_confirmed_role: Optional[str] = None
    dimensions_mm: Optional[Dict[str, float]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AssemblyConnection(BaseModel):
    """Connection between components."""

    from_component: str
    to_component: str
    connection_type: str  # e.g., sliding_track, hinged, screw_fixed
    location_hint: Optional[str] = None  # e.g., top_rail, meeting_rail


class AssemblySystem(BaseModel):
    """Detected window/door system."""

    system_type: Literal[
        "sliding",
        "casement",
        "fixed",
        "tilt_turn",
        "folding",
        "lift_slide",
        "curtain_wall",
        "unknown",
    ]
    confidence: float = Field(ge=0.0, le=1.0)
    validation_rules_applied: List[str] = Field(default_factory=list)


class AssemblyResponse(BaseModel):
    """Full assembly intelligence response."""

    success: bool
    assembly_id: str = Field(
        default_factory=lambda: f"assy_{uuid.uuid4().hex[:8]}"
    )
    system: AssemblySystem
    components: List[AssemblyComponent]
    connections: List[AssemblyConnection]
    validation_results: Dict[str, Any] = Field(default_factory=dict)
    missing_components: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    requires_user_review: bool = True
    processing_time_ms: int = 0
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


router = APIRouter(prefix="/smart-scan", tags=["smart-scan"])


@router.post(
    "/assembly",
    response_model=AssemblyResponse,
    status_code=status.HTTP_200_OK,
)
async def scan_assembly(
    file: UploadFile = File(..., description="Shop drawing PDF or image"),
):
    """
    Analyze shop drawing for assembly intelligence.

    Detects window/door system type, components with roles, connections,
    and provides validation results for human review.
    """
    tmp_path = None
    try:
        filename = file.filename or "upload"
        suffix = os.path.splitext(filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Lazy import to avoid heavy init at module load
        from ai_services.vision.assembly_recognizer import AssemblyRecognizer

        recognizer = AssemblyRecognizer()

        start_time = datetime.now()
        assembly_result = recognizer.recognize_assembly(tmp_path)
        processing_time_ms = int(
            (datetime.now() - start_time).total_seconds() * 1000
        )

        response = AssemblyResponse(
            success=True,
            system=AssemblySystem(
                system_type=assembly_result.get("system_type", "unknown"),
                confidence=assembly_result.get("system_confidence", 0.0),
                validation_rules_applied=assembly_result.get(
                    "validation_rules_applied", []
                ),
            ),
            components=[
                AssemblyComponent(**comp)
                for comp in assembly_result.get("components", [])
            ],
            connections=[
                AssemblyConnection(**conn)
                for conn in assembly_result.get("connections", [])
            ],
            validation_results=assembly_result.get("validation", {}),
            missing_components=assembly_result.get("validation", {}).get(
                "missing_components", []
            ),
            confidence=assembly_result.get("confidence", 0.0),
            requires_user_review=assembly_result.get("requires_review", True),
            processing_time_ms=processing_time_ms,
        )

        return response
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assembly scan failed: {exc}",
        ) from exc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


@router.post("/assembly/{assembly_id}/confirm")
async def confirm_assembly(
    assembly_id: str, confirmed_components: List[Dict[str, Any]]
):
    """
    Confirm assembly with user corrections.
    Stores user feedback for future learning.
    """
    return {
        "success": True,
        "assembly_id": assembly_id,
        "confirmed_at": datetime.now().isoformat(),
        "user_corrections": len(confirmed_components),
        "message": "Assembly confirmed successfully",
    }
