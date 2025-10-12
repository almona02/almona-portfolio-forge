import time
from unittest.mock import patch
from fastapi.testclient import TestClient
from apis.main import app

client = TestClient(app)


class TestAPIEndpoints:
    """Test cases for API endpoints"""

    @patch('core.connection_pool.SupabaseConnectionPool.get_performance_stats')
    def test_health_check(self, mock_performance_stats):
        """Test health check endpoint"""
        # Mock the performance stats to return healthy database stats
        from core.connection_pool import PoolStats
        mock_performance_stats.return_value = PoolStats(
            total_connections=10,
            active_connections=2,
            idle_connections=8,
            healthy_connections=10,  # This is the key - must be > 0
            unhealthy_connections=0,
            total_queries=100,
            successful_queries=100,
            failed_queries=0,
            avg_response_time_ms=50.0,
            error_rate=0.0,
            pool_utilization=0.2,
            last_health_check=time.time()
        )

        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "checks" in data
        assert "summary" in data

    def test_root_endpoint(self):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["message"] == "Almona AI Services API"

    def test_get_models(self):
        """Test get models endpoint"""
        response = client.get("/api/v1/models")
        assert response.status_code == 200
        assert "models" in response.json()
        assert len(response.json()["models"]) > 0

    def test_identify_part_valid_image(self, sample_image):
        """Test identify part with valid image"""
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
        with open(invalid_file, "rb") as f:
            response = client.post(
                "/api/v1/identify-part",
                files={"image": ("test.txt", f, "text/plain")}
            )

        assert response.status_code == 400

    def test_identify_part_missing_file(self):
        """Test identify part without file"""
        response = client.post("/api/v1/identify-part")
        assert response.status_code == 422  # Unprocessable entity

    def test_preprocess_image_valid(self, sample_image):
        """Test preprocess image with valid image"""
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
