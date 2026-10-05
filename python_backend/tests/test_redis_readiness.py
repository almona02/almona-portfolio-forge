import asyncio
from unittest.mock import AsyncMock, Mock

from core.health_checks import HealthStatus, RedisHealthCheck, settings
from redis.asyncio import Redis


def test_missing_configuration_is_degraded(monkeypatch):
    monkeypatch.setattr(settings, 'REDIS_URL', '')
    probe = RedisHealthCheck()
    assert asyncio.run(probe.check()) == HealthStatus.DEGRADED
    assert probe.details['status'] == 'not_configured'
    assert probe.message == 'Redis URL is not configured'


def test_degraded_redis_marks_manager_degraded(monkeypatch):
    from core.health_checks import HealthCheckManager

    monkeypatch.setattr(settings, 'REDIS_URL', '')
    manager = HealthCheckManager()
    # Keep only Redis in this unit so other infra cannot mask the result.
    manager.checks = [RedisHealthCheck()]
    result = asyncio.run(manager.run_all_checks())
    assert result['status'] == HealthStatus.DEGRADED.value
    assert result['checks']['redis']['status'] == HealthStatus.DEGRADED.value
    assert result['checks']['redis']['details']['status'] == 'not_configured'
    assert result['checks']['redis']['message'] == 'Redis URL is not configured'


def test_reachable_redis_is_healthy_and_closed(monkeypatch):
    monkeypatch.setattr(settings, 'REDIS_URL', 'redis://example.invalid')
    client = Mock(ping=AsyncMock(return_value=True), aclose=AsyncMock())
    monkeypatch.setattr(Redis, 'from_url', Mock(return_value=client))
    probe = RedisHealthCheck()
    assert asyncio.run(probe.check()) == HealthStatus.HEALTHY
    client.ping.assert_awaited_once()
    client.aclose.assert_awaited_once()


def test_failed_ping_is_unhealthy_without_credentials(monkeypatch):
    monkeypatch.setattr(settings, 'REDIS_URL', 'redis://example.invalid')
    client = Mock(ping=AsyncMock(side_effect=ConnectionError('private-password')), aclose=AsyncMock())
    monkeypatch.setattr(Redis, 'from_url', Mock(return_value=client))
    probe = RedisHealthCheck()
    assert asyncio.run(probe.check()) == HealthStatus.UNHEALTHY
    assert 'private-password' not in probe.message
    client.aclose.assert_awaited_once()


def test_malformed_configuration_is_unhealthy_without_credentials(monkeypatch):
    monkeypatch.setattr(settings, 'REDIS_URL', 'invalid')
    monkeypatch.setattr(Redis, 'from_url', Mock(side_effect=ValueError('private-password')))
    probe = RedisHealthCheck()
    assert asyncio.run(probe.check()) == HealthStatus.UNHEALTHY
    assert 'private-password' not in probe.message
