"""
Performance Audit API

Provides backend endpoints for performance audit dashboard metrics.

@since Phase 1: Precision Upgrade Plan (January 2026)
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from datetime import datetime
import logging

from core.slow_query_detector import SlowQueryDetector
from core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/performance-audit", tags=["Performance Audit"])


@router.get("/database-metrics")
async def get_database_metrics() -> Dict[str, Any]:
    """
    Get database performance metrics for audit dashboard.

    Returns:
        Dictionary with database metrics:
        - avg_query_time: Average query time in ms
        - slow_queries_count: Number of slow queries (>1s)
        - connection_pool_status: Connection pool health status
        - connection_pool_issues: List of issues (if any)
    """
    try:
        async with AsyncSessionLocal() as session:
            detector = SlowQueryDetector(session, threshold_ms=1000.0)

            # Get slow queries report
            report = await detector.generate_report(limit=50, min_calls=5)

            # Calculate average query time
            avg_query_time: Optional[float] = None
            if report.queries:
                total_time = sum(q.total_time_ms for q in report.queries)
                total_calls = sum(q.calls for q in report.queries)
                if total_calls > 0:
                    avg_query_time = total_time / total_calls

            # Count slow queries
            slow_queries_count = report.slow_queries_count

            # Determine connection pool status
            connection_pool_status = "healthy"
            connection_pool_issues: list[str] = []

            if slow_queries_count > 10:
                connection_pool_status = "warning"
                connection_pool_issues.append(
                    f"{slow_queries_count} slow queries detected"
                )

            if avg_query_time and avg_query_time > 100:
                connection_pool_status = "unhealthy"
                connection_pool_issues.append(
                    f"Average query time too high: " f"{avg_query_time:.2f}ms"
                )

            return {
                "avg_query_time": avg_query_time,
                "slow_queries_count": slow_queries_count,
                "connection_pool_status": connection_pool_status,
                "connection_pool_issues": connection_pool_issues,
            }

    except Exception as e:
        error_msg = f"Failed to fetch database metrics: {str(e)}"
        logger.error(f"Error fetching database metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=error_msg)


@router.get("/bundle-size")
async def get_bundle_size() -> Dict[str, Any]:
    """
    Get bundle size metrics.

    Note: This would typically be fetched from build artifacts or CI/CD
    metrics. For now, returns placeholder.

    Returns:
        Dictionary with bundle size metrics:
        - total_size_mb: Total bundle size in MB
        - main_bundle_mb: Main bundle size in MB
        - vendor_bundle_mb: Vendor bundle size in MB
    """
    # TODO: Integrate with build system to get actual bundle sizes
    # This could be stored in a database table updated during builds
    # or fetched from build artifacts

    return {
        "total_size_mb": None,
        "main_bundle_mb": None,
        "vendor_bundle_mb": None,
        "note": ("Bundle size metrics require build system integration"),
    }


@router.get("/health")
async def get_health() -> Dict[str, Any]:
    """
    Health check endpoint for performance audit system.

    Returns:
        Dictionary with health status
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }
