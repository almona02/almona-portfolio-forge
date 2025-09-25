from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from supabase import Client  # type: ignore


class TicketsRepository:
    """Persistence layer for service tickets and related entities."""

    def __init__(self, supabase: Client):
        self._db = supabase

    # Creation
    def insert_ticket(self, data: Dict[str, Any]) -> Dict[str, Any]:
        resp = self._db.table("service_tickets").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create ticket")
        return rows[0]

    # Retrieval
    def get_ticket_by_id(self, ticket_id: UUID) -> Optional[Dict[str, Any]]:
        resp = (
            self._db.table("service_tickets").select("*").eq("id", str(ticket_id)).execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def get_user_role(self, user_id: UUID) -> Optional[str]:
        resp = (
            self._db.table("profiles").select("role").eq("id", str(user_id)).execute()
        )
        rows = getattr(resp, "data", []) or []
        if not rows:
            return None
        return rows[0].get("role")

    def list_user_tickets(self, user_id: UUID, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        query = self._db.table("service_tickets").select("*").eq("user_id", str(user_id))
        if filters:
            for key, value in filters.items():
                if value is not None:
                    query = query.eq(key, value)
        resp = query.order("created_at", desc=True).execute()
        return getattr(resp, "data", []) or []

    # Updates
    def update_ticket_fields(self, ticket_id: UUID, update: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        resp = self._db.table("service_tickets").update(update).eq("id", str(ticket_id)).execute()
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    # Messages
    def insert_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        resp = self._db.table("ticket_messages").insert(message).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to add message")
        return rows[0]

    def list_messages(self, ticket_id: UUID) -> List[Dict[str, Any]]:
        resp = (
            self._db.table("ticket_messages")
            .select("*")
            .eq("ticket_id", str(ticket_id))
            .order("created_at", desc=False)
            .execute()
        )
        return getattr(resp, "data", []) or []


