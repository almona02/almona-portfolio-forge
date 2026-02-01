from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timezone

from supabase import Client  # type: ignore

from apis.v2.repositories.bulk_operations import BulkOperationsRepository
from apis.v2.core.errors import SupabaseError
from models.api_v2_models import (
    BulkJobResponse,
    BulkJobStatus,
    BulkJobProgress,
    BulkJobResult,
    BulkJobError,
)


def utcnow_iso() -> str:
    """Get current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class BulkOperationService:
    """Service layer for bulk operations, using repository for data access."""

    def __init__(self, supabase: Client):
        self._repo = BulkOperationsRepository(supabase)
        self._max_concurrent_jobs = 5

    def _calculate_progress_percentage(
        self, completed: int, total: int
    ) -> float:
        """Calculate progress percentage."""
        if total == 0:
            return 0.0
        return round((completed / total) * 100, 2)

    def _convert_db_row_to_response(
        self, row: Dict[str, Any]
    ) -> BulkJobResponse:
        """Convert database row to BulkJobResponse model."""
        progress_completed = row.get("progress_completed", 0)
        progress_total = row.get("progress_total", 0)

        progress = BulkJobProgress(
            completed=progress_completed,
            total=progress_total,
            percentage=self._calculate_progress_percentage(progress_completed, progress_total)
        )

        result = None
        if row.get("result_succeeded") is not None or row.get("result_failed") is not None:
            errors = []
            result_errors = row.get("result_errors", [])
            if isinstance(result_errors, list):
                for err in result_errors:
                    if isinstance(err, dict):
                        errors.append(
                            BulkJobError(
                                itemId=err.get("itemId", ""),
                                message=err.get("message", ""),
                                code=err.get("code")
                            )
                        )

            result = BulkJobResult(
                succeeded=row.get("result_succeeded", 0),
                failed=row.get("result_failed", 0),
                errors=errors,
                downloadUrl=row.get("result_download_url"),
                downloadExpiresAt=row.get("result_download_expires_at")
            )

        original_job_id = (
            str(row["original_job_id"])
            if row.get("original_job_id") else None
        )

        return BulkJobResponse(
            jobId=str(row["id"]),
            status=BulkJobStatus(row.get("status", "queued")),
            operation={
                "type": row.get("operation_type", ""),
                "params": row.get("operation_params", {})
            },
            itemCount=row.get("item_count", 0),
            progress=progress,
            result=result,
            createdAt=row.get("created_at", utcnow_iso()),
            startedAt=row.get("started_at"),
            completedAt=row.get("completed_at"),
            canceledAt=row.get("canceled_at"),
            originalJobId=original_job_id
        )

    def start_operation(
        self,
        user_id: UUID,
        item_ids: List[str],
        operation: Dict[str, Any],
    ) -> BulkJobResponse:
        """Start a bulk operation and create a job."""
        try:
            # Validate operation type
            op_type = operation.get("type")
            if op_type not in ["edit", "export", "delete", "status_change"]:
                raise ValueError(f"Invalid operation type: {op_type}")

            # Check rate limiting (max 5 concurrent jobs)
            job_counts = self._repo.count_user_jobs_by_status(user_id)
            concurrent_count = (
                job_counts.get("queued", 0) + job_counts.get("running", 0)
            )
            if concurrent_count >= self._max_concurrent_jobs:
                raise ValueError(
                    f"Too many concurrent jobs ({concurrent_count}). "
                    f"Maximum {self._max_concurrent_jobs} allowed."
                )

            # Create job record
            job_data: Dict[str, Any] = {
                "user_id": str(user_id),
                "status": "queued",
                "operation_type": op_type,
                "operation_params": operation.get("params", {}),
                "item_ids": item_ids,
                "item_count": len(item_ids),
                "progress_completed": 0,
                "progress_total": len(item_ids),
                "result_succeeded": 0,
                "result_failed": 0,
                "result_errors": [],
                "created_at": utcnow_iso(),
            }

            try:
                row = self._repo.insert_job(job_data)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to create bulk operation job",
                    operation="insert_job",
                    original_error=e
                )

            # TODO: Enqueue Celery task for async processing
            # For now, job is created and will be processed by background worker

            return self._convert_db_row_to_response(row)

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error starting bulk operation",
                operation="start_operation",
                original_error=e
            )

    def get_job_status(
        self, job_id: UUID, user_id: UUID
    ) -> Optional[BulkJobResponse]:
        """Get job status by ID."""
        try:
            job = self._repo.get_job_by_id(job_id, user_id)
            if not job:
                return None

            return self._convert_db_row_to_response(job)

        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve bulk operation job",
                operation="get_job_by_id",
                original_error=e
            )

    def cancel_job(self, job_id: UUID, user_id: UUID) -> Optional[BulkJobResponse]:
        """Cancel a running or queued job."""
        try:
            job = self._repo.get_job_by_id(job_id, user_id)
            if not job:
                return None

            current_status = job.get("status")
            if current_status not in ["queued", "running"]:
                raise ValueError(
                    f"Job cannot be canceled. Current status: {current_status}"
                )

            update: Dict[str, Any] = {
                "status": "canceled",
                "canceled_at": utcnow_iso(),
            }

            try:
                updated_job = self._repo.update_job_fields(job_id, update)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to cancel bulk operation job",
                    operation="update_job_fields",
                    original_error=e
                )

            # TODO: Cancel Celery task if running

            return self._convert_db_row_to_response(updated_job) if updated_job else None

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error canceling bulk operation job",
                operation="cancel_job",
                original_error=e
            )

    def retry_failed_items(
        self,
        original_job_id: UUID,
        user_id: UUID,
        item_ids: Optional[List[str]] = None,
    ) -> BulkJobResponse:
        """Retry failed items from an original job."""
        try:
            original_job = self._repo.get_job_by_id(original_job_id, user_id)
            if not original_job:
                raise ValueError("Original job not found")

            if original_job.get("status") != "failed":
                raise ValueError("Can only retry failed jobs")

            # Get failed items from original job
            result_errors = original_job.get("result_errors", [])
            if not result_errors:
                raise ValueError("No failed items to retry")

            failed_item_ids = []
            if item_ids:
                # Retry specific items
                failed_item_ids = [
                    err.get("itemId")
                    for err in result_errors
                    if isinstance(err, dict) and err.get("itemId") in item_ids
                ]
            else:
                # Retry all failed items
                failed_item_ids = [
                    err.get("itemId")
                    for err in result_errors
                    if isinstance(err, dict) and err.get("itemId")
                ]

            if not failed_item_ids:
                raise ValueError("No failed items found to retry")

            # Create new job with same operation
            job_data: Dict[str, Any] = {
                "user_id": str(user_id),
                "status": "queued",
                "operation_type": original_job.get("operation_type"),
                "operation_params": original_job.get("operation_params", {}),
                "item_ids": failed_item_ids,
                "item_count": len(failed_item_ids),
                "progress_completed": 0,
                "progress_total": len(failed_item_ids),
                "result_succeeded": 0,
                "result_failed": 0,
                "result_errors": [],
                "original_job_id": str(original_job_id),
                "created_at": utcnow_iso(),
            }

            try:
                row = self._repo.insert_job(job_data)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to create retry job",
                    operation="insert_job",
                    original_error=e
                )

            # TODO: Enqueue Celery task

            return self._convert_db_row_to_response(row)

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error retrying bulk operation",
                operation="retry_failed_items",
                original_error=e
            )

    def list_jobs(
        self,
        user_id: UUID,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[BulkJobResponse]:
        """List user's bulk operation jobs."""
        try:
            filters: Dict[str, Any] = {}
            if status:
                filters["status"] = status

            rows = self._repo.list_user_jobs(user_id, filters, limit=limit)
            return [self._convert_db_row_to_response(row) for row in rows]

        except Exception as e:
            raise SupabaseError(
                message="Failed to list bulk operation jobs",
                operation="list_user_jobs",
                original_error=e
            )
