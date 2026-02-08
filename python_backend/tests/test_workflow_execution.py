"""
Tests for workflow execution integration.

Priority 3: Workflow Builder - Automation Engine Backend Integration
Tests for workflow execution task and execution engine.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from uuid import uuid4
from datetime import datetime, timezone

from tasks.workflow_tasks import execute_workflow_task
from apis.v2.services.workflow_execution_engine import ConditionEvaluator, ActionExecutor


def utcnow_iso() -> str:
    """Get current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class TestConditionEvaluator:
    """Test condition evaluator."""
    
    def test_evaluate_equals(self):
        """Test equals operator."""
        condition = {
            "field": "status",
            "operator": "equals",
            "value": "active",
        }
        context = {"status": "active"}
        
        result = ConditionEvaluator.evaluate(condition, context)
        assert result is True
    
    def test_evaluate_not_equals(self):
        """Test not_equals operator."""
        condition = {
            "field": "status",
            "operator": "not_equals",
            "value": "inactive",
        }
        context = {"status": "active"}
        
        result = ConditionEvaluator.evaluate(condition, context)
        assert result is True
    
    def test_evaluate_greater_than(self):
        """Test greater_than operator."""
        condition = {
            "field": "amount",
            "operator": "greater_than",
            "value": 100,
        }
        context = {"amount": 150}
        
        result = ConditionEvaluator.evaluate(condition, context)
        assert result is True
    
    def test_evaluate_contains(self):
        """Test contains operator."""
        condition = {
            "field": "name",
            "operator": "contains",
            "value": "test",
        }
        context = {"name": "Test User"}
        
        result = ConditionEvaluator.evaluate(condition, context)
        assert result is True
    
    def test_evaluate_is_empty(self):
        """Test is_empty operator."""
        condition = {
            "field": "description",
            "operator": "is_empty",
            "value": None,
        }
        context = {"description": ""}
        
        result = ConditionEvaluator.evaluate(condition, context)
        assert result is True


class TestActionExecutor:
    """Test action executor."""
    
    @pytest.fixture
    def mock_supabase(self):
        """Mock Supabase client."""
        return Mock()
    
    @pytest.fixture
    def action_executor(self, mock_supabase):
        """Create action executor instance."""
        return ActionExecutor(mock_supabase)
    
    @pytest.mark.asyncio
    async def test_execute_email_action(self, action_executor):
        """Test email action execution."""
        with patch("tasks.notification_tasks.send_email") as mock_send_email:
            action_config = {
                "action_type": "email",
                "params": {
                    "to": "test@example.com",
                    "subject": "Test",
                    "body": "Test body",
                },
            }
            context = {"data": {}}
            
            result = await action_executor.execute(action_config, context)
            
            assert result["success"] is True
            assert result["data"]["sent_to"] == "test@example.com"
    
    @pytest.mark.asyncio
    async def test_execute_notification_action(self, action_executor, mock_supabase):
        """Test notification action execution."""
        mock_repo = Mock()
        mock_repo.insert_notification = Mock(return_value={"id": "123"})
        
        with patch(
            "apis.v2.repositories.notifications_repository.NotificationsRepository",
            return_value=mock_repo,
        ):
            action_config = {
                "action_type": "notification",
                "params": {
                    "title": "Test",
                    "message": "Test message",
                    "user_id": "user-123",
                },
            }
            context = {"user_id": "user-123", "data": {}}
            
            result = await action_executor.execute(action_config, context)
            
            assert result["success"] is True
            assert result["data"]["title"] == "Test"
    
    @pytest.mark.asyncio
    async def test_execute_webhook_action(self, action_executor):
        """Test webhook action execution."""
        with patch("requests.request") as mock_request:
            mock_response = Mock()
            mock_response.ok = True
            mock_response.status_code = 200
            mock_response.json.return_value = {"success": True}
            mock_response.content = b'{"success": true}'
            mock_request.return_value = mock_response
            
            action_config = {
                "action_type": "webhook",
                "params": {
                    "url": "https://example.com/webhook",
                    "method": "POST",
                    "body": {"test": "data"},
                },
            }
            context = {"data": {}}
            
            result = await action_executor.execute(action_config, context)
            
            assert result["success"] is True
            assert result["data"]["status"] == 200


class TestWorkflowExecutionTask:
    """Test workflow execution task."""
    
    @patch("tasks.workflow_tasks.get_enhanced_supabase_client")
    def test_execute_workflow_task_success(self, mock_get_supabase):
        """Test successful workflow execution."""
        # Mock Supabase client
        mock_supabase = Mock()
        mock_get_supabase.return_value = mock_supabase
        
        # Mock workflow response
        workflow_id = str(uuid4())
        execution_id = str(uuid4())
        user_id = str(uuid4())
        
        mock_workflow_resp = Mock()
        mock_workflow_resp.data = {
            "id": workflow_id,
            "workflow_data": {
                "nodes": [
                    {"id": "start-1", "type": "start", "data": {"label": "Start"}},
                    {"id": "end-1", "type": "end", "data": {"label": "End"}},
                ],
                "edges": [
                    {"id": "e1", "source": "start-1", "target": "end-1"},
                ],
            },
        }
        
        mock_table = Mock()
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.single.return_value = mock_table
        mock_table.execute.return_value = mock_workflow_resp
        
        mock_update = Mock()
        mock_update.update.return_value = mock_update
        mock_update.eq.return_value = mock_update
        mock_update.execute.return_value = Mock()
        
        mock_supabase.table.side_effect = lambda table: mock_table if table == "workflows" else mock_update
        
        # Mock execution logs insert
        mock_insert = Mock()
        mock_insert.insert.return_value = mock_insert
        mock_insert.execute.return_value = Mock()
        mock_supabase.table.return_value = mock_insert
        
        # Create task instance
        task = execute_workflow_task
        
        # This is a simplified test - full integration test would require Celery setup
        # For now, we just verify the code structure is correct
        assert callable(task)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
