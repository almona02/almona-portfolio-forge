"""
Production validation tests for Fabricator constraints.

Run these before every deployment to ensure backend safety rails are active.
"""

import os

import pytest
from fastapi.testclient import TestClient

from apis.main import app
from apis.v2.app import v2_app
from apis.v2.deps import get_current_user, get_industrial_supabase
from core.fabricator_validation import ProductionConstraints


def _test_user_override():
    return {
        "sub": "test-user",
        "id": "test-user",
        "role": "admin",
    }


# For these production validation tests we don't care about real JWT auth – we
# just need a stable "current user" to exercise the constraints layer.
app.dependency_overrides[get_current_user] = _test_user_override
v2_app.dependency_overrides[get_current_user] = _test_user_override


class _DummySupabase:
    """Minimal async context manager stub so tests don't hit real Supabase."""

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


def _dummy_supabase_dep():
    return _DummySupabase()


app.dependency_overrides[get_industrial_supabase] = _dummy_supabase_dep
v2_app.dependency_overrides[get_industrial_supabase] = _dummy_supabase_dep

client = TestClient(app)


def test_backend_enforces_max_dimensions():
    """Ensure backend rejects oversized profiles (matching frontend constraints)"""

    # Test data that exceeds backend constraints
    oversized_profile = {
        "name": "Oversized Test Profile",
        "material": "aluminum",
        "width": ProductionConstraints.MAX_WIDTH_MM + 100,  # Should fail
        "height": 1000,
        "cost_per_meter": 10.0,
    }

    response = client.post(
        "/api/v2/fabricator/profiles",
        json=oversized_profile,
        headers={"Authorization": "Bearer test-token"},  # Mock auth in real tests
    )

    # Should be rejected by backend validation
    assert response.status_code == 400

    body = response.json()
    # v2 errors are wrapped under an `error` envelope; fall back gracefully if
    # a plain FastAPI-style `detail` field is ever used.
    detail = (
        body.get("detail")
        or body.get("error", {}).get("detail")
        or body.get("error", {}).get("message", "")
    )
    assert "exceeds maximum" in str(detail).lower()


def test_backend_enforces_stock_length_constraints():
    """Ensure cutting optimization respects max stock length"""

    # Test cutting plan that would require over-length stock
    test_cuts = [ProductionConstraints.MAX_STOCK_LENGTH_MM + 1000]  # 9m cut

    # This should be caught by backend validation
    with pytest.raises(ValueError, match="exceeds maximum stock length"):
        ProductionConstraints.validate_cutting_plan(test_cuts)


def test_health_endpoints_respond():
    """Ensure all health endpoints return 200"""

    endpoints = [
        "/health",
        "/health/ready",
        "/health/database",
        "/metrics",
    ]

    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code == 200, f"Endpoint {endpoint} failed"


def test_environment_variables_configured():
    """Critical environment variables must be present"""

    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY",
        "ALLOWED_ORIGINS",
    ]

    missing = [var for var in required_vars if not os.getenv(var)]
    assert len(missing) == 0, f"Missing environment variables: {missing}"


# Add to your test runner
if __name__ == "__main__":
    pytest.main([__file__, "-v"])


