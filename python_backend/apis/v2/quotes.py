from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
import os

from supabase import create_client, Client  # type: ignore
from models.api_v2_models import (
    QuoteLookupResponse,
    QuoteSummary,
)
from fastapi import Body
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List as _List


class QuoteItem(BaseModel):
    product_id: Optional[str] = None
    service_id: Optional[str] = None
    quantity: int = 1
    unit_price: Optional[float] = None

    @property
    def total(self) -> Optional[float]:  # convenience
        if self.unit_price is None:
            return None
        return self.unit_price * self.quantity


class QuoteCreateRequest(BaseModel):
    products: _List[QuoteItem] = Field(default_factory=list)
    services: _List[QuoteItem] = Field(default_factory=list)
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    company: Optional[str] = None
    project_description: Optional[str] = None
    urgency: Optional[str] = Field(default="standard")
    delivery_location: Optional[str] = None
    special_requirements: Optional[str] = None
    related_service_ticket_id: Optional[str] = Field(
        default=None, description="Link to an existing service_ticket if any"
    )
    machine_id: Optional[str] = None


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

SUPABASE_URL = os.getenv("SUPABASE_URL") or ""
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
    or ""
)


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Supabase environment variables not configured",
        )
    return create_client(SUPABASE_URL, SUPABASE_KEY)


@router.get("/lookup", response_model=QuoteLookupResponse)
def lookup_quotes(
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
    except Exception as exc:  # pragma: no cover
        raise HTTPException(
            status_code=500, detail=f"RPC failed: {exc}"
        ) from exc

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


@router.post("/create", response_model=QuoteCreateResponse, status_code=201)
def create_quote(
    payload: QuoteCreateRequest = Body(...),
    supabase: Client = Depends(get_supabase),
):
    """Create a quote with optional line items.

    Steps:
    1. Insert quote header (trigger assigns twin code / reference).
    2. Batch insert quote_items for products & services if provided.
    3. Recalculate total based on inserted items when any unit_price present.
    """

    # Initial client-calculated total (fallback if items missing prices)
    header_estimated_total = 0.0
    for group in (payload.products, payload.services):
        for item in group:
            if item.unit_price is not None:
                header_estimated_total += (
                    item.unit_price * max(item.quantity, 1)
                )

    insert_data: Dict[str, Any] = {
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
        "total_amount": header_estimated_total or None,
    }

    # 1. Insert quote header
    try:
        result = supabase.table("quotes").insert(insert_data).execute()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(
            status_code=500, detail=f"Insert failed: {exc}"
        ) from exc

    rows = getattr(result, "data", []) or []
    if not rows:
        raise HTTPException(
            status_code=500, detail="Quote insert returned no data"
        )
    row = rows[0]
    quote_id = row.get("id")
    if not quote_id:
        raise HTTPException(status_code=500, detail="Quote id missing")

    # 2. Prepare items for batch insert (skip entries lacking id refs)
    items_payload = []
    for item in payload.products:
        if not item.product_id:
            continue
        items_payload.append(
            {
                "quote_id": quote_id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total_price": (item.unit_price or 0) * item.quantity
                if item.unit_price is not None
                else None,
            }
        )
    for item in payload.services:
        # Represent services similarly (service_id column assumed)
        if not item.service_id:
            continue
        items_payload.append(
            {
                "quote_id": quote_id,
                "service_id": item.service_id,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total_price": (item.unit_price or 0) * item.quantity
                if item.unit_price is not None
                else None,
            }
        )

    if items_payload:
        try:
            supabase.table("quote_items").insert(items_payload).execute()
        except Exception as exc:  # pragma: no cover
            raise HTTPException(
                status_code=500, detail=f"Quote items insert failed: {exc}"
            ) from exc

    # 3. Recalculate total if we have item rows with prices
    recalculated_total = None
    if items_payload:
        # Sum only non-null total_price values we computed
        recalculated_total = sum(
            [i["total_price"] for i in items_payload if i.get("total_price")]
        )
        try:
            supabase.table("quotes").update(
                {"total_amount": recalculated_total}
            ).eq("id", quote_id).execute()
        except Exception:  # silent fallback
            pass

    return QuoteCreateResponse(
        id=row.get("id"),
        quote_number=row.get("quote_number"),
        digital_twin_code=row.get("digital_twin_code"),
        portal_reference=row.get("portal_reference"),
        status=row.get("status", "pending"),
        total_amount=recalculated_total
        if recalculated_total is not None
        else row.get("total_amount"),
        related_service_ticket_id=row.get("related_service_ticket_id"),
        created_at=row.get("created_at"),
    )
