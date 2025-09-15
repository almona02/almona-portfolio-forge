"""Unified Tickets API (v2)

Provides endpoints for creating and managing unified service tickets.
These endpoints build on the UnifiedTicketService abstraction.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional, Dict, Any
from uuid import UUID

from supabase import Client

from models.api_v2_models import (
    SupportTicketCreate,
    PreventiveMaintenanceTicketCreate,
    ScheduledMaintenanceTicketCreate,
    EmergencyServiceTicketCreate,
    ProductQuoteTicketCreate,
    AddToQuoteTicketCreate,
    TicketResponse,
    TicketStatus,
    TicketCategory,
)
from services.unified_ticket_service import UnifiedTicketService

# Dependency providers
from dependencies import get_supabase, get_current_user

router = APIRouter(prefix="/tickets", tags=["Tickets"])


def _service(supabase: Client) -> UnifiedTicketService:
    return UnifiedTicketService(supabase)


@router.post(
    "/support",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_support_ticket(
    ticket: SupportTicketCreate,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    svc = _service(supabase)
    return svc.create_ticket(
        category=ticket.category,
        payload=ticket.payload,
        user_id=UUID(current_user["id"]),
    )


@router.post(
    "/maintenance/preventive",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_preventive_maintenance_ticket(
    ticket: PreventiveMaintenanceTicketCreate,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    svc = _service(supabase)
    return svc.create_ticket(
        category=ticket.category,
        payload=ticket.payload,
        user_id=UUID(current_user["id"]),
        maintenance_metadata=ticket.maintenance_metadata.dict(
            exclude_unset=True
        ),
    )


@router.post(
    "/maintenance/scheduled",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_scheduled_maintenance_ticket(
    ticket: ScheduledMaintenanceTicketCreate,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    svc = _service(supabase)
    return svc.create_ticket(
        category=ticket.category,
        payload=ticket.payload,
        user_id=UUID(current_user["id"]),
        scheduled_for=ticket.scheduled_for.isoformat(),
        maintenance_metadata=ticket.maintenance_metadata.dict(
            exclude_unset=True
        ),
    )


@router.post(
    "/emergency",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_emergency_ticket(
    ticket: EmergencyServiceTicketCreate,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    svc = _service(supabase)
    return svc.create_ticket(
        category=ticket.category,
        payload=ticket.payload,
        user_id=UUID(current_user["id"]),
        severity=(
            ticket.severity.value
            if hasattr(ticket.severity, "value")
            else ticket.severity
        ),
    )


@router.post(
    "/product-quote",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product_quote_ticket(
    ticket: ProductQuoteTicketCreate,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    svc = _service(supabase)
    return svc.create_ticket(
        category=ticket.category,
        payload=ticket.payload,
        user_id=UUID(current_user["id"]),
        related_product_id=ticket.related_product_id,
    )


@router.post(
    "/add-to-quote",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_add_to_quote_ticket(
    ticket: AddToQuoteTicketCreate,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    svc = _service(supabase)
    return svc.create_ticket(
        category=ticket.category,
        payload=ticket.payload,
        user_id=UUID(current_user["id"]),
        related_quote_id=ticket.related_quote_id,
    )


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    svc = _service(supabase)
    ticket = svc.get_ticket(ticket_id, UUID(current_user["id"]))
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.get("/", response_model=List[TicketResponse])
def list_tickets(
    category: Optional[TicketCategory] = None,
    status_param: Optional[TicketStatus] = None,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    svc = _service(supabase)
    filters: Dict[str, Any] = {}
    if category:
        filters["category"] = category.value
    if status_param:
        filters["status"] = status_param.value
    return svc.get_user_tickets(UUID(current_user["id"]), filters)


@router.post("/{ticket_id}/status", response_model=TicketResponse)
def update_status(
    ticket_id: UUID,
    status_param: TicketStatus = Body(..., embed=True, alias="status"),
    resolution_summary: Optional[str] = Body(None, embed=True),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    svc = _service(supabase)
    if not svc.get_ticket(ticket_id, UUID(current_user["id"])):
        raise HTTPException(status_code=404, detail="Ticket not found")
    updated = svc.update_ticket_status(
        ticket_id, status_param, resolution_summary
    )
    if not updated:
        raise HTTPException(
            status_code=400, detail="Failed to update ticket status"
        )
    return updated


@router.post(
    "/{ticket_id}/assign/{assignee_id}",
    response_model=TicketResponse,
)
def assign_ticket(
    ticket_id: UUID,
    assignee_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if current_user.get("role") not in {"admin", "technician", "sales_rep"}:
        raise HTTPException(
            status_code=403, detail="Only staff can assign tickets"
        )
    svc = _service(supabase)
    updated = svc.assign_ticket(
        ticket_id, assignee_id, UUID(current_user["id"])
    )
    if not updated:
        raise HTTPException(status_code=400, detail="Failed to assign ticket")
    return updated


@router.post("/{ticket_id}/messages")
def add_message(
    ticket_id: UUID,
    message: str = Body(..., embed=True),
    message_type: str = Body("message", embed=True),
    is_internal: bool = Body(False, embed=True),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    svc = _service(supabase)
    if not svc.get_ticket(ticket_id, UUID(current_user["id"])):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return svc.add_message(
        ticket_id,
        UUID(current_user["id"]),
        message,
        message_type,
        is_internal,
    )


@router.get("/{ticket_id}/messages")
def list_messages(
    ticket_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    svc = _service(supabase)
    if not svc.get_ticket(ticket_id, UUID(current_user["id"])):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return svc.list_messages(ticket_id)
