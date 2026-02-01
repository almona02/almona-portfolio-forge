from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from supabase import Client  # type: ignore


class AnalyticsQueryLogsRepository:
    """Persistence layer for analytics query logs."""

    def __init__(self, supabase: Client):
        self._db = supabase

    # Log Insertion (service role only)
    def insert_log(
        self, data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Insert query log (service role only)."""
        # RLS policy requires service role for inserts
        resp = self._db.table("analytics_query_logs").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to insert query log")
        return rows[0]

    # Log Retrieval (user-scoped)
    def get_user_logs(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get user's query logs (RLS handles user scoping)."""
        resp = (
            self._db.table("analytics_query_logs")
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return getattr(resp, "data", []) or []

    def get_log_by_id(
        self, log_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Get log by ID (user-scoped)."""
        query = (
            self._db.table("analytics_query_logs")
            .select("*")
            .eq("id", str(log_id))
        )

        resp = query.execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            return None

        log = rows[0]
        # RLS should handle this, but verify user_id matches
        log_user_id = log.get("user_id")
        if user_id and log_user_id != str(user_id):
            return None

        return log
