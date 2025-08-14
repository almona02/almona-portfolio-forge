"""Comprehensive tests for API v2 endpoints."""

import pytest
import json
import tempfile
import os
from apis.v2.part_detection import part_detection_bp
from apis.v2.auth import auth_bp
from flask import Flask

@pytest.fixture
def app():
    """Create test Flask app."""
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'test-secret-key'
    app.register_blueprint(part_detection_bp)
    app.register_blueprint(auth_bp)
    return app

@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()

class TestAPIV2:
    """Test suite for API v2 endpoints."""
    
    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get('/api/v2/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert data['version'] == '2.0.0'
    
    def test_model_info(self, client):
        """Test model info endpoint."""
        response = client.get('/api/v2/model-info')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'data' in data
        assert data['data']['version'] == '2.0.0'
    
    def test_auth_login_success(self, client):
        """Test successful login."""
        response = client.post('/api/v2/auth/login', 
                             json={'username': 'admin', 'password': 'password'})
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'refresh_token' in data
    
    def test_auth_login_failure(self, client):
        """Test failed login."""
        response = client.post('/api/v2/auth/login', 
                             json={'username': 'wrong', 'password': 'wrong'})
        assert response.status_code == 401
    
    def test_detect_no_image(self, client):
        """Test detection without image."""
        response = client.post('/api/v2/detect')
        assert response.status_code == 400
    
    def test_detect_no_api_key(self, client):
        """Test detection without API key."""
        response = client.post('/api/v2/detect')
        assert response.status_code == 401
    
    def test_batch_detect_limit(self, client):
        """Test batch detection limit."""
        # Mock 11 files to test limit
        data = {'images': ['mock'] * 11}
        response = client.post('/api/v2/batch-detect', data=data)
        assert response.status_code == 400
    
    def test_token_refresh(self, client):
        """Test token refresh."""
        # First login to get refresh token
        login_response = client.post('/api/v2/auth/login', 
                                   json={'username': 'admin', 'password': 'password'})
        login_data = json.loads(login_response.data)
        refresh_token = login_data['refresh_token']
        
        # Test refresh
        response = client.post('/api/v2/auth/refresh', 
                             json={'refresh_token': refresh_token})
        assert response.status_code == 200
    
    def test_invalid_token(self, client):
        """Test invalid token handling."""
        headers = {'Authorization': 'Bearer invalid_token'}
        response = client.get('/api/v2/auth/verify', headers=headers)
        assert response.status_code == 401
    
    def test_rate_limiting(self, client):
        """Test rate limiting."""
        # Test with 11 rapid requests (should trigger rate limit)
        for i in range(11):
            response = client.post('/api/v2/auth/login', 
                               json={'username': 'admin', 'password': 'password'})
        assert response.status_code == 429  # Rate limited
    
    def test_security_headers(self, client):
        """Test security headers."""
        response = client.get('/api/v2/health')
        assert 'X-Content-Type-Options' in response.headers
        assert 'X-Frame-Options' in response.headers
        assert 'X-XSS-Protection' in response.headers
