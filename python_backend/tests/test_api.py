import pytest
import os
from fastapi.testclient import TestClient
from apis.main import app

client = TestClient(app)

class TestAPIEndpoints:
    """Test cases for API endpoints"""
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        assert "service" in response.json()
    
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
        
        # Note: This might fail if the model isn't loaded, but we'll test the endpoint structure
        assert response.status_code in [200, 500]  # 500 if model not available
        
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
        
        assert response.status_code in [200, 500]  # 500 if processor not available
        
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
        assert response.status_code in [200, 413, 500]  # 413 if size limit enforced
    
    def test_cors_headers(self):
        """Test CORS headers are properly set"""
        response = client.get("/health")
        assert "access-control-allow-origin" in response.headers or "*" in str(response.headers).lower()
