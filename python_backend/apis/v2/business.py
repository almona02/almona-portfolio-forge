"""
Business intelligence endpoints for ERP dispatch and profitability analysis.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.business.cost_engine import PredictiveCostEngine
from core.business.egyptian_compliance import EgyptianEinvoiceBuilder
from core.business.erp_bridge import ErpBridge

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/business", tags=["Business Intelligence"])


class InvoiceItem(BaseModel):
    description: str = Field(..., description="Line description")
    quantity: float = Field(..., description="Quantity")
    unit_price: float = Field(..., description="Unit price")
    material_requirements_kg: Optional[float] = Field(
        default=None, description="Material weight contribution (kg)"
    )
    labor_hours: Optional[float] = Field(default=None, description="Labor hours")
    machine_time_hours: Optional[float] = Field(default=None, description="Machine hours")
    remnant_utilization_kg: Optional[float] = Field(
        default=None, description="Remnant utilization (kg)"
    )


class InvoiceGenerationRequest(BaseModel):
    """Trigger quote-to-invoice flow."""

    quote_id: str
    quote_number: str
    customer_name: str
    customer_tax_id: Optional[str] = None
    region: str = Field("EG", description="Region code")
    currency: str = Field("EGP", description="Currency code")
    quote_total: float
    items: List[InvoiceItem] = Field(default_factory=list)


class ProfitabilityAnalysisRequest(BaseModel):
    material_kg: float
    labor_hours: float
    machine_hours: float
    remnant_utilization_percent: float = Field(15.0, description="Remnant usage %")
    quote_price: float
    region: str = Field("EG", description="Region for tax calculation")


@router.post("/invoice/generate")
async def generate_invoice_event(request: InvoiceGenerationRequest):
    """
    Generates costing, EG XML (if EG), and dispatches invoice to ERP.
    """
    try:
        logger.info("Generating invoice for quote %s", request.quote_id)

        quote_data = {
            "id": request.quote_id,
            "quote_number": request.quote_number,
            "customer_name": request.customer_name,
            "customer_tax_id": request.customer_tax_id,
            "region": request.region,
            "currency": request.currency,
            "total_price": request.quote_total,
            "items": [
                {
                    "name": item.description,
                    "qty": item.quantity,
                    "price": item.unit_price,
                    "material_requirements_kg": item.material_requirements_kg,
                    "labor_hours": item.labor_hours,
                    "machine_time_hours": item.machine_time_hours,
                    "remnant_utilization_kg": item.remnant_utilization_kg,
                }
                for item in request.items
            ],
        }

        # Build optimization signals from items (defensive defaults)
        signals = {
            "material_requirements_kg": sum(
                (item.material_requirements_kg or 0) for item in request.items
            ),
            "remnant_utilization_kg": sum(
                (item.remnant_utilization_kg or 0) for item in request.items
            ),
            "machine_time_hours": sum((item.machine_time_hours or 0) for item in request.items),
            "labor_hours": sum((item.labor_hours or 0) for item in request.items),
        }

        cost_engine = PredictiveCostEngine()
        costing = cost_engine.calculate_pre_flight_margin(
            {"total_price": request.quote_total, "currency": request.currency},
            signals,
        )

        einvoice_xml = None
        if request.region.upper() == "EG":
            builder = EgyptianEinvoiceBuilder()
            einvoice_xml = builder.build(
                invoice={
                    "external_ref": request.quote_number,
                    "date": datetime.utcnow().strftime("%Y-%m-%d"),
                    "customer_name": request.customer_name,
                    "vat_amount": costing.get("vat_amount"),
                },
                line_items=[
                    {
                        "description": item.description,
                        "quantity": item.quantity,
                        "unit_price": item.unit_price,
                    }
                    for item in request.items
                ],
                buyer_tax_id=request.customer_tax_id or "",
                currency=request.currency,
            )

        backend_type = os.getenv("ERP_BACKEND", "mock")
        bridge = ErpBridge(backend_type=backend_type)
        compliance_data = {
            "region": request.region,
            "customer_tax_id": request.customer_tax_id,
            "currency": request.currency,
            "einvoice_xml": einvoice_xml,
        }

        result = await bridge.emit_invoice_event(
            quote_data=quote_data, ai_costing=costing, compliance_data=compliance_data
        )

        return {
            "status": "success",
            "erp_reference": result.get("erp_reference"),
            "invoice_number": result.get("invoice_number"),
            "egyptian_compliance": einvoice_xml is not None,
            "ai_margin_percent": round(costing.get("projected_margin_percent", 0), 2),
            "ai_total_cost": round(costing.get("total_cost", 0), 2),
        }
    except Exception as exc:
        logger.error("Business invoice generation failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Invoice generation failed: {exc}")


@router.post("/profitability/analyze")
async def analyze_profitability(request: ProfitabilityAnalysisRequest):
    """Returns AI-calculated margin and recommendations."""
    try:
        signals = {
            "material_requirements_kg": request.material_kg,
            "remnant_utilization_kg": request.material_kg
            * (request.remnant_utilization_percent / 100.0),
            "machine_time_hours": request.machine_hours,
            "labor_hours": request.labor_hours,
        }
        cost_engine = PredictiveCostEngine()
        costing = cost_engine.calculate_pre_flight_margin(
            {"total_price": request.quote_price, "currency": "EGP"}, signals
        )

        vat_info = {}
        if request.region.upper() == "EG":
            vat_amount = round(request.quote_price * 0.14, 2)
            vat_info = {"vat_rate": 14.0, "vat_amount": vat_amount, "total_with_vat": round(request.quote_price + vat_amount, 2)}

        return {
            "status": "success",
            "profitability_analysis": {
                "quoted_price": request.quote_price,
                "ai_estimated_cost": round(costing.get("total_cost", 0), 2),
                "projected_margin_percent": round(costing.get("projected_margin_percent", 0), 2),
                "projected_margin_amount": round(
                    request.quote_price - (costing.get("total_cost", 0) or 0), 2
                ),
                "remnant_utilization_percent": request.remnant_utilization_percent,
            },
            "egyptian_compliance": vat_info,
        }
    except Exception as exc:
        logger.error("Profitability analysis failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


@router.get("/health")
async def business_health():
    """Health check for business intelligence services."""
    try:
        # quick instantiation checks
        PredictiveCostEngine()
        ErpBridge(backend_type="mock")
        EgyptianEinvoiceBuilder()
        return {
            "status": "healthy",
            "modules": {
                "cost_engine": "operational",
                "erp_bridge": "operational",
                "egyptian_compliance": "operational",
            },
            "pilot_ready": True,
        }
    except Exception as exc:
        logger.error("Business health check failed: %s", exc, exc_info=True)
        return {"status": "degraded", "error": str(exc), "pilot_ready": False}
