"""Reports API (v2)

Provides endpoints for report generation: create jobs, check status, download.
Phase 4 Reporting & Analytics Implementation.
"""
from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from typing import Dict, Any
from uuid import UUID

from supabase import Client

from models.api_v2_models import (
    ReportGenerationRequest,
    ReportJobResponse,
)
from apis.v2.services.report_generation_service import (
    ReportGenerationService
)
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


router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/health")
async def reports_health_check() -> Dict[str, str]:
    """Lightweight health check for the Reports service."""
    return {"status": "healthy"}


def _service(supabase: Client) -> ReportGenerationService:
    return ReportGenerationService(supabase)


@router.post(
    "/generate",
    response_model=ReportJobResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Generate Report",
    description="""
    Create a new report generation job.

    The job will be queued for processing. Use GET /reports/{job_id} to check
    status and GET /reports/{job_id}/download to download when completed.
    """,
)
async def generate_report(
    request: ReportGenerationRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a report generation job."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.create_generation_job(user_id, request)
        return result
    except Exception as e:
        context = create_error_context(
            operation="generate_report",
            user_id=str(user_id),
        )
        handle_supabase_error(e, context)
        raise


@router.get(
    "/{job_id}",
    response_model=ReportJobResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Report Job Status",
    description="Get the status of a report generation job.",
)
async def get_report_job(
    job_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get report generation job status."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.get_job(job_id, user_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report generation job not found",
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            operation="get_report_job",
            user_id=str(user_id),
            job_id=str(job_id),
        )
        handle_supabase_error(e, context)
        raise


@router.get(
    "/{job_id}/download",
    responses=COMMON_ERROR_RESPONSES,
    summary="Download Generated Report",
    description="""
    Get download URL for a completed report.

    Returns a redirect (302) to the download URL if available.
    """,
)
async def download_report(
    job_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get download URL for completed report."""
    from fastapi.responses import RedirectResponse

    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        download_url = service.get_download_url(job_id, user_id)
        if not download_url:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    "Report not available for download. "
                    "Job may not be completed or URL has expired."
                ),
            )
        return RedirectResponse(url=download_url, status_code=302)
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            operation="download_report",
            user_id=str(user_id),
            job_id=str(job_id),
        )
        handle_supabase_error(e, context)
        raise
