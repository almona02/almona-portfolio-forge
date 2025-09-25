from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timezone

from supabase import Client  # type: ignore

from apis.v2.repositories.tickets import TicketsRepository
from apis.v2.core.errors import (
    TicketValidationError,
    SupabaseError
)
from models.api_v2_models import (
    TicketResponse,
    TicketCategory,
    TicketPriority,
    TicketStatus,
    UnifiedTicketBase,
)


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class TicketService:
    """Service layer for tickets, using repository for data access."""

    def __init__(self, supabase: Client):
        self._repo = TicketsRepository(supabase)

    # Creation
    def create_ticket(
        self,
        category: TicketCategory,
        payload: UnifiedTicketBase,
        user_id: UUID,
        **extra: Any,
    ) -> TicketResponse:
        """Create a ticket with comprehensive error handling."""
        try:
            # Validate required fields
            if not payload.title:
                raise TicketValidationError(
                    message="Ticket title is required",
                    field="title"
                )

            if isinstance(payload.priority, TicketPriority):
                priority_value = payload.priority.value
            else:
                priority_value = str(payload.priority)

            data: Dict[str, Any] = {
                "category": category.value,
                "title": payload.title,
                "description": payload.description,
                "priority": priority_value,
                "machine_id": payload.machine_id,
                "machine_serial_number": payload.machine_serial_number,
                "user_id": str(user_id),
                "status": TicketStatus.open.value,
                "created_at": utcnow_iso(),
                "updated_at": utcnow_iso(),
            }

            allowed_extras = {
                "scheduled_for",
                "maintenance_metadata",
                "severity",
                "related_product_id",
                "related_quote_id",
                "related_service_ticket_id",
                "maintenance_type",
            }
            for k, v in extra.items():
                if k in allowed_extras and v is not None:
                    data[k] = v

            try:
                row = self._repo.insert_ticket(data)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to create ticket",
                    operation="insert_ticket",
                    original_error=e
                )

            return TicketResponse(**row)
        
        except (TicketValidationError, SupabaseError):
            # Re-raise our custom errors
            raise
        except Exception as e:
            # Convert unexpected errors to SupabaseError
            raise SupabaseError(
                message="Unexpected error in ticket creation",
                operation="create_ticket",
                original_error=e
            )

    # Retrieval
    def get_ticket(
        self, ticket_id: UUID, user_id: UUID
    ) -> Optional[TicketResponse]:
        """Get a ticket by ID with permission checking."""
        try:
            ticket = self._repo.get_ticket_by_id(ticket_id)
            if not ticket:
                return None

            # Check permissions
            if ticket.get("user_id") != str(user_id):
                role = self._repo.get_user_role(user_id)
                if role not in ["admin", "technician", "sales_rep"]:
                    return None

            return TicketResponse(**ticket)
        
        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve ticket",
                operation="get_ticket_by_id",
                original_error=e
            )

    def get_user_tickets(
        self, user_id: UUID, filters: Optional[Dict[str, Any]] = None
    ) -> List[TicketResponse]:
        rows = self._repo.list_user_tickets(user_id, filters)
        return [TicketResponse(**row) for row in rows]

    # Updates
    def update_ticket_status(
        self,
        ticket_id: UUID,
        status: TicketStatus,
        resolution_summary: Optional[str] = None
    ) -> Optional[TicketResponse]:
        update: Dict[str, Any] = {
            "status": status.value,
            "updated_at": utcnow_iso(),
        }
        if status in {TicketStatus.resolved, TicketStatus.closed}:
            update["resolved_at"] = utcnow_iso()
            if resolution_summary:
                update["resolution_summary"] = resolution_summary
        row = self._repo.update_ticket_fields(ticket_id, update)
        return TicketResponse(**row) if row else None

    def assign_ticket(
        self, ticket_id: UUID, assignee_id: UUID, assigned_by: UUID
    ) -> Optional[TicketResponse]:
        """Assign a ticket to a user with error handling."""
        try:
            update = {
                "assigned_to": str(assignee_id),
                "assigned_by": str(assigned_by),
                "assigned_at": utcnow_iso(),
                "status": TicketStatus.in_progress.value,
                "updated_at": utcnow_iso(),
            }
            
            try:
                row = self._repo.update_ticket_fields(ticket_id, update)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to assign ticket",
                    operation="update_ticket_fields",
                    original_error=e
                )

            return TicketResponse(**row) if row else None
        
        except SupabaseError:
            # Re-raise our custom errors
            raise
        except Exception as e:
            # Convert unexpected errors to SupabaseError
            raise SupabaseError(
                message="Unexpected error in ticket assignment",
                operation="assign_ticket",
                original_error=e
            )

    # Messages
    def add_message(
        self,
        ticket_id: UUID,
        author_id: UUID,
        message: str,
        message_type: str = "message",
        is_internal: bool = False,
    ) -> Dict[str, Any]:
        msg = {
            "ticket_id": str(ticket_id),
            "author_id": str(author_id),
            "message": message,
            "message_type": message_type,
            "is_internal_note": is_internal,
            "created_at": utcnow_iso(),
        }
        return self._repo.insert_message(msg)

    def list_messages(self, ticket_id: UUID) -> List[Dict[str, Any]]:
        return self._repo.list_messages(ticket_id)


