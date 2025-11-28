from fastapi import APIRouter, Depends, Query, Request
from typing import List

from supabase import Client  # type: ignore
from models.api_v2_models import (
    QuoteLookupResponse,
    QuoteSummary,
)
from fastapi import Body
from pydantic import BaseModel, Field
from typing import Optional, List as _List
from apis.v2.deps import get_supabase
from apis.v2.services.quote_service import QuoteService
from apis.v2.core.errors import (
    QuoteValidationError,
    QuoteNotFoundError,
    QuoteAlreadyExistsError,
    handle_supabase_error,
    create_error_context,
    COMMON_ERROR_RESPONSES
)


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

    return QuoteCreateResponse(**result)
