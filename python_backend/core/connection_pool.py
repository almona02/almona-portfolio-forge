"""
Enhanced connection pooling and performance monitoring for Supabase client.
"""
import asyncio
import logging
import time
import threading
from contextlib import asynccontextmanager
from typing import Dict, Optional, Any, List
from dataclasses import dataclass, field
from datetime import datetime
from collections import deque

from supabase import create_client
from core.config import settings
from core.monitoring import record_database_metrics, get_structured_logger

logger = get_structured_logger(__name__)


@dataclass
class QueryMetrics:
    """Enhanced query performance metrics."""
    query_type: str
    table_name: str
    duration_ms: float
    success: bool
    timestamp: datetime = field(default_factory=datetime.utcnow)
    error: Optional[str] = None
    query_size: Optional[int] = None
    connection_id: Optional[str] = None
    retry_count: int = 0


@dataclass
class ConnectionHealth:
    """Connection health status."""
    connection_id: str
    is_healthy: bool
    last_check: datetime
    response_time_ms: float
    error_count: int = 0
    total_queries: int = 0
    last_error: Optional[str] = None


@dataclass
class PoolStats:
    """Connection pool statistics."""
    total_connections: int
    active_connections: int
    idle_connections: int
    healthy_connections: int
    unhealthy_connections: int
    total_queries: int
    successful_queries: int
    failed_queries: int
    avg_response_time_ms: float
    slow_queries_count: int
    error_rate: float
    uptime_seconds: float


class SupabaseConnectionPool:
    """Enhanced connection pool with performance monitoring for Supabase."""
    
    def __init__(
        self,
        max_connections: int = 10,
        query_timeout: float = 30.0,
        health_check_interval: float = 60.0,
        slow_query_threshold: float = 1000.0,
        max_retries: int = 3
    ):
        self.max_connections = max_connections
        self.query_timeout = query_timeout
        self.health_check_interval = health_check_interval
        self.slow_query_threshold = slow_query_threshold
        self.max_retries = max_retries
        
        self._pool: asyncio.Queue = asyncio.Queue(maxsize=max_connections)
        self._metrics: deque = deque(maxlen=10000)
        self._connection_health: Dict[str, ConnectionHealth] = {}
        self._connection_counter = 0
        self._start_time = time.time()
        self._initialized = False
        self._lock = threading.Lock()
        self._health_check_task: Optional[asyncio.Task] = None
    
    async def initialize(self):
        """Initialize connection pool with health monitoring."""
        if self._initialized:
            return
        
        # Check for sovereign mode (skip Supabase initialization)
        import os
        if os.getenv("SKIP_SUPABASE_INIT", "").lower() == "true":
            logger.info("Sovereign mode: Skipping Supabase connection pool initialization")
            self._initialized = True
            return
            
        try:
            for i in range(self.max_connections):
                connection_id = f"conn_{i}_{int(time.time())}"
                client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_KEY
                )
                
                # Initialize connection health tracking
                self._connection_health[connection_id] = ConnectionHealth(
                    connection_id=connection_id,
                    is_healthy=True,
                    last_check=datetime.utcnow(),
                    response_time_ms=0.0
                )
                
                # Add connection ID to client for tracking
                client._connection_id = connection_id
                await self._pool.put(client)
            
            self._initialized = True
            logger.info(
                f"Initialized Supabase connection pool with "
                f"{self.max_connections} connections"
            )
            
            # Start health check task
            self._health_check_task = asyncio.create_task(self._health_check_loop())
            
        except Exception as e:
            logger.error(f"Failed to initialize connection pool: {e}")
            raise
    
    @asynccontextmanager
    async def get_client(self):
        """Get a client from the pool with automatic return and health checking."""
        if not self._initialized:
            await self.initialize()
        
        client = await self._pool.get()
        connection_id = getattr(client, '_connection_id', 'unknown')
        
        try:
            # Check if connection is healthy before yielding
            if connection_id in self._connection_health:
                health = self._connection_health[connection_id]
                if not health.is_healthy:
                    logger.warning(
                        f"Using potentially unhealthy connection: {connection_id}"
                    )
            
            yield client
        finally:
            await self._pool.put(client)
    
    async def execute_with_timeout(self, operation, *args, **kwargs):
        """Execute a Supabase operation with timeout and retry logic."""
        retry_count = 0
        last_error = None
        
        while retry_count <= self.max_retries:
            try:
                start_time = time.time()
                
                # Execute with timeout
                result = await asyncio.wait_for(
                    operation(*args, **kwargs),
                    timeout=self.query_timeout
                )
                
                duration_ms = (time.time() - start_time) * 1000
                
                # Record successful metrics
                self.record_query_metrics(QueryMetrics(
                    query_type=operation.__name__,
                    table_name=kwargs.get('table', 'unknown'),
                    duration_ms=duration_ms,
                    success=True,
                    retry_count=retry_count
                ))
                
                # Record Prometheus metrics
                record_database_metrics(
                    query_type=operation.__name__,
                    table_name=kwargs.get('table', 'unknown'),
                    duration=duration_ms / 1000.0,  # Convert to seconds
                    success=True
                )
                
                return result
                
            except asyncio.TimeoutError:
                duration_ms = (time.time() - start_time) * 1000
                error_msg = f"Query timeout after {self.query_timeout}s"
                
                self.record_query_metrics(QueryMetrics(
                    query_type=operation.__name__,
                    table_name=kwargs.get('table', 'unknown'),
                    duration_ms=duration_ms,
                    success=False,
                    error=error_msg,
                    retry_count=retry_count
                ))
                
                # Record Prometheus metrics
                record_database_metrics(
                    query_type=operation.__name__,
                    table_name=kwargs.get('table', 'unknown'),
                    duration=duration_ms / 1000.0,  # Convert to seconds
                    success=False
                )
                
                last_error = asyncio.TimeoutError(error_msg)
                retry_count += 1
                
                if retry_count <= self.max_retries:
                    logger.warning(
                        f"Query timeout, retrying ({retry_count}/{self.max_retries})"
                    )
                    await asyncio.sleep(min(retry_count * 0.5, 5.0))
                else:
                    break
                    
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                error_msg = str(e)
                
                self.record_query_metrics(QueryMetrics(
                    query_type=operation.__name__,
                    table_name=kwargs.get('table', 'unknown'),
                    duration_ms=duration_ms,
                    success=False,
                    error=error_msg,
                    retry_count=retry_count
                ))
                
                # Record Prometheus metrics
                record_database_metrics(
                    query_type=operation.__name__,
                    table_name=kwargs.get('table', 'unknown'),
                    duration=duration_ms / 1000.0,  # Convert to seconds
                    success=False
                )
                
                last_error = e
                retry_count += 1
                
                if retry_count <= self.max_retries:
                    logger.warning(
                        f"Query failed, retrying ({retry_count}/{self.max_retries}): "
                        f"{error_msg}"
                    )
                    await asyncio.sleep(min(retry_count * 0.5, 5.0))
                else:
                    break
        
        # All retries exhausted
        logger.error(f"Query failed after {self.max_retries} retries: {last_error}")
        raise last_error
    
    def record_query_metrics(self, metrics: QueryMetrics):
        """Record query performance metrics with enhanced tracking."""
        with self._lock:
            self._metrics.append(metrics)
            
            # Update connection health
            if metrics.connection_id and metrics.connection_id in self._connection_health:
                health = self._connection_health[metrics.connection_id]
                health.total_queries += 1
                health.last_check = datetime.utcnow()
                
                if not metrics.success:
                    health.error_count += 1
                    health.last_error = metrics.error
                    # Mark as unhealthy if error rate is too high
                    if health.error_count / health.total_queries > 0.1:
                        health.is_healthy = False
                        logger.warning(
                            f"Connection {metrics.connection_id} marked as unhealthy"
                        )
                else:
                    # Reset error count on successful queries
                    if health.error_count > 0:
                        health.error_count = max(0, health.error_count - 1)
                    health.response_time_ms = metrics.duration_ms
        
        # Log slow queries
        if metrics.duration_ms > self.slow_query_threshold:
            logger.warning(
                f"Slow query detected: {metrics.query_type} on "
                f"{metrics.table_name} took {metrics.duration_ms:.2f}ms "
                f"(threshold: {self.slow_query_threshold}ms)"
            )
    
    async def _health_check_loop(self):
        """Background task to perform periodic health checks."""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                await self._perform_health_checks()
            except Exception as e:
                logger.error(f"Health check loop error: {e}")
    
    async def _perform_health_checks(self):
        """Perform health checks on all connections."""
        if not self._initialized:
            return
            
        logger.debug("Performing connection health checks")
        
        # Get a temporary client for health check
        async with self.get_client() as client:
            try:
                start_time = time.time()
                # Simple health check query
                await asyncio.wait_for(
                    client.table('profiles').select('id').limit(1).execute(),
                    timeout=5.0
                )
                response_time = (time.time() - start_time) * 1000
                
                # Update health status for all connections
                for connection_id, health in self._connection_health.items():
                    health.is_healthy = True
                    health.last_check = datetime.utcnow()
                    health.response_time_ms = response_time
                    
            except Exception as e:
                logger.warning(f"Health check failed: {e}")
                # Mark all connections as potentially unhealthy
                for health in self._connection_health.values():
                    health.is_healthy = False
                    health.last_error = str(e)
    
    def get_performance_stats(self) -> PoolStats:
        """Get comprehensive performance statistics."""
        with self._lock:
            if not self._metrics:
                return PoolStats(
                    total_connections=self.max_connections,
                    active_connections=0,
                    idle_connections=self.max_connections,
                    healthy_connections=0,
                    unhealthy_connections=0,
                    total_queries=0,
                    successful_queries=0,
                    failed_queries=0,
                    avg_response_time_ms=0.0,
                    slow_queries_count=0,
                    error_rate=0.0,
                    uptime_seconds=time.time() - self._start_time
                )
            
            total_queries = len(self._metrics)
            successful_queries = sum(1 for m in self._metrics if m.success)
            failed_queries = total_queries - successful_queries
            avg_duration = sum(m.duration_ms for m in self._metrics) / total_queries
            slow_queries = sum(1 for m in self._metrics if m.duration_ms > self.slow_query_threshold)
            
            # Connection health stats
            healthy_connections = sum(
                1 for h in self._connection_health.values() if h.is_healthy
            )
            unhealthy_connections = len(self._connection_health) - healthy_connections
            
            return PoolStats(
                total_connections=self.max_connections,
                active_connections=self.max_connections - self._pool.qsize(),
                idle_connections=self._pool.qsize(),
                healthy_connections=healthy_connections,
                unhealthy_connections=unhealthy_connections,
                total_queries=total_queries,
                successful_queries=successful_queries,
                failed_queries=failed_queries,
                avg_response_time_ms=avg_duration,
                slow_queries_count=slow_queries,
                error_rate=(
                    failed_queries / total_queries if total_queries > 0 else 0.0
                ),
                uptime_seconds=time.time() - self._start_time
            )
    
    def get_detailed_metrics(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get detailed metrics for recent queries."""
        with self._lock:
            recent_metrics = list(self._metrics)[-limit:]
            return [
                {
                    "query_type": m.query_type,
                    "table_name": m.table_name,
                    "duration_ms": m.duration_ms,
                    "success": m.success,
                    "timestamp": m.timestamp.isoformat(),
                    "error": m.error,
                    "retry_count": m.retry_count,
                    "connection_id": m.connection_id
                }
                for m in recent_metrics
            ]
    
    def get_connection_health(self) -> Dict[str, Dict[str, Any]]:
        """Get health status of all connections."""
        with self._lock:
            return {
                conn_id: {
                    "is_healthy": health.is_healthy,
                    "last_check": health.last_check.isoformat(),
                    "response_time_ms": health.response_time_ms,
                    "error_count": health.error_count,
                    "total_queries": health.total_queries,
                    "last_error": health.last_error
                }
                for conn_id, health in self._connection_health.items()
            }
    
    async def shutdown(self):
        """Gracefully shutdown the connection pool."""
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Connection pool shutdown complete")


# Global connection pool instance
connection_pool = SupabaseConnectionPool(
    max_connections=settings.SUPABASE_MAX_CONNECTIONS,
    query_timeout=settings.SUPABASE_QUERY_TIMEOUT,
    health_check_interval=settings.SUPABASE_HEALTH_CHECK_INTERVAL,
    slow_query_threshold=settings.SUPABASE_SLOW_QUERY_THRESHOLD,
    max_retries=settings.SUPABASE_MAX_RETRIES
)


def get_connection_pool() -> SupabaseConnectionPool:
    """Get the global connection pool instance."""
    return connection_pool
