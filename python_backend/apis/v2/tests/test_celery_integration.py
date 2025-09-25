"""
Test suite for Celery integration and background task processing.
"""
import pytest
import time
from unittest.mock import Mock, patch, AsyncMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

from celery_app import celery_app
from tasks.quote_tasks import process_quote_calculation
from tasks.notification_tasks import send_email, send_quote_notification
from tasks.report_tasks import generate_report
from tasks.monitoring_tasks import system_health_check


@pytest.fixture
def test_app():
    """Create a test FastAPI app with Celery endpoints."""
    app = FastAPI()
    
    @app.get("/celery/status")
    async def get_celery_status():
        return {"status": "success", "data": {"workers": {"count": 1}}}
    
    @app.post("/celery/health-check")
    async def trigger_health_check():
        return {"status": "success", "data": {"task_id": "test-task-id"}}
    
    @app.get("/celery/tasks/{task_id}/status")
    async def get_task_status(task_id: str):
        return {"status": "success", "data": {"task_id": task_id, "state": "SUCCESS"}}
    
    return app


class TestCeleryConfiguration:
    """Test Celery configuration and setup."""
    
    def test_celery_app_creation(self):
        """Test that Celery app is properly configured."""
        assert celery_app is not None
        assert celery_app.main == "almona_backend"
    
    def test_celery_task_routes(self):
        """Test that task routes are properly configured."""
        routes = celery_app.conf.task_routes
        assert "tasks.quote_tasks.process_quote_calculation" in routes
        assert "tasks.notification_tasks.*" in routes
        assert "tasks.report_tasks.*" in routes
    
    def test_celery_task_annotations(self):
        """Test that task annotations are properly configured."""
        annotations = celery_app.conf.task_annotations
        assert "tasks.quote_tasks.process_quote_calculation" in annotations
        assert "tasks.notification_tasks.send_email" in annotations
        assert "tasks.report_tasks.generate_report" in annotations


class TestQuoteTasks:
    """Test quote processing tasks."""
    
    @patch('tasks.quote_tasks.get_enhanced_supabase_client')
    @patch('tasks.quote_tasks.get_connection_pool')
    def test_process_quote_calculation_success(self, mock_get_pool, mock_get_supabase):
        """Test successful quote calculation."""
        # Mock Supabase client
        mock_supabase = Mock()
        mock_supabase.client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": "test-quote"}]
        mock_get_supabase.return_value = mock_supabase
        
        # Mock connection pool
        mock_pool = Mock()
        mock_get_pool.return_value = mock_pool
        
        # Test data
        quote_id = "test-quote-123"
        items_data = {
            "products": [
                {"id": "prod1", "name": "Product 1", "unit_price": 100.0, "quantity": 2},
                {"id": "prod2", "name": "Product 2", "unit_price": 50.0, "quantity": 1}
            ],
            "services": [
                {"id": "serv1", "name": "Service 1", "unit_price": 200.0, "quantity": 1}
            ],
            "discounts": [
                {"type": "percentage", "value": 10}
            ],
            "taxes": [
                {"type": "percentage", "value": 15}
            ]
        }
        
        # Execute task
        result = process_quote_calculation(quote_id, items_data)
        
        # Verify result
        assert result["quote_id"] == quote_id
        assert result["total_amount"] > 0
        assert result["processing_time_seconds"] > 0
        assert result["item_count"] == 3  # 2 products + 1 service
    
    @patch('tasks.quote_tasks.get_enhanced_supabase_client')
    def test_process_quote_calculation_no_items(self, mock_get_supabase):
        """Test quote calculation with no items."""
        mock_supabase = Mock()
        mock_get_supabase.return_value = mock_supabase
        
        quote_id = "test-quote-123"
        items_data = {"products": [], "services": []}
        
        with pytest.raises(ValueError, match="No products or services found"):
            process_quote_calculation(quote_id, items_data)
    
    @patch('tasks.quote_tasks.get_enhanced_supabase_client')
    def test_process_quote_calculation_database_error(self, mock_get_supabase):
        """Test quote calculation with database error."""
        # Mock Supabase client to return no data
        mock_supabase = Mock()
        mock_supabase.client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = None
        mock_get_supabase.return_value = mock_supabase
        
        quote_id = "test-quote-123"
        items_data = {
            "products": [{"id": "prod1", "unit_price": 100.0, "quantity": 1}]
        }
        
        with pytest.raises(Exception):
            process_quote_calculation(quote_id, items_data)


class TestNotificationTasks:
    """Test notification tasks."""
    
    @patch('tasks.notification_tasks.get_enhanced_supabase_client')
    def test_send_email_success(self, mock_get_supabase):
        """Test successful email sending."""
        mock_supabase = Mock()
        mock_supabase.client.table.return_value.insert.return_value.execute.return_value.data = [{"id": "email-123"}]
        mock_get_supabase.return_value = mock_supabase
        
        result = send_email(
            to_email="test@example.com",
            subject="Test Email",
            html_content="<h1>Test</h1>",
            text_content="Test"
        )
        
        assert result["to_email"] == "test@example.com"
        assert result["subject"] == "Test Email"
        assert result["status"] == "sent"
        assert result["processing_time_seconds"] > 0
    
    def test_send_email_missing_fields(self):
        """Test email sending with missing required fields."""
        with pytest.raises(ValueError, match="Missing required email fields"):
            send_email(
                to_email="",
                subject="Test",
                html_content="<h1>Test</h1>"
            )
    
    @patch('tasks.notification_tasks.send_email.delay')
    def test_send_quote_notification(self, mock_send_email):
        """Test quote notification sending."""
        mock_task = Mock()
        mock_task.id = "email-task-123"
        mock_send_email.return_value = mock_task
        
        result = send_quote_notification(
            quote_id="quote-123",
            recipient_email="customer@example.com",
            quote_data={
                "customer_name": "John Doe",
                "total_amount": 1000.0,
                "status": "created"
            },
            notification_type="quote_created"
        )
        
        assert result["quote_id"] == "quote-123"
        assert result["recipient_email"] == "customer@example.com"
        assert result["notification_type"] == "quote_created"
        assert result["email_task_id"] == "email-task-123"


class TestReportTasks:
    """Test report generation tasks."""
    
    @patch('tasks.report_tasks.get_enhanced_supabase_client')
    def test_generate_sales_summary_report(self, mock_get_supabase):
        """Test sales summary report generation."""
        # Mock Supabase responses
        mock_supabase = Mock()
        
        # Mock quotes data
        mock_supabase.client.table.return_value.select.return_value.gte.return_value.lte.return_value.execute.return_value.data = [
            {"id": "quote1", "total_amount": 1000.0, "status": "completed", "customer_id": "cust1"},
            {"id": "quote2", "total_amount": 2000.0, "status": "pending", "customer_id": "cust2"}
        ]
        
        # Mock profiles data
        mock_supabase.client.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
            {"id": "cust1", "full_name": "Customer 1", "company_name": "Company 1"},
            {"id": "cust2", "full_name": "Customer 2", "company_name": "Company 2"}
        ]
        
        mock_get_supabase.return_value = mock_supabase
        
        result = generate_report(
            report_type="sales_summary",
            parameters={"start_date": "2024-01-01", "end_date": "2024-01-31"},
            user_id="user-123",
            format="json"
        )
        
        assert result["report_type"] == "sales_summary"
        assert result["user_id"] == "user-123"
        assert result["format"] == "json"
        assert result["processing_time_seconds"] > 0
    
    def test_generate_report_invalid_type(self):
        """Test report generation with invalid report type."""
        with pytest.raises(ValueError, match="Unsupported report type"):
            generate_report(
                report_type="invalid_type",
                parameters={},
                user_id="user-123"
            )
    
    def test_generate_report_missing_parameters(self):
        """Test report generation with missing parameters."""
        with pytest.raises(ValueError, match="Missing required report parameters"):
            generate_report(
                report_type="sales_summary",
                parameters={},
                user_id=""
            )


class TestMonitoringTasks:
    """Test monitoring tasks."""
    
    @patch('tasks.monitoring_tasks.get_enhanced_supabase_client')
    @patch('tasks.monitoring_tasks.get_connection_pool')
    @patch('tasks.monitoring_tasks.psutil.cpu_percent')
    @patch('tasks.monitoring_tasks.psutil.virtual_memory')
    @patch('tasks.monitoring_tasks.psutil.disk_usage')
    def test_system_health_check_success(self, mock_disk, mock_memory, mock_cpu, mock_get_pool, mock_get_supabase):
        """Test successful system health check."""
        # Mock Supabase
        mock_supabase = Mock()
        mock_supabase.client.table.return_value.select.return_value.limit.return_value.execute.return_value.data = [{"id": "test"}]
        mock_get_supabase.return_value = mock_supabase
        
        # Mock connection pool
        mock_pool = Mock()
        mock_pool.get_performance_stats.return_value = Mock(
            error_rate=0.05,
            total_connections=10,
            active_connections=3,
            healthy_connections=9,
            avg_response_time_ms=250.0
        )
        mock_pool.get_connection_health.return_value = {"conn1": {"is_healthy": True}}
        mock_get_pool.return_value = mock_pool
        
        # Mock system resources
        mock_cpu.return_value = 45.0
        mock_memory.return_value = Mock(percent=60.0, available=8*1024**3)
        mock_disk.return_value = Mock(percent=70.0, free=50*1024**3)
        
        result = system_health_check()
        
        assert result["overall_status"] in ["healthy", "degraded"]
        assert "checks" in result
        assert "database" in result["checks"]
        assert "connection_pool" in result["checks"]
        assert "system_resources" in result["checks"]
        assert result["processing_time_seconds"] > 0
    
    @patch('tasks.monitoring_tasks.get_enhanced_supabase_client')
    def test_system_health_check_database_failure(self, mock_get_supabase):
        """Test system health check with database failure."""
        # Mock Supabase to raise exception
        mock_supabase = Mock()
        mock_supabase.client.table.return_value.select.return_value.limit.return_value.execute.side_effect = Exception("Database error")
        mock_get_supabase.return_value = mock_supabase
        
        result = system_health_check()
        
        assert result["overall_status"] == "degraded"
        assert result["checks"]["database"]["status"] == "unhealthy"
        assert "error" in result["checks"]["database"]


class TestCeleryEndpoints:
    """Test Celery monitoring endpoints."""
    
    def test_celery_status_endpoint(self, test_app):
        """Test Celery status endpoint."""
        client = TestClient(test_app)
        response = client.get("/celery/status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
    
    def test_health_check_endpoint(self, test_app):
        """Test health check trigger endpoint."""
        client = TestClient(test_app)
        response = client.post("/celery/health-check")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "task_id" in data["data"]
    
    def test_task_status_endpoint(self, test_app):
        """Test task status endpoint."""
        client = TestClient(test_app)
        response = client.get("/celery/tasks/test-task-id/status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["task_id"] == "test-task-id"


class TestTaskIntegration:
    """Test task integration and workflow."""
    
    @patch('tasks.quote_tasks.get_enhanced_supabase_client')
    @patch('tasks.notification_tasks.send_email.delay')
    def test_quote_workflow(self, mock_send_email, mock_get_supabase):
        """Test complete quote workflow."""
        # Mock Supabase
        mock_supabase = Mock()
        mock_supabase.client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": "quote-123"}]
        mock_get_supabase.return_value = mock_supabase
        
        # Mock email task
        mock_email_task = Mock()
        mock_email_task.id = "email-123"
        mock_send_email.return_value = mock_email_task
        
        # Test quote calculation
        quote_result = process_quote_calculation(
            "quote-123",
            {
                "products": [{"id": "prod1", "unit_price": 100.0, "quantity": 1}],
                "services": [],
                "discounts": [],
                "taxes": []
            }
        )
        
        assert quote_result["quote_id"] == "quote-123"
        assert quote_result["total_amount"] == 100.0
        
        # Test quote notification
        notification_result = send_quote_notification(
            "quote-123",
            "customer@example.com",
            {"customer_name": "Test Customer", "total_amount": 100.0},
            "quote_created"
        )
        
        assert notification_result["quote_id"] == "quote-123"
        assert notification_result["email_task_id"] == "email-123"


if __name__ == "__main__":
    pytest.main([__file__])
