from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
from services.national_service_features import NationalServiceFeatures
from services.national_analytics import NationalAnalyticsEngine

router = APIRouter(prefix="/national", tags=["National Service"])

class InvoiceRequest(BaseModel):
    amount: float
    tax_id: str
    company_name: str

class ComplianceRequest(BaseModel):
    design_specs: Dict[str, Any]
    region: str = "Cairo"

class ImportSavingsRequest(BaseModel):
    remnant_usage_kg: float

@router.get("/dashboard")
async def get_national_dashboard():
    """Get aggregated national dashboard metrics."""
    engine = NationalAnalyticsEngine()
    return await engine.generate_national_dashboard_data()

@router.post("/calculate-savings")
async def calculate_savings(request: ImportSavingsRequest):
    """Calculate import substitution savings."""
    features = NationalServiceFeatures()
    return await features.calculate_import_substitution(request.remnant_usage_kg)

@router.post("/validate-compliance")
async def validate_compliance(request: ComplianceRequest):
    """Validate design against Egyptian building codes."""
    features = NationalServiceFeatures()
    return await features.validate_egyptian_building_code(request.design_specs, request.region)

@router.post("/generate-invoice")
async def generate_invoice(request: InvoiceRequest):
    """Generate VAT-compliant invoice data."""
    features = NationalServiceFeatures()
    from decimal import Decimal
    return await features.generate_egyptian_vat_invoice(
        Decimal(str(request.amount)), 
        request.tax_id, 
        request.company_name
    )

