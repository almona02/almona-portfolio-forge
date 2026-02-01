"""Bulk Operations API (v2)

Provides endpoints for bulk operations (edit, export, delete, status change)
with async job tracking, progress monitoring, and error handling.

Phase 3 Enterprise Features Implementation.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from typing import Optional, Dict, Any
from uuid import UUID

from supabase import Client

from models.api_v2_models import (
    BulkOperationStartRequest,
    BulkOperationRetryRequest,
    BulkJobResponse,
    BulkJobStatus,
    BulkJobListResponse,
)
from apis.v2.services.bulk_operation_service import BulkOperationService
from apis.v2.core.errors import (
    handle_supabase_error,
    create_error_context,
    COMMON_ERROR_RESPONSES,
)

# Dependency providers
from apis.v2.deps import get_supabase, get_current_user


def _user_uuid(current_user: Dict[str, Any]) -> UUID:
    """Extract UUID from user claims."""
    raw = current_user.get("id") or current_user.get("sub")
    return UUID(raw)


router = APIRouter(prefix="/bulk-operations", tags=["Bulk Operations"])


@router.get("/health")
async def bulk_operations_health_check() -> Dict[str, str]:
    """Lightweight health check for the Bulk Operations service."""
    return {"status": "healthy"}


def _service(supabase: Client) -> BulkOperationService:
    return BulkOperationService(supabase)


@router.post(
    "",
    response_model=BulkJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Start Bulk Operation",
    description="""
    Start a bulk operation on multiple items. Operations execute asynchronously.

    **Supported Operations:**
    - `edit`: Bulk edit fields (systemPack, color, etc.)
    - `export`: Export to PDF/CSV/DXF
    - `delete`: Bulk delete
    - `status_change`: Change status for multiple items

    **Rate Limiting:**
    - Maximum 5 concurrent jobs per user
    - Returns 429 if limit exceeded

    **Returns:**
    - Job ID immediately (202 Accepted)
    - Job executes asynchronously
    - Poll job status endpoint for progress
    """
)
def start_bulk_operation(
    request: Request,
    payload: BulkOperationStartRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Start a bulk operation."""
    try:
        svc = _service(supabase)
        return svc.start_operation(
            user_id=_user_uuid(current_user),
            item_ids=payload.itemIds,
            operation=payload.operation,
        )
    except ValueError as e:
        error_message = str(e)
        if "Too many concurrent jobs" in error_message:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=error_message
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="start_bulk_operation",
        )
        raise handle_supabase_error(e, "start_operation", context)


@router.get(
    "/{job_id}",
    response_model=BulkJobResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Bulk Operation Status",
    description="""
    Get the status and progress of a bulk operation job.

    **Polling:**
    - Poll every 1.5-2 seconds while status is 'running' or 'queued'
    - Stop polling when status is 'completed', 'failed', or 'canceled'

    **Response includes:**
    - Current progress (completed/total/percentage)
    - Result summary (succeeded/failed counts, errors)
    - Download URL for export operations
    - Estimated completion time
    """
)
def get_bulk_operation_status(
    request: Request,
    job_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get bulk operation job status."""
    try:
        svc = _service(supabase)
        job = svc.get_job_status(job_id, _user_uuid(current_user))
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bulk operation job not found"
            )
        return job
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_bulk_operation_status",
        )
        raise handle_supabase_error(e, "get_job_status", context)


@router.post(
    "/{job_id}/cancel",
    response_model=BulkJobResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Cancel Bulk Operation",
    description="""
    Cancel a running or queued bulk operation job.

    **Conditions:**
    - Only cancelable if status is 'queued' or 'running'
    - Returns 409 Conflict if job is already completed/failed

    **Result:**
    - Job status changed to 'canceled'
    - Partial results returned for items already processed
    """
)
def cancel_bulk_operation(
    request: Request,
    job_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cancel a bulk operation job."""
    try:
        svc = _service(supabase)
        job = svc.cancel_job(job_id, _user_uuid(current_user))
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bulk operation job not found"
            )
        return job
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="cancel_bulk_operation",
        )
        raise handle_supabase_error(e, "cancel_job", context)


@router.post(
    "/{job_id}/retry",
    response_model=BulkJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Retry Failed Items",
    description="""
    Retry failed items from a bulk operation job.

    **Behavior:**
    - Creates a new job with only the failed items
    - Applies the same operation from the original job
    - If itemIds not provided, retries all failed items
    - Idempotent (safe to retry multiple times)

    **Returns:**
    - New job ID (202 Accepted)
    - Links to original job via originalJobId
    """
)
def retry_bulk_operation(
    request: Request,
    job_id: UUID,
    payload: Optional[BulkOperationRetryRequest] = None,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retry failed items from a bulk operation job."""
    try:
        svc = _service(supabase)
        item_ids = payload.itemIds if payload else None
        return svc.retry_failed_items(
            original_job_id=job_id,
            user_id=_user_uuid(current_user),
            item_ids=item_ids,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="retry_bulk_operation",
        )
        raise handle_supabase_error(e, "retry_failed_items", context)


@router.get(
    "",
    response_model=BulkJobListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="List Bulk Operation Jobs",
    description="""
    List bulk operation jobs for the current user.

    **Filtering:**
    - Filter by status (queued, running, completed, failed, canceled)
    - Limit results (default: 50, max: 100)

    **Sorting:**
    - Sorted by createdAt descending (most recent first)
    """
)
def list_bulk_operations(
    request: Request,
    status: Optional[BulkJobStatus] = Query(
        None, description="Filter by job status"
    ),
    limit: int = Query(
        50, ge=1, le=100, description="Maximum number of results"
    ),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List bulk operation jobs."""
    try:
        svc = _service(supabase)
        jobs = svc.list_jobs(
            user_id=_user_uuid(current_user),
            status=status.value if status else None,
            limit=limit,
        )
        return BulkJobListResponse(
            jobs=jobs,
            total=len(jobs),
            limit=limit
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="list_bulk_operations",
        )
        raise handle_supabase_error(e, "list_jobs", context)
