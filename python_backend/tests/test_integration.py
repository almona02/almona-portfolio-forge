"""
Integration tests for v2 API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from uuid import uuid4

from apis.main import app
from models.api_v2_models import TicketCategory, TicketPriority


@pytest.fixture
def client():
    """Test client fixture."""
    return TestClient(app)


@pytest.fixture
def mock_supabase():
    """Mock Supabase client."""
    with patch('apis.v2.deps.get_supabase') as mock:
        mock_client = Mock()
        mock.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_auth():
    """Mock authentication."""
    with patch('apis.v2.deps.get_current_user') as mock:
        mock.return_value = {
            "sub": "test@example.com",
            "id": str(uuid4()),
            "role": "user"
        }
        yield mock


class TestTicketsAPI:
    """Integration tests for tickets endpoints."""
    
    def test_create_support_ticket(self, client, mock_supabase, mock_auth):
        """Test creating a support ticket."""
        # Mock the service response
        mock_ticket = {
            "id": str(uuid4()),
            "title": "Test Issue",
            "description": "Test Description",
            "status": "open",
            "category": "support",
            "priority": "medium"
        }
        
        with patch('apis.v2.services.ticket_service.TicketService.create_ticket') as mock_create:
            mock_create.return_value = Mock(**mock_ticket)
            
            response = client.post(
                "/api/v2/tickets/support",
                json={
                    "title": "Test Issue",
                    "description": "Test Description",
                    "priority": "medium",
                    "machine_id": None,
                    "machine_serial_number": None
                },
                headers={"Authorization": "Bearer fake-token"}
            )
            
            assert response.status_code == 201
            data = response.json()
            assert data["title"] == "Test Issue"
            assert data["status"] == "open"
    
    def test_list_tickets(self, client, mock_supabase, mock_auth):
        """Test listing user tickets."""
        mock_tickets = [
            {
                "id": str(uuid4()),
                "title": "Ticket 1",
                "status": "open"
            },
            {
                "id": str(uuid4()),
                "title": "Ticket 2", 
                "status": "in_progress"
            }
        ]
        
        with patch('apis.v2.services.ticket_service.TicketService.get_user_tickets') as mock_list:
            mock_list.return_value = [Mock(**ticket) for ticket in mock_tickets]
            
            response = client.get(
                "/api/v2/tickets/",
                headers={"Authorization": "Bearer fake-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["title"] == "Ticket 1"
    
    def test_unauthorized_access(self, client, mock_supabase):
        """Test unauthorized access returns 401."""
        with patch('apis.v2.deps.get_current_user') as mock_auth:
            mock_auth.side_effect = Exception("Invalid token")
            
            response = client.get(
                "/api/v2/tickets/",
                headers={"Authorization": "Bearer invalid-token"}
            )
            
            assert response.status_code == 401


class TestQuotesAPI:
    """Integration tests for quotes endpoints."""
    
    def test_create_quote(self, client, mock_supabase):
        """Test creating a quote."""
        mock_quote = {
            "id": str(uuid4()),
            "quote_number": "Q-2024-001",
            "status": "pending",
            "total_amount": 100.0
        }
        
        with patch('apis.v2.services.quote_service.QuoteService.create_quote_with_items') as mock_create:
            mock_create.return_value = mock_quote
            
            response = client.post(
                "/api/v2/quotes/create",
                json={
                    "products": [
                        {"product_id": "p1", "quantity": 2, "unit_price": 50.0}
                    ],
                    "services": [],
                    "contact_name": "John Doe",
                    "contact_email": "john@example.com"
                }
            )
            
            assert response.status_code == 201
            data = response.json()
            assert data["quote_number"] == "Q-2024-001"
            assert data["total_amount"] == 100.0
    
    def test_quote_lookup(self, client, mock_supabase):
        """Test quote lookup functionality."""
        mock_results = [
            {
                "id": str(uuid4()),
                "quote_number": "Q-2024-001",
                "status": "pending"
            }
        ]
        
        with patch('apis.v2.repositories.quotes.QuotesRepository.rpc_quote_lookup') as mock_lookup:
            mock_lookup.return_value = mock_results
            
            response = client.get("/api/v2/quotes/lookup?q=Q-2024-001")
            
            assert response.status_code == 200
            data = response.json()
            assert data["count"] == 1
            assert data["results"][0]["quote_number"] == "Q-2024-001"


class TestRateLimiting:
    """Test rate limiting functionality."""
    
    def test_rate_limit_exceeded(self, client):
        """Test that rate limiting works."""
        # Make many requests quickly to trigger rate limit
        responses = []
        for _ in range(25):  # Exceed burst limit of 20
            response = client.get("/health")
            responses.append(response)
        
        # Should have some 429 responses
        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes


class TestSecurityHeaders:
    """Test security headers are present."""
    
    def test_security_headers(self, client):
        """Test that security headers are added."""
        response = client.get("/health")
        
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"
        assert "Strict-Transport-Security" in response.headers
        assert "Server" not in response.headers  # Should be removed


class TestErrorHandling:
    """Test error handling and responses."""
    
    def test_404_error(self, client):
        """Test 404 error handling."""
        response = client.get("/api/v2/nonexistent")
        assert response.status_code == 404
    
    def test_validation_error(self, client, mock_supabase, mock_auth):
        """Test validation error handling."""
        response = client.post(
            "/api/v2/tickets/support",
            json={
                "title": "",  # Invalid empty title
                "description": "Test"
            },
            headers={"Authorization": "Bearer fake-token"}
        )
        
        # Should return validation error
        assert response.status_code in [400, 422]
