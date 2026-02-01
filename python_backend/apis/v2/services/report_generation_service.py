from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import UUID
from datetime import datetime, timezone

from supabase import Client  # type: ignore

from apis.v2.repositories.report_generation_repository import (
    ReportGenerationRepository
)
from apis.v2.core.errors import SupabaseError
from models.api_v2_models import (
    ReportGenerationRequest,
    ReportJobResponse,
    ReportJobStatus,
    ReportFormat,
)


def utcnow_iso() -> str:
    """Get current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class ReportGenerationService:
    """Service layer for report generation."""

    def __init__(self, supabase: Client):
        self._repo = ReportGenerationRepository(supabase)
        self._db = supabase

    def _convert_db_row_to_response(
        self, row: Dict[str, Any]
    ) -> ReportJobResponse:
        """Convert database row to ReportJobResponse model."""
        return ReportJobResponse(
            id=str(row["id"]),
            status=ReportJobStatus(row.get("status", "queued")),
            template_id=row.get("template_id"),
            report_type=row.get("report_type", ""),
            format=ReportFormat(row.get("format", "pdf")),
            file_size_bytes=row.get("file_size_bytes"),
            page_count=row.get("page_count"),
            download_url=row.get("download_url"),
            download_expires_at=row.get("download_expires_at"),
            error_message=row.get("error_message"),
            generation_time_ms=row.get("generation_time_ms"),
            created_at=row.get("created_at", utcnow_iso()),
            started_at=row.get("started_at"),
            completed_at=row.get("completed_at"),
        )

    def create_generation_job(
        self,
        user_id: UUID,
        request: ReportGenerationRequest,
    ) -> ReportJobResponse:
        """Create a new report generation job."""
        try:
            job_data: Dict[str, Any] = {
                "user_id": str(user_id),
                "template_id": request.template_id,
                "status": "queued",
                "report_type": request.report_type,
                "report_data": request.report_data,
                "format": request.format.value,
                "created_at": utcnow_iso(),
            }

            try:
                row = self._repo.insert_job(job_data)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to create report generation job",
                    operation="insert_job",
                    original_error=e
                )

            # Trigger background job processing (Celery task)
            try:
                from tasks.report_tasks import generate_report_job_file
                job_id_str = str(row["id"])
                generate_report_job_file.delay(job_id_str)
            except Exception as e:
                # Log error but don't fail job creation
                # Job will remain in 'queued' status and can be processed manually
                import logging
                logger = logging.getLogger(__name__)
                logger.error(
                    f"Failed to trigger report generation task for job: {e}"
                )

            return self._convert_db_row_to_response(row)

        except SupabaseError:
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error creating report generation job",
                operation="create_generation_job",
                original_error=e
            )

    def get_job(
        self, job_id: UUID, user_id: UUID
    ) -> Optional[ReportJobResponse]:
        """Get job by ID."""
        try:
            job = self._repo.get_job_by_id(job_id, user_id)
            if not job:
                return None

            return self._convert_db_row_to_response(job)

        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve report generation job",
                operation="get_job_by_id",
                original_error=e
            )

    def get_download_url(
        self, job_id: UUID, user_id: UUID
    ) -> Optional[str]:
        """Get download URL for completed report."""
        try:
            job = self._repo.get_job_by_id(job_id, user_id)
            if not job:
                return None

            status = job.get("status")
            if status != "completed":
                return None

            download_url = job.get("download_url")
            download_expires_at = job.get("download_expires_at")

            # Check if download URL has expired
            if download_expires_at:
                expires_at = datetime.fromisoformat(
                    download_expires_at.replace("Z", "+00:00")
                )
                if datetime.now(timezone.utc) > expires_at:
                    return None

            return download_url

        except Exception as e:
            raise SupabaseError(
                message="Failed to get download URL",
                operation="get_download_url",
                original_error=e
            )
