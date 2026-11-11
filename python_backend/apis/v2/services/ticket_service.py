from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timezone

from supabase import Client  # type: ignore

from apis.v2.repositories.tickets import TicketsRepository
from apis.v2.core.errors import (
    TicketValidationError,
    SupabaseError,
)
from models.api_v2_models import (
    TicketResponse,
    TicketCategory,
    TicketPriority,
    TicketStatus,
    UnifiedTicketBase,
)
from services.sla_calculator import calculate_sla_deadlines
from services.ticket_lifecycle import validate_transition


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class TicketService:
    """Service layer for tickets, using repository for data access."""

    def __init__(self, supabase: Client):
        self._repo = TicketsRepository(supabase)

    @staticmethod
    def _payload_dict(payload: Any) -> Dict[str, Any]:
        if isinstance(payload, dict):
            return payload
        if hasattr(payload, "model_dump"):
            return payload.model_dump(exclude_unset=False)
        if hasattr(payload, "dict"):
            return payload.dict()
        return {
            "title": getattr(payload, "title", None),
            "description": getattr(payload, "description", None),
            "priority": getattr(payload, "priority", None),
            "machine_id": getattr(payload, "machine_id", None),
            "machine_serial_number": getattr(payload, "machine_serial_number", None),
        }

    @staticmethod
    def _coerce_category(raw: Any) -> TicketCategory:
        value = str(raw or "support")
        try:
            return TicketCategory(value)
        except ValueError:
            # Legacy DB rows may use type labels like "general"/"technical"
            return TicketCategory.SUPPORT

    @staticmethod
    def _coerce_status(raw: Any) -> TicketStatus:
        value = str(raw or TicketStatus.OPEN.value)
        try:
            return TicketStatus(value)
        except ValueError:
            return TicketStatus.OPEN

    @classmethod
    def _to_response(cls, row: Dict[str, Any]) -> TicketResponse:
        """Map flat service_tickets row → TicketResponse (nested payload)."""
        payload = {
            "title": row.get("title"),
            "description": row.get("description"),
            "priority": row.get("priority"),
            "machine_serial_number": row.get("machine_serial_number"),
            "machine_model": row.get("machine_model"),
            "assigned_to": row.get("assigned_to"),
            "ticket_number": row.get("ticket_number"),
        }
        payload = {k: v for k, v in payload.items() if v is not None}
        return TicketResponse(
            id=str(row["id"]),
            category=cls._coerce_category(row.get("category") or row.get("type")),
            status=cls._coerce_status(row.get("status")),
            user_id=str(row["user_id"]),
            created_at=str(row.get("created_at") or ""),
            updated_at=str(row.get("updated_at") or row.get("created_at") or ""),
            payload=payload,
        )

    # Creation
    def create_ticket(
        self,
        category: TicketCategory,
        payload: UnifiedTicketBase | Dict[str, Any],
        user_id: UUID,
        **extra: Any,
    ) -> TicketResponse:
        """Create a ticket with comprehensive error handling."""
        try:
            payload_data = self._payload_dict(payload)
            title = payload_data.get("title")
            if not title:
                raise TicketValidationError(
                    message="Ticket title is required",
                    field="title"
                )

            priority = payload_data.get("priority")
            if isinstance(priority, TicketPriority):
                priority_value = priority.value
            else:
                priority_value = str(priority or TicketPriority.MEDIUM.value)

            created = datetime.now(timezone.utc)
            sla = calculate_sla_deadlines(priority_value, category.value, created)

            # Only columns that exist on public.service_tickets
            data: Dict[str, Any] = {
                "category": category.value,
                "title": title,
                "description": payload_data.get("description"),
                "priority": priority_value,
                "machine_serial_number": payload_data.get("machine_serial_number"),
                "user_id": str(user_id),
                "status": TicketStatus.OPEN.value,
                "type": category.value if category.value in {"technical", "general"} else "general",
                "sla_response_due": sla.response_due.isoformat().replace("+00:00", "Z"),
                "sla_resolution_due": sla.resolution_due.isoformat().replace("+00:00", "Z"),
                "sla_breached": False,
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

            # Strip None values to avoid PostgREST column errors
            data = {k: v for k, v in data.items() if v is not None}

            try:
                row = self._repo.insert_ticket(data)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to create ticket",
                    operation="insert_ticket",
                    original_error=e
                )

            return self._to_response(row)
        
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
                if role not in ["admin", "technician", "sales_rep", "support"]:
                    return None

            return self._to_response(ticket)
        
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
        return [self._to_response(row) for row in rows]

    # Updates
    def update_ticket_status(
        self,
        ticket_id: UUID,
        status: TicketStatus,
        resolution_summary: Optional[str] = None,
        actor_id: Optional[UUID] = None,
    ) -> Optional[TicketResponse]:
        existing = self._repo.get_ticket_by_id(ticket_id)
        if not existing:
            return None
        if actor_id is None:
            raise TicketValidationError(
                message="Actor identity required for governed status updates",
                field="actor_id",
            )

        current_status = existing.get("status", TicketStatus.OPEN.value)
        valid, rationale = validate_transition(current_status, status.value)
        if not valid:
            raise TicketValidationError(
                message=rationale,
                field="status",
            )

        try:
            row = self._repo.govern_ticket_transition(
                ticket_id=ticket_id,
                to_status=status.value,
                actor_id=actor_id,
                rationale=rationale,
                resolution_summary=resolution_summary,
            )
        except Exception as e:
            raise SupabaseError(
                message="Failed to update ticket status via govern_ticket_transition",
                operation="govern_ticket_transition",
                original_error=e,
            )
        return self._to_response(row) if row else None

    def assign_ticket(
        self, ticket_id: UUID, assignee_id: UUID, assigned_by: UUID
    ) -> Optional[TicketResponse]:
        """Assign a ticket via govern_ticket_assign (preserves actor identity)."""
        try:
            existing = self._repo.get_ticket_by_id(ticket_id)
            if not existing:
                return None

            try:
                row = self._repo.govern_ticket_assign(
                    ticket_id=ticket_id,
                    assignee_id=assignee_id,
                    actor_id=assigned_by,
                    rationale=f"Assigned by {assigned_by}",
                )
            except Exception as e:
                raise SupabaseError(
                    message="Failed to assign ticket",
                    operation="govern_ticket_assign",
                    original_error=e
                )

            return self._to_response(row) if row else None
        
        except SupabaseError:
            raise
        except TicketValidationError:
            raise
        except Exception as e:
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


