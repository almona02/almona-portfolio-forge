"""Analytics API (v2)

Provides endpoints for analytics metrics and queries.
Phase 4 Reporting & Analytics Implementation.
"""
from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
)
from typing import Dict, Any, Optional
from uuid import UUID

from supabase import Client

from models.api_v2_models import (
    AnalyticsMetricsRequest,
    AnalyticsMetricsResponse,
    AnalyticsQueryRequest,
    AnalyticsQueryResponse,
    MetricPeriod,
)
from apis.v2.services.analytics_metrics_service import (
    AnalyticsMetricsService
)
from apis.v2.services.analytics_query_service import (
    AnalyticsQueryService
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


router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/health")
async def analytics_health_check() -> Dict[str, str]:
    """Lightweight health check for the Analytics service."""
    return {"status": "healthy"}


def _metrics_service(supabase: Client) -> AnalyticsMetricsService:
    return AnalyticsMetricsService(supabase)


def _query_service(supabase: Client) -> AnalyticsQueryService:
    return AnalyticsQueryService(supabase)


@router.get(
    "/metrics",
    response_model=AnalyticsMetricsResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Analytics Metrics",
    description="""
    Get analytics metrics (project volume, revenue).

    Metrics are cached for performance. Use period parameter to specify
    time range (daily, weekly, monthly, quarterly, yearly).
    """,
)
async def get_analytics_metrics(
    period: MetricPeriod = Query(
        MetricPeriod.monthly, description="Time period for metrics"
    ),
    start_date: Optional[str] = Query(
        None, description="Start date (ISO 8601)"
    ),
    end_date: Optional[str] = Query(
        None, description="End date (ISO 8601)"
    ),
    include_cache: bool = Query(True, description="Use cached metrics"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get analytics metrics."""
    from datetime import datetime

    service = _metrics_service(supabase)

    # Parse dates if provided
    start_dt = None
    end_dt = None
    if start_date:
        start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
    if end_date:
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))

    request = AnalyticsMetricsRequest(
        period=period,
        start_date=start_dt,
        end_date=end_dt,
        include_cache=include_cache,
    )

    try:
        result = service.get_metrics(request)
        return result
    except Exception as e:
        context = create_error_context(
            operation="get_analytics_metrics",
        )
        handle_supabase_error(e, context)
        raise


@router.post(
    "/queries",
    response_model=AnalyticsQueryResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Execute Analytics Query",
    description="""
    Execute an analytics query and return results.

    Supports multiple query types (revenue, project_volume, waste,
    production_time, customer, custom) with filtering and grouping.
    """,
)
async def execute_analytics_query(
    request: AnalyticsQueryRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Execute analytics query."""
    user_id = _user_uuid(current_user)
    service = _query_service(supabase)

    try:
        result = service.execute_query(request, user_id)
        return result
    except Exception as e:
        context = create_error_context(
            operation="execute_analytics_query",
            user_id=str(user_id),
        )
        handle_supabase_error(e, context)
        raise


@router.get(
    "/queries/{query_id}",
    response_model=AnalyticsQueryResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Query Result",
    description="Get query result by query log ID.",
)
async def get_query_result(
    query_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get query result by log ID."""
    user_id = _user_uuid(current_user)
    service = _query_service(supabase)

    try:
        result = service.get_query_log(query_id, user_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Query log not found",
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            operation="get_query_result",
            user_id=str(user_id),
            query_id=str(query_id),
        )
        handle_supabase_error(e, context)
        raise


@router.get(
    "/queries/{query_id}/export",
    responses=COMMON_ERROR_RESPONSES,
    summary="Export Query Results",
    description="""
    Export query results in specified format (csv, excel, pdf).
    """,
)
async def export_query_results(
    query_id: UUID,
    format: str = Query("csv", regex="^(csv|excel|pdf)$"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Export query results."""
    from fastapi.responses import Response

    user_id = _user_uuid(current_user)
    service = _query_service(supabase)

    try:
        export_data = service.export_query_results(
            query_id, user_id, format
        )
        excel_mime = (
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        )
        content_type = {
            "csv": "text/csv",
            "excel": excel_mime,
            "pdf": "application/pdf",
        }.get(format, "application/octet-stream")

        return Response(
            content=export_data,
            media_type=content_type,
            headers={
                "Content-Disposition": (
                    f'attachment; filename="query_export.{format}"'
                ),
            },
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        context = create_error_context(
            operation="export_query_results",
            user_id=str(user_id),
            query_id=str(query_id),
        )
        handle_supabase_error(e, context)
        raise
