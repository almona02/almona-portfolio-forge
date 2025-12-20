from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apis.v1 import router as v1_router
from apis.v2 import business, assembly_intelligence
from apis.v2.routers import router as v2_router
from core.security_middleware import setup_security_middleware
from core.middleware import (
    RateLimitMiddleware,
    RequestValidationMiddleware,
    ErrorHandlingMiddleware,
    RequestLoggingMiddleware,
)
from core.connection_pool import get_connection_pool
from core.monitoring import setup_monitoring, monitoring, get_structured_logger
from core.health_checks import (
    get_health_status,
    get_liveness_status,
    get_readiness_status,
)
from core.railway_health import get_railway_recommendations
from core.sentry_setup import init_sentry
from core.config import settings

# Force import of celery_app to trigger Redis URL debugging on startup
try:
    from core.celery_app import celery_app

    logger = get_structured_logger(__name__)
    logger.info("Celery app imported at startup for Redis URL debugging")
except Exception as e:
    logger = get_structured_logger(__name__)
    logger.error(f"Failed to import celery_app at startup: {e}")

app = FastAPI(
    title="Almona Industrial API",
    version="2.0.0",
    description="""
    # Almona Industrial API

    A comprehensive API for industrial machinery management,
    service ticketing, and quote generation.

    ## Features

    * **Service Ticketing**: Create and manage support tickets,
      maintenance requests, and emergency services
    * **Quote Management**: Generate and lookup product quotes
      with digital twin integration
    * **Authentication**: JWT-based authentication with
      role-based access control
    * **AI Integration**: Part detection and machine learning capabilities
    * **Real-time Updates**: WebSocket support for live updates

    ## Authentication

    Most endpoints require authentication. Use the
    `/api/v2/auth/token` endpoint to obtain a JWT token.

    ## Rate Limiting

    API requests are rate-limited based on user type:
    - Anonymous: 30 requests/minute
    - Authenticated: 100 requests/minute
    - Premium: 200 requests/minute
    - Admin: 500 requests/minute

    ## Error Handling

    All errors follow a consistent format with error codes,
    messages, and context information.
    """,
    contact={
        "name": "Almona Industrial Support",
        "email": "api-support@almona.com",
        "url": "https://almona.com/support",
    },
    license_info={"name": "Proprietary", "url": "https://almona.com/license"},
    servers=[
        {"url": "https://api.almona.com", "description": "Production server"},
        {"url": "https://staging-api.almona.com", "description": "Staging server"},
        {"url": "http://localhost:8000", "description": "Development server"},
    ],
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User authentication and authorization endpoints",
        },
        {
            "name": "Tickets",
            "description": (
                "Service ticket management - support, "
                "maintenance, and emergency services"
            ),
        },
        {"name": "Quotes", "description": "Quote generation and lookup functionality"},
        {
            "name": "AI",
            "description": (
                "AI-powered part detection and " "machine learning features"
            ),
        },
        {"name": "Health", "description": "System health and monitoring endpoints"},
    ],
)

# Setup monitoring infrastructure
monitoring_setup = setup_monitoring(app)

# Initialize Sentry error tracking
init_sentry()

# Configure security middleware
setup_security_middleware(app)

# Add security and monitoring middleware (order matters!)
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RequestValidationMiddleware)
# Security headers are handled by setup_security_middleware
app.add_middleware(RateLimitMiddleware, requests_per_minute=100, burst_limit=20)

# CORS middleware (production domains)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Allow all Vercel preview domains
    allow_origins=[
        "http://localhost:3000",  # Development
        "http://localhost:3001",  # Development
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:5173",  # Development
        "http://127.0.0.1:5173",
        "http://localhost:8002",
        "http://127.0.0.1:8002",
        "https://www.almona02.com",  # Production domain
        "https://almona-portfolio-forge.vercel.app",  # Vercel production
        "https://almona-portfolio-forge-git-main.vercel.app",  # Vercel main branch
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(v1_router, prefix="/api/v1")
# Business intelligence endpoints (pilot)
app.include_router(business.router)
# Assembly intelligence endpoints
app.include_router(assembly_intelligence.router)

# Include v2 routers with /api/v2 prefix
# Using include_router instead of mount to ensure routes are accessible
app.include_router(v2_router, prefix="/api/v2")

# Include SmartScan routers with prefix
try:
    from apis.v2 import (
        smart_scan,
        smart_scan_enhanced,
        smart_scan_assembly,
    )

    app.include_router(smart_scan.router, prefix="/api/v2")
    app.include_router(smart_scan_enhanced.router, prefix="/api/v2")
    app.include_router(smart_scan_assembly.router, prefix="/api/v2")
except Exception as exc:
    logger = get_structured_logger(__name__)
    logger.warning("SmartScan routers not loaded: %s", exc)


# Add v2 health endpoint (from v2_app)
@app.get("/api/v2/health")
async def v2_health_check():
    """V2-specific health check endpoint."""
    from apis.v2.middleware import is_rate_limiting_enabled

    return {
        "status": "healthy",
        "version": "2.0.0",
        "rate_limiting_enabled": is_rate_limiting_enabled(),
    }


@app.on_event("startup")
async def startup_event():
    """Initialize connection pool on startup (non-blocking for Railway)."""
    try:
        pool = get_connection_pool()
        await pool.initialize()
    except Exception as e:
        # Don't fail startup if database isn't ready yet
        logger = get_structured_logger(__name__)
        logger.warning(
            f"Database connection pool initialization failed (non-blocking): {e}"
        )


@app.get("/")
async def root():
    return {"message": "Almona Industrial API", "version": "2.0.0"}


@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint (Railway-compatible)."""
    try:
        # Try full health check first
        return await get_health_status()
    except Exception as e:
        # If health checks fail, return basic status (service is running)
        logger = get_structured_logger(__name__)
        logger.warning(f"Health check error (returning basic status): {e}")
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "note": "Basic health check passed (detailed checks may be unavailable)",
            "error": str(e) if getattr(settings, "DEBUG", False) else None,
        }


@app.get("/health/live")
async def liveness_probe():
    """Kubernetes liveness probe endpoint (critical checks only)."""
    try:
        return await get_liveness_status()
    except Exception:
        # If health checks fail, return basic OK (service is running)
        return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/health/ready")
async def readiness_probe():
    """Kubernetes readiness probe endpoint (all checks)."""
    return await get_readiness_status()


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return monitoring.get_metrics_response()


@app.get("/metrics/json")
async def metrics_json():
    """Enhanced metrics endpoint for monitoring (JSON format)."""
    pool = get_connection_pool()
    stats = pool.get_performance_stats()

    return {
        "database": {
            "connection_pool": {
                "total_connections": stats.total_connections,
                "active_connections": stats.active_connections,
                "idle_connections": stats.idle_connections,
                "healthy_connections": stats.healthy_connections,
                "unhealthy_connections": stats.unhealthy_connections,
            },
            "performance": {
                "total_queries": stats.total_queries,
                "successful_queries": stats.successful_queries,
                "failed_queries": stats.failed_queries,
                "success_rate": (
                    stats.successful_queries / stats.total_queries
                    if stats.total_queries > 0
                    else 0
                ),
                "error_rate": stats.error_rate,
                "avg_response_time_ms": stats.avg_response_time_ms,
                "slow_queries_count": stats.slow_queries_count,
            },
            "uptime_seconds": stats.uptime_seconds,
        },
        "api": {
            "version": "2.0.0",
            "uptime": "N/A",  # You might want to track actual uptime
        },
    }


@app.get("/metrics/detailed")
async def detailed_metrics(limit: int = 100):
    """Detailed metrics endpoint with recent query history."""
    pool = get_connection_pool()
    stats = pool.get_performance_stats()
    recent_metrics = pool.get_detailed_metrics(limit)
    connection_health = pool.get_connection_health()

    return {
        "summary": {
            "total_connections": stats.total_connections,
            "active_connections": stats.active_connections,
            "healthy_connections": stats.healthy_connections,
            "total_queries": stats.total_queries,
            "success_rate": (
                stats.successful_queries / stats.total_queries
                if stats.total_queries > 0
                else 0
            ),
            "avg_response_time_ms": stats.avg_response_time_ms,
            "uptime_seconds": stats.uptime_seconds,
        },
        "recent_queries": recent_metrics,
        "connection_health": connection_health,
    }


@app.get("/health/database")
async def database_health():
    """Database health check endpoint."""
    pool = get_connection_pool()
    stats = pool.get_performance_stats()

    # Determine overall health
    is_healthy = (
        stats.healthy_connections > 0
        and stats.error_rate < 0.1  # Less than 10% error rate
        and stats.avg_response_time_ms < 5000  # Less than 5 seconds average
    )

    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "details": {
            "healthy_connections": stats.healthy_connections,
            "total_connections": stats.total_connections,
            "error_rate": stats.error_rate,
            "avg_response_time_ms": stats.avg_response_time_ms,
            "last_check": "N/A",  # Could add timestamp
        },
    }


@app.get("/health/railway")
async def railway_services_recommendations():
    """
    Railway services health and recommendations endpoint.
    Shows what services are missing and provides setup commands.
    """
    return await get_railway_recommendations()
