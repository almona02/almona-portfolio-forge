"""
Test suite for connection pooling and performance monitoring.
"""
import pytest
import asyncio
import time
from unittest.mock import Mock, AsyncMock, patch
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from apis.v2.deps import (
    get_industrial_supabase,
    get_high_performance_supabase,
    get_read_only_supabase,
    get_connection_pool_stats,
    get_connection_health_status,
    get_recent_query_metrics,
    validate_connection_pool_health
)
from core.connection_pool import SupabaseConnectionPool, QueryMetrics, ConnectionHealth
from apis.v2.core.errors import SupabaseError


@pytest.fixture
def mock_request():
    """Create a mock FastAPI request."""
    request = Mock(spec=Request)
    request.url.path = "/api/v2/test"
    request.method = "GET"
    request.headers = {"user-agent": "test-agent"}
    return request


@pytest.fixture
def mock_connection_pool():
    """Create a mock connection pool."""
    pool = Mock(spec=SupabaseConnectionPool)
    pool.get_client = AsyncMock()
    pool.get_performance_stats.return_value = Mock(
        error_rate=0.05,
        total_queries=100,
        failed_queries=5,
        avg_response_time_ms=500.0,
        slow_queries_count=2,
        total_connections=10,
        active_connections=3,
        idle_connections=7,
        healthy_connections=9,
        unhealthy_connections=1,
        successful_queries=95,
        uptime_seconds=3600.0
    )
    pool.get_connection_health.return_value = {
        "conn_1": {
            "is_healthy": True,
            "last_check": "2024-01-01T00:00:00Z",
            "response_time_ms": 450.0,
            "error_count": 0,
            "total_queries": 50,
            "last_error": None
        },
        "conn_2": {
            "is_healthy": False,
            "last_check": "2024-01-01T00:00:00Z",
            "response_time_ms": 2000.0,
            "error_count": 5,
            "total_queries": 20,
            "last_error": "Connection timeout"
        }
    }
    pool.get_detailed_metrics.return_value = [
        {
            "query_type": "select",
            "table_name": "profiles",
            "duration_ms": 250.0,
            "success": True,
            "timestamp": "2024-01-01T00:00:00Z",
            "error": None,
            "retry_count": 0,
            "connection_id": "conn_1"
        }
    ]
    return pool


@pytest.fixture
def test_app():
    """Create a test FastAPI app with connection pool endpoints."""
    app = FastAPI()
    
    @app.get("/connection-pool/stats")
    async def get_stats():
        return {"status": "success", "data": get_connection_pool_stats().__dict__}
    
    @app.get("/connection-pool/health")
    async def get_health():
        return {"status": "success", "data": get_connection_health_status()}
    
    @app.get("/connection-pool/metrics")
    async def get_metrics(limit: int = 100):
        return {"status": "success", "data": {"metrics": get_recent_query_metrics(limit)}}
    
    @app.get("/connection-pool/validate")
    async def validate_health():
        return {"status": "success", "data": await validate_connection_pool_health()}
    
    return app


class TestConnectionPoolDependencies:
    """Test connection pool dependency providers."""
    
    @patch('apis.v2.deps.get_connection_pool')
    async def test_get_industrial_supabase_success(self, mock_get_pool, mock_request, mock_connection_pool):
        """Test successful industrial Supabase client retrieval."""
        mock_get_pool.return_value = mock_connection_pool
        
        # Mock the async context manager properly
        mock_client = Mock()
        mock_client._connection_id = "conn_1"
        
        # Create a proper async context manager mock
        mock_context_manager = AsyncMock()
        mock_context_manager.__aenter__.return_value = mock_client
        mock_context_manager.__aexit__.return_value = None
        mock_connection_pool.get_client.return_value = mock_context_manager
        
        # Use the async generator properly
        async for client in get_industrial_supabase(mock_request):
            assert client == mock_client
            assert hasattr(client, '_request_context')
            assert client._request_context['endpoint'] == "/api/v2/test"
            assert client._request_context['method'] == "GET"
            break  # Only test the first client
    
    @patch('apis.v2.deps.get_connection_pool')
    async def test_get_industrial_supabase_high_error_rate(self, mock_get_pool, mock_request):
        """Test industrial Supabase client with high error rate."""
        mock_pool = Mock()
        mock_pool.get_performance_stats.return_value = Mock(
            error_rate=0.6,  # 60% error rate
            total_queries=100,
            failed_queries=60
        )
        mock_get_pool.return_value = mock_pool
        
        with pytest.raises(SupabaseError) as exc_info:
            async for client in get_industrial_supabase(mock_request):
                pass
        
        assert "high error rate" in str(exc_info.value)
        assert exc_info.value.details["error_rate"] == 0.6