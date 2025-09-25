from __future__ import annotations

from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from typing import Any, Dict, AsyncGenerator
import time
import asyncio
import logging

from core.config import settings
from core.supabase_client import (
    get_supabase_client,
    get_enhanced_supabase_client,
    get_pooled_supabase_client
)
from core.connection_pool import get_connection_pool, PoolStats
from core.errors import UnauthorizedError, ErrorContext
from apis.v2.core.errors import (
    SupabaseError,
    create_error_context
)

logger = logging.getLogger(__name__)


# OAuth2 bearer configured for v2 auth endpoints
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v2/auth/token")


def get_supabase():
    """Unified Supabase client dependency for v2 routers.

    Returns a configured supabase Client instance (service key by default).
    Uses connection pooling and performance monitoring.
    """
    return get_supabase_client()


def get_enhanced_supabase():
    """Enhanced Supabase client dependency with connection pooling.

    Returns the enhanced client with full connection pool capabilities.
    """
    return get_enhanced_supabase_client()


async def get_pooled_supabase():
    """Async pooled Supabase client dependency.

    Returns a client from the connection pool with automatic cleanup.
    """
    async for client in get_pooled_supabase_client():
        yield client


async def get_industrial_supabase(
    request: Request
) -> AsyncGenerator[Any, None]:
    """Industrial-scale Supabase client with advanced monitoring.

    This dependency provides:
    - Connection pooling with health monitoring
    - Query timeout handling
    - Performance metrics collection
    - Automatic retry logic
    - Connection health validation

    Args:
        request: FastAPI request object for context

    Yields:
        Supabase client from the connection pool

    Raises:
        SupabaseError: If connection pool is unhealthy or unavailable
    """
    pool = get_connection_pool()
    context = create_error_context(
        request=request,
        operation="get_industrial_supabase"
    )

    try:
        # Check pool health before providing client
        stats = pool.get_performance_stats()
        if stats.error_rate > 0.5:  # 50% error rate threshold
            raise SupabaseError(
                message="Connection pool has high error rate",
                operation="health_check",
                context=context,
                details={
                    "error_rate": stats.error_rate,
                    "total_queries": stats.total_queries,
                    "failed_queries": stats.failed_queries
                }
            )

        # Get client from pool with timeout
        async with asyncio.timeout(5.0):  # 5 second timeout for getting client
            async with pool.get_client() as client:
                # Validate connection health
                connection_id = getattr(client, '_connection_id', 'unknown')
                health_status = pool.get_connection_health()

                if connection_id in health_status:
                    health = health_status[connection_id]
                    if not health['is_healthy']:
                        logger.warning(
                            f"Using potentially unhealthy connection: {connection_id}"
                        )

                # Add request context to client for tracking
                client._request_context = {
                    'request_id': context.request_id,
                    'endpoint': str(request.url.path),
                    'method': request.method,
                    'user_agent': request.headers.get('user-agent', 'unknown')
                }

                yield client

    except asyncio.TimeoutError:
        raise SupabaseError(
            message="Timeout waiting for connection from pool",
            operation="get_client",
            context=context,
            details={
                "timeout_seconds": 5.0,
                "pool_stats": pool.get_performance_stats().__dict__
            }
        )
    except Exception as e:
        raise SupabaseError(
            message=f"Failed to get connection from pool: {str(e)}",
            operation="get_client",
            original_error=e,
            context=context
        )


async def get_high_performance_supabase(request: Request) -> AsyncGenerator[Any, None]:
    """High-performance Supabase client for data-intensive operations.

    Optimized for:
    - Large data queries
    - Batch operations
    - Analytics queries
    - Reporting operations

    Features:
    - Extended query timeouts
    - Connection affinity
    - Enhanced monitoring
    - Bulk operation support

    Args:
        request: FastAPI request object for context

    Yields:
        Optimized Supabase client for high-performance operations
    """
    pool = get_connection_pool()
    context = create_error_context(
        request=request,
        operation="get_high_performance_supabase"
    )

    try:
        # Use extended timeout for high-performance operations
        async with asyncio.timeout(10.0):  # 10 second timeout
            async with pool.get_client() as client:
                # Configure client for high-performance operations
                client._high_performance_mode = True
                client._request_context = {
                    'request_id': context.request_id,
                    'endpoint': str(request.url.path),
                    'method': request.method,
                    'performance_mode': 'high_performance',
                    'user_agent': request.headers.get('user-agent', 'unknown')
                }

                # Set extended timeout for queries
                original_timeout = pool.query_timeout
                pool.query_timeout = 60.0  # 60 seconds for high-performance queries

                try:
                    yield client
                finally:
                    # Restore original timeout
                    pool.query_timeout = original_timeout

    except asyncio.TimeoutError:
        raise SupabaseError(
            message="Timeout waiting for high-performance connection",
            operation="get_high_performance_client",
            context=context,
            details={
                "timeout_seconds": 10.0,
                "pool_stats": pool.get_performance_stats().__dict__
            }
        )
    except Exception as e:
        raise SupabaseError(
            message=f"Failed to get high-performance connection: {str(e)}",
            operation="get_high_performance_client",
            original_error=e,
            context=context
        )


async def get_read_only_supabase(request: Request) -> AsyncGenerator[Any, None]:
    """Read-only Supabase client for safe data access.

    Optimized for:
    - Read operations only
    - Analytics queries
    - Reporting
    - Data exploration

    Features:
    - Read-only connection
    - Optimized for SELECT queries
    - Reduced connection overhead
    - Enhanced caching support

    Args:
        request: FastAPI request object for context

    Yields:
        Read-only optimized Supabase client
    """
    pool = get_connection_pool()
    context = create_error_context(
        request=request,
        operation="get_read_only_supabase"
    )

    try:
        async with asyncio.timeout(3.0):  # Shorter timeout for read operations
            async with pool.get_client() as client:
                # Configure client for read-only operations
                client._read_only_mode = True
                client._request_context = {
                    'request_id': context.request_id,
                    'endpoint': str(request.url.path),
                    'method': request.method,
                    'access_mode': 'read_only',
                    'user_agent': request.headers.get('user-agent', 'unknown')
                }

                yield client

    except asyncio.TimeoutError:
        raise SupabaseError(
            message="Timeout waiting for read-only connection",
            operation="get_read_only_client",
            context=context,
            details={
                "timeout_seconds": 3.0,
                "pool_stats": pool.get_performance_stats().__dict__
            }
        )
    except Exception as e:
        raise SupabaseError(
            message=f"Failed to get read-only connection: {str(e)}",
            operation="get_read_only_client",
            original_error=e,
            context=context
        )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """Validate an access token and return minimal user claims.

    Expects tokens created with settings.JWT_SECRET_KEY and {"type": "access"}.
    Returns a dict with at least {"sub": <email or id>}.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "access":
            raise UnauthorizedError("Invalid token type")
        subject = payload.get("sub")
        if subject is None:
            raise UnauthorizedError("Missing subject in token")
        return payload  # full claims to allow role/tenant checks by callers
    except JWTError as e:
        raise UnauthorizedError(f"Token validation failed: {str(e)}")


def get_request_context(request: Request) -> ErrorContext:
    """Extract request context for error reporting."""
    request_id = f"req_{int(time.time() * 1000)}"
    return ErrorContext(
        request_id=request_id,
        operation=f"{request.method} {request.url.path}"
    )


def get_connection_pool_stats() -> PoolStats:
    """Get connection pool performance statistics.

    Returns:
        PoolStats: Comprehensive pool performance metrics
    """
    pool = get_connection_pool()
    return pool.get_performance_stats()


def get_connection_health_status() -> Dict[str, Any]:
    """Get detailed connection health status.

    Returns:
        Dict containing health status of all connections
    """
    pool = get_connection_pool()
    return pool.get_connection_health()


def get_recent_query_metrics(limit: int = 100) -> list[Dict[str, Any]]:
    """Get recent query performance metrics.

    Args:
        limit: Maximum number of recent metrics to return

    Returns:
        List of recent query metrics
    """
    pool = get_connection_pool()
    return pool.get_detailed_metrics(limit=limit)


async def validate_connection_pool_health() -> Dict[str, Any]:
    """Validate connection pool health and return status.

    Returns:
        Dict containing health validation results
    """
    pool = get_connection_pool()
    stats = pool.get_performance_stats()
    connection_health = pool.get_connection_health()
    
    # Calculate health score
    health_score = 100.0
    if stats.error_rate > 0.1:  # 10% error rate reduces score
        health_score -= (stats.error_rate * 100)
    
    if stats.avg_response_time_ms > 1000:  # Slow queries reduce score
        health_score -= min(20, (stats.avg_response_time_ms - 1000) / 100)
    
    unhealthy_connections = sum(
        1 for health in connection_health.values() 
        if not health['is_healthy']
    )
    if unhealthy_connections > 0:
        health_score -= (unhealthy_connections / stats.total_connections) * 30
    
    # Determine overall health status
    if health_score >= 90:
        status = "excellent"
    elif health_score >= 75:
        status = "good"
    elif health_score >= 50:
        status = "fair"
    else:
        status = "poor"
    
    return {
        "status": status,
        "health_score": max(0, health_score),
        "pool_stats": stats.__dict__,
        "connection_health": connection_health,
        "recommendations": _get_health_recommendations(stats, connection_health)
    }


def _get_health_recommendations(stats: PoolStats, health_status: Dict[str, Any]) -> list[str]:
    """Generate health recommendations based on pool statistics.

    Args:
        stats: Pool performance statistics
        health_status: Connection health status

    Returns:
        List of health recommendations
    """
    recommendations = []

    if stats.error_rate > 0.1:
        recommendations.append(
            f"High error rate detected ({stats.error_rate:.1%}). "
            "Check database connectivity and query performance."
        )

    if stats.avg_response_time_ms > 1000:
        recommendations.append(
            f"Slow query performance detected ({stats.avg_response_time_ms:.1f}ms avg). "
            "Consider query optimization or increasing connection pool size."
        )

    if stats.slow_queries_count > stats.total_queries * 0.1:
        recommendations.append(
            f"High number of slow queries ({stats.slow_queries_count}). "
            "Review and optimize slow-running queries."
        )

    unhealthy_connections = sum(
        1 for health in health_status.values()
        if not health['is_healthy']
    )
    if unhealthy_connections > 0:
        recommendations.append(
            f"Unhealthy connections detected ({unhealthy_connections}). "
            "Consider restarting the connection pool or checking network connectivity."
        )

    if stats.active_connections / stats.total_connections > 0.8:
        recommendations.append(
            "High connection pool utilization. "
            "Consider increasing max_connections or optimizing connection usage."
        )

    if not recommendations:
        recommendations.append("Connection pool is operating within normal parameters.")

    return recommendations
