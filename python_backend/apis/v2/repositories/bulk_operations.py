from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from supabase import Client  # type: ignore


class BulkOperationsRepository:
    """Persistence layer for bulk operation jobs."""

    def __init__(self, supabase: Client):
        self._db = supabase

    # Creation
    def insert_job(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new bulk operation job."""
        resp = self._db.table("bulk_operation_jobs").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create bulk operation job")
        return rows[0]

    # Retrieval
    def get_job_by_id(
        self, job_id: UUID, user_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get a bulk operation job by ID (user-scoped for RLS)."""
        resp = (
            self._db.table("bulk_operation_jobs")
            .select("*")
            .eq("id", str(job_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def list_user_jobs(
        self,
        user_id: UUID,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """List bulk operation jobs for a user with optional filters."""
        query = (
            self._db.table("bulk_operation_jobs")
            .select("*")
            .eq("user_id", str(user_id))
        )

        if filters:
            if filters.get("status"):
                query = query.eq("status", filters["status"])
        
        resp = query.order("created_at", desc=True).limit(limit).execute()
        return getattr(resp, "data", []) or []

    def count_user_jobs_by_status(self, user_id: UUID) -> Dict[str, int]:
        """Count jobs by status for a user (for rate limiting)."""
        # Get all jobs and count by status (RLS ensures user-scoped)
        resp = (
            self._db.table("bulk_operation_jobs")
            .select("status")
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []

        counts = {
            "queued": 0,
            "running": 0,
            "completed": 0,
            "failed": 0,
            "canceled": 0,
        }
        for row in rows:
            status = row.get("status", "")
            if status in counts:
                counts[status] += 1
        return counts

    # Updates
    def update_job_fields(
        self, job_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update job fields (service role for background workers)."""
        resp = (
            self._db.table("bulk_operation_jobs")
            .update(update)
            .eq("id", str(job_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None
