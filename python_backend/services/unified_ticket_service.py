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
from apis.v2.services.ticket_access import (
    BROAD_STAFF_ROLES,
    can_read_ticket_record,
    can_view_internal_messages,
    filter_messages_for_viewer,
    merge_ticket_rows,
)

ISO = "%Y-%m-%dT%H:%M:%S.%fZ"


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class UnifiedTicketService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    @staticmethod
    def _to_response(row: Dict[str, Any]) -> TicketResponse:
        """Map flat service_tickets row → TicketResponse (nested payload)."""
        if "payload" in row and isinstance(row.get("payload"), dict):
            return TicketResponse(
                id=str(row["id"]),
                category=row.get("category") or TicketCategory.SUPPORT,
                status=row.get("status") or TicketStatus.OPEN,
                user_id=str(row["user_id"]),
                created_at=str(row.get("created_at") or ""),
                updated_at=str(row.get("updated_at") or row.get("created_at") or ""),
                payload=row.get("payload") or {},
            )
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
        category_raw = row.get("category") or row.get("type") or "support"
        try:
            category = TicketCategory(str(category_raw))
        except ValueError:
            category = TicketCategory.SUPPORT
        status_raw = row.get("status") or TicketStatus.OPEN.value
        try:
            status = TicketStatus(str(status_raw))
        except ValueError:
            status = TicketStatus.OPEN
        return TicketResponse(
            id=str(row["id"]),
            category=category,
            status=status,
            user_id=str(row["user_id"]),
            created_at=str(row.get("created_at") or ""),
            updated_at=str(row.get("updated_at") or row.get("created_at") or ""),
            payload=payload,
        )

    def _get_role(self, user_id: UUID) -> Optional[str]:
        role_resp = (
            self.supabase.table("profiles")
            .select("role")
            .eq("id", str(user_id))
            .execute()
        )
        if not role_resp.data:
            return None
        return role_resp.data[0].get("role")

    @staticmethod
    def _relation_missing(exc: BaseException) -> bool:
        text = str(exc).lower()
        return (
            "service_jobs" in text
            or "service_job_visits" in text
            or "pgrst205" in text
            or "does not exist" in text
            or "could not find the table" in text
        )

    def _technician_has_job(self, ticket_id: str, user_id: UUID) -> bool:
        try:
            resp = (
                self.supabase.table("service_jobs")
                .select("id")
                .eq("ticket_id", ticket_id)
                .eq("assigned_technician_id", str(user_id))
                .limit(1)
                .execute()
            )
            return bool(resp.data)
        except Exception as exc:  # noqa: BLE001
            if self._relation_missing(exc):
                return False
            raise

    def _technician_historical_attendee(self, ticket_id: str, user_id: UUID) -> bool:
        try:
            jobs = (
                self.supabase.table("service_jobs")
                .select("id, state")
                .eq("ticket_id", ticket_id)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            if self._relation_missing(exc):
                return False
            raise
        for job in jobs.data or []:
            if job.get("state") in ("cancelled", "waived"):
                continue
            try:
                visits = (
                    self.supabase.table("service_job_visits")
                    .select("id")
                    .eq("job_id", job["id"])
                    .eq("attending_technician_id", str(user_id))
                    .eq("state", "completed")
                    .limit(1)
                    .execute()
                )
            except Exception as exc:  # noqa: BLE001
                if self._relation_missing(exc):
                    return False
                raise
            if visits.data:
                return True
        return False

    def _viewer_may_read_row(
        self, ticket: Dict[str, Any], user_id: UUID, role: Optional[str]
    ) -> bool:
        job_assigned = False
        historical = False
        if role == "technician":
            job_assigned = self._technician_has_job(str(ticket["id"]), user_id)
            historical = self._technician_historical_attendee(
                str(ticket["id"]), user_id
            )
        return can_read_ticket_record(
            ticket=ticket,
            user_id=user_id,
            role=role,
            job_assigned=job_assigned,
            historical_attendee=historical,
        )

    def _apply_filters(self, query: Any, filters: Optional[Dict[str, Any]]):
        if not filters:
            return query
        for key, value in filters.items():
            if value is not None:
                query = query.eq(key, value)
        return query

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
        """Fetch a ticket enforcing approved record scope (service-key safe)."""
        resp = (
            self.supabase.table("service_tickets")
            .select("*")
            .eq("id", str(ticket_id))
            .execute()
        )
        if not resp.data:
            return None
        ticket = resp.data[0]
        role = self._get_role(user_id)
        if not self._viewer_may_read_row(ticket, user_id, role):
            return None
        return self._to_response(ticket)

    def get_user_tickets(
        self, user_id: UUID, filters: Optional[Dict[str, Any]] = None
    ) -> List[TicketResponse]:
        """List tickets under the caller's approved scope (not role→all)."""
        role = self._get_role(user_id)
        if role in BROAD_STAFF_ROLES:
            query = self.supabase.table("service_tickets").select("*")
            query = self._apply_filters(query, filters)
            resp = query.order("created_at", desc=True).execute()
            rows = resp.data or []
        elif role == "technician":
            owned_q = (
                self.supabase.table("service_tickets")
                .select("*")
                .eq("user_id", str(user_id))
            )
            owned = self._apply_filters(owned_q, filters).order(
                "created_at", desc=True
            ).execute().data or []
            assigned_q = (
                self.supabase.table("service_tickets")
                .select("*")
                .eq("assigned_to", str(user_id))
            )
            assigned = self._apply_filters(assigned_q, filters).order(
                "created_at", desc=True
            ).execute().data or []
            related: set[str] = set()
            try:
                job_ids = (
                    self.supabase.table("service_jobs")
                    .select("ticket_id")
                    .eq("assigned_technician_id", str(user_id))
                    .execute()
                )
                related = {
                    str(j["ticket_id"])
                    for j in (job_ids.data or [])
                    if j.get("ticket_id")
                }
                visits = (
                    self.supabase.table("service_job_visits")
                    .select("job_id")
                    .eq("attending_technician_id", str(user_id))
                    .eq("state", "completed")
                    .execute()
                )
                for v in visits.data or []:
                    if not v.get("job_id"):
                        continue
                    job = (
                        self.supabase.table("service_jobs")
                        .select("ticket_id, state")
                        .eq("id", v["job_id"])
                        .limit(1)
                        .execute()
                    )
                    rows_j = job.data or []
                    if not rows_j or rows_j[0].get("state") in ("cancelled", "waived"):
                        continue
                    if rows_j[0].get("ticket_id"):
                        related.add(str(rows_j[0]["ticket_id"]))
            except Exception as exc:  # noqa: BLE001
                if not self._relation_missing(exc):
                    raise
                related = set()
            related_rows: List[Dict[str, Any]] = []
            if related:
                rq = (
                    self.supabase.table("service_tickets")
                    .select("*")
                    .in_("id", list(related))
                )
                related_rows = self._apply_filters(rq, filters).order(
                    "created_at", desc=True
                ).execute().data or []
            rows = merge_ticket_rows([*owned, *assigned, *related_rows])
        else:
            owned_q = (
                self.supabase.table("service_tickets")
                .select("*")
                .eq("user_id", str(user_id))
            )
            owned = self._apply_filters(owned_q, filters).order(
                "created_at", desc=True
            ).execute().data or []
            assigned_q = (
                self.supabase.table("service_tickets")
                .select("*")
                .eq("assigned_to", str(user_id))
            )
            assigned = self._apply_filters(assigned_q, filters).order(
                "created_at", desc=True
            ).execute().data or []
            rows = merge_ticket_rows([*owned, *assigned])
        return [self._to_response(row) for row in rows]

    # ------------------------------------------------------------------
    # Updates
    # ------------------------------------------------------------------
    def update_ticket_status(
        self,
        ticket_id: UUID,
        status: TicketStatus,
        resolution_summary: Optional[str] = None,
        actor_id: Optional[UUID] = None,
    ) -> Optional[TicketResponse]:
        """Update status through govern_ticket_transition (actor required)."""
        if actor_id is None:
            raise ValueError("actor_id is required for governed status updates")
        resp = self.supabase.rpc(
            "govern_ticket_transition",
            {
                "p_ticket_id": str(ticket_id),
                "p_to_status": status.value,
                "p_rationale": "unified_ticket_service",
                "p_resolution_summary": resolution_summary,
                "p_actor_id": str(actor_id),
            },
        ).execute()
        if not resp.data:
            return None
        row = resp.data[0] if isinstance(resp.data, list) else resp.data
        return TicketResponse(**row)

    def assign_ticket(
        self, ticket_id: UUID, assignee_id: UUID, assigned_by: UUID
    ) -> Optional[TicketResponse]:
        """Assign ticket via govern_ticket_assign (preserves actor identity)."""
        resp = self.supabase.rpc(
            "govern_ticket_assign",
            {
                "p_ticket_id": str(ticket_id),
                "p_assignee_id": str(assignee_id),
                "p_rationale": f"Assigned by {assigned_by}",
                "p_actor_id": str(assigned_by),
            },
        ).execute()
        if not resp.data:
            return None
        row = resp.data[0] if isinstance(resp.data, list) else resp.data
        return TicketResponse(**row)

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

    def list_messages(
        self, ticket_id: UUID, user_id: UUID
    ) -> List[Dict[str, Any]]:
        """List messages visible to the caller (owners never see internals)."""
        resp = (
            self.supabase.table("service_tickets")
            .select("*")
            .eq("id", str(ticket_id))
            .execute()
        )
        if not resp.data:
            return []
        ticket = resp.data[0]
        role = self._get_role(user_id)
        if not self._viewer_may_read_row(ticket, user_id, role):
            return []
        include_internal = can_view_internal_messages(
            role=role, ticket=ticket, user_id=user_id
        )
        msg_resp = (
            self.supabase.table("ticket_messages")
            .select("*")
            .eq("ticket_id", str(ticket_id))
            .order("created_at", desc=False)
            .execute()
        )
        return filter_messages_for_viewer(
            msg_resp.data or [], include_internal=include_internal
        )

    def count_messages(self, ticket_id: UUID, user_id: UUID) -> int:
        return len(self.list_messages(ticket_id, user_id))

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------
    def change_priority(
        self,
        ticket_id: UUID,
        priority: TicketPriority,
        actor_id: Optional[UUID] = None,
    ) -> Optional[TicketResponse]:
        if actor_id is None:
            raise ValueError("actor_id is required for governed priority updates")
        resp = self.supabase.rpc(
            "govern_ticket_set_priority",
            {
                "p_ticket_id": str(ticket_id),
                "p_priority": priority.value,
                "p_rationale": "unified_ticket_service",
                "p_actor_id": str(actor_id),
            },
        ).execute()
        if not resp.data:
            return None
        row = resp.data[0] if isinstance(resp.data, list) else resp.data
        return TicketResponse(**row)

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
