from __future__ import annotations

from typing import Any, Dict, List, Optional, Set
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

    def technician_has_job_assignment(self, ticket_id: UUID, user_id: UUID) -> bool:
        resp = (
            self._db.table("service_jobs")
            .select("id")
            .eq("ticket_id", str(ticket_id))
            .eq("assigned_technician_id", str(user_id))
            .limit(1)
            .execute()
        )
        return bool(getattr(resp, "data", None))

    def technician_is_historical_attendee(self, ticket_id: UUID, user_id: UUID) -> bool:
        """Mirror admin_private.is_ticket_visit_attending_technician."""
        jobs_resp = (
            self._db.table("service_jobs")
            .select("id, state")
            .eq("ticket_id", str(ticket_id))
            .execute()
        )
        jobs = getattr(jobs_resp, "data", []) or []
        active_job_ids = [
            j["id"]
            for j in jobs
            if j.get("id") and j.get("state") not in ("cancelled", "waived")
        ]
        if not active_job_ids:
            return False
        for job_id in active_job_ids:
            visits = (
                self._db.table("service_job_visits")
                .select("id")
                .eq("job_id", str(job_id))
                .eq("attending_technician_id", str(user_id))
                .eq("state", "completed")
                .limit(1)
                .execute()
            )
            if getattr(visits, "data", None):
                return True
        return False

    def _apply_filters(self, query: Any, filters: Optional[Dict[str, Any]]):
        if not filters:
            return query
        for key, value in filters.items():
            if value is not None:
                query = query.eq(key, value)
        return query

    def list_user_tickets(self, user_id: UUID, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        query = self._db.table("service_tickets").select("*").eq("user_id", str(user_id))
        query = self._apply_filters(query, filters)
        resp = query.order("created_at", desc=True).execute()
        return getattr(resp, "data", []) or []

    def list_all_tickets(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        query = self._db.table("service_tickets").select("*")
        query = self._apply_filters(query, filters)
        resp = query.order("created_at", desc=True).execute()
        return getattr(resp, "data", []) or []

    def list_assigned_tickets(
        self, user_id: UUID, filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        query = (
            self._db.table("service_tickets")
            .select("*")
            .eq("assigned_to", str(user_id))
        )
        query = self._apply_filters(query, filters)
        resp = query.order("created_at", desc=True).execute()
        return getattr(resp, "data", []) or []

    def list_technician_related_ticket_ids(self, user_id: UUID) -> Set[str]:
        """Ticket ids reachable via job assignment or completed visit attendance."""
        ids: Set[str] = set()
        jobs = (
            self._db.table("service_jobs")
            .select("id, ticket_id, state")
            .eq("assigned_technician_id", str(user_id))
            .execute()
        )
        for job in getattr(jobs, "data", []) or []:
            if job.get("ticket_id"):
                ids.add(str(job["ticket_id"]))

        visits = (
            self._db.table("service_job_visits")
            .select("job_id")
            .eq("attending_technician_id", str(user_id))
            .eq("state", "completed")
            .execute()
        )
        job_ids = [
            str(v["job_id"])
            for v in (getattr(visits, "data", []) or [])
            if v.get("job_id")
        ]
        for job_id in job_ids:
            job_row = (
                self._db.table("service_jobs")
                .select("ticket_id, state")
                .eq("id", job_id)
                .limit(1)
                .execute()
            )
            rows = getattr(job_row, "data", []) or []
            if not rows:
                continue
            if rows[0].get("state") in ("cancelled", "waived"):
                continue
            if rows[0].get("ticket_id"):
                ids.add(str(rows[0]["ticket_id"]))
        return ids

    def get_tickets_by_ids(
        self, ticket_ids: Set[str], filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        if not ticket_ids:
            return []
        query = (
            self._db.table("service_tickets")
            .select("*")
            .in_("id", list(ticket_ids))
        )
        query = self._apply_filters(query, filters)
        resp = query.order("created_at", desc=True).execute()
        return getattr(resp, "data", []) or []

    def govern_ticket_transition(
        self,
        ticket_id: UUID,
        to_status: str,
        actor_id: UUID,
        rationale: Optional[str] = None,
        resolution_summary: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        resp = self._db.rpc(
            "govern_ticket_transition",
            {
                "p_ticket_id": str(ticket_id),
                "p_to_status": to_status,
                "p_rationale": rationale,
                "p_resolution_summary": resolution_summary,
                "p_actor_id": str(actor_id),
            },
        ).execute()
        data = getattr(resp, "data", None)
        if isinstance(data, list):
            return data[0] if data else None
        return data

    def govern_ticket_assign(
        self,
        ticket_id: UUID,
        assignee_id: UUID,
        actor_id: UUID,
        rationale: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        resp = self._db.rpc(
            "govern_ticket_assign",
            {
                "p_ticket_id": str(ticket_id),
                "p_assignee_id": str(assignee_id),
                "p_rationale": rationale,
                "p_actor_id": str(actor_id),
            },
        ).execute()
        data = getattr(resp, "data", None)
        if isinstance(data, list):
            return data[0] if data else None
        return data

    def govern_ticket_set_priority(
        self,
        ticket_id: UUID,
        priority: str,
        actor_id: UUID,
        rationale: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        resp = self._db.rpc(
            "govern_ticket_set_priority",
            {
                "p_ticket_id": str(ticket_id),
                "p_priority": priority,
                "p_rationale": rationale,
                "p_actor_id": str(actor_id),
            },
        ).execute()
        data = getattr(resp, "data", None)
        if isinstance(data, list):
            return data[0] if data else None
        return data

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


