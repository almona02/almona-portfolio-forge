from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from ..services.analytics_service import AnalyticsService
from ..deps import get_db

router = APIRouter()


@router.get("/kpis", response_model=Dict[str, Any])
async def get_business_kpis(
    start_date: Optional[datetime] = Query(
        None, description="Start date for KPI calculation"
    ),
    end_date: Optional[datetime] = Query(
        None, description="End date for KPI calculation"
    ),
    supabase=Depends(get_supabase)
):
    """
    Get key business performance indicators (KPIs)
    """
    try:
        service = AnalyticsService(supabase)
        return await service.get_business_kpis(start_date, end_date)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching KPIs: {str(e)}"
        )


@router.get("/revenue", response_model=List[Dict[str, Any]])
async def get_revenue_analytics(
    period: str = Query(
        "monthly",
        description="Time period grouping: daily, weekly, monthly"
    ),
    limit: int = Query(12, description="Number of periods to return"),
    supabase=Depends(get_supabase)
):
    """
    Get revenue analytics over time
    """
    try:
        service = AnalyticsService(supabase)
        return await service.get_revenue_analytics(period, limit)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching revenue analytics: {str(e)}"
        )


@router.get("/engagement", response_model=Dict[str, Any])
async def get_user_engagement_metrics(
    start_date: Optional[datetime] = Query(
        None, description="Start date for engagement metrics"
    ),
    end_date: Optional[datetime] = Query(
        None, description="End date for engagement metrics"
    ),
    supabase=Depends(get_supabase)
):
    """
    Get user engagement metrics
    """
    try:
        service = AnalyticsService(supabase)
        return await service.get_user_engagement_metrics(start_date, end_date)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching engagement metrics: {str(e)}"
        )


@router.get("/performance", response_model=Dict[str, Any])
async def get_performance_metrics(
    start_date: Optional[datetime] = Query(
        None, description="Start date for performance metrics"
    ),
    end_date: Optional[datetime] = Query(
        None, description="End date for performance metrics"
    ),
    supabase=Depends(get_supabase)
):
    """
    Get system performance metrics
    """
    try:
        service = AnalyticsService(supabase)
        return await service.get_performance_metrics(start_date, end_date)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching performance metrics: {str(e)}"
        )


@router.post("/events", response_model=bool)
async def track_event(
    event_type: str,
    user_id: Optional[int] = None,
    event_data: Optional[Dict[str, Any]] = None,
    supabase=Depends(get_supabase)
):
    """
    Track an analytics event
    """
    try:
        service = AnalyticsService(supabase)
        return await service.track_event(event_type, user_id, event_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error tracking event: {str(e)}"
        )


@router.post("/metrics", response_model=bool)
async def update_business_metrics(
    metrics_data: Dict[str, Any],
    supabase=Depends(get_supabase)
):
    """
    Update business metrics
    """
    try:
        service = AnalyticsService(supabase)
        return await service.update_business_metrics(metrics_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating business metrics: {str(e)}"
        )


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard_data(supabase=Depends(get_supabase)):
    """
    Get comprehensive dashboard data combining KPIs and recent metrics
    """
    try:
        service = AnalyticsService(supabase)

        # Get KPIs for last 30 days
        kpis = await service.get_business_kpis()

        # Get revenue analytics for last 6 months
        revenue = await service.get_revenue_analytics("monthly", 6)

        # Get engagement metrics for last 7 days
        engagement = await service.get_user_engagement_metrics(
            datetime.now() - timedelta(days=7),
            datetime.now()
        )

        return {
            "kpis": kpis,
            "revenue_trend": revenue,
            "engagement": engagement,
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching dashboard data: {str(e)}"
        )
