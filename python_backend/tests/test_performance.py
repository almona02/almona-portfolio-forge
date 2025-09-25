"""
Performance tests for v2 API endpoints.
"""
import time
import pytest
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

from apis.main import app


@pytest.fixture
def client():
    """Test client fixture."""
    return TestClient(app)


class TestPerformance:
    """Performance tests for API endpoints."""
    
    def test_concurrent_ticket_creation(self, client):
        """Test concurrent ticket creation performance."""
        def create_ticket():
            with patch('apis.v2.deps.get_current_user') as mock_auth, \
                 patch('apis.v2.services.ticket_service.TicketService.create_ticket') as mock_create:
                
                mock_auth.return_value = {"sub": "test@example.com", "id": str(pytest.uuid4())}
                mock_create.return_value = Mock(
                    id=str(pytest.uuid4()),
                    title="Test",
                    status="open"
                )
                
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
                return response.status_code
        
        # Test with 10 concurrent requests
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(create_ticket) for _ in range(10)]
            results = [future.result() for future in futures]
        
        end_time = time.time()
        duration = end_time - start_time
        
        # All requests should succeed
        assert all(status == 201 for status in results)
        
        # Should complete within reasonable time (adjust based on your requirements)
        assert duration < 5.0  # 5 seconds for 10 concurrent requests
        
        print(f"Concurrent ticket creation: {duration:.2f}s for 10 requests")
    
    def test_quote_creation_performance(self, client):
        """Test quote creation performance with large payload."""
        with patch('apis.v2.services.quote_service.QuoteService.create_quote_with_items') as mock_create:
            mock_create.return_value = {
                "id": str(pytest.uuid4()),
                "quote_number": "Q-2024-001",
                "status": "pending",
                "total_amount": 1000.0
            }
            
            # Large payload with many items
            large_payload = {
                "products": [
                    {"product_id": f"p{i}", "quantity": 1, "unit_price": 10.0}
                    for i in range(100)  # 100 products
                ],
                "services": [
                    {"service_id": f"s{i}", "quantity": 1, "unit_price": 5.0}
                    for i in range(50)   # 50 services
                ],
                "contact_name": "John Doe",
                "contact_email": "john@example.com"
            }
            
            start_time = time.time()
            response = client.post("/api/v2/quotes/create", json=large_payload)
            end_time = time.time()
            
            duration = end_time - start_time
            
            assert response.status_code == 201
            assert duration < 2.0  # Should complete within 2 seconds
            
            print(f"Large quote creation: {duration:.2f}s for 150 items")
    
    def test_database_query_performance(self, client):
        """Test database query performance."""
        with patch('apis.v2.deps.get_current_user') as mock_auth, \
             patch('apis.v2.services.ticket_service.TicketService.get_user_tickets') as mock_list:
            
            mock_auth.return_value = {"sub": "test@example.com", "id": str(pytest.uuid4())}
            
            # Mock large result set
            large_ticket_list = [
                Mock(
                    id=str(pytest.uuid4()),
                    title=f"Ticket {i}",
                    status="open"
                )
                for i in range(1000)  # 1000 tickets
            ]
            mock_list.return_value = large_ticket_list
            
            start_time = time.time()
            response = client.get(
                "/api/v2/tickets/",
                headers={"Authorization": "Bearer fake-token"}
            )
            end_time = time.time()
            
            duration = end_time - start_time
            
            assert response.status_code == 200
            assert duration < 1.0  # Should complete within 1 second
            
            print(f"Large ticket list: {duration:.2f}s for 1000 tickets")
    
    def test_memory_usage_under_load(self, client):
        """Test memory usage doesn't grow excessively under load."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Make many requests
        for _ in range(100):
            with patch('apis.v2.deps.get_current_user') as mock_auth, \
                 patch('apis.v2.services.ticket_service.TicketService.get_user_tickets') as mock_list:
                
                mock_auth.return_value = {"sub": "test@example.com", "id": str(pytest.uuid4())}
                mock_list.return_value = []
                
                response = client.get(
                    "/api/v2/tickets/",
                    headers={"Authorization": "Bearer fake-token"}
                )
                assert response.status_code == 200
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_growth = final_memory - initial_memory
        
        # Memory growth should be reasonable (less than 50MB for 100 requests)
        assert memory_growth < 50
        
        print(f"Memory usage: {initial_memory:.1f}MB -> {final_memory:.1f}MB (growth: {memory_growth:.1f}MB)")


class TestLoadTesting:
    """Load testing scenarios."""
    
    def test_sustained_load(self, client):
        """Test API under sustained load."""
        def make_request():
            with patch('apis.v2.deps.get_current_user') as mock_auth, \
                 patch('apis.v2.services.ticket_service.TicketService.get_user_tickets') as mock_list:
                
                mock_auth.return_value = {"sub": "test@example.com", "id": str(pytest.uuid4())}
                mock_list.return_value = []
                
                response = client.get(
                    "/api/v2/tickets/",
                    headers={"Authorization": "Bearer fake-token"}
                )
                return response.status_code, time.time()
        
        # Run sustained load for 30 seconds
        start_time = time.time()
        end_time = start_time + 30
        
        successful_requests = 0
        failed_requests = 0
        response_times = []
        
        while time.time() < end_time:
            status_code, request_time = make_request()
            response_time = time.time() - request_time
            response_times.append(response_time)
            
            if status_code == 200:
                successful_requests += 1
            else:
                failed_requests += 1
        
        total_requests = successful_requests + failed_requests
        success_rate = successful_requests / total_requests if total_requests > 0 else 0
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # Performance assertions
        assert success_rate > 0.95  # 95% success rate
        assert avg_response_time < 0.5  # Average response time under 500ms
        assert total_requests > 50  # Should handle at least 50 requests in 30 seconds
        
        print(f"Sustained load results:")
        print(f"  Total requests: {total_requests}")
        print(f"  Success rate: {success_rate:.2%}")
        print(f"  Average response time: {avg_response_time:.3f}s")
        print(f"  Requests per second: {total_requests / 30:.1f}")
