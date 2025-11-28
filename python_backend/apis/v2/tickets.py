"""Unified Tickets API (v2)

Provides endpoints for creating and managing unified service tickets.
These endpoints build on the UnifiedTicketService abstraction.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
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
from apis.v2.services.ticket_service import TicketService
from apis.v2.core.errors import (
    TicketNotFoundError,
    TicketValidationError,
    TicketPermissionError,
    V2ForbiddenError,
    handle_supabase_error,
    create_error_context,
    COMMON_ERROR_RESPONSES
)

# Dependency providers
from apis.v2.deps import get_supabase, get_current_user


def _user_uuid(current_user: Dict[str, Any]) -> UUID:
    """Extract UUID from user claims, falling back to 'sub' when 'id' is absent."""
    raw = current_user.get("id") or current_user.get("sub")
    return UUID(raw)


router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.get("/health")
async def tickets_health_check() -> Dict[str, str]:
    """
    Lightweight health check for the Tickets service.

    This endpoint does not require authentication and is intended for
    smoke tests and uptime monitoring. It does not expose any sensitive
    data or ticket contents.
    """
    return {"status": "healthy"}


def _service(supabase: Client) -> TicketService:
    return TicketService(supabase)


@router.post(
    "/support",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Create Support Ticket",
    description="""
    Create a new support ticket for technical issues, general inquiries, or customer support requests.
    
    **Use Cases:**
    - Report equipment malfunctions
    - Request technical assistance
    - General customer support inquiries
    - Documentation or training requests
    
    **Required Fields:**
    - `title`: Brief description of the issue
    - `payload.priority`: Priority level (low, medium, high, urgent, critical)
    
    **Optional Fields:**
    - `description`: Detailed description of the issue
    - `machine_id`: Link to specific machine if applicable
    - `machine_serial_number`: Machine serial number for reference
    """
)
def create_support_ticket(
    request: Request,
    ticket: SupportTicketCreate,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new support ticket."""
    try:
        svc = _service(supabase)
        return svc.create_ticket(
            category=ticket.category,
            payload=ticket.payload,
            user_id=_user_uuid(current_user),
        )
    except (TicketValidationError, TicketPermissionError):
        # Re-raise our custom errors directly
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="create_support_ticket",
            additional_data={
                "category": (
                    ticket.category.value
                    if hasattr(ticket.category, 'value')
                    else str(ticket.category)
                )
            }
        )
        raise handle_supabase_error(e, "create_ticket", context)


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
        user_id=_user_uuid(current_user),
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
        user_id=_user_uuid(current_user),
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
        user_id=_user_uuid(current_user),
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
        user_id=_user_uuid(current_user),
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
        user_id=_user_uuid(current_user),
        related_quote_id=ticket.related_quote_id,
    )


@router.get(
    "/{ticket_id}",
    response_model=TicketResponse,
    responses=COMMON_ERROR_RESPONSES
)
def get_ticket(
    request: Request,
    ticket_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get a specific ticket by ID."""
    try:
        svc = _service(supabase)
        ticket = svc.get_ticket(ticket_id, _user_uuid(current_user))
        if not ticket:
            context = create_error_context(
                request=request,
                user_id=str(_user_uuid(current_user)),
                operation="get_ticket",
                resource_id=str(ticket_id)
            )
            raise TicketNotFoundError(ticket_id, context)
        return ticket
    except (TicketNotFoundError, TicketPermissionError):
        # Re-raise our custom errors directly
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_ticket",
            resource_id=str(ticket_id)
        )
        raise handle_supabase_error(e, "get_ticket", context)


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
    return svc.get_user_tickets(_user_uuid(current_user), filters)


@router.post("/{ticket_id}/status", response_model=TicketResponse)
def update_status(
    ticket_id: UUID,
    status_param: TicketStatus = Body(..., embed=True, alias="status"),
    resolution_summary: Optional[str] = Body(None, embed=True),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    svc = _service(supabase)
    if not svc.get_ticket(ticket_id, _user_uuid(current_user)):
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
    responses=COMMON_ERROR_RESPONSES
)
def assign_ticket(
    request: Request,
    ticket_id: UUID,
    assignee_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Assign a ticket to a specific user."""
    user_role = current_user.get("role")
    if user_role not in {"admin", "technician", "sales_rep"}:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            user_role=user_role,
            operation="assign_ticket",
            resource_id=str(ticket_id)
        )
        raise V2ForbiddenError(
            message="Only staff can assign tickets",
            required_role="admin, technician, or sales_rep",
            user_role=user_role,
            context=context
        )

    svc = _service(supabase)
    try:
        updated = svc.assign_ticket(
            ticket_id, assignee_id, _user_uuid(current_user)
        )
        if not updated:
            context = create_error_context(
                request=request,
                user_id=str(_user_uuid(current_user)),
                operation="assign_ticket",
                resource_id=str(ticket_id),
                additional_data={"assignee_id": str(assignee_id)}
            )
            raise TicketValidationError(
                message="Failed to assign ticket",
                context=context
            )
        return updated
    except (TicketValidationError, TicketPermissionError, V2ForbiddenError):
        # Re-raise our custom errors directly
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="assign_ticket",
            resource_id=str(ticket_id),
            additional_data={"assignee_id": str(assignee_id)}
        )
        raise handle_supabase_error(e, "assign_ticket", context)


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
    if not svc.get_ticket(ticket_id, _user_uuid(current_user)):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return svc.add_message(
        ticket_id,
        _user_uuid(current_user),
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
