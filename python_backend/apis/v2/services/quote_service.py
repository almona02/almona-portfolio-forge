from __future__ import annotations

from typing import Any, Dict, List, Optional
from supabase import Client  # type: ignore

from apis.v2.repositories.quotes import QuotesRepository
from apis.v2.core.errors import (
    QuoteValidationError,
    QuoteAlreadyExistsError,
    SupabaseError
)


class QuoteService:
    """Service layer orchestrating quote creation and related operations."""

    def __init__(self, supabase: Client):
        self._repo = QuotesRepository(supabase)

    def create_quote_with_items(
        self, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a quote with items, with comprehensive error handling."""
        try:
            # Validate required fields
            if not payload.get("contact_name"):
                raise QuoteValidationError(
                    message="Contact name is required",
                    field="contact_name"
                )
            
            if not payload.get("contact_email"):
                raise QuoteValidationError(
                    message="Contact email is required",
                    field="contact_email"
                )

            # 1) Estimate header total from provided items
            header_estimated_total: float = 0.0
            for group in (
                payload.get("products") or [],
                payload.get("services") or []
            ):
                for item in group:
                    price = item.get("unit_price")
                    qty = max(int(item.get("quantity", 1)), 1)
                    if price is not None:
                        header_estimated_total += float(price) * qty

            insert_data: Dict[str, Any] = {
                "contact_name": payload.get("contact_name"),
                "contact_email": payload.get("contact_email"),
                "contact_phone": payload.get("contact_phone"),
                "company": payload.get("company"),
                "project_description": payload.get("project_description"),
                "urgency": payload.get("urgency"),
                "delivery_location": payload.get("delivery_location"),
                "special_requirements": payload.get("special_requirements"),
                "related_service_ticket_id": payload.get(
                    "related_service_ticket_id"
                ),
                "machine_id": payload.get("machine_id"),
                "total_amount": header_estimated_total or None,
            }

            # 2) Insert header
            try:
                row = self._repo.insert_quote(insert_data)
            except Exception as e:
                error_msg = str(e).lower()
                if "duplicate" in error_msg or "unique" in error_msg:
                    raise QuoteAlreadyExistsError(
                        quote_number=payload.get("quote_number", "unknown")
                    )
                raise SupabaseError(
                    message="Failed to create quote",
                    operation="insert_quote",
                    original_error=e
                )

            quote_id = row.get("id")
            if not quote_id:
                raise SupabaseError(
                    message="Quote ID missing after insert",
                    operation="insert_quote"
                )

            # 3) Prepare and insert items
            items_payload: List[Dict[str, Any]] = []
            for item in payload.get("products") or []:
                product_id = item.get("product_id")
                if not product_id:
                    continue
                unit_price = item.get("unit_price")
                quantity = int(item.get("quantity", 1))
                items_payload.append(
                    {
                        "quote_id": quote_id,
                        "product_id": product_id,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total_price": (
                        (unit_price or 0) * quantity
                        if unit_price is not None else None
                    ),
                }
                )

            for item in payload.get("services") or []:
                service_id = item.get("service_id")
                if not service_id:
                    continue
                unit_price = item.get("unit_price")
                quantity = int(item.get("quantity", 1))
                items_payload.append(
                    {
                        "quote_id": quote_id,
                        "service_id": service_id,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total_price": (
                        (unit_price or 0) * quantity
                        if unit_price is not None else None
                    ),
                }
                )

            if items_payload:
                try:
                    self._repo.insert_quote_items(items_payload)
                except Exception as e:
                    raise SupabaseError(
                        message="Failed to insert quote items",
                        operation="insert_quote_items",
                        original_error=e
                    )

            # 4) Recalculate and persist total when items have prices
            recalculated_total: Optional[float] = None
            if items_payload:
                recalculated_total = sum(
                    i["total_price"] for i in items_payload
                    if i.get("total_price")
                )
                try:
                    self._repo.update_quote_total(quote_id, recalculated_total)
                except Exception:
                    # non-fatal if update fails
                    pass

            # 5) return full response shape
            return {
                "id": row.get("id"),
                "quote_number": row.get("quote_number"),
                "digital_twin_code": row.get("digital_twin_code"),
                "portal_reference": row.get("portal_reference"),
                "status": row.get("status", "pending"),
                "total_amount": (
                    recalculated_total
                    if recalculated_total is not None
                    else row.get("total_amount")
                ),
                "related_service_ticket_id": row.get(
                    "related_service_ticket_id"
                ),
                "created_at": row.get("created_at"),
            }
        
        except (QuoteValidationError, QuoteAlreadyExistsError, SupabaseError):
            # Re-raise our custom errors
            raise
        except Exception as e:
            # Convert unexpected errors to SupabaseError
            raise SupabaseError(
                message="Unexpected error in quote creation",
                operation="create_quote_with_items",
                original_error=e
            )
