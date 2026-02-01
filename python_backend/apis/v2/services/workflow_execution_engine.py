"""
Workflow Execution Engine

Priority 3: Workflow Builder - Automation Engine Backend Integration
Backend workflow execution engine with condition evaluation and action execution.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


def utcnow_iso() -> str:
    """Get current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class ConditionEvaluator:
    """Evaluate workflow conditions."""
    
    @staticmethod
    def evaluate(
        condition: Dict[str, Any],
        context: Dict[str, Any]
    ) -> bool:
        """
        Evaluate a condition against context.
        
        Args:
            condition: Condition definition with field, operator, value
            context: Execution context data
            
        Returns:
            Boolean result of condition evaluation
        """
        field = condition.get("field", "")
        operator = condition.get("operator", "equals")
        value = condition.get("value")
        
        field_value = _get_nested_value(context, field)
        
        try:
            if operator == "equals":
                return field_value == value
            elif operator == "not_equals":
                return field_value != value
            elif operator == "greater_than":
                return float(field_value or 0) > float(value or 0)
            elif operator == "less_than":
                return float(field_value or 0) < float(value or 0)
            elif operator == "contains":
                return str(value).lower() in str(field_value or "").lower()
            elif operator == "is_empty":
                return not field_value or str(field_value).strip() == ""
            elif operator == "is_not_empty":
                return bool(field_value) and str(field_value).strip() != ""
            else:
                logger.warning(f"Unknown operator: {operator}")
                return False
        except Exception as e:
            logger.error(f"Error evaluating condition: {e}")
            return False


def _get_nested_value(data: Dict[str, Any], path: str) -> Any:
    """Get nested value from dict using dot notation."""
    parts = path.split(".")
    value = data
    for part in parts:
        if isinstance(value, dict):
            value = value.get(part)
        else:
            return None
        if value is None:
            return None
    return value


class ActionExecutor:
    """Execute workflow actions."""
    
    def __init__(self, supabase_client: Any):
        """Initialize action executor with Supabase client."""
        self._supabase = supabase_client
    
    async def execute(
        self,
        action_config: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute an action.
        
        Args:
            action_config: Action configuration with action_type and params
            context: Execution context
            
        Returns:
            Execution result with success status and data/error
        """
        action_type = action_config.get("action_type")
        params = action_config.get("params", {})
        
        try:
            if action_type == "email":
                return await self._execute_email_action(params, context)
            elif action_type == "notification":
                return await self._execute_notification_action(params, context)
            elif action_type == "update_status":
                return await self._execute_update_status_action(params, context)
            elif action_type == "webhook":
                return await self._execute_webhook_action(params, context)
            elif action_type == "delay":
                return await self._execute_delay_action(params, context)
            else:
                return {
                    "success": False,
                    "error": f"Unknown action type: {action_type}",
                }
        except Exception as e:
            logger.error(f"Action execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    async def _execute_email_action(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute email action."""
        to = params.get("to")
        subject = params.get("subject", "Workflow Notification")
        body = params.get("body", "")
        
        if not to:
            return {
                "success": False,
                "error": "Email 'to' address is required",
            }
        
        # Use notification task to send email
        try:
            from tasks.notification_tasks import send_email
            
            # Trigger email task (fire and forget for now)
            send_email.delay(
                to_email=to,
                subject=subject,
                html_content=body or "<p>Workflow notification</p>",
                template_data=context.get("data", {}),
            )
            
            return {
                "success": True,
                "data": {"sent_to": to, "subject": subject},
            }
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    async def _execute_notification_action(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute notification action."""
        title = params.get("title", "Workflow Notification")
        message = params.get("message", "")
        user_id = params.get("user_id") or context.get("user_id")
        notification_type = params.get("type", "info")
        
        if not user_id:
            return {
                "success": False,
                "error": "User ID is required for notifications",
            }
        
        try:
            # Create notification via API service
            from apis.v2.services.notification_service import NotificationService
            from apis.v2.repositories.notifications_repository import NotificationsRepository
            
            notification_repo = NotificationsRepository(self._supabase)
            notification_service = NotificationService(self._supabase)
            
            notification_data = {
                "user_id": str(user_id),
                "channel": "in_app",
                "type": notification_type,
                "title": title,
                "message": message,
                "metadata": context.get("data", {}),
            }
            
            notification_repo.insert_notification(notification_data)
            
            return {
                "success": True,
                "data": {"title": title, "type": notification_type},
            }
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    async def _execute_update_status_action(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute update status action."""
        entity_type = params.get("entity_type")
        entity_id = params.get("entity_id")
        status = params.get("status")
        
        if not entity_type or not entity_id or not status:
            return {
                "success": False,
                "error": "entity_type, entity_id, and status are required",
            }
        
        # This would integrate with appropriate entity update services
        # For now, return success (placeholder)
        return {
            "success": True,
            "data": {
                "entity_type": entity_type,
                "entity_id": entity_id,
                "status": status,
            },
        }
    
    async def _execute_webhook_action(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute webhook action."""
        url = params.get("url")
        method = params.get("method", "POST")
        headers = params.get("headers", {})
        body = params.get("body", context.get("data", {}))
        
        if not url:
            return {
                "success": False,
                "error": "Webhook URL is required",
            }
        
        try:
            import requests
            
            response = requests.request(
                method=method,
                url=url,
                headers={
                    "Content-Type": "application/json",
                    **headers,
                },
                json=body,
                timeout=30,
            )
            
            if not response.ok:
                return {
                    "success": False,
                    "error": f"Webhook returned {response.status_code}: {response.text}",
                }
            
            return {
                "success": True,
                "data": {
                    "status": response.status_code,
                    "response": response.json() if response.content else {},
                },
            }
        except Exception as e:
            logger.error(f"Webhook execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    async def _execute_delay_action(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute delay action."""
        import asyncio
        
        duration_ms = params.get("duration_ms", 0)
        duration_seconds = params.get("duration_seconds", 0)
        
        delay_seconds = duration_seconds if duration_seconds else (duration_ms / 1000.0)
        
        if delay_seconds <= 0:
            return {
                "success": False,
                "error": "Valid delay duration is required",
            }
        
        # Cap delay at 5 minutes
        delay_seconds = min(delay_seconds, 300)
        
        await asyncio.sleep(delay_seconds)
        
        return {
            "success": True,
            "data": {"delay_seconds": delay_seconds},
        }
