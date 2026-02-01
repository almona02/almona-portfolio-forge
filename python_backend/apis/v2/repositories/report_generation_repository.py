from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import UUID
from supabase import Client  # type: ignore


class ReportGenerationRepository:
    """Persistence layer for report generation jobs."""

    def __init__(self, supabase: Client):
        self._db = supabase

    # Job Creation
    def insert_job(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new report generation job."""
        resp = self._db.table("report_generation_jobs").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create report generation job")
        return rows[0]

    # Job Retrieval
    def get_job_by_id(
        self, job_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Get a job by ID."""
        # RLS policies handle user access control
        query = (
            self._db.table("report_generation_jobs")
            .select("*")
            .eq("id", str(job_id))
        )

        resp = query.execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            return None

        job = rows[0]
        # RLS should handle this, but verify user_id matches
        job_user_id = job.get("user_id")
        if user_id and job_user_id != str(user_id):
            return None

        return job

    # Job Updates (typically called by service role for status updates)
    def update_job_fields(
        self, job_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update job fields (status, download_url, etc.)."""
        # RLS policy requires service role for updates
        resp = (
            self._db.table("report_generation_jobs")
            .update(update)
            .eq("id", str(job_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None
