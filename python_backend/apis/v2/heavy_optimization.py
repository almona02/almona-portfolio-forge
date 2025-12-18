"""
Heavy Optimization API Endpoints
================================

Industrial-grade cutting and mass-production optimization endpoints
intended to offload browser-heavy algorithms (GA/LP) to the Python
backend.

These endpoints are deliberately coarse grained and batch-friendly so
Egyptian workshops can run 100–1000+ window jobs without freezing the UI.
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, conint, confloat
import logging

logger = logging.getLogger(__name__)

from services.optimization.defect_aware_solver import (
    CutDef,
    DefectAwareOptimizer,
    OptimizationObjective,
    StockBarDef,
)
from core.cache import cached


router = APIRouter(prefix="/heavy", tags=["Heavy Optimization"])


# ---------------------------------------------------------------------------
# Pydantic models – kept close to existing TypeScript fabricator types
# ---------------------------------------------------------------------------


class OptimizationObjectiveEnum(str, Enum):
    minimize_waste = "minimize_waste"
    minimize_cost = "minimize_cost"
    minimize_bars = "minimize_bars"
    minimize_setup = "minimize_setup"
    balanced = "balanced"


class CutRequest(BaseModel):
    """
    Single cut requirement.

    This intentionally mirrors the core of the frontend `Cut` type:
    - `id` / `componentId`
    - `length` in mm
    - per‑profile association
    """

    id: str = Field(..., description="Stable identifier (e.g. componentId)")
    length_mm: confloat(gt=0) = Field(..., description="Required cut length in mm")
    quantity: conint(ge=1) = Field(
        1, description="How many identical cuts are required"
    )
    priority: conint(ge=1, le=10) = Field(
        1, description="Higher priority cuts are packed first in greedy fallbacks"
    )
    profile_id: Optional[str] = Field(
        None, description="Optional profile/system identifier"
    )
    allow_defects: bool = Field(
        False,
        description=(
            "If true, minor defect zones on remnants are acceptable for this cut"
        ),
    )


class StockBarRequest(BaseModel):
    """
    Single stock bar definition (new bar or remnant).
    """

    id: str = Field(..., description="Bar or remnant identifier")
    length_mm: confloat(gt=0) = Field(..., description="Bar length in mm")
    quantity: conint(ge=1) = Field(
        1, description="How many bars of this type are available"
    )
    cost_per_unit: float = Field(
        0.0,
        description=(
            "Cost per bar – used for cost-aware objectives. "
            "For remnants, use effective cost (often lower)."
        ),
    )
    is_remnant: bool = Field(
        False, description="Marks this bar as a remnant to be preferred"
    )
    profile_id: Optional[str] = Field(
        None, description="Optional profile/system identifier"
    )


class CuttingOptimizationRequest(BaseModel):
    """
    Request for heavy 1D cutting / stock optimization.

    This is the Python counterpart to the frontend's cutting optimizer
    APIs and can be used for both single‑project and cross‑project jobs.
    """

    cuts: List[CutRequest] = Field(
        ..., description="All required cuts across one or more projects"
    )
    stock: List[StockBarRequest] = Field(
        ..., description="Available stock bars and remnants"
    )
    objective: OptimizationObjectiveEnum = Field(
        OptimizationObjectiveEnum.balanced,
        description="Primary optimization objective",
    )
    kerf_width_mm: confloat(gt=0) = Field(
        3.0, description="Saw blade kerf width in mm"
    )
    min_usable_remnant_mm: confloat(ge=0) = Field(
        100.0,
        description=(
            "Minimum leftover length on a bar to keep as a usable remnant"
        ),
    )
    time_limit_seconds: confloat(gt=0) = Field(
        30.0, description="Solver time limit to keep jobs within SLA"
    )
    workshop_id: Optional[str] = Field(
        None, description="Optional workshop identifier for logging/analytics"
    )
    project_ids: Optional[List[str]] = Field(
        None,
        description=(
            "Optional list of project IDs when running cross‑project mass "
            "production jobs. Used only for metadata."
        ),
    )


class CuttingOptimizationResponse(BaseModel):
    """
    Response payload mapped closely to the DefectAwareOptimizer solution.
    """

    assignments: List[Dict[str, Any]]
    bars_used: Dict[str, int]
    metrics: Dict[str, Any]
    solve_time_ms: float
    solver_status: str
    computed_in: str
    engine: str
    egyptian_context: Dict[str, Any]


def _map_objective(obj: OptimizationObjectiveEnum) -> OptimizationObjective:
    mapping = {
        OptimizationObjectiveEnum.minimize_waste: OptimizationObjective.MINIMIZE_WASTE,
        OptimizationObjectiveEnum.minimize_cost: OptimizationObjective.MINIMIZE_COST,
        OptimizationObjectiveEnum.minimize_bars: OptimizationObjective.MINIMIZE_BARS,
        OptimizationObjectiveEnum.minimize_setup: OptimizationObjective.MINIMIZE_SETUP,
        OptimizationObjectiveEnum.balanced: OptimizationObjective.BALANCED,
    }
    return mapping[obj]


@router.post(
    "/optimize/cutting",
    summary="Heavy cutting optimization (Async - Returns Job ID)",
    responses={
        202: {
            "description": "Optimization job enqueued successfully",
            "content": {
                "application/json": {
                    "example": {
                        "job_id": "123e4567-e89b-12d3-a456-426614174000",
                        "status": "enqueued",
                        "message": "Heavy optimization job has been enqueued. Track progress via job_id.",
                        "estimated_time_seconds": 30
                    }
                }
            }
        }
    }
)
async def optimize_cutting_async(req: CuttingOptimizationRequest) -> Dict[str, Any]:
    """
    ENQUEUE heavy 1D cutting / stock optimization job for async processing.

    This endpoint returns IMMEDIATELY with a job_id. The actual computation
    happens in the background via Celery workers.

    Frontend should:
    1. Call this endpoint
    2. Show "Optimization in progress..." message
    3. Poll job status or listen via Supabase Realtime
    4. Display results when job completes

    Intended for:
    - 100+ cuts
    - 500–1000+ window projects
    - scenarios where computation would block the API
    """
    # Input validation only - no heavy computation
    if not req.cuts:
        raise HTTPException(status_code=400, detail="At least one cut is required")
    if not req.stock:
        raise HTTPException(status_code=400, detail="At least one stock bar is required")

    try:
        # Import services here to avoid circular imports
        from tasks.heavy_computation_tasks import optimize_cutting_task
        from services.job_service import job_service

        # Convert Pydantic model to dict for Celery serialization
        request_data = req.model_dump()

        # Enqueue the task - returns immediately
        task = optimize_cutting_task.delay(request_data)

        # Create job record in database for Supabase Realtime
        await job_service.create_job(
            job_id=task.id,
            job_type="optimization",
            workshop_id=req.workshop_id,
            project_ids=req.project_ids,
            input_data={
                "cuts_count": len(req.cuts),
                "stock_count": len(req.stock),
                "objective": req.objective,
                "time_limit_seconds": req.time_limit_seconds
            },
            estimated_time_seconds=30,
            metadata={"endpoint": "heavy_optimization.cutting"}
        )

        logger.info("Heavy cutting optimization job enqueued and tracked",
                   job_id=task.id,
                   workshop_id=req.workshop_id,
                   cuts_count=len(req.cuts),
                   stock_count=len(req.stock))

        return {
            "job_id": task.id,
            "status": "enqueued",
            "message": "Heavy optimization job has been enqueued. Track progress via job_id.",
            "estimated_time_seconds": 30,  # Conservative estimate
            "workshop_id": req.workshop_id,
        }

    except Exception as e:
        logger.error(f"Failed to enqueue heavy cutting optimization job: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to enqueue optimization job: {str(e)}"
        )


@router.get(
    "/job/{job_id}",
    summary="Check optimization job status",
    responses={
        200: {
            "description": "Job completed successfully",
            "content": {"application/json": {"example": {"status": "completed", "result": {...}}}}
        },
        202: {
            "description": "Job still processing",
            "content": {"application/json": {"example": {"status": "processing", "progress": "75%"}}}
        },
        404: {"description": "Job not found"}
    }
)
async def get_job_status(job_id: str) -> Dict[str, Any]:
    """
    Check the status of an optimization job via Supabase database.
    This endpoint reads from the jobs table for realtime-compatible status.

    Returns:
    - 200: Job completed with results
    - 202: Job still processing
    - 404: Job not found
    """
    try:
        # Import job service here to avoid circular imports
        from services.job_service import job_service

        # Get job status from database
        job_record = await job_service.get_job_status(job_id)

        if not job_record:
            raise HTTPException(status_code=404, detail="Job not found")

        status = job_record["status"]

        if status == "pending":
            return {
                "job_id": job_id,
                "status": "pending",
                "message": "Job is queued and waiting to be processed",
                "estimated_time_seconds": job_record.get("estimated_time_seconds", 30),
                "created_at": job_record.get("created_at"),
            }
        elif status == "processing":
            return {
                "job_id": job_id,
                "status": "processing",
                "message": "Optimization is currently running",
                "started_at": job_record.get("started_at"),
            }
        elif status == "completed":
            return {
                "job_id": job_id,
                "status": "completed",
                "result": job_record.get("result_data"),
                "completed_at": job_record.get("completed_at"),
                "processing_time_seconds": job_record.get("processing_time_seconds", 0),
            }
        elif status == "failed":
            return {
                "job_id": job_id,
                "status": "failed",
                "error": job_record.get("error_message", "Unknown error"),
                "message": "Optimization job failed",
                "completed_at": job_record.get("completed_at"),
            }
        else:
            return {
                "job_id": job_id,
                "status": status,
                "message": f"Job is in {status} state",
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error checking job status", job_id=job_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error checking job status: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive logging
        raise HTTPException(
            status_code=500,
            detail=f"Heavy cutting optimization failed: {exc}",
        )


@router.post(
    "/optimize/mass-production",
    response_model=CuttingOptimizationResponse,
    summary="Mass production optimization across projects",
)
async def optimize_mass_production(
    req: CuttingOptimizationRequest,
) -> CuttingOptimizationResponse:
    """
    Convenience endpoint for mass‑production jobs.

    Semantically identical to `/optimize/cutting` but keeps a distinct
    URL for clearer frontend routing and logging.
    """
    return await optimize_cutting(req)


