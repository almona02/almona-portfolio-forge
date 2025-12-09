"""
Minimal CAD profile import endpoint.

DXF/DWG path is enabled with certified CAD accuracy. Other source types are
stubbed for future expansion to PDF and image-based ingestion.
"""

from typing import Literal

from fastapi import APIRouter, File, HTTPException, UploadFile

from core.cad_ingest import CadProfileIngestor

router = APIRouter(prefix="/profile-import", tags=["Profile Import"])


@router.post("/ingest")
async def ingest_profile(
    file: UploadFile = File(...),
    source_type: Literal["dxf", "dwg", "pdf", "image"] = "dxf",
    material_type: Literal["aluminium", "upvc"] = "aluminium",
):
    """
    Unified profile import endpoint. DXF/DWG is implemented; PDF/image are stubs.
    """

    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    if source_type in ("dxf", "dwg"):
        ingestor = CadProfileIngestor(material_type=material_type)
        result = ingestor.process_dxf(content)

        if result.get("status") != "success":
            raise HTTPException(status_code=400, detail=result.get("error", "CAD ingestion failed"))

        result["egyptian_context"] = {
            "import_method": "cad_direct",
            "suitable_for_nafeza": True,
        }
        return result

    if source_type == "pdf":
        return {
            "status": "pending",
            "message": "PDF import not yet implemented",
            "accuracy_score": 0.0,
            "confidence": "not_implemented",
        }

    if source_type == "image":
        return {
            "status": "pending",
            "message": "Use SmartScan for image ingestion",
            "accuracy_score": 0.0,
            "confidence": "use_smartscan_endpoint",
        }

    raise HTTPException(status_code=400, detail=f"Unsupported source type: {source_type}")
