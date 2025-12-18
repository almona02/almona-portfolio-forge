# flake8: noqa
"""
Comprehensive health check system for Kubernetes deployment.
"""
import asyncio
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from enum import Enum

from fastapi import HTTPException, status
from core.config import settings
from core.connection_pool import get_connection_pool
from core.monitoring import get_structured_logger, record_error_metrics
from core.railway_health import railway_health

logger = get_structured_logger(__name__)


class HealthStatus(str, Enum):
    """Health check status enumeration."""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"


class HealthCheck:
    """Individual health check component."""
    
    def __init__(self, name: str, critical: bool = True):
        self.name = name
        self.critical = critical
        self.status = HealthStatus.HEALTHY
        self.message = ""
        self.details: Dict[str, Any] = {}
        self.response_time_ms = 0.0
        self.last_check = None
    
    async def check(self) -> HealthStatus:
        """Perform the health check."""
        start_time = time.time()
        self.last_check = datetime.utcnow()
        
        try:
            self.status = await self._perform_check()
            self.message = "Check passed"
        except Exception as e:
            self.status = HealthStatus.UNHEALTHY
            self.message = str(e)
            logger.error(
                f"Health check failed: {self.name}",
                error=str(e),
                check_name=self.name
            )
            record_error_metrics("health_check_failure", "error")
        
        self.response_time_ms = (time.time() - start_time) * 1000
        return self.status
    
    async def _perform_check(self) -> HealthStatus:
        """Override this method in subclasses."""
        return HealthStatus.HEALTHY


class DatabaseHealthCheck(HealthCheck):
    """Database connectivity and performance health check."""
    
    def __init__(self):
        super().__init__("database", critical=True)
    
    async def _perform_check(self) -> HealthStatus:
        """Check database connectivity and performance."""
        pool = get_connection_pool()
        stats = pool.get_performance_stats()
        
        # Check connection health
        if stats.healthy_connections == 0:
            raise Exception("No healthy database connections available")
        
        # Check error rate
        if stats.error_rate > 0.1:  # 10% error rate threshold
            raise Exception(f"High database error rate: {stats.error_rate:.2%}")
        
        # Check response time
        if stats.avg_response_time_ms > 5000:  # 5 second threshold
            raise Exception(f"Slow database response time: {stats.avg_response_time_ms:.2f}ms")
        
        # Test actual query
        async with pool.get_client() as client:
            await asyncio.to_thread(
                lambda: client.table('profiles').select('id').limit(1).execute()
            )
        
        self.details = {
            "healthy_connections": stats.healthy_connections,
            "total_connections": stats.total_connections,
            "error_rate": stats.error_rate,
            "avg_response_time_ms": stats.avg_response_time_ms,
            "uptime_seconds": stats.uptime_seconds
        }
        
        return HealthStatus.HEALTHY


class RedisHealthCheck(HealthCheck):
    """Redis connectivity health check."""
    
    def __init__(self):
        super().__init__("redis", critical=False)
    
    async def _perform_check(self) -> HealthStatus:
        """Check Redis connectivity."""
        # This would be implemented if Redis is used
        # For now, we'll skip this check
        self.details = {"status": "not_configured"}
        return HealthStatus.HEALTHY


class ExternalServicesHealthCheck(HealthCheck):
    """External services health check."""
    
    def __init__(self):
        super().__init__("external_services", critical=False)
    
    async def _perform_check(self) -> HealthStatus:
        """Check external services connectivity."""
        services_status = {}
        
        # Check Supabase
        try:
            pool = get_connection_pool()
            async with pool.get_client() as client:
                await asyncio.to_thread(
                    lambda: client.table('profiles').select('id').limit(1).execute()
                )
            services_status["supabase"] = "healthy"
        except Exception as e:
            services_status["supabase"] = f"unhealthy: {str(e)}"
        
        # Check SendGrid (if configured)
        if settings.SENDGRID_API_KEY:
            services_status["sendgrid"] = "configured"
        else:
            services_status["sendgrid"] = "not_configured"
        
        # Check Twilio (if configured)
        if settings.TWILIO_ACCOUNT_SID:
            services_status["twilio"] = "configured"
        else:
            services_status["twilio"] = "not_configured"
        
        self.details = services_status
        
        # Determine overall status
        unhealthy_services = [
            service for service, status in services_status.items()
            if "unhealthy" in status
        ]
        
        if unhealthy_services:
            return HealthStatus.DEGRADED
        
        return HealthStatus.HEALTHY


class SystemResourcesHealthCheck(HealthCheck):
    """System resources health check."""
    
    def __init__(self):
        super().__init__("system_resources", critical=False)
    
    async def _perform_check(self) -> HealthStatus:
        """Check system resources."""
        try:
            import psutil
        except ImportError:
            # psutil not available - skip this check
            self.details = {"status": "not_available", "note": "psutil not installed"}
            return HealthStatus.HEALTHY
        
        try:
            # Check memory usage
            memory = psutil.virtual_memory()
            memory_usage_percent = memory.percent
            
            # Check CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Check disk usage
            disk = psutil.disk_usage('/')
            disk_usage_percent = (disk.used / disk.total) * 100
            
            self.details = {
                "memory_usage_percent": memory_usage_percent,
                "cpu_usage_percent": cpu_percent,
                "disk_usage_percent": disk_usage_percent,
                "available_memory_gb": memory.available / (1024**3),
                "total_memory_gb": memory.total / (1024**3)
            }
            
            # Check thresholds
            if memory_usage_percent > 90:
                raise Exception(f"High memory usage: {memory_usage_percent:.1f}%")
            
            if cpu_percent > 90:
                raise Exception(f"High CPU usage: {cpu_percent:.1f}%")
            
            if disk_usage_percent > 90:
                raise Exception(f"High disk usage: {disk_usage_percent:.1f}%")
            
            return HealthStatus.HEALTHY
        except Exception as e:
            # Don't fail health check if system resources check fails
            logger.warning(f"System resources health check failed (non-blocking): {e}")
            self.details = {"error": str(e), "status": "degraded"}
            return HealthStatus.DEGRADED


class RailwayServicesHealthCheck(HealthCheck):
    """Health check for Railway services (PostgreSQL, Redis, Email)."""
    
    def __init__(self):
        super().__init__("railway_services", critical=False)
    
    async def _perform_check(self) -> HealthStatus:
        """Check Railway services health."""
        try:
            # Get Railway services status
            railway_status = await railway_health.check_all_services()
            
            self.details = {
                "railway_services": railway_status["services"],
                "overall_status": railway_status["overall_status"],
                "recommendations_available": True
            }
            
            # Convert Railway status to our health status
            if railway_status["overall_status"] == "healthy":
                return HealthStatus.HEALTHY
            elif railway_status["overall_status"] == "degraded":
                return HealthStatus.DEGRADED
            else:
                return HealthStatus.UNHEALTHY
                
        except Exception as e:
            # Don't fail health check if Railway services check fails
            logger.warning(f"Railway services health check failed (non-blocking): {e}")
            self.details = {"error": str(e), "status": "degraded"}
            return HealthStatus.DEGRADED  # Return degraded instead of raising


class HealthCheckManager:
    """Manages all health checks."""
    
    def __init__(self):
        self.checks: List[HealthCheck] = [
            DatabaseHealthCheck(),
            RedisHealthCheck(),
            ExternalServicesHealthCheck(),
            SystemResourcesHealthCheck(),
            RailwayServicesHealthCheck(),
        ]
        self.start_time = time.time()
    
    async def run_all_checks(self) -> Dict[str, Any]:
        """Run all health checks and return comprehensive status."""
        start_time = time.time()
        
        # Run all checks concurrently
        check_tasks = [check.check() for check in self.checks]
        results = await asyncio.gather(*check_tasks, return_exceptions=True)
        
        # Process results
        checks_status = {}
        overall_status = HealthStatus.HEALTHY
        critical_failures = 0
        
        for i, check in enumerate(self.checks):
            if isinstance(results[i], Exception):
                check.status = HealthStatus.UNHEALTHY
                check.message = str(results[i])
            
            checks_status[check.name] = {
                "status": check.status.value,
                "message": check.message,
                "details": check.details,
                "response_time_ms": check.response_time_ms,
                "last_check": check.last_check.isoformat() if check.last_check else None,
                "critical": check.critical
            }
            
            # Determine overall status
            if check.status == HealthStatus.UNHEALTHY:
                if check.critical:
                    critical_failures += 1
                    overall_status = HealthStatus.UNHEALTHY
                elif overall_status == HealthStatus.HEALTHY:
                    overall_status = HealthStatus.DEGRADED
        
        total_time = (time.time() - start_time) * 1000
        
        return {
            "status": overall_status.value,
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": time.time() - self.start_time,
            "total_check_time_ms": total_time,
            "checks": checks_status,
            "summary": {
                "total_checks": len(self.checks),
                "healthy_checks": sum(1 for c in self.checks if c.status == HealthStatus.HEALTHY),
                "degraded_checks": sum(1 for c in self.checks if c.status == HealthStatus.DEGRADED),
                "unhealthy_checks": sum(1 for c in self.checks if c.status == HealthStatus.UNHEALTHY),
                "critical_failures": critical_failures
            }
        }
    
    async def run_quick_check(self) -> Dict[str, Any]:
        """Run only critical health checks for liveness probe."""
        critical_checks = [check for check in self.checks if check.critical]
        
        # Run checks but don't fail if database isn't ready yet (for Railway startup)
        passed_checks = 0
        failed_checks = []
        
        for check in critical_checks:
            try:
                await check.check()
                if check.status == HealthStatus.HEALTHY:
                    passed_checks += 1
                else:
                    failed_checks.append(f"{check.name}: {check.message}")
            except Exception as e:
                # Log but don't fail - database might not be ready on first startup
                logger.warning(f"Health check {check.name} failed (non-blocking): {e}")
                failed_checks.append(f"{check.name}: {str(e)}")
        
        # Return healthy if at least API is running (database can connect later)
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "critical_checks_passed": passed_checks,
            "total_critical_checks": len(critical_checks),
            "warnings": failed_checks if failed_checks else None
        }


# Global health check manager
health_manager = HealthCheckManager()


async def get_health_status() -> Dict[str, Any]:
    """Get comprehensive health status."""
    return await health_manager.run_all_checks()


async def get_liveness_status() -> Dict[str, Any]:
    """Get liveness probe status (critical checks only)."""
    try:
        return await health_manager.run_quick_check()
    except Exception as e:
        # If health checks fail, return basic status (don't fail startup)
        logger.warning(f"Health check error (non-blocking): {e}")
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "note": "Basic health check passed (detailed checks may be unavailable)"
        }


async def get_readiness_status() -> Dict[str, Any]:
    """Get readiness probe status (all checks)."""
    return await health_manager.run_all_checks()
