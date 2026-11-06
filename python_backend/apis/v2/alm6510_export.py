"""
ALM 6510 MDB Export API
=======================

Produces an INTERMEDIATE JSON representation of the Table1 rows expected by
Yilmaz ALM 6510 machine software. This is not a binary MDB file and must not
be presented as controller-ready: it is a debug/interchange format until a
real MDB encoder plus controller-import acceptance exist.

All-or-nothing: any malformed or unconvertible cut rejects the entire export.
A partial cut list must never reach the shop floor as if it were complete.
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import logging
import json
from pathlib import Path

router = APIRouter(prefix="/alm6510", tags=["alm6510-export"])
logger = logging.getLogger(__name__)

#: Format marker for the intermediate (non-controller-ready) payload.
INTERMEDIATE_FORMAT = "mdb-json-intermediate"


# ============================================================================
# Pydantic Models
# ============================================================================

class ALM6510CutRecord(BaseModel):
    """Single cut record for ALM 6510 MDB format"""
    PROGRAM_NO: int = 1
    CUSTOMER_CODE: str = ""
    CUSTOMER_NAME: str = ""
    STOCK_CODE: str = ""
    STOCK_NAME: str = ""
    ORDER_NO: str = ""
    EXPLANATION1: str = ""
    EXPLANATION2: str = ""
    LENGTH: str = "0"  # mm as string (multiplied by 10)
    INCH_MM: int = 0  # 0 = mm, 1 = inch
    FRAME_X: str = "5000"
    FRAME_Y: str = "5000"
    POSE_NO: int = 1
    TROLLEY: int = 1
    UNIT: int = 1
    LEFT_ANGLE: int = 900  # 90° (angle * 10)
    RIGHT_ANGLE: int = 900  # 90° (angle * 10)
    SIDE: int = 4  # 1=left, 2=top, 3=right, 4=bottom
    CUTTED: int = 1
    HEIGHT: int = 0  # mm
    SELLER: Optional[str] = None
    IMAGE: str = ""
    PAIR: int = 1
    BAR_NO: int = 1
    TOTAL_SIZE: str = "0"
    PICE_NO: int = 1
    GRUP: Optional[str] = None
    WIDTH: int = 0  # mm
    TYPE: str = "A"  # "A" = Aluminum, "P" = PVC
    COLOR_CODE: str = "1"
    STIL_LENGTH: str = "0"
    FRAME_NO: int = 1
    REMAINING_LENGTH: Optional[str] = None
    CODE: Optional[str] = None  # Operation codes (P1-P7 format)
    ROBOT_Y: int = 0  # mm
    ROBOT_Z: int = 0  # mm
    ROBOT_VERTICAL: int = 0


class ALM6510ExportRequest(BaseModel):
    """Request to generate ALM 6510 MDB file"""
    orderNumber: str = Field(..., description="Order number")
    customerCode: Optional[str] = Field(None, description="Customer code")
    customerName: Optional[str] = Field(None, description="Customer name")
    cuttingPlan: List[Dict[str, Any]] = Field(..., description="Cutting plan data")
    profiles: List[Dict[str, Any]] = Field(default_factory=list, description="Profile information")
    project: Optional[Dict[str, Any]] = Field(None, description="Project metadata")


# ============================================================================
# MDB File Generation
# ============================================================================

def convert_cut_to_alm6510_record(
    cut: Dict[str, Any],
    config: Dict[str, Any],
    bar_index: int = 1,
    cut_index: int = 1
) -> ALM6510CutRecord:
    """Convert a cut from optimization result to ALM 6510 MDB record"""

    # Validate and extract length
    length_mm = cut.get("length", 0)
    if not isinstance(length_mm, (int, float)):
        try:
            length_mm = float(length_mm)
        except (ValueError, TypeError):
            length_mm = 0

    if length_mm <= 0:
        raise ValueError(f"Invalid cut length: {length_mm}. Length must be greater than 0.")

    # Validate and extract angle
    angle_deg = cut.get("angle", 90)
    if not isinstance(angle_deg, (int, float)):
        try:
            angle_deg = float(angle_deg)
        except (ValueError, TypeError):
            angle_deg = 90

    # ALM 6510 format: length * 10, angle * 10
    length_formatted = str(int(round(length_mm * 10)))
    angle_formatted = int(round(angle_deg * 10))

    # Get profile info with safe defaults
    profile = cut.get("profile", {})
    if not isinstance(profile, dict):
        profile = {}

    profile_name = profile.get("name", "") or config.get("STOCK_NAME", "") or "UNKNOWN"
    profile_code = profile.get("code", "") or config.get("STOCK_CODE", "") or ""
    material = profile.get("material", "aluminum") or "aluminum"
    material_type = "A" if material.lower() in ("aluminum", "aluminium", "al") else "P"

    # Safe extraction of numeric values
    def safe_int(value, default=0):
        if isinstance(value, (int, float)):
            return int(value)
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return default

    def safe_str(value, default=""):
        if value is None:
            return default
        return str(value) if value else default

    return ALM6510CutRecord(
        PROGRAM_NO=config.get("PROGRAM_NO", 1),
        CUSTOMER_CODE=safe_str(config.get("CUSTOMER_CODE", "")),
        CUSTOMER_NAME=safe_str(config.get("CUSTOMER_NAME", "")),
        STOCK_CODE=safe_str(profile_code),
        STOCK_NAME=safe_str(profile_name),
        ORDER_NO=safe_str(config.get("ORDER_NO", "")),
        EXPLANATION1=safe_str(cut.get("componentId", "")),
        EXPLANATION2=safe_str(cut.get("componentType", "")),
        LENGTH=length_formatted,
        INCH_MM=0,
        FRAME_X="5000",
        FRAME_Y="5000",
        POSE_NO=safe_int(config.get("POSE_NO", 1)),
        TROLLEY=bar_index,
        UNIT=1,
        LEFT_ANGLE=angle_formatted,
        RIGHT_ANGLE=angle_formatted,
        SIDE=4,
        CUTTED=1,
        HEIGHT=safe_int(cut.get("height", 0)),
        SELLER=None,
        IMAGE="",
        PAIR=1,
        BAR_NO=bar_index,
        TOTAL_SIZE=length_formatted,
        PICE_NO=cut_index,
        GRUP=None,
        WIDTH=safe_int(cut.get("width", 0)),
        TYPE=material_type,
        COLOR_CODE="1",
        STIL_LENGTH=length_formatted,
        FRAME_NO=1,
        REMAINING_LENGTH=None,
        CODE=cut.get("operationCode") if cut.get("operationCode") else None,
        ROBOT_Y=safe_int(cut.get("robotY", 0)),
        ROBOT_Z=safe_int(cut.get("robotZ", 0)),
        ROBOT_VERTICAL=safe_int(cut.get("robotVertical", 0)),
    )


def generate_mdb_json_structure(records: List[ALM6510CutRecord]) -> Dict[str, Any]:
    """Generate JSON structure representing MDB table (intermediate format)."""
    return {
        "format": INTERMEDIATE_FORMAT,
        "controllerReady": False,
        "warning": (
            "Intermediate JSON, not a binary MDB file. Verify in the Yilmaz "
            "controller software before production use."
        ),
        "tableName": "Table1",
        "columns": [
            "PROGRAM_NO", "CUSTOMER_CODE", "CUSTOMER_NAME", "STOCK_CODE", "STOCK_NAME",
            "ORDER_NO", "EXPLANATION1", "EXPLANATION2", "LENGTH", "INCH_MM",
            "FRAME_X", "FRAME_Y", "POSE_NO", "TROLLEY", "UNIT",
            "LEFT_ANGLE", "RIGHT_ANGLE", "SIDE", "CUTTED", "HEIGHT",
            "SELLER", "IMAGE", "PAIR", "BAR_NO", "TOTAL_SIZE",
            "PICE_NO", "GRUP", "WIDTH", "TYPE", "COLOR_CODE",
            "STIL_LENGTH", "FRAME_NO", "REMAINING_LENGTH", "CODE",
            "ROBOT_Y", "ROBOT_Z", "ROBOT_VERTICAL"
        ],
        "rows": [record.dict() for record in records]
    }


# ============================================================================
# API Endpoints
# ============================================================================

def build_alm6510_records(request: ALM6510ExportRequest) -> List[ALM6510CutRecord]:
    """Validate a cutting plan and convert every cut, all-or-nothing.

    Shared by the intermediate-JSON and binary-MDB endpoints so both formats
    always carry identical records. Raises HTTPException on any failure.
    """
    # Validate request
    if not request.cuttingPlan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cutting plan is empty. Please generate optimization first."
        )

    if len(request.cuttingPlan) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No cuts found in cutting plan."
        )

    # Convert cutting plan to ALM 6510 records
    records: List[ALM6510CutRecord] = []
    bar_index = 1

    # Group cuts by bar/stock. Malformed entries reject the export —
    # they must never be silently dropped from a production file.
    bars: Dict[int, List[Dict[str, Any]]] = {}
    malformed_entries: List[str] = []
    for position, cut in enumerate(request.cuttingPlan, 1):
        if not isinstance(cut, dict):
            malformed_entries.append(f"entry {position}: not a cut object")
            continue

        bar_no = cut.get("barIndex", bar_index)
        if not isinstance(bar_no, int):
            bar_no = bar_index

        if bar_no not in bars:
            bars[bar_no] = []
        bars[bar_no].append(cut)

    if malformed_entries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Export rejected: "
                f"{len(malformed_entries)} malformed cutting-plan "
                f"entr{'y' if len(malformed_entries) == 1 else 'ies'} "
                "(all-or-nothing, no partial file was produced): "
                + "; ".join(malformed_entries)
            ),
        )

    if not bars:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid cuts found in cutting plan."
        )

    # Generate records for each bar. All-or-nothing: collect every
    # conversion failure and reject the whole export when any cut fails.
    failures: List[str] = []
    for bar_no, cuts in sorted(bars.items()):
        for cut_idx, cut in enumerate(cuts, 1):
            try:
                config = {
                    "ORDER_NO": request.orderNumber or "",
                    "CUSTOMER_CODE": request.customerCode or "",
                    "CUSTOMER_NAME": request.customerName or "",
                    "PROGRAM_NO": 1,
                    "POSE_NO": request.project.get("positionNumber", 1) if request.project else 1,
                }

                record = convert_cut_to_alm6510_record(
                    cut,
                    config,
                    bar_index=bar_no,
                    cut_index=cut_idx
                )
                records.append(record)
            except Exception as cut_error:
                logger.error(f"Error converting cut {cut_idx} in bar {bar_no}: {cut_error}", exc_info=True)
                component = cut.get("componentId", "?") if isinstance(cut, dict) else "?"
                failures.append(f"bar {bar_no} cut {cut_idx} (component {component}): {cut_error}")

    if failures:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Export rejected: "
                f"{len(failures)} of {len(request.cuttingPlan)} cuts failed "
                "conversion (all-or-nothing, no partial file was produced): "
                + "; ".join(failures)
            ),
        )

    if not records:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to convert any cuts to ALM 6510 format. Please check your cutting plan data."
        )

    return records


@router.post("/generate-mdb", response_class=Response)
async def generate_alm6510_mdb(request: ALM6510ExportRequest):
    """
    Generate the ALM 6510 intermediate JSON payload from a cutting plan.

    All-or-nothing: any malformed or unconvertible cut rejects the whole
    export with HTTP 400. The response is intermediate JSON, not a binary
    MDB file (see `format` / `controllerReady` fields and the
    `X-Export-Format` header).
    """
    try:
        logger.info(f"Generating ALM 6510 MDB for order {request.orderNumber}")

        records = build_alm6510_records(request)

        # Generate the intermediate JSON structure. This is intentionally not
        # a binary MDB file; see /generate-mdb-file for the Jet binary.
        mdb_structure = generate_mdb_json_structure(records)
        json_data = json.dumps(mdb_structure, indent=2, ensure_ascii=False)

        # Create filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"ALM6510_{request.orderNumber}_{timestamp}.mdb.json"

        logger.info(f"Generated {len(records)} records for ALM 6510 MDB")

        return Response(
            content=json_data,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-Export-Format": INTERMEDIATE_FORMAT,
                "X-MDB-Records": str(len(records)),
                "X-MDB-Table": "Table1"
            }
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error generating ALM 6510 MDB: {e}", exc_info=True)
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Full traceback: {error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate MDB file: {str(e)}"
        )


@router.post("/generate-mdb-file", response_class=Response)
async def generate_alm6510_mdb_file(request: ALM6510ExportRequest):
    """
    Generate a real binary Jet (.mdb) file with the Table1 rows.

    Same records and all-or-nothing contract as /generate-mdb. Requires the
    workshop host setup (pyodbc + Access ODBC driver + template); when any
    piece is missing the endpoint answers HTTP 501 with operator guidance
    instead of a fake file. A produced file is read-back verified but still
    needs the controller acceptance checklist before production use.
    """
    try:
        logger.info(f"Generating binary ALM 6510 MDB for order {request.orderNumber}")

        records = build_alm6510_records(request)

        from services.alm6510_mdb_writer import MdbUnavailableError, write_mdb

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"ALM6510_{request.orderNumber}_{timestamp}.mdb"

        import tempfile

        with tempfile.TemporaryDirectory(prefix="alm6510_") as tmpdir:
            dest = Path(tmpdir) / filename
            try:
                write_mdb(
                    [record.dict() for record in records],
                    dest,
                )
            except MdbUnavailableError as unavailable:
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail=f"Binary MDB export unavailable: {unavailable.guidance}",
                )
            payload = dest.read_bytes()

        logger.info(f"Generated binary MDB ({len(payload)} bytes, {len(records)} records)")

        return Response(
            content=payload,
            media_type="application/x-msaccess",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-Export-Format": "mdb-binary-jet",
                "X-MDB-Records": str(len(records)),
                "X-MDB-Table": "Table1",
                "X-Controller-Acceptance": "required",
            },
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error generating binary ALM 6510 MDB: {e}", exc_info=True)
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Full traceback: {error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate binary MDB file: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "alm6510-export"}
