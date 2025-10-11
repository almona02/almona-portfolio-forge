"""
Railway services health check and monitoring.
"""
import asyncio
import logging
from typing import Dict, Any
from datetime import datetime

from core.database_adapter import db_adapter
from core.email_adapter import email_adapter
from core.config import settings

logger = logging.getLogger(__name__)


class RailwayHealthCheck:
    """Health check and monitoring for Railway services."""
    
    async def check_all_services(self) -> Dict[str, Any]:
        """Check health of all Railway and fallback services."""
        
        health_status = {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": "healthy",
            "environment": settings.ENVIRONMENT,
            "services": {}
        }
        
        # Check database services
        db_status = await db_adapter.get_connection_status()
        health_status["services"]["database"] = {
            **db_status,
            "status": "healthy" if (db_status.get("railway_postgresql") or db_status.get("supabase")) else "unhealthy"
        }
        
        # Check Redis cache
        redis_healthy = await db_adapter.check_redis_connection()
        health_status["services"]["redis"] = {
            "available": redis_healthy,
            "url_configured": bool(settings.REDIS_URL),
            "host_configured": bool(settings.REDIS_HOST),
            "status": "healthy" if redis_healthy else "degraded"
        }
        
        # Check email services
        email_status = email_adapter.get_service_status()
        health_status["services"]["email"] = {
            **email_status,
            "resend_api_key_configured": bool(getattr(settings, 'RESEND_API_KEY', None)),
            "sendgrid_api_key_configured": bool(settings.SENDGRID_API_KEY),
            "status": "healthy" if email_status["operational"] else "degraded"
        }
        
        # Check environment variables (Railway services)
        health_status["services"]["environment"] = await self._check_environment_variables()
        
        # Determine overall status
        service_statuses = [
            health_status["services"]["database"]["status"],
            health_status["services"]["redis"]["status"],
            health_status["services"]["email"]["status"],
            health_status["services"]["environment"]["status"]
        ]
        
        if "unhealthy" in service_statuses:
            health_status["overall_status"] = "unhealthy"
        elif "degraded" in service_statuses:
            health_status["overall_status"] = "degraded"
        
        return health_status
    
    async def _check_environment_variables(self) -> Dict[str, Any]:
        """Check if Railway environment variables are properly configured."""
        
        railway_services = {
            "DATABASE_URL": {
                "configured": bool(settings.DATABASE_URL),
                "type": "postgresql" if settings.DATABASE_URL.startswith("postgresql") else "other",
                "critical": True
            },
            "REDIS_URL": {
                "configured": bool(settings.REDIS_URL),
                "critical": False
            },
            "RESEND_API_KEY": {
                "configured": bool(getattr(settings, 'RESEND_API_KEY', None)),
                "critical": False
            }
        }
        
        # Check configuration completeness
        critical_services = [k for k, v in railway_services.items() if v["critical"]]
        critical_configured = [k for k, v in railway_services.items() if v["critical"] and v["configured"]]
        
        status = "healthy"
        if len(critical_configured) < len(critical_services):
            status = "unhealthy"
        elif not all(v["configured"] for v in railway_services.values()):
            status = "degraded"
        
        return {
            "railway_services": railway_services,
            "critical_services_configured": len(critical_configured),
            "total_critical_services": len(critical_services),
            "status": status
        }
    
    async def get_service_recommendations(self) -> Dict[str, Any]:
        """Get recommendations for missing or misconfigured services."""
        
        health = await self.check_all_services()
        recommendations = []
        
        # Database recommendations
        db_service = health["services"]["database"]
        if not db_service.get("railway_postgresql", False):
            if not db_service.get("supabase", False):
                recommendations.append({
                    "priority": "CRITICAL",
                    "service": "Database",
                    "action": "Add PostgreSQL service to Railway project",
                    "command": "railway add postgresql",
                    "reason": "No database connection available"
                })
            else:
                recommendations.append({
                    "priority": "HIGH",
                    "service": "Database",
                    "action": "Add PostgreSQL service to Railway project",
                    "command": "railway add postgresql",
                    "reason": "Currently using external Supabase - migrate to Railway for better performance"
                })
        
        # Redis recommendations
        redis_service = health["services"]["redis"]
        if not redis_service.get("available", False):
            recommendations.append({
                "priority": "HIGH",
                "service": "Redis",
                "action": "Add Redis service to Railway project",
                "command": "railway add redis",
                "reason": "Caching and session management not available"
            })
        
        # Email recommendations
        email_service = health["services"]["email"]
        if not email_service.get("operational", False):
            recommendations.append({
                "priority": "MEDIUM",
                "service": "Email",
                "action": "Add Resend service to Railway project",
                "command": "railway add resend",
                "reason": "No email service available for notifications"
            })
        elif email_service.get("provider") == "sendgrid":
            recommendations.append({
                "priority": "LOW",
                "service": "Email",
                "action": "Consider migrating to Resend for better Railway integration",
                "command": "railway add resend",
                "reason": "Resend offers better Railway integration than SendGrid"
            })
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "recommendations": recommendations,
            "total_recommendations": len(recommendations),
            "critical_issues": len([r for r in recommendations if r["priority"] == "CRITICAL"]),
            "summary": self._get_recommendations_summary(recommendations)
        }
    
    def _get_recommendations_summary(self, recommendations: list) -> str:
        """Generate a summary of recommendations."""
        if not recommendations:
            return "✅ All Railway services are properly configured!"
        
        critical = len([r for r in recommendations if r["priority"] == "CRITICAL"])
        high = len([r for r in recommendations if r["priority"] == "HIGH"])
        
        if critical > 0:
            return f"🚨 {critical} critical issues require immediate attention"
        elif high > 0:
            return f"⚠️  {high} high-priority improvements recommended"
        else:
            return "💡 Minor optimizations available"


# Global health check instance
railway_health = RailwayHealthCheck()


async def get_railway_health():
    """FastAPI dependency for health checks."""
    return await railway_health.check_all_services()


async def get_railway_recommendations():
    """FastAPI dependency for service recommendations."""
    return await railway_health.get_service_recommendations()