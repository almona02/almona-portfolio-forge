"""
V2 API application factory.

Creates a FastAPI application specifically for v2 APIs with enhanced middleware
including rate limiting, security headers, and request validation.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apis.v2.routers import router as v2_router
from apis.v2.middleware import (
    V2RateLimitMiddleware,
    is_rate_limiting_enabled,
    get_default_rate_limit_tier,
    get_cleanup_interval
)
from apis.v2.core.errors import (
    v2_error_handler,
    v2_validation_error_handler,
    v2_http_exception_handler,
    v2_general_exception_handler,
    V2APIError
)
from apis.v2.middleware.error_handler import V2ErrorHandlerMiddleware
from apis.v2.deps import (
    get_connection_pool_stats,
    get_connection_health_status,
    get_recent_query_metrics,
    validate_connection_pool_health
)
from celery_app import celery_app
from tasks.monitoring_tasks import (
    system_health_check,
    task_performance_monitor,
    cleanup_old_tasks,
    monitor_celery_workers
)
from core.middleware import (
    SecurityHeadersMiddleware,
    RequestValidationMiddleware,
    ErrorHandlingMiddleware,
    RequestLoggingMiddleware
)
from core.config import settings
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException


def create_v2_app() -> FastAPI:
    """
    Create and configure the v2 API application.

    Returns:
        Configured FastAPI application for v2 APIs
    """
    app = FastAPI(
        title="Almona Industrial API v2",
        version="2.0.0",
        description=(
            "Enhanced API with rate limiting and advanced security features"
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json"
    )
    
    # Add middleware in the correct order (last added is first executed)

    # 1. V2 Error handling (outermost)
    app.add_middleware(V2ErrorHandlerMiddleware)
    
    # 2. General error handling
    app.add_middleware(ErrorHandlingMiddleware)

    # 3. Request logging
    app.add_middleware(RequestLoggingMiddleware)

    # 4. Rate limiting (if enabled)
    if is_rate_limiting_enabled():
        app.add_middleware(
            V2RateLimitMiddleware,
            default_tier=get_default_rate_limit_tier(),
            cleanup_interval=get_cleanup_interval()
        )

    # 5. Request validation
    app.add_middleware(RequestValidationMiddleware)

    # 6. Security headers
    app.add_middleware(SecurityHeadersMiddleware)

    # 7. CORS (innermost)
    origins = settings.ALLOWED_ORIGINS.split(",") if settings.ALLOWED_ORIGINS else ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Register error handlers
    app.add_exception_handler(V2APIError, v2_error_handler)
    app.add_exception_handler(RequestValidationError, v2_validation_error_handler)
    app.add_exception_handler(HTTPException, v2_http_exception_handler)
    app.add_exception_handler(Exception, v2_general_exception_handler)
    
    # Include v2 router
    app.include_router(v2_router)

    # Add v2-specific endpoints
    @app.get("/health")
    async def v2_health_check():
        """V2-specific health check endpoint."""
        return {
            "status": "healthy",
            "version": "2.0.0",
            "rate_limiting_enabled": is_rate_limiting_enabled()
        }

    @app.get("/rate-limits")
    async def get_rate_limit_info():
        """Get current rate limiting configuration and stats."""
        if not is_rate_limiting_enabled():
            return {"enabled": False}

        # Get rate limit stats from middleware
        # Note: This would need to be implemented in the middleware to expose stats
        return {
            "enabled": True,
            "tiers": {
                "anonymous": {
                    "requests_per_minute": settings.RATE_LIMIT_ANONYMOUS_PER_MINUTE,
                    "requests_per_hour": settings.RATE_LIMIT_ANONYMOUS_PER_HOUR,
                    "burst_limit": settings.RATE_LIMIT_ANONYMOUS_BURST
                },
                "authenticated": {
                    "requests_per_minute": settings.RATE_LIMIT_AUTHENTICATED_PER_MINUTE,
                    "requests_per_hour": settings.RATE_LIMIT_AUTHENTICATED_PER_HOUR,
                    "burst_limit": settings.RATE_LIMIT_AUTHENTICATED_BURST
                },
                "premium": {
                    "requests_per_minute": settings.RATE_LIMIT_PREMIUM_PER_MINUTE,
                    "requests_per_hour": settings.RATE_LIMIT_PREMIUM_PER_HOUR,
                    "burst_limit": settings.RATE_LIMIT_PREMIUM_BURST
                },
                "admin": {
                    "requests_per_minute": settings.RATE_LIMIT_ADMIN_PER_MINUTE,
                    "requests_per_hour": settings.RATE_LIMIT_ADMIN_PER_HOUR,
                    "burst_limit": settings.RATE_LIMIT_ADMIN_BURST
                }
            }
        }

    @app.get("/connection-pool/stats")
    async def get_connection_pool_stats_endpoint():
        """Get connection pool performance statistics."""
        try:
            stats = get_connection_pool_stats()
            return {
                "status": "success",
                "data": {
                    "total_connections": stats.total_connections,
                    "active_connections": stats.active_connections,
                    "idle_connections": stats.idle_connections,
                    "healthy_connections": stats.healthy_connections,
                    "unhealthy_connections": stats.unhealthy_connections,
                    "total_queries": stats.total_queries,
                    "successful_queries": stats.successful_queries,
                    "failed_queries": stats.failed_queries,
                    "avg_response_time_ms": round(stats.avg_response_time_ms, 2),
                    "slow_queries_count": stats.slow_queries_count,
                    "error_rate": round(stats.error_rate, 4),
                    "uptime_seconds": round(stats.uptime_seconds, 2)
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to get connection pool stats: {str(e)}"
            }

    @app.get("/connection-pool/health")
    async def get_connection_pool_health_endpoint():
        """Get detailed connection pool health status."""
        try:
            health_status = get_connection_health_status()
            return {
                "status": "success",
                "data": health_status
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to get connection pool health: {str(e)}"
            }

    @app.get("/connection-pool/metrics")
    async def get_recent_query_metrics_endpoint(limit: int = 100):
        """Get recent query performance metrics."""
        try:
            metrics = get_recent_query_metrics(limit=limit)
            return {
                "status": "success",
                "data": {
                    "metrics": metrics,
                    "count": len(metrics)
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to get query metrics: {str(e)}"
            }

    @app.get("/connection-pool/validate")
    async def validate_connection_pool_health_endpoint():
        """Validate connection pool health and get recommendations."""
        try:
            health_validation = await validate_connection_pool_health()
            return {
                "status": "success",
                "data": health_validation
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to validate connection pool health: {str(e)}"
            }

    @app.get("/celery/status")
    async def get_celery_status():
        """Get Celery worker and queue status."""
        try:
            inspect = celery_app.control.inspect()
            
            # Get worker statistics
            worker_stats = inspect.stats()
            active_tasks = inspect.active()
            scheduled_tasks = inspect.scheduled()
            reserved_tasks = inspect.reserved()
            
            # Calculate totals
            total_active = sum(len(tasks) for tasks in (active_tasks or {}).values())
            total_scheduled = sum(len(tasks) for tasks in (scheduled_tasks or {}).values())
            total_reserved = sum(len(tasks) for tasks in (reserved_tasks or {}).values())
            
            return {
                "status": "success",
                "data": {
                    "workers": {
                        "count": len(worker_stats) if worker_stats else 0,
                        "details": worker_stats or {}
                    },
                    "queues": {
                        "active_tasks": total_active,
                        "scheduled_tasks": total_scheduled,
                        "reserved_tasks": total_reserved,
                        "total_pending": total_active + total_scheduled + total_reserved
                    },
                    "task_distribution": {
                        "active": active_tasks or {},
                        "scheduled": scheduled_tasks or {},
                        "reserved": reserved_tasks or {}
                    }
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to get Celery status: {str(e)}"
            }

    @app.get("/celery/tasks")
    async def get_celery_tasks():
        """Get detailed information about Celery tasks."""
        try:
            inspect = celery_app.control.inspect()
            
            # Get registered tasks
            registered_tasks = inspect.registered()
            
            # Get active tasks with details
            active_tasks = inspect.active()
            
            # Get scheduled tasks
            scheduled_tasks = inspect.scheduled()
            
            return {
                "status": "success",
                "data": {
                    "registered_tasks": registered_tasks or {},
                    "active_tasks": active_tasks or {},
                    "scheduled_tasks": scheduled_tasks or {},
                    "task_count": {
                        "registered": sum(len(tasks) for tasks in (registered_tasks or {}).values()),
                        "active": sum(len(tasks) for tasks in (active_tasks or {}).values()),
                        "scheduled": sum(len(tasks) for tasks in (scheduled_tasks or {}).values())
                    }
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to get Celery tasks: {str(e)}"
            }

    @app.post("/celery/health-check")
    async def trigger_health_check():
        """Trigger a system health check."""
        try:
            task = system_health_check.delay()
            return {
                "status": "success",
                "data": {
                    "task_id": task.id,
                    "message": "Health check task started",
                    "status_url": f"/api/v2/celery/tasks/{task.id}/status"
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to start health check: {str(e)}"
            }

    @app.post("/celery/performance-monitor")
    async def trigger_performance_monitor():
        """Trigger task performance monitoring."""
        try:
            task = task_performance_monitor.delay()
            return {
                "status": "success",
                "data": {
                    "task_id": task.id,
                    "message": "Performance monitoring task started",
                    "status_url": f"/api/v2/celery/tasks/{task.id}/status"
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to start performance monitoring: {str(e)}"
            }

    @app.post("/celery/cleanup")
    async def trigger_cleanup(days_old: int = 7):
        """Trigger cleanup of old tasks and logs."""
        try:
            task = cleanup_old_tasks.delay(days_old=days_old)
            return {
                "status": "success",
                "data": {
                    "task_id": task.id,
                    "message": f"Cleanup task started (older than {days_old} days)",
                    "status_url": f"/api/v2/celery/tasks/{task.id}/status"
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to start cleanup: {str(e)}"
            }

    @app.get("/celery/tasks/{task_id}/status")
    async def get_task_status(task_id: str):
        """Get the status of a specific Celery task."""
        try:
            task_result = celery_app.AsyncResult(task_id)
            
            return {
                "status": "success",
                "data": {
                    "task_id": task_id,
                    "state": task_result.state,
                    "result": task_result.result if task_result.ready() else None,
                    "info": task_result.info,
                    "ready": task_result.ready(),
                    "successful": task_result.successful() if task_result.ready() else None,
                    "failed": task_result.failed() if task_result.ready() else None
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to get task status: {str(e)}"
            }

    @app.get("/celery/workers")
    async def get_worker_status():
        """Get detailed worker status and statistics."""
        try:
            task = monitor_celery_workers.delay()
            return {
                "status": "success",
                "data": {
                    "task_id": task.id,
                    "message": "Worker monitoring task started",
                    "status_url": f"/api/v2/celery/tasks/{task.id}/status"
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to start worker monitoring: {str(e)}"
            }
    
    return app


# Create the v2 app instance
v2_app = create_v2_app()
