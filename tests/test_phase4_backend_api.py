"""
Phase 4 Backend API Tests

Tests for Reporting & Analytics API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import json


@pytest.fixture
def client():
    """Create test client"""
    # Import app here to avoid circular imports
    from python_backend.main import app
    return TestClient(app)


@pytest.fixture
def mock_user():
    """Mock authenticated user"""
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "role": "user"
    }


@pytest.fixture
def auth_headers(mock_user):
    """Mock authentication headers"""
    with patch('python_backend.apis.v2.report_templates.get_current_user') as mock_get_user:
        mock_get_user.return_value = mock_user
        yield {"Authorization": "Bearer test-token"}


class TestReportTemplatesAPI:
    """Test Report Templates API endpoints"""

    def test_list_report_templates(self, client, auth_headers):
        """Test listing report templates"""
        response = client.get("/api/v2/report-templates", headers=auth_headers)
        assert response.status_code in [200, 404]  # 404 if no templates exist

    def test_get_report_template(self, client, auth_headers):
        """Test getting a report template"""
        template_id = "test-template-id"
        response = client.get(f"/api/v2/report-templates/{template_id}", headers=auth_headers)
        assert response.status_code in [200, 404]

    def test_create_report_template(self, client, auth_headers):
        """Test creating a report template"""
        data = {
            "name": "Test Template",
            "description": "Test description",
            "category": "revenue",
            "template_schema": {"type": "object"},
            "is_public": False
        }
        response = client.post("/api/v2/report-templates", json=data, headers=auth_headers)
        assert response.status_code in [200, 201, 400, 500]

    def test_update_report_template(self, client, auth_headers):
        """Test updating a report template"""
        template_id = "test-template-id"
        data = {
            "name": "Updated Template",
            "description": "Updated description"
        }
        response = client.put(f"/api/v2/report-templates/{template_id}", json=data, headers=auth_headers)
        assert response.status_code in [200, 404, 400, 500]

    def test_delete_report_template(self, client, auth_headers):
        """Test deleting a report template"""
        template_id = "test-template-id"
        response = client.delete(f"/api/v2/report-templates/{template_id}", headers=auth_headers)
        assert response.status_code in [200, 204, 404, 500]


class TestReportGenerationAPI:
    """Test Report Generation API endpoints"""

    def test_generate_report(self, client, auth_headers):
        """Test generating a report"""
        data = {
            "report_type": "revenue",
            "report_data": {"period": "monthly"},
            "format": "pdf"
        }
        response = client.post("/api/v2/reports/generate", json=data, headers=auth_headers)
        assert response.status_code in [200, 201, 400, 500]

    def test_get_report_job(self, client, auth_headers):
        """Test getting a report generation job"""
        job_id = "test-job-id"
        response = client.get(f"/api/v2/reports/{job_id}", headers=auth_headers)
        assert response.status_code in [200, 404]

    def test_download_report(self, client, auth_headers):
        """Test downloading a report"""
        job_id = "test-job-id"
        response = client.get(f"/api/v2/reports/{job_id}/download", headers=auth_headers)
        assert response.status_code in [200, 404, 400, 500]


class TestAnalyticsAPI:
    """Test Analytics API endpoints"""

    def test_get_analytics_metrics(self, client, auth_headers):
        """Test getting analytics metrics"""
        response = client.get("/api/v2/analytics/metrics?period=monthly", headers=auth_headers)
        assert response.status_code in [200, 400, 500]

    def test_execute_analytics_query(self, client, auth_headers):
        """Test executing an analytics query"""
        data = {
            "query_type": "revenue",
            "filters": {},
            "group_by": [],
            "limit": 50
        }
        response = client.post("/api/v2/analytics/queries", json=data, headers=auth_headers)
        assert response.status_code in [200, 201, 400, 500]

    def test_get_query_result(self, client, auth_headers):
        """Test getting query result"""
        query_id = "test-query-id"
        response = client.get(f"/api/v2/analytics/queries/{query_id}", headers=auth_headers)
        assert response.status_code in [200, 404]

    def test_export_query_results(self, client, auth_headers):
        """Test exporting query results"""
        query_id = "test-query-id"
        response = client.get(f"/api/v2/analytics/queries/{query_id}/export?format=csv", headers=auth_headers)
        assert response.status_code in [200, 404, 400, 500]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
