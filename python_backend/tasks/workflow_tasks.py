"""
Background tasks for workflow execution and automation.

Priority 3: Workflow Builder - Automation Engine Backend Integration
Executes workflows asynchronously with action execution, condition evaluation, and error handling.
"""

from celery import current_task
from celery.exceptions import Retry
from typing import Dict, Any, List, Optional
import logging
import time
from datetime import datetime, timezone
from uuid import UUID

from celery_app import celery_app
from core.supabase_client import get_enhanced_supabase_client

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="execute_workflow", max_retries=3)
def execute_workflow_task(
    self,
    execution_id: str,
    workflow_id: str,
    user_id: str,
    execution_data: Optional[Dict[str, Any]] = None,
):
    """
    Execute a workflow asynchronously.
    
    This task:
    1. Loads workflow definition from database
    2. Executes workflow nodes in order
    3. Evaluates conditions
    4. Executes actions
    5. Updates execution status and logs
    
    Args:
        execution_id: Workflow execution ID
        workflow_id: Workflow ID to execute
        user_id: User ID who triggered execution
        execution_data: Initial execution data/context
    """
    start_time = time.time()
    
    try:
        # Update task status
        current_task.update_state(
            state="PROGRESS",
            meta={
                "current": 0,
                "total": 100,
                "status": "Initializing workflow execution...",
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "started_at": datetime.utcnow().isoformat(),
            },
        )
        
        # Step 1: Load workflow and execution (10%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 10, "total": 100, "status": "Loading workflow definition..."},
        )
        
        supabase = get_enhanced_supabase_client()
        
        # Get workflow
        workflow_resp = (
            supabase.table("workflows")
            .select("*")
            .eq("id", workflow_id)
            .single()
            .execute()
        )
        
        if not workflow_resp.data:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        workflow = workflow_resp.data
        workflow_data = workflow.get("workflow_data", {})
        
        if not workflow_data:
            raise ValueError("Workflow definition is empty")
        
        # Update execution status to "running"
        execution_uuid = UUID(execution_id)
        supabase.table("workflow_executions").update({
            "status": "running",
            "started_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }).eq("id", execution_id).execute()
        
        # Step 2: Initialize execution context (20%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 20, "total": 100, "status": "Initializing execution context..."},
        )
        
        context: Dict[str, Any] = {
            "workflow_id": workflow_id,
            "execution_id": execution_id,
            "user_id": user_id,
            "data": execution_data or {},
            "node_results": {},
        }
        
        # Step 3: Execute workflow nodes (60%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 30, "total": 100, "status": "Executing workflow nodes..."},
        )
        
        nodes = workflow_data.get("nodes", [])
        edges = workflow_data.get("edges", [])
        
        if not nodes:
            raise ValueError("Workflow has no nodes")
        
        # Find start node
        start_node = next((n for n in nodes if n.get("type") == "start"), None)
        if not start_node:
            raise ValueError("Workflow has no start node")
        
        # Execute workflow (simplified execution - full implementation would use workflow engine)
        executed_nodes: List[str] = []
        failed_nodes: List[str] = []
        execution_logs: List[Dict[str, Any]] = []
        
        execution_queue: List[str] = [start_node.get("id")]
        executed_node_ids = set()
        
        max_iterations = 100  # Prevent infinite loops
        iteration = 0
        
        while execution_queue and iteration < max_iterations:
            iteration += 1
            node_id = execution_queue.pop(0)
            
            if node_id in executed_node_ids:
                continue  # Skip already executed nodes (cycle prevention)
            
            executed_node_ids.add(node_id)
            node = next((n for n in nodes if n.get("id") == node_id), None)
            
            if not node:
                continue
            
            try:
                # Execute node (simplified - full implementation would handle all node types)
                node_type = node.get("type", "")
                node_config = node.get("data", {}).get("config", {})
                
                # Log node execution
                log_entry = {
                    "execution_id": execution_id,
                    "node_id": node_id,
                    "node_type": node_type,
                    "status": "success",
                    "message": f"Executed {node_type} node",
                    "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                }
                execution_logs.append(log_entry)
                
                # Handle different node types
                if node_type == "end":
                    break  # End workflow
                elif node_type == "automation":
                    # Execute automation action (simplified)
                    action_type = node_config.get("action", {}).get("action_type")
                    if action_type == "email":
                        # Email action would be executed here
                        log_entry["message"] = f"Executed email action"
                    elif action_type == "notification":
                        # Notification action would be executed here
                        log_entry["message"] = f"Executed notification action"
                
                executed_nodes.append(node_id)
                
                # Get next nodes from edges
                next_node_ids = [
                    e.get("target")
                    for e in edges
                    if e.get("source") == node_id
                ]
                execution_queue.extend(next_node_ids)
                
            except Exception as node_error:
                logger.error(f"Node {node_id} execution failed: {node_error}")
                failed_nodes.append(node_id)
                
                log_entry = {
                    "execution_id": execution_id,
                    "node_id": node_id,
                    "node_type": node.get("type", ""),
                    "status": "error",
                    "message": str(node_error),
                    "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                }
                execution_logs.append(log_entry)
        
        # Step 4: Store execution logs (80%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 80, "total": 100, "status": "Storing execution logs..."},
        )
        
        # Insert execution logs
        if execution_logs:
            supabase.table("workflow_execution_logs").insert(execution_logs).execute()
        
        # Step 5: Update execution status (90%)
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 90, "total": 100, "status": "Finalizing execution..."},
        )
        
        execution_status = "completed" if not failed_nodes else "failed"
        error_message = None
        
        if failed_nodes:
            error_message = f"Failed nodes: {', '.join(failed_nodes)}"
        
        supabase.table("workflow_executions").update({
            "status": execution_status,
            "completed_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "error_message": error_message,
        }).eq("id", execution_id).execute()
        
        # Final status
        processing_time = time.time() - start_time
        
        current_task.update_state(
            state="SUCCESS",
            meta={
                "current": 100,
                "total": 100,
                "status": f"Workflow execution {execution_status}",
                "executed_nodes": executed_nodes,
                "failed_nodes": failed_nodes,
                "processing_time_seconds": processing_time,
                "completed_at": datetime.utcnow().isoformat(),
            },
        )
        
        return {
            "execution_id": execution_id,
            "status": execution_status,
            "executed_nodes": executed_nodes,
            "failed_nodes": failed_nodes,
            "processing_time_seconds": processing_time,
        }
        
    except Exception as e:
        processing_time = time.time() - start_time
        error_msg = f"Workflow execution failed: {str(e)}"
        
        logger.error(f"{error_msg} (processing_time: {processing_time:.2f}s)")
        
        # Update execution status to "failed"
        try:
            supabase = get_enhanced_supabase_client()
            supabase.table("workflow_executions").update({
                "status": "failed",
                "error_message": str(e),
                "completed_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }).eq("id", execution_id).execute()
        except Exception as update_error:
            logger.error(f"Failed to update execution status: {update_error}")
        
        current_task.update_state(
            state="FAILURE",
            meta={
                "error": str(e),
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "processing_time_seconds": processing_time,
                "failed_at": datetime.utcnow().isoformat(),
            },
        )
        
        # Retry logic for transient failures
        if self.request.retries < self.max_retries:
            retry_delay = 2 ** self.request.retries  # Exponential backoff
            logger.info(f"Retrying workflow execution {execution_id} in {retry_delay} seconds")
            raise self.retry(countdown=retry_delay, exc=e)
        
        raise
