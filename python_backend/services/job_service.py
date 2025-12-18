"""
Job service for managing async computation jobs.
Provides database operations for job tracking and Supabase Realtime updates.
"""
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid

from core.supabase_client import get_enhanced_supabase_client
from core.config import settings

logger = logging.getLogger(__name__)

class JobService:
    """Service for managing async job status and realtime updates."""

    def __init__(self):
        # Fix: Ensure Supabase credentials exist before initializing
        try:
            if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
                logger.warning(
                    "Supabase credentials missing. Job tracking will be disabled. "
                    "Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
                )
                self.supabase = None
            else:
                self.supabase = get_enhanced_supabase_client()
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client for job service: {e}")
            self.supabase = None

    async def create_job(
        self,
        job_id: str,
        job_type: str,
        user_id: Optional[str] = None,
        workshop_id: Optional[str] = None,
        project_ids: Optional[List[str]] = None,
        input_data: Optional[Dict[str, Any]] = None,
        estimated_time_seconds: int = 30,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new job record in the database."""
        # Fix: Handle missing Supabase gracefully
        if self.supabase is None:
            logger.warning(
                f"Supabase not available. Creating minimal job record for job_id={job_id}"
            )
            return {
                "id": str(uuid.uuid4()),
                "job_id": job_id,
                "job_type": job_type,
                "status": "pending",
                "created_at": datetime.utcnow().isoformat(),
                "estimated_time_seconds": estimated_time_seconds,
            }

        job_data = {
            "job_id": job_id,
            "job_type": job_type,
            "status": "pending",
            "user_id": user_id,
            "workshop_id": workshop_id,
            "project_ids": project_ids or [],
            "input_data": input_data,
            "estimated_time_seconds": estimated_time_seconds,
            "metadata": metadata or {},
        }

        try:
            response = (
                self.supabase.client.table("jobs")
                .insert(job_data)
                .execute()
            )

            if response.data:
                return response.data[0]
            else:
                raise Exception("Failed to create job record")

        except Exception as e:
            # Log error but don't fail the job creation
            logger.error(f"Failed to create job record: {e}", exc_info=True)
            # Return a minimal job record for backward compatibility
            return {
                "id": str(uuid.uuid4()),
                "job_id": job_id,
                "job_type": job_type,
                "status": "pending",
                "created_at": datetime.utcnow().isoformat(),
                "estimated_time_seconds": estimated_time_seconds,
            }

    async def update_job_status(
        self,
        job_id: str,
        status: str,
        result_data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        processing_time_seconds: Optional[float] = None
    ) -> bool:
        """Update job status in database (triggers Supabase Realtime)."""
        # Fix: Handle missing Supabase gracefully
        if self.supabase is None:
            logger.warning(f"Supabase not available. Cannot update job status for job_id={job_id}")
            return False

        update_data = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat(),
        }

        if status == "processing" and not hasattr(self, '_start_time'):
            update_data["started_at"] = datetime.utcnow().isoformat()

        if status in ["completed", "failed"]:
            update_data["completed_at"] = datetime.utcnow().isoformat()
            if processing_time_seconds is not None:
                update_data["processing_time_seconds"] = processing_time_seconds

        if result_data is not None:
            update_data["result_data"] = result_data

        if error_message is not None:
            update_data["error_message"] = error_message

        try:
            response = (
                self.supabase.client.table("jobs")
                .update(update_data)
                .eq("job_id", job_id)
                .execute()
            )

            success = len(response.data) > 0
            if success:
                logger.info(f"✅ Job {job_id} status updated to {status}")
            else:
                logger.warning(f"⚠️  Job {job_id} not found for status update")

            return success

        except Exception as e:
            logger.error(f"❌ Failed to update job {job_id} status: {e}", exc_info=True)
            return False

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status from database."""
        # Fix: Handle missing Supabase gracefully
        if self.supabase is None:
            logger.warning(f"Supabase not available. Cannot get job status for job_id={job_id}")
            return None

        try:
            response = (
                self.supabase.client.table("jobs")
                .select("*")
                .eq("job_id", job_id)
                .execute()
            )

            if response.data and len(response.data) > 0:
                return response.data[0]
            else:
                return None

        except Exception as e:
            logger.error(f"❌ Failed to get job {job_id} status: {e}", exc_info=True)
            return None

    async def get_user_jobs(
        self,
        user_id: str,
        limit: int = 50,
        status_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get user's recent jobs."""
        # Fix: Handle missing Supabase gracefully
        if self.supabase is None:
            logger.warning(f"Supabase not available. Cannot get user jobs for user_id={user_id}")
            return []

        try:
            query = (
                self.supabase.client.table("jobs")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
            )

            if status_filter:
                query = query.eq("status", status_filter)

            response = query.execute()
            return response.data or []

        except Exception as e:
            logger.error(f"❌ Failed to get user jobs: {e}", exc_info=True)
            return []

# Global job service instance
job_service = JobService()
