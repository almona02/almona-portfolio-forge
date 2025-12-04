"""
Machine Management API for CNC Integration
==========================================

Provides CRUD operations for CNC machine profiles,
status updates, and G-code generation endpoints.

Features:
- Machine profile management
- Real-time status updates (for Edge Agent)
- G-code generation per machine
- Job queue management
- Security logging integration
"""

from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import logging

from core.supabase_client import supabase_client
from core.security_logger import SecurityLogger, SecurityEvent

router = APIRouter(prefix="/machines", tags=["machines"])
logger = logging.getLogger(__name__)
security_logger = SecurityLogger()


# ============================================================================
# Pydantic Models
# ============================================================================

class MachineBrand(str, Enum):
    """Supported CNC machine brands."""
    YILMAZ = "yilmaz"
    ELUMATEC = "elumatec"
    FOMM = "fomm"
    EMMEGI = "emmegi"
    BIESSE = "biesse"
    CUSTOM = "custom"


class MachineStatus(str, Enum):
    """Machine operational status."""
    IDLE = "idle"
    RUNNING = "running"
    MAINTENANCE = "maintenance"
    ERROR = "error"
    OFFLINE = "offline"


class PostProcessorConfig(BaseModel):
    """G-code post-processor configuration."""
    safety_height: float = Field(
        50.0, ge=0, description="Safety retract height in mm"
    )
    work_offset: str = Field("G54", description="Work coordinate system")
    coolant_on: str = Field("M08", description="Coolant on command")
    coolant_off: str = Field("M09", description="Coolant off command")
    spindle_cw: str = Field("M03", description="Spindle clockwise command")
    spindle_stop: str = Field("M05", description="Spindle stop command")
    program_end: str = Field("M30", description="Program end command")
    tool_change: str = Field("M06", description="Tool change command")
    custom_init: List[str] = Field(
        default_factory=list,
        description="Custom initialization codes"
    )


class SafetyLimits(BaseModel):
    """Machine safety limits configuration."""
    min_x: float = Field(0, description="Minimum X travel")
    min_y: float = Field(0, description="Minimum Y travel")
    min_z: float = Field(
        -300, description="Minimum Z travel (negative is down)"
    )
    max_spindle_temp: float = Field(
        60, description="Max spindle temperature °C"
    )
    max_feed_override: int = Field(150, description="Max feed override %")
    clamp_positions: List[float] = Field(
        default_factory=list, description="Clamp X positions in mm"
    )


class MachineProfileCreate(BaseModel):
    """Schema for creating a new machine profile."""
    name: str = Field(
        ..., min_length=1, max_length=255,
        description="Machine display name"
    )
    description: Optional[str] = Field(
        None, description="Machine description"
    )
    brand: MachineBrand = Field(..., description="Machine brand")
    model: str = Field(
        ..., min_length=1, max_length=255,
        description="Machine model"
    )
    serial_number: Optional[str] = Field(
        None, max_length=100, description="Serial number"
    )
    workshop_id: Optional[str] = Field(
        None, description="Associated workshop UUID"
    )
    location: Optional[str] = Field(
        None, max_length=255, description="Physical location"
    )

    # Technical specifications
    max_x_travel: float = Field(6500.0, ge=0, description="Max X travel in mm")
    max_y_travel: float = Field(1200.0, ge=0, description="Max Y travel in mm")
    max_z_travel: float = Field(300.0, ge=0, description="Max Z travel in mm")
    max_spindle_speed: int = Field(
        18000, ge=0, description="Max spindle RPM"
    )
    max_feed_rate: float = Field(
        15000.0, ge=0, description="Max feed rate mm/min"
    )
    tool_changer_capacity: int = Field(
        10, ge=0, description="Tool magazine capacity"
    )
    controller_type: Optional[str] = Field(
        None, description="Controller type/brand"
    )

    # G-code configuration
    gcode_dialect: str = Field("fanuc", description="G-code dialect")
    post_processor_config: PostProcessorConfig = Field(
        default_factory=PostProcessorConfig,
        description="Post-processor configuration"
    )
    safety_limits: SafetyLimits = Field(
        default_factory=SafetyLimits,
        description="Safety limits"
    )

    # Metadata
    tags: List[str] = Field(
        default_factory=list, description="Tags for filtering"
    )
    notes: Optional[str] = Field(None, description="Additional notes")

    class Config:
        use_enum_values = True


class MachineProfileUpdate(BaseModel):
    """Schema for updating a machine profile."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    model: Optional[str] = Field(None, min_length=1, max_length=255)
    serial_number: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=255)
    
    max_x_travel: Optional[float] = Field(None, ge=0)
    max_y_travel: Optional[float] = Field(None, ge=0)
    max_z_travel: Optional[float] = Field(None, ge=0)
    max_spindle_speed: Optional[int] = Field(None, ge=0)
    max_feed_rate: Optional[float] = Field(None, ge=0)
    tool_changer_capacity: Optional[int] = Field(None, ge=0)
    controller_type: Optional[str] = None

    gcode_dialect: Optional[str] = None
    post_processor_config: Optional[PostProcessorConfig] = None
    safety_limits: Optional[SafetyLimits] = None

    is_active: Optional[bool] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class MachineProfileResponse(BaseModel):
    """Schema for machine profile response."""
    id: str
    created_at: datetime
    updated_at: datetime
    name: str
    description: Optional[str]
    brand: str
    model: str
    serial_number: Optional[str]
    workshop_id: Optional[str]
    owner_id: Optional[str]
    location: Optional[str]
    
    max_x_travel: float
    max_y_travel: float
    max_z_travel: float
    max_spindle_speed: int
    max_feed_rate: float
    tool_changer_capacity: Optional[int]
    controller_type: Optional[str]
    
    gcode_dialect: str
    post_processor_config: Dict[str, Any]
    safety_limits: Dict[str, Any]
    
    calibration_date: Optional[datetime]
    last_maintenance_date: Optional[datetime]
    
    status: str
    is_active: bool
    last_heartbeat: Optional[datetime]
    tags: List[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


class MachineStatusUpdate(BaseModel):
    """Schema for updating machine status (Edge Agent)."""
    status: MachineStatus = Field(..., description="New machine status")
    current_job_id: Optional[str] = Field(
        None, description="Current job UUID"
    )
    current_program: Optional[str] = Field(
        None, description="Current program name"
    )
    error_message: Optional[str] = Field(
        None, description="Error message if status is error"
    )
    telemetry: Optional[Dict[str, Any]] = Field(
        None, description="Telemetry data"
    )

    class Config:
        use_enum_values = True


class GCodeGenerationRequest(BaseModel):
    """Schema for G-code generation request."""
    job_id: Optional[str] = Field(
        None, description="Job UUID to generate G-code for"
    )
    operations: List[Dict[str, Any]] = Field(
        ..., description="Cut operations"
    )
    material_thickness: float = Field(
        10.0, ge=0, description="Material thickness in mm"
    )
    stock_dimensions: List[float] = Field(
        [100, 100, 6000], description="Stock W, H, L in mm"
    )
    tool_config: Dict[str, Any] = Field(
        ..., description="Tool configuration"
    )
    job_name: str = Field(
        "FABRICATOR_JOB", description="Job name for G-code header"
    )


class JobQueueItem(BaseModel):
    """Schema for job queue item."""
    job_id: Optional[str] = None
    gcode_id: Optional[str] = None
    job_name: str
    priority: int = Field(
        5, ge=1, le=10, description="Priority 1=highest, 10=lowest"
    )
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# Helper Functions
# ============================================================================

async def get_current_user_id(authorization: str = None) -> Optional[str]:
    """
    Extract user ID from authorization.
    In production, this would validate the JWT token.
    """
    # TODO: Implement proper JWT validation
    # For now, return None to allow public access with RLS handling auth
    return None


def log_security_event(
    event_type: str,
    user_id: Optional[str],
    details: Dict[str, Any],
    severity: str = "INFO"
):
    """Log security event."""
    try:
        event = SecurityEvent(
            event_type=event_type,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            ip_address=None,
            user_agent=None,
            details=details,
            severity=severity
        )
        security_logger.log_event(event)
    except Exception as e:
        logger.warning(f"Failed to log security event: {e}")


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/", response_model=List[MachineProfileResponse])
async def list_machines(
    workshop_id: Optional[str] = Query(
        None, description="Filter by workshop"
    ),
    brand: Optional[MachineBrand] = Query(
        None, description="Filter by brand"
    ),
    status: Optional[MachineStatus] = Query(
        None, description="Filter by status"
    ),
    is_active: Optional[bool] = Query(
        None, description="Filter by active status"
    ),
    limit: int = Query(50, ge=1, le=100, description="Max results"),
    offset: int = Query(0, ge=0, description="Offset for pagination")
):
    """
    List machine profiles with optional filtering.

    Returns machines the current user has access to based on RLS policies.
    """
    try:
        query = supabase_client.table("machine_profiles").select("*")

        # Apply filters
        if workshop_id:
            query = query.eq("workshop_id", workshop_id)
        if brand:
            query = query.eq("brand", brand.value)
        if status:
            query = query.eq("status", status.value)
        if is_active is not None:
            query = query.eq("is_active", is_active)

        # Pagination and ordering
        query = query.order("created_at", desc=True).range(
            offset, offset + limit - 1
        )

        result = query.execute()

        log_security_event(
            "machine_list_accessed",
            None,
            {
                "count": len(result.data),
                "filters": {"workshop_id": workshop_id, "brand": brand}
            }
        )
        
        return result.data
        
    except Exception as e:
        logger.error(f"Error listing machines: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list machines: {str(e)}"
        )


@router.get("/{machine_id}", response_model=MachineProfileResponse)
async def get_machine(machine_id: str):
    """
    Get a specific machine profile by ID.
    """
    try:
        result = supabase_client.table("machine_profiles")\
            .select("*")\
            .eq("id", machine_id)\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Machine not found"
            )
        
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching machine {machine_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch machine: {str(e)}"
        )


@router.post(
    "/",
    response_model=MachineProfileResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_machine(machine_data: MachineProfileCreate):
    """
    Create a new machine profile.
    """
    try:
        # Prepare data for insertion
        insert_data = machine_data.dict()
        insert_data["post_processor_config"] = (
            machine_data.post_processor_config.dict()
        )
        insert_data["safety_limits"] = machine_data.safety_limits.dict()
        insert_data["status"] = "offline"

        result = supabase_client.table("machine_profiles")\
            .insert(insert_data)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create machine profile"
            )
        
        log_security_event(
            "machine_created",
            None,
            {
                "machine_id": result.data[0]["id"],
                "machine_name": machine_data.name,
                "brand": machine_data.brand
            }
        )
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating machine: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create machine: {str(e)}"
        )


@router.put("/{machine_id}", response_model=MachineProfileResponse)
async def update_machine(machine_id: str, machine_data: MachineProfileUpdate):
    """
    Update a machine profile.
    """
    try:
        # Check if machine exists
        existing = supabase_client.table("machine_profiles")\
            .select("id")\
            .eq("id", machine_id)\
            .single()\
            .execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Machine not found"
            )
        
        # Build update data (exclude None values)
        update_data = {
            k: v for k, v in machine_data.dict().items() if v is not None
        }

        if ("post_processor_config" in update_data and
                update_data["post_processor_config"]):
            ppc = update_data["post_processor_config"]
            update_data["post_processor_config"] = (
                ppc.dict() if hasattr(ppc, 'dict') else ppc
            )

        if ("safety_limits" in update_data and
                update_data["safety_limits"]):
            sl = update_data["safety_limits"]
            update_data["safety_limits"] = (
                sl.dict() if hasattr(sl, 'dict') else sl
            )
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        result = supabase_client.table("machine_profiles")\
            .update(update_data)\
            .eq("id", machine_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update machine"
            )
        
        log_security_event(
            "machine_updated",
            None,
            {
                "machine_id": machine_id,
                "updated_fields": list(update_data.keys())
            }
        )
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating machine {machine_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update machine: {str(e)}"
        )


@router.delete("/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_machine(machine_id: str):
    """
    Delete a machine profile.
    """
    try:
        supabase_client.table("machine_profiles")\
            .delete()\
            .eq("id", machine_id)\
            .execute()

        log_security_event(
            "machine_deleted",
            None,
            {"machine_id": machine_id},
            severity="WARNING"
        )

        return None
        
    except Exception as e:
        logger.error(f"Error deleting machine {machine_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete machine: {str(e)}"
        )


@router.patch("/{machine_id}/status")
async def update_machine_status(
    machine_id: str, status_update: MachineStatusUpdate
):
    """
    Update machine status (typically called by Edge Agent).

    This endpoint is designed for real-time status updates from
    the Edge Agent running at the workshop.
    """
    try:
        update_data = {
            "status": status_update.status,
            "last_heartbeat": datetime.utcnow().isoformat()
        }

        if status_update.current_job_id:
            update_data["current_job_id"] = status_update.current_job_id
        if status_update.current_program:
            update_data["current_program"] = status_update.current_program
        if (status_update.error_message and
                status_update.status == "error"):
            update_data["error_message"] = status_update.error_message
        if status_update.telemetry:
            update_data["telemetry"] = status_update.telemetry

        result = supabase_client.table("machine_profiles")\
            .update(update_data)\
            .eq("id", machine_id)\
            .execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Machine not found"
            )
        
        # Log status changes
        if status_update.status == "error":
            log_security_event(
                "machine_error",
                None,
                {
                    "machine_id": machine_id,
                    "error": status_update.error_message
                },
                severity="ERROR"
            )
        
        return {"message": "Status updated", "status": status_update.status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating machine status {machine_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}"
        )


@router.post("/{machine_id}/generate-gcode")
async def generate_gcode_for_machine(
    machine_id: str,
    request: GCodeGenerationRequest
):
    """
    Generate G-code for a specific machine.

    Uses the machine's profile and post-processor configuration
    to generate appropriate G-code.
    """
    try:
        # Get machine profile
        machine_result = supabase_client.table("machine_profiles")\
            .select("*")\
            .eq("id", machine_id)\
            .single()\
            .execute()

        if not machine_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Machine not found"
            )

        machine = machine_result.data

        # Import G-code generator
        from services.gcode_generator import (
            generate_gcode_for_machine as gen_gcode
        )

        # Generate G-code
        stock_dims = request.stock_dimensions
        if len(stock_dims) != 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="stock_dimensions must have exactly 3 values"
            )
        gcode_result = gen_gcode(
            operations=request.operations,
            machine_brand=machine["brand"],
            tool_config=request.tool_config,
            material_thickness=request.material_thickness,
            stock_dimensions=(stock_dims[0], stock_dims[1], stock_dims[2]),
            job_name=request.job_name
        )

        if (not gcode_result.get("is_valid", False) and
                gcode_result.get("errors")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"G-code generation failed: "
                    f"{gcode_result['errors']}"
                )
            )

        # Store G-code
        gcode_record = {
            "job_id": request.job_id,
            "machine_id": machine_id,
            "gcode": gcode_result["gcode"],
            "filename": f"{request.job_name}.nc",
            "file_size": len(gcode_result["gcode"]),
            "metadata": gcode_result["metadata"],
            "warnings": gcode_result.get("warnings", [])
        }

        store_result = supabase_client.table("generated_gcode")\
            .insert(gcode_record)\
            .execute()

        log_security_event(
            "gcode_generated",
            None,
            {
                "machine_id": machine_id,
                "job_name": request.job_name,
                "operations_count": len(request.operations)
            }
        )

        gcode_id = (
            store_result.data[0]["id"] if store_result.data else None
        )
        gcode_preview = (
            gcode_result["gcode"][:1000] + "..."
            if len(gcode_result["gcode"]) > 1000
            else gcode_result["gcode"]
        )
        download_url = (
            f"/api/v2/machines/{machine_id}/gcode/{gcode_id}"
            if store_result.data else None
        )

        return {
            "gcode_id": gcode_id,
            "gcode_preview": gcode_preview,
            "metadata": gcode_result["metadata"],
            "warnings": gcode_result.get("warnings", []),
            "download_url": download_url
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating G-code for machine {machine_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate G-code: {str(e)}"
        )


@router.get("/{machine_id}/gcode/{gcode_id}")
async def download_gcode(machine_id: str, gcode_id: str):
    """
    Download generated G-code file.
    """
    try:
        result = supabase_client.table("generated_gcode")\
            .select("*")\
            .eq("id", gcode_id)\
            .eq("machine_id", machine_id)\
            .single()\
            .execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="G-code not found"
            )
        
        from fastapi.responses import Response

        filename = result.data['filename']
        return Response(
            content=result.data["gcode"],
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading G-code {gcode_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download G-code: {str(e)}"
        )


@router.post("/{machine_id}/queue", status_code=status.HTTP_201_CREATED)
async def queue_job(machine_id: str, job: JobQueueItem):
    """
    Add a job to the machine's queue (for Edge Agent).
    """
    try:
        queue_data = {
            "machine_id": machine_id,
            "job_id": job.job_id,
            "gcode_id": job.gcode_id,
            "job_name": job.job_name,
            "priority": job.priority,
            "status": "queued",
            "metadata": job.metadata
        }

        result = supabase_client.table("machine_job_queue")\
            .insert(queue_data)\
            .execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to queue job"
            )
        
        log_security_event(
            "job_queued",
            None,
            {
                "machine_id": machine_id,
                "job_name": job.job_name,
                "priority": job.priority
            }
        )

        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error queuing job for machine {machine_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue job: {str(e)}"
        )


@router.get("/{machine_id}/queue")
async def get_job_queue(
    machine_id: str,
    status_filter: Optional[str] = Query(None, description="Filter by status")
):
    """
    Get the job queue for a machine.
    """
    try:
        query = supabase_client.table("machine_job_queue")\
            .select("*")\
            .eq("machine_id", machine_id)
        
        if status_filter:
            query = query.eq("status", status_filter)

        result = query.order("priority").order("queued_at").execute()

        return result.data

    except Exception as e:
        logger.error(f"Error fetching job queue for machine {machine_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch job queue: {str(e)}"
        )

