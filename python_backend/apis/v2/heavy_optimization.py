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

    cuts: List<CutRequest] = Field(
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
    response_model=CuttingOptimizationResponse,
    summary="Heavy cutting optimization (Python backend)",
)
@cached(ttl=600, key_prefix="heavy_cutting")
async def optimize_cutting(req: CuttingOptimizationRequest) -> Dict[str, Any]:
    """
    Run heavy 1D cutting / stock optimization in Python.

    Intended for:
    - 100+ cuts
    - 500–1000+ window projects
    - scenarios where the browser GA would freeze on low‑end machines
    """
    if not req.cuts:
        raise HTTPException(status_code=400, detail="At least one cut is required")
    if not req.stock:
        raise HTTPException(status_code=400, detail="At least one stock bar is required")

    try:
        optimizer = DefectAwareOptimizer(
            kerf_width=req.kerf_width_mm,
            min_usable_remnant=req.min_usable_remnant_mm,
            time_limit_seconds=req.time_limit_seconds,
        )

        cuts = [
            CutDef(
                id=c.id,
                length=c.length_mm,
                quantity=c.quantity,
                priority=c.priority,
                profile_id=c.profile_id or "",
                allow_defects=c.allow_defects,
            )
            for c in req.cuts
        ]
        stock = [
            StockBarDef(
                id=s.id,
                length=s.length_mm,
                quantity=s.quantity,
                cost_per_unit=s.cost_per_unit,
                is_remnant=s.is_remnant,
                defects=[],
                profile_id=s.profile_id or "",
            )
            for s in req.stock
        ]

        solution = optimizer.optimize(
            cuts=cuts,
            stock=stock,
            objective=_map_objective(req.objective),
        )

        payload = solution.to_dict()

        egyptian_context: Dict[str, Any] = {
            "workshop_id": req.workshop_id,
            "project_ids": req.project_ids or [],
            "optimized_for_egypt": True,
            "notes": (
                "Tuned for low‑RAM workshop PCs; moves heavy LP/CP compute to Python "
                "instead of the browser."
            ),
        }
        return {
            "assignments": payload["assignments"],
            "bars_used": payload["bars_used"],
            "metrics": payload["metrics"],
            "solve_time_ms": payload["solve_time_ms"],
            "solver_status": payload["solver_status"],
            "computed_in": "python_backend",
            "engine": "defect_aware_solver",
            "egyptian_context": egyptian_context,
        }
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


