"""
Simple test suite for connection pooling functionality.
"""
import pytest
from unittest.mock import Mock, patch

from apis.v2.deps import (
    get_connection_pool_stats,
    get_connection_health_status,
    get_recent_query_metrics,
    validate_connection_pool_health
)
from core.connection_pool import PoolStats


class TestConnectionPoolMonitoring:
    """Test connection pool monitoring functions."""

    @patch('apis.v2.deps.get_connection_pool')
    def test_get_connection_pool_stats(self, mock_get_pool):
        """Test getting connection pool statistics."""
        mock_pool = Mock()
        mock_stats = Mock()
        mock_stats.error_rate = 0.05
        mock_stats.total_queries = 100
        mock_stats.failed_queries = 5
        mock_stats.avg_response_time_ms = 500.0
        mock_pool.get_performance_stats.return_value = mock_stats
        mock_get_pool.return_value = mock_pool

        stats = get_connection_pool_stats()

        assert stats.error_rate == 0.05
        assert stats.total_queries == 100
        assert stats.failed_queries == 5
        assert stats.avg_response_time_ms == 500.0

    @patch('apis.v2.deps.get_connection_pool')
    def test_get_connection_health_status(self, mock_get_pool):
        """Test getting connection health status."""
        mock_pool = Mock()
        mock_health = {
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
        mock_pool.get_connection_health.return_value = mock_health
        mock_get_pool.return_value = mock_pool

        health = get_connection_health_status()

        assert "conn_1" in health
        assert "conn_2" in health
        assert health["conn_1"]["is_healthy"] is True
        assert health["conn_2"]["is_healthy"] is False

    @patch('apis.v2.deps.get_connection_pool')
    def test_get_recent_query_metrics(self, mock_get_pool):
        """Test getting recent query metrics."""
        mock_pool = Mock()
        mock_metrics = [
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
        mock_pool.get_detailed_metrics.return_value = mock_metrics
        mock_get_pool.return_value = mock_pool

        metrics = get_recent_query_metrics(limit=50)

        assert len(metrics) == 1
        assert metrics[0]["query_type"] == "select"
        assert metrics[0]["table_name"] == "profiles"
        assert metrics[0]["success"] is True

    @patch('apis.v2.deps.get_connection_pool')
    async def test_validate_connection_pool_health_excellent(self, mock_get_pool):
        """Test connection pool health validation with excellent status."""
        mock_pool = Mock()
        mock_stats = Mock()
        mock_stats.error_rate = 0.02
        mock_stats.avg_response_time_ms = 200.0
        mock_stats.total_connections = 10
        mock_stats.slow_queries_count = 1
        mock_stats.total_queries = 1000
        mock_stats.active_connections = 2
        mock_pool.get_performance_stats.return_value = mock_stats
        mock_pool.get_connection_health.return_value = {
            "conn_1": {"is_healthy": True},
            "conn_2": {"is_healthy": True}
        }
        mock_get_pool.return_value = mock_pool

        result = await validate_connection_pool_health()

        assert result["status"] == "excellent"
        assert result["health_score"] >= 90
        assert "recommendations" in result

    @patch('apis.v2.deps.get_connection_pool')
    async def test_validate_connection_pool_health_poor(self, mock_get_pool):
        """Test connection pool health validation with poor status."""
        mock_pool = Mock()
        mock_stats = Mock()
        mock_stats.error_rate = 0.6  # 60% error rate
        mock_stats.avg_response_time_ms = 3000.0  # Very slow queries
        mock_stats.total_connections = 10
        mock_stats.slow_queries_count = 200
        mock_stats.total_queries = 1000
        mock_stats.active_connections = 9
        mock_pool.get_performance_stats.return_value = mock_stats
        mock_pool.get_connection_health.return_value = {
            "conn_1": {"is_healthy": False},
            "conn_2": {"is_healthy": False}
        }
        mock_get_pool.return_value = mock_pool

        result = await validate_connection_pool_health()

        assert result["status"] == "poor"
        assert result["health_score"] < 50
        assert len(result["recommendations"]) > 0


if __name__ == "__main__":
    pytest.main([__file__])
