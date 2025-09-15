"""Unified Ticket Service

Provides CRUD and messaging operations for unified service tickets.
Assumes Supabase Python client (postgrest) style synchronous API. If an async
client is introduced later, adapt calls accordingly.
"""
from __future__ import annotations

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timezone

from supabase import Client

from models.api_v2_models import (
    UnifiedTicketBase,
    TicketResponse,
    TicketCategory,
    TicketPriority,
    TicketStatus,
)

ISO = "%Y-%m-%dT%H:%M:%S.%fZ"


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class UnifiedTicketService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------
    def create_ticket(
        self,
        category: TicketCategory,
        payload: UnifiedTicketBase,
        user_id: UUID,
        **extra: Any,
    ) -> TicketResponse:
        """Create a new unified ticket.

        Args:
            category: TicketCategory enum identifying ticket type.
            payload: Core ticket data (title, description, priority, machine
                refs).
            user_id: UUID of the creating user.
            extra: Additional category specific fields (e.g. scheduled_for,
                metadata).
        """
        if isinstance(payload.priority, TicketPriority):
            priority_value = payload.priority.value
        else:
            priority_value = str(payload.priority)

        data = {
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

        # Merge allowed extra fields
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

        response = (
            self.supabase.table("service_tickets").insert(data).execute()
        )
        if not getattr(response, "data", None):
            raise ValueError("Failed to create ticket")
        return TicketResponse(**response.data[0])

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------
    def get_ticket(
        self, ticket_id: UUID, user_id: UUID
    ) -> Optional[TicketResponse]:
        """Fetch a ticket enforcing user access (owner or staff roles)."""
        resp = (
            self.supabase.table("service_tickets")
            .select("*")
            .eq("id", str(ticket_id))
            .execute()
        )
        if not resp.data:
            return None
        ticket = resp.data[0]

        if ticket.get("user_id") != str(user_id):
            # fetch role for access
            role_resp = (
                self.supabase.table("profiles")
                .select("role")
                .eq("id", str(user_id))
                .execute()
            )
            if not role_resp.data or role_resp.data[0].get("role") not in [
                "admin",
                "technician",
                "sales_rep",
            ]:
                return None
        return TicketResponse(**ticket)

    def get_user_tickets(
        self, user_id: UUID, filters: Optional[Dict[str, Any]] = None
    ) -> List[TicketResponse]:
        """List tickets for a user with optional key=value filters."""
        query = (
            self.supabase.table("service_tickets")
            .select("*")
            .eq("user_id", str(user_id))
        )
        if filters:
            for key, value in filters.items():
                if value is not None:
                    query = query.eq(key, value)
        resp = query.order("created_at", desc=True).execute()
        return [TicketResponse(**row) for row in resp.data or []]

    # ------------------------------------------------------------------
    # Updates
    # ------------------------------------------------------------------
    def update_ticket_status(
        self,
        ticket_id: UUID,
        status: TicketStatus,
        resolution_summary: Optional[str] = None,
    ) -> Optional[TicketResponse]:
        """Update status; set resolution timestamps for resolved/closed."""
        update = {
            "status": status.value,
            "updated_at": utcnow_iso(),
        }
        if status in {TicketStatus.resolved, TicketStatus.closed}:
            update["resolved_at"] = utcnow_iso()
            if resolution_summary:
                update["resolution_summary"] = resolution_summary
        resp = (
            self.supabase.table("service_tickets")
            .update(update)
            .eq("id", str(ticket_id))
            .execute()
        )
        if not resp.data:
            return None
        return TicketResponse(**resp.data[0])

    def assign_ticket(
        self, ticket_id: UUID, assignee_id: UUID, assigned_by: UUID
    ) -> Optional[TicketResponse]:
        """Assign ticket to staff (status -> in_progress)."""
        update = {
            "assigned_to": str(assignee_id),
            "assigned_by": str(assigned_by),
            "assigned_at": utcnow_iso(),
            "status": TicketStatus.in_progress.value,
            "updated_at": utcnow_iso(),
        }
        resp = (
            self.supabase.table("service_tickets")
            .update(update)
            .eq("id", str(ticket_id))
            .execute()
        )
        if not resp.data:
            return None
        return TicketResponse(**resp.data[0])

    # ------------------------------------------------------------------
    # Messaging
    # ------------------------------------------------------------------
    def add_message(
        self,
        ticket_id: UUID,
        author_id: UUID,
        message: str,
        message_type: str = "message",
        is_internal: bool = False,
    ) -> Dict[str, Any]:
        """Add a message or internal note to a ticket."""
        msg = {
            "ticket_id": str(ticket_id),
            "author_id": str(author_id),
            "message": message,
            "message_type": message_type,
            "is_internal_note": is_internal,
            "created_at": utcnow_iso(),
        }
        resp = self.supabase.table("ticket_messages").insert(msg).execute()
        if not resp.data:
            raise ValueError("Failed to add message")
        return resp.data[0]

    def list_messages(self, ticket_id: UUID) -> List[Dict[str, Any]]:
        """List messages for a ticket (chronological)."""
        resp = (
            self.supabase.table("ticket_messages")
            .select("*")
            .eq("ticket_id", str(ticket_id))
            .order("created_at", desc=False)
            .execute()
        )
        return resp.data or []

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------
    def change_priority(
        self, ticket_id: UUID, priority: TicketPriority
    ) -> Optional[TicketResponse]:
        resp = (
            self.supabase.table("service_tickets")
            .update({"priority": priority.value, "updated_at": utcnow_iso()})
            .eq("id", str(ticket_id))
            .execute()
        )
        if not resp.data:
            return None
        return TicketResponse(**resp.data[0])

    def link_related_ticket(
        self, ticket_id: UUID, related_service_ticket_id: UUID
    ) -> Optional[TicketResponse]:
        resp = (
            self.supabase.table("service_tickets")
            .update(
                {
                    "related_service_ticket_id": str(
                        related_service_ticket_id
                    ),
                    "updated_at": utcnow_iso(),
                }
            )
            .eq("id", str(ticket_id))
            .execute()
        )
        if not resp.data:
            return None
        return TicketResponse(**resp.data[0])

    def add_maintenance_metadata(
        self,
        ticket_id: UUID,
        metadata: Dict[str, Any],
    ) -> Optional[TicketResponse]:
        resp = (
            self.supabase.table("service_tickets")
            .update(
                {
                    "maintenance_metadata": metadata,
                    "updated_at": utcnow_iso(),
                }
            )
            .eq("id", str(ticket_id))
            .execute()
        )
        if not resp.data:
            return None
        return TicketResponse(**resp.data[0])
