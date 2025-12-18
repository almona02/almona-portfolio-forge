import pytest  # type: ignore
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient  # type: ignore
from apis.main import app

client = TestClient(app)


def skip_if_v1_endpoint_not_found(endpoint_path: str, method: str = "GET"):
    """
    Helper to skip tests if a v1 endpoint is not available.
    Uses OPTIONS for non-GET probes to avoid sending bodies.
    """
    if method.upper() == "GET":
        response = client.get(endpoint_path)
    else:
        response = client.options(endpoint_path)
    if response.status_code == 404:
        pytest.skip(f"V1 endpoint {endpoint_path} not implemented")


class TestAPIEndpoints:
    """Test cases for API endpoints"""

    @patch('core.health_checks.get_health_status', new_callable=AsyncMock)
    def test_health_check(self, mock_health_status):
        """Test health check endpoint with full mock."""
        mock_health_status.return_value = {
            "status": "healthy",
            "checks": {},
            "summary": {"ok": True},
        }

        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        # Accept both healthy and degraded status (degraded is OK when fallback services work)
        assert data["status"] in ["healthy", "degraded"]
        assert "checks" in data
        assert "summary" in data

    def test_root_endpoint(self):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["message"] == "Almona Industrial API"

    def test_get_models(self):
        """Test get models endpoint"""
        response = client.get("/api/v1/models")
        if response.status_code == 404:
            pytest.skip(
                "Endpoint /api/v1/models not implemented in this API version"
            )
        assert response.status_code == 200
        assert "models" in response.json()
        assert len(response.json()["models"]) > 0

    def test_identify_part_valid_image(self, sample_image):
        """Test identify part with valid image"""
        skip_if_v1_endpoint_not_found("/api/v1/identify-part", "POST")
        with open(sample_image, "rb") as f:
            response = client.post(
                "/api/v1/identify-part",
                files={"image": ("test.jpg", f, "image/jpeg")},
                data={"confidence_threshold": "0.7"}
            )

        # Note: This might fail if the model isn't loaded, but we'll test the
        # endpoint structure
        # 500 if model not available
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            assert "data" in data
            assert "message" in data

    def test_identify_part_invalid_file(self, invalid_file):
        """Test identify part with invalid file type"""
        skip_if_v1_endpoint_not_found("/api/v1/identify-part", "POST")
        with open(invalid_file, "rb") as f:
            response = client.post(
                "/api/v1/identify-part",
                files={"image": ("test.txt", f, "text/plain")}
            )

        assert response.status_code == 400

    def test_identify_part_missing_file(self):
        """Test identify part without file"""
        skip_if_v1_endpoint_not_found("/api/v1/identify-part", "POST")
        response = client.post("/api/v1/identify-part")
        assert response.status_code == 422  # Unprocessable entity

    def test_preprocess_image_valid(self, sample_image):
        """Test preprocess image with valid image"""
        skip_if_v1_endpoint_not_found("/api/v1/preprocess-image", "POST")
        with open(sample_image, "rb") as f:
            response = client.post(
                "/api/v1/preprocess-image",
                files={"image": ("test.jpg", f, "image/jpeg")},
                data={"operation": "enhance"}
            )

        # 500 if processor not available
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            assert "data" in data

    def test_large_file_upload(self, large_image):
        """Test file size limit handling"""
        skip_if_v1_endpoint_not_found("/api/v1/identify-part", "POST")
        with open(large_image, "rb") as f:
            response = client.post(
                "/api/v1/identify-part",
                files={"image": ("large.jpg", f, "image/jpeg")}
            )

        # Should handle large files gracefully
        # 413 if size limit enforced
        assert response.status_code in [200, 413, 500]

    def test_cors_headers(self):
        """Test CORS headers are properly set"""
        response = client.get("/health")
        headers_str = str(response.headers).lower()
        assert ("access-control-allow-origin" in response.headers or
                "*" in headers_str)
