from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apis.v1 import router as v1_router
from apis.v2.app import v2_app
from apis.v2 import business, assembly_intelligence
from core.security_middleware import setup_security_middleware
from core.middleware import (
    RateLimitMiddleware,
    RequestValidationMiddleware,
    ErrorHandlingMiddleware,
    RequestLoggingMiddleware
)
from core.connection_pool import get_connection_pool
from core.monitoring import setup_monitoring, monitoring
from core.health_checks import (
    get_health_status,
    get_liveness_status,
    get_readiness_status
)
from core.railway_health import get_railway_recommendations
from core.sentry_setup import init_sentry

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
        "url": "https://almona.com/support"
    },
    license_info={
        "name": "Proprietary",
        "url": "https://almona.com/license"
    },
    servers=[
        {
            "url": "https://api.almona.com",
            "description": "Production server"
        },
        {
            "url": "https://staging-api.almona.com",
            "description": "Staging server"
        },
        {
            "url": "http://localhost:8000",
            "description": "Development server"
        }
    ],
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User authentication and authorization endpoints"
        },
        {
            "name": "Tickets",
            "description": (
                "Service ticket management - support, "
                "maintenance, and emergency services"
            )
        },
        {
            "name": "Quotes",
            "description": "Quote generation and lookup functionality"
        },
        {
            "name": "AI",
            "description": (
                "AI-powered part detection and "
                "machine learning features"
            )
        },
        {
            "name": "Health",
            "description": "System health and monitoring endpoints"
        }
    ]
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
app.add_middleware(
    RateLimitMiddleware,
    requests_per_minute=100,
    burst_limit=20
)

# CORS middleware (production domains)
app.add_middleware(
    CORSMiddleware,
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
        "https://almona-portfolio-forge.vercel.app",  # Vercel domain
        "https://almona-portfolio-forge-kz44hknh6.vercel.app",
        # Vercel preview
        "https://almona-portfolio-forge-git-main.vercel.app"
        # Vercel branch
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

# Mount v2 app as a sub-application to preserve v2-specific middleware
app.mount("/api/v2", v2_app)


@app.on_event("startup")
async def startup_event():
    """Initialize connection pool on startup."""
    pool = get_connection_pool()
    await pool.initialize()


@app.get("/")
async def root():
    return {"message": "Almona Industrial API", "version": "2.0.0"}


@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint."""
    return await get_health_status()


@app.get("/health/live")
async def liveness_probe():
    """Kubernetes liveness probe endpoint (critical checks only)."""
    return await get_liveness_status()


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
                "unhealthy_connections": stats.unhealthy_connections
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
                "slow_queries_count": stats.slow_queries_count
            },
            "uptime_seconds": stats.uptime_seconds
        },
        "api": {
            "version": "2.0.0",
            "uptime": "N/A"  # You might want to track actual uptime
        }
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
            "uptime_seconds": stats.uptime_seconds
        },
        "recent_queries": recent_metrics,
        "connection_health": connection_health
    }


@app.get("/health/database")
async def database_health():
    """Database health check endpoint."""
    pool = get_connection_pool()
    stats = pool.get_performance_stats()

    # Determine overall health
    is_healthy = (
        stats.healthy_connections > 0 and
        stats.error_rate < 0.1 and  # Less than 10% error rate
        stats.avg_response_time_ms < 5000  # Less than 5 seconds average
    )

    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "details": {
            "healthy_connections": stats.healthy_connections,
            "total_connections": stats.total_connections,
            "error_rate": stats.error_rate,
            "avg_response_time_ms": stats.avg_response_time_ms,
            "last_check": "N/A"  # Could add timestamp
        }
    }


@app.get("/health/railway")
async def railway_services_recommendations():
    """
    Railway services health and recommendations endpoint.
    Shows what services are missing and provides setup commands.
    """
    return await get_railway_recommendations()
