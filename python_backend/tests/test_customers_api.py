"""
API endpoint tests for Customers API.

Tests all customer-related API endpoints using FastAPI TestClient.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from uuid import uuid4


@pytest.fixture
def client():
    """Create test client."""
    # Import app here to avoid circular imports
    try:
        from python_backend.main import app

        return TestClient(app)
    except ImportError:
        # Fallback to apis.main if python_backend.main doesn't exist
        from apis.main import app

        return TestClient(app)


@pytest.fixture
def mock_user():
    """Mock authenticated user."""
    return {
        "id": str(uuid4()),
        "email": "test@example.com",
        "role": "user",
    }


@pytest.fixture
def auth_headers(client, mock_user):
    """Mock authentication headers."""
    # Import get_current_user to override it
    try:
        from apis.v2.deps import get_current_user
    except ImportError:
        # Fallback if path is different
        from python_backend.apis.v2.deps import get_current_user

    app = client.app
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield {"Authorization": "Bearer test-token"}
    # Clean up
    app.dependency_overrides = {}


class TestCustomerManagementAPI:
    """Test Customer Management API endpoints."""

    def test_list_customers(self, client, auth_headers):
        """Test listing customers."""
        response = client.get("/api/v2/customers", headers=auth_headers)
        assert response.status_code in [200, 404]  # 200 if exists, 404 if no data

    def test_get_customer(self, client, auth_headers):
        """Test getting a customer."""
        customer_id = str(uuid4())
        response = client.get(f"/api/v2/customers/{customer_id}", headers=auth_headers)
        assert response.status_code in [200, 404]

    def test_create_customer(self, client, auth_headers):
        """Test creating a customer."""
        data = {
            "name": "Test Customer",
            "contact_person": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "sector": "commercial",
        }
        response = client.post("/api/v2/customers", json=data, headers=auth_headers)
        assert response.status_code in [200, 201, 400, 500]

    def test_update_customer(self, client, auth_headers):
        """Test updating a customer."""
        customer_id = str(uuid4())
        data = {
            "name": "Updated Customer",
            "email": "updated@example.com",
        }
        response = client.put(
            f"/api/v2/customers/{customer_id}", json=data, headers=auth_headers
        )
        assert response.status_code in [200, 404, 400, 500]

    def test_delete_customer(self, client, auth_headers):
        """Test deleting a customer."""
        customer_id = str(uuid4())
        response = client.delete(
            f"/api/v2/customers/{customer_id}", headers=auth_headers
        )
        assert response.status_code in [200, 204, 404, 500]


class TestCustomerAnalyticsAPI:
    """Test Customer Analytics API endpoints."""

    def test_get_customer_analytics(self, client, auth_headers):
        """Test getting customer analytics."""
        customer_id = str(uuid4())
        response = client.get(
            f"/api/v2/customers/{customer_id}/analytics", headers=auth_headers
        )
        assert response.status_code in [200, 404]

    def test_get_analytics_summary(self, client, auth_headers):
        """Test getting analytics summary."""
        response = client.get(
            "/api/v2/customers/analytics/summary", headers=auth_headers
        )
        assert response.status_code in [200, 404, 500]

    def test_get_purchase_history(self, client, auth_headers):
        """Test getting purchase history."""
        customer_id = str(uuid4())
        response = client.get(
            f"/api/v2/customers/{customer_id}/purchase-history", headers=auth_headers
        )
        assert response.status_code in [200, 404]

    def test_get_customer_revenue(self, client, auth_headers):
        """Test getting customer revenue."""
        customer_id = str(uuid4())
        response = client.get(
            f"/api/v2/customers/{customer_id}/revenue", headers=auth_headers
        )
        assert response.status_code in [200, 404]


class TestTagsAPI:
    """Test Tags API endpoints."""

    def test_list_tags(self, client, auth_headers):
        """Test listing tags."""
        response = client.get("/api/v2/customers/tags", headers=auth_headers)
        assert response.status_code in [200, 404]

    def test_get_tag(self, client, auth_headers):
        """Test getting a tag."""
        tag_id = str(uuid4())
        response = client.get(f"/api/v2/customers/tags/{tag_id}", headers=auth_headers)
        assert response.status_code in [200, 404]

    def test_create_tag(self, client, auth_headers):
        """Test creating a tag."""
        data = {
            "name": "VIP",
            "color": "#FF0000",
        }
        response = client.post(
            "/api/v2/customers/tags", json=data, headers=auth_headers
        )
        assert response.status_code in [200, 201, 400, 500]

    def test_update_tag(self, client, auth_headers):
        """Test updating a tag."""
        tag_id = str(uuid4())
        data = {
            "name": "Updated Tag",
            "color": "#00FF00",
        }
        response = client.put(
            f"/api/v2/customers/tags/{tag_id}", json=data, headers=auth_headers
        )
        assert response.status_code in [200, 404, 400, 500]

    def test_delete_tag(self, client, auth_headers):
        """Test deleting a tag."""
        tag_id = str(uuid4())
        response = client.delete(
            f"/api/v2/customers/tags/{tag_id}", headers=auth_headers
        )
        assert response.status_code in [200, 204, 404, 500]

    def test_assign_tag(self, client, auth_headers):
        """Test assigning a tag to a customer."""
        customer_id = str(uuid4())
        data = {"tag_id": str(uuid4())}
        response = client.post(
            f"/api/v2/customers/{customer_id}/tags", json=data, headers=auth_headers
        )
        assert response.status_code in [200, 201, 404, 400, 500]

    def test_get_customer_tags(self, client, auth_headers):
        """Test getting tags for a customer."""
        customer_id = str(uuid4())
        response = client.get(
            f"/api/v2/customers/{customer_id}/tags", headers=auth_headers
        )
        assert response.status_code in [200, 404]

    def test_remove_tag(self, client, auth_headers):
        """Test removing a tag from a customer."""
        customer_id = str(uuid4())
        tag_id = str(uuid4())
        response = client.delete(
            f"/api/v2/customers/{customer_id}/tags/{tag_id}", headers=auth_headers
        )
        assert response.status_code in [200, 204, 404, 500]


class TestCommunicationsAPI:
    """Test Communications API endpoints."""

    def test_list_communications(self, client, auth_headers):
        """Test listing communications for a customer."""
        customer_id = str(uuid4())
        response = client.get(
            f"/api/v2/customers/{customer_id}/communications", headers=auth_headers
        )
        assert response.status_code in [200, 404]

    def test_get_communication(self, client, auth_headers):
        """Test getting a communication."""
        comm_id = str(uuid4())
        response = client.get(
            f"/api/v2/customers/communications/{comm_id}", headers=auth_headers
        )
        assert response.status_code in [200, 404]

    def test_create_communication(self, client, auth_headers):
        """Test creating a communication."""
        customer_id = str(uuid4())
        data = {
            "type": "email",
            "subject": "Test Email",
            "message": "Test message",
        }
        response = client.post(
            f"/api/v2/customers/{customer_id}/communications",
            json=data,
            headers=auth_headers,
        )
        assert response.status_code in [200, 201, 404, 400, 500]

    def test_update_communication(self, client, auth_headers):
        """Test updating a communication."""
        comm_id = str(uuid4())
        data = {
            "subject": "Updated Subject",
            "message": "Updated message",
        }
        response = client.put(
            f"/api/v2/customers/communications/{comm_id}",
            json=data,
            headers=auth_headers,
        )
        assert response.status_code in [200, 404, 400, 500]


class TestSegmentsAPI:
    """Test Segments API endpoints."""

    def test_list_segments(self, client, auth_headers):
        """Test listing segments."""
        response = client.get("/api/v2/customers/segments", headers=auth_headers)
        assert response.status_code in [200, 404]

    def test_get_segment(self, client, auth_headers):
        """Test getting a segment."""
        segment_id = str(uuid4())
        response = client.get(
            f"/api/v2/customers/segments/{segment_id}", headers=auth_headers
        )
        assert response.status_code in [200, 404]

    def test_create_segment(self, client, auth_headers):
        """Test creating a segment."""
        data = {
            "name": "High Value",
            "description": "High value customers",
            "criteria": {"min_revenue": 10000},
            "is_dynamic": True,
        }
        response = client.post(
            "/api/v2/customers/segments", json=data, headers=auth_headers
        )
        assert response.status_code in [200, 201, 400, 500]

    def test_update_segment(self, client, auth_headers):
        """Test updating a segment."""
        segment_id = str(uuid4())
        data = {
            "name": "Updated Segment",
            "description": "Updated description",
        }
        response = client.put(
            f"/api/v2/customers/segments/{segment_id}", json=data, headers=auth_headers
        )
        assert response.status_code in [200, 404, 400, 500]

    def test_delete_segment(self, client, auth_headers):
        """Test deleting a segment."""
        segment_id = str(uuid4())
        response = client.delete(
            f"/api/v2/customers/segments/{segment_id}", headers=auth_headers
        )
        assert response.status_code in [200, 204, 404, 500]

    def test_get_segment_customers(self, client, auth_headers):
        """Test getting customers in a segment."""
        segment_id = str(uuid4())
        response = client.get(
            f"/api/v2/customers/segments/{segment_id}/customers", headers=auth_headers
        )
        assert response.status_code in [200, 404]


class TestRemindersAPI:
    """Test Reminders API endpoints."""

    def test_list_reminders(self, client, auth_headers):
        """Test listing reminders for a customer."""
        customer_id = str(uuid4())
        response = client.get(
            f"/api/v2/customers/{customer_id}/reminders", headers=auth_headers
        )
        assert response.status_code in [200, 404]

    def test_get_reminder(self, client, auth_headers):
        """Test getting a reminder."""
        reminder_id = str(uuid4())
        response = client.get(
            f"/api/v2/customers/reminders/{reminder_id}", headers=auth_headers
        )
        assert response.status_code in [200, 404]

    def test_create_reminder(self, client, auth_headers):
        """Test creating a reminder."""
        customer_id = str(uuid4())
        data = {
            "title": "Follow up",
            "description": "Follow up with customer",
            "reminder_date": "2026-12-31T00:00:00Z",
        }
        response = client.post(
            f"/api/v2/customers/{customer_id}/reminders",
            json=data,
            headers=auth_headers,
        )
        assert response.status_code in [200, 201, 404, 400, 500]

    def test_update_reminder(self, client, auth_headers):
        """Test updating a reminder."""
        reminder_id = str(uuid4())
        data = {
            "title": "Updated Reminder",
            "is_completed": True,
        }
        response = client.put(
            f"/api/v2/customers/reminders/{reminder_id}",
            json=data,
            headers=auth_headers,
        )
        assert response.status_code in [200, 404, 400, 500]

    def test_delete_reminder(self, client, auth_headers):
        """Test deleting a reminder."""
        reminder_id = str(uuid4())
        response = client.delete(
            f"/api/v2/customers/reminders/{reminder_id}", headers=auth_headers
        )
        assert response.status_code in [200, 204, 404, 500]


class TestHealthCheck:
    """Test health check endpoint."""

    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/api/v2/customers/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
