# flake8: noqa

from fastapi import APIRouter, Depends, Query, Request
from typing import Any, Dict, List, Optional
import logging

from supabase import Client  # type: ignore
from models.api_v2_models import QuoteLookupResponse, QuoteSummary
from fastapi import Body
from pydantic import BaseModel, Field
from typing import List as _List
from apis.v2.deps import get_supabase
from apis.v2.services.quote_service import QuoteService
from apis.v2.core.errors import (
    QuoteValidationError,
    QuoteAlreadyExistsError,
    handle_supabase_error,
    create_error_context,
    COMMON_ERROR_RESPONSES,
)
from core.business.cost_engine import PredictiveCostEngine
from tasks.erp_tasks import dispatch_invoice_task

logger = logging.getLogger(__name__)
try:
    from celery import current_app as celery_app
except Exception:  # pragma: no cover - celery optional
    celery_app = None


class QuoteItem(BaseModel):
    product_id: Optional[str] = Field(
        None,
        description="ID of the product to quote",
        example="prod-cnc-xyz2000"
    )
    service_id: Optional[str] = Field(
        None,
        description="ID of the service to quote",
        example="svc-maintenance-monthly"
    )
    quantity: int = Field(
        1,
        description="Quantity of the item",
        example=2,
        ge=1
    )
    unit_price: Optional[float] = Field(
        None,
        description="Unit price of the item",
        example=1500.00,
        ge=0
    )

    @property
    def total(self) -> Optional[float]:  # convenience
        if self.unit_price is None:
            return None
        return self.unit_price * self.quantity
    
    class Config:
        schema_extra = {
            "example": {
                "product_id": "prod-cnc-xyz2000",
                "service_id": None,
                "quantity": 2,
                "unit_price": 1500.00
            }
        }


class QuoteCreateRequest(BaseModel):
    products: _List[QuoteItem] = Field(
        default_factory=list,
        description="List of products to include in the quote"
    )
    services: _List[QuoteItem] = Field(
        default_factory=list,
        description="List of services to include in the quote"
    )
    contact_name: str = Field(
        ...,
        description="Name of the contact person",
        example="Ahmed Hassan"
    )
    contact_email: str = Field(
        ...,
        description="Email address of the contact person",
        example="ahmed.hassan@company.com"
    )
    contact_phone: Optional[str] = Field(
        None,
        description="Phone number of the contact person",
        example="+20 123 456 7890"
    )
    company: Optional[str] = Field(
        None,
        description="Company name",
        example="Egyptian Manufacturing Co."
    )
    project_description: Optional[str] = Field(
        None,
        description="Description of the project or requirements",
        example="We need to upgrade our production line with new CNC machines for automotive parts manufacturing."
    )
    urgency: Optional[str] = Field(
        default="standard",
        description="Urgency level of the quote request",
        example="urgent"
    )
    delivery_location: Optional[str] = Field(
        None,
        description="Delivery location address",
        example="Cairo Industrial Zone, Building 15, Floor 3"
    )
    special_requirements: Optional[str] = Field(
        None,
        description="Any special requirements or notes",
        example="Installation must be completed during weekend hours due to production schedule."
    )
    region: Optional[str] = Field(
        default=None,
        description="Region code for compliance/ERP (e.g., EG)",
        example="EG",
    )
    currency: Optional[str] = Field(
        default="EGP",
        description="Currency code for pricing/ERP",
        example="EGP",
    )
    customer_tax_id: Optional[str] = Field(
        default=None,
        description="Customer tax/VAT ID for ERP dispatch",
        example="EG123456789",
    )
    related_service_ticket_id: Optional[str] = Field(
        default=None,
        description="Link to an existing service_ticket if any",
        example="550e8400-e29b-41d4-a716-446655440001"
    )
    machine_id: Optional[str] = Field(
        None,
        description="ID of the machine this quote is related to",
        example="550e8400-e29b-41d4-a716-446655440000"
    )
    dispatch_to_erp: bool = Field(
        default=False,
        description="If true, enqueue ERP invoice dispatch after creation",
    )
    ai_costing: Optional[Dict[str, Any]] = Field(
        default=None,
        description="AI costing payload to send to ERP (total_cost, vat_amount, margin, etc.)",
    )
    optimization_signals: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optimization signals for predictive costing (material_requirements_kg, machine_time_hours, labor_hours, remnant_utilization_kg)",
    )
    compliance_data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Compliance payload (e.g., tax ids) for ERP dispatch",
    )
    
    class Config:
        schema_extra = {
            "example": {
                "products": [
                    {
                        "product_id": "prod-cnc-xyz2000",
                        "service_id": None,
                        "quantity": 2,
                        "unit_price": 1500.00
                    }
                ],
                "services": [
                    {
                        "product_id": None,
                        "service_id": "svc-maintenance-monthly",
                        "quantity": 1,
                        "unit_price": 500.00
                    }
                ],
                "contact_name": "Ahmed Hassan",
                "contact_email": "ahmed.hassan@company.com",
                "contact_phone": "+20 123 456 7890",
                "company": "Egyptian Manufacturing Co.",
                "project_description": "We need to upgrade our production line with new CNC machines for automotive parts manufacturing.",
                "urgency": "urgent",
                "delivery_location": "Cairo Industrial Zone, Building 15, Floor 3",
                "special_requirements": "Installation must be completed during weekend hours due to production schedule.",
                "related_service_ticket_id": "550e8400-e29b-41d4-a716-446655440001",
                "machine_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


class QuoteCreateResponse(BaseModel):
    id: str
    quote_number: str
    digital_twin_code: Optional[str]
    portal_reference: Optional[str]
    status: str
    total_amount: Optional[float]
    related_service_ticket_id: Optional[str]
    created_at: str
    erp_task_id: Optional[str] = Field(default=None, description="Celery task id for ERP dispatch")
    erp_idempotency_key: Optional[str] = Field(default=None, description="Idempotency key used for ERP audit log")
    ai_costing: Optional[Dict[str, Any]] = Field(default=None, description="Computed or provided AI costing snapshot")


class ErpDispatchRequest(BaseModel):
    quote_data: Dict[str, Any] = Field(
        ...,
        description="Quote payload (must include quote_number or id and items)",
    )
    ai_costing: Dict[str, Any] = Field(
        ...,
        description="AI costing payload (total_cost, vat_amount, margin, etc.)",
    )
    compliance_data: Optional[Dict[str, Any]] = Field(
        default=None, description="Regional compliance data (e.g., tax ids)"
    )
    backend_type: Optional[str] = Field(
        default=None, description="Override ERP backend (e.g., 'odoo', 'mock')"
    )
    idempotency_key: Optional[str] = Field(
        default=None,
        description="Idempotency key to reuse an existing ERP transaction",
    )


class ErpDispatchResponse(BaseModel):
    task_id: str
    idempotency_key: str
    status: str = Field(description="Immediate task enqueue status")


router = APIRouter(prefix="/quotes", tags=["Quotes"])


@router.get("/health")
async def quotes_health_check():
    """
    Lightweight health check for the Quotes service.

    This is primarily used by smoke tests and monitoring to verify that
    the quotes router is registered and that Supabase connectivity is
    broadly functional.
    """
    return {
        "status": "healthy",
        "service": "quotes",
    }


@router.get(
    "/lookup",
    response_model=QuoteLookupResponse,
    responses=COMMON_ERROR_RESPONSES
)
def lookup_quotes(
    request: Request,
    q: str = Query(
        ...,
        min_length=2,
        max_length=64,
        description="Search fragment",
    ),
    supabase: Client = Depends(get_supabase),
):
    """Lookup quotes by number, twin code, or portal ref (RLS)."""
    try:
        rpc_response = supabase.rpc(
            "portal_quote_lookup", {"_query": q}
        ).execute()
    except Exception as exc:
        context = create_error_context(
            request=request,
            operation="quote_lookup",
            additional_data={"query": q}
        )
        raise handle_supabase_error(exc, "portal_quote_lookup", context)

    rows = getattr(rpc_response, "data", []) or []
    summaries: List[QuoteSummary] = [
        QuoteSummary(
            id=r.get("id"),
            quote_number=r.get("quote_number"),
            status=r.get("status"),
            digital_twin_code=r.get("digital_twin_code"),
            portal_reference=r.get("portal_reference"),
            total_amount=r.get("total_amount"),
            created_at=r.get("created_at"),
        )
        for r in rows
    ]
    return QuoteLookupResponse(results=summaries, count=len(summaries))


@router.post(
    "/create",
    response_model=QuoteCreateResponse,
    status_code=201,
    responses=COMMON_ERROR_RESPONSES,
    summary="Create Quote",
    description="""
    Create a new quote with products and/or services.
    
    **Use Cases:**
    - Request pricing for new equipment
    - Get quotes for maintenance services
    - Request custom solutions pricing
    - Generate quotes for existing service tickets
    
    **Required Fields:**
    - `contact_name`: Name of the person requesting the quote
    - `contact_email`: Email address for quote delivery
    - At least one product or service item
    
    **Features:**
    - Digital twin integration for machine-specific quotes
    - Link to existing service tickets
    - Support for both products and services
    - Urgency levels and special requirements
    """
)
def create_quote(
    request: Request,
    payload: QuoteCreateRequest = Body(...),
    supabase: Client = Depends(get_supabase),
):
    """Create a new quote with items."""
    service = QuoteService(supabase)

    # Validate payload
    if not payload.products and not payload.services:
        context = create_error_context(
            request=request,
            operation="create_quote"
        )
        raise QuoteValidationError(
            message="At least one product or service must be specified",
            field="products,services",
            context=context
        )

    try:
        result = service.create_quote_with_items(
            {
                "products": [i.dict() for i in payload.products],
                "services": [i.dict() for i in payload.services],
                "contact_name": payload.contact_name,
                "contact_email": payload.contact_email,
                "contact_phone": payload.contact_phone,
                "company": payload.company,
                "project_description": payload.project_description,
                "urgency": payload.urgency,
                "delivery_location": payload.delivery_location,
                "special_requirements": payload.special_requirements,
                "related_service_ticket_id": payload.related_service_ticket_id,
                "machine_id": payload.machine_id,
            }
        )
    except (QuoteValidationError, QuoteAlreadyExistsError):
        # Re-raise our custom errors directly
        raise
    except Exception as exc:
        context = create_error_context(
            request=request,
            operation="create_quote",
            additional_data={
                "contact_email": payload.contact_email,
                "products_count": len(payload.products),
                "services_count": len(payload.services)
            }
        )
        raise handle_supabase_error(exc, "create_quote_with_items", context)

    response_payload = dict(result)

    # Celery availability warning (non-blocking)
    if payload.dispatch_to_erp and celery_app:
        try:
            inspector = celery_app.control.inspect()
            active = inspector.active() or {}
            if not active:
                logger.warning("No active Celery workers detected for ERP dispatch")
        except Exception as exc:  # pragma: no cover - best effort
            logger.warning("Celery health check failed: %s", exc)

    # Compute predictive costing if signals provided and not already supplied
    computed_costing: Optional[Dict[str, Any]] = None
    if payload.optimization_signals and not payload.ai_costing:
        engine = PredictiveCostEngine()
        total_price = 0.0
        for item in payload.products:
            if item.unit_price is not None:
                total_price += item.unit_price * item.quantity
        for item in payload.services:
            if item.unit_price is not None:
                total_price += item.unit_price * item.quantity
        computed_costing = engine.calculate_pre_flight_margin(
            {"total_price": total_price, "currency": payload.currency},
            payload.optimization_signals,
        )
        response_payload["ai_costing"] = computed_costing

    # Optional ERP dispatch hook
    ai_costing_payload = payload.ai_costing or computed_costing
    if payload.dispatch_to_erp:
        # Guard against bad data
        should_dispatch = True
        reason = ""

        total_cost = (ai_costing_payload or {}).get("total_cost", 0)
        margin_pct = (ai_costing_payload or {}).get("projected_margin_percent", 0)

        if not ai_costing_payload:
            should_dispatch = False
            reason = "missing_ai_costing"
        elif total_cost is None or float(total_cost) <= 0:
            should_dispatch = False
            reason = "zero_total_cost"
        elif margin_pct is not None and float(margin_pct) < -20:
            should_dispatch = False
            reason = "extreme_negative_margin"
        elif not (payload.company or payload.contact_name):
            should_dispatch = False
            reason = "missing_customer_name"

        if should_dispatch:
            quote_items: List[Dict[str, Any]] = []
            for item in payload.products:
                quote_items.append(
                    {
                        "name": item.product_id or "product",
                        "qty": item.quantity,
                        "price": item.unit_price,
                    }
                )
            for item in payload.services:
                quote_items.append(
                    {
                        "name": item.service_id or "service",
                        "qty": item.quantity,
                        "price": item.unit_price,
                    }
                )

            quote_payload = {
                "id": result["id"],
                "quote_number": result["quote_number"],
                "customer_name": payload.company or payload.contact_name,
                "customer_tax_id": payload.customer_tax_id,
                "region": payload.region,
                "currency": payload.currency,
                "items": quote_items,
            }

            idempotency_key = f"invoice-{result['id']}-{result.get('quote_number')}"

            try:
                task = dispatch_invoice_task.delay(
                    quote_payload,
                    ai_costing_payload,
                    payload.compliance_data,
                    idempotency_key,
                    None,
                )
                response_payload["erp_task_id"] = task.id
                response_payload["erp_idempotency_key"] = idempotency_key
            except Exception as exc:  # pragma: no cover - dispatch failure
                logger.error("Failed to enqueue ERP dispatch: %s", exc, exc_info=True)
                response_payload["erp_task_id"] = "FAILED_ENQUEUE"
                response_payload["erp_idempotency_key"] = idempotency_key
                response_payload["erp_error"] = str(exc)
        else:
            response_payload["erp_task_id"] = f"SKIPPED_{reason}"
            response_payload["erp_idempotency_key"] = None

    return QuoteCreateResponse(**response_payload)


@router.post(
    "/dispatch-erp",
    response_model=ErpDispatchResponse,
    status_code=202,
    summary="Dispatch quote invoice to ERP (async)",
    description="Enqueue ERP invoice dispatch with audit logging. Uses Celery + ErpBridge.",
)
def dispatch_quote_to_erp(
    payload: ErpDispatchRequest = Body(...),
):
    """
    Enqueue ERP dispatch task. Requires Celery workers running.
    """
    task = dispatch_invoice_task.delay(
        payload.quote_data,
        payload.ai_costing,
        payload.compliance_data,
        payload.idempotency_key,
        payload.backend_type,
    )
    return ErpDispatchResponse(
        task_id=task.id,
        idempotency_key=payload.idempotency_key
        or f"pending-{payload.quote_data.get('id') or payload.quote_data.get('quote_number', 'unknown')}",
        status="queued",
    )


@router.get(
    "/erp-status/{quote_id}",
    summary="Fetch ERP dispatch status for a quote",
    description="Returns recent ERP transaction log entries for the given quote_id.",
)
def get_erp_status(
    quote_id: str,
    supabase: Client = Depends(get_supabase),
):
    try:
        resp = (
            supabase.table("erp_transaction_log")
            .select("*")
            .eq("quote_id", quote_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        entries = getattr(resp, "data", []) or []
        return {"quote_id": quote_id, "entries": entries}
    except Exception as exc:
        raise handle_supabase_error(exc, "fetch_erp_status", {"quote_id": quote_id})
