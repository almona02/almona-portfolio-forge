"""Regression tests for truthful health, liveness, and readiness semantics.

Covers the false-healthy bug where an exception in the health manager was
reported as ``healthy`` and where the readiness probe never returned HTTP 503.
"""
import asyncio
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from apis.main import app
from core.health_checks import (
    HealthCheck,
    HealthCheckManager,
    HealthStatus,
    RailwayServicesHealthCheck,
    RedisHealthCheck,
    settings,
)

client = TestClient(app)


class _StubCheck(HealthCheck):
    """A health check with a fixed outcome (a status or an exception)."""

    def __init__(self, name, critical, outcome):
        super().__init__(name, critical=critical)
        self._outcome = outcome

    async def _perform_check(self):
        if isinstance(self._outcome, Exception):
            raise self._outcome
        return self._outcome


def test_health_exception_reports_unhealthy():
    """An exception in the health manager must surface as unhealthy, not healthy."""
    with patch("apis.main.get_health_status", new_callable=AsyncMock) as mocked:
        mocked.side_effect = RuntimeError("boom")
        response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "unhealthy"
    assert "timestamp" in body
    assert "error" in body


def test_readiness_returns_503_on_critical_failure():
    """A failed required dependency must yield HTTP 503, never a false 200."""
    result = {
        "status": "unhealthy",
        "checks": {"database": {"status": "unhealthy", "critical": True}},
        "summary": {"critical_failures": 1},
    }
    with patch("apis.main.get_readiness_status", new_callable=AsyncMock) as mocked:
        mocked.return_value = result
        response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json()["status"] == "unhealthy"


def test_readiness_returns_200_on_optional_degraded():
    """Optional failures (e.g. missing Redis) degrade, but stay HTTP 200."""
    result = {
        "status": "degraded",
        "checks": {"redis": {"status": "degraded", "critical": False}},
        "summary": {"critical_failures": 0},
    }
    with patch("apis.main.get_readiness_status", new_callable=AsyncMock) as mocked:
        mocked.return_value = result
        response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json()["status"] == "degraded"


def test_readiness_returns_200_when_healthy():
    result = {
        "status": "healthy",
        "checks": {},
        "summary": {"critical_failures": 0},
    }
    with patch("apis.main.get_readiness_status", new_callable=AsyncMock) as mocked:
        mocked.return_value = result
        response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_liveness_is_process_only():
    """Liveness reports process-alive without touching external dependencies."""
    response = client.get("/health/live")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "timestamp" in body


def test_manager_critical_failure_is_unhealthy():
    manager = HealthCheckManager()
    manager.checks = [_StubCheck("database", True, RuntimeError("db down"))]
    result = asyncio.run(manager.run_all_checks())
    assert result["status"] == HealthStatus.UNHEALTHY.value
    assert result["summary"]["critical_failures"] == 1


def test_manager_optional_failure_is_degraded(monkeypatch):
    monkeypatch.setattr(settings, "REDIS_URL", "")
    manager = HealthCheckManager()
    manager.checks = [RedisHealthCheck()]
    result = asyncio.run(manager.run_all_checks())
    assert result["status"] == HealthStatus.DEGRADED.value
    assert result["summary"]["critical_failures"] == 0


def test_manager_skipped_config_is_degraded(monkeypatch):
    from core import railway_health as rh

    async def _skipped():
        return {
            "timestamp": "t",
            "overall_status": "skipped",
            "environment": "test",
            "note": "skipped",
            "services": {},
        }

    monkeypatch.setattr(rh.railway_health, "check_all_services", _skipped)
    manager = HealthCheckManager()
    manager.checks = [RailwayServicesHealthCheck()]
    result = asyncio.run(manager.run_all_checks())
    assert result["status"] == HealthStatus.DEGRADED.value


def test_manager_all_healthy_is_healthy():
    manager = HealthCheckManager()
    manager.checks = [_StubCheck("database", True, HealthStatus.HEALTHY)]
    result = asyncio.run(manager.run_all_checks())
    assert result["status"] == HealthStatus.HEALTHY.value
    assert result["summary"]["critical_failures"] == 0
