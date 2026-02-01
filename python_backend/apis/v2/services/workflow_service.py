from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timezone

from supabase import Client  # type: ignore

from apis.v2.repositories.workflows_repository import (
    WorkflowsRepository
)
from apis.v2.core.errors import SupabaseError
from models.api_v2_models import (
    WorkflowResponse,
    WorkflowCategory,
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
    WorkflowListResponse,
    WorkflowExecutionResponse,
    WorkflowExecutionLogResponse,
    WorkflowExecutionStatus,
    WorkflowExecutionLogStatus,
    WorkflowExecutionCreateRequest,
    WorkflowExecutionListResponse,
    WorkflowExecutionLogsResponse,
)


def utcnow_iso() -> str:
    """Get current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class WorkflowValidationError(Exception):
    """Workflow validation error."""
    pass


class WorkflowService:
    """Service layer for workflows."""

    def __init__(self, supabase: Client):
        self._repo = WorkflowsRepository(supabase)
        self._db = supabase

    def _convert_db_row_to_response(
        self, row: Dict[str, Any]
    ) -> WorkflowResponse:
        """Convert database row to WorkflowResponse model."""
        return WorkflowResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            name=row.get("name", ""),
            description=row.get("description"),
            category=WorkflowCategory(row.get("category", "custom")),
            workflow_data=row.get("workflow_data", {}),
            is_active=row.get("is_active", True),
            is_public=row.get("is_public", False),
            is_template=row.get("is_template", False),
            version=row.get("version", "1.0.0"),
            usage_count=row.get("usage_count", 0),
            created_at=row.get("created_at", utcnow_iso()),
            updated_at=row.get("updated_at", utcnow_iso()),
        )

    def _convert_execution_row_to_response(
        self, row: Dict[str, Any]
    ) -> WorkflowExecutionResponse:
        """Convert execution row to WorkflowExecutionResponse."""
        status_str = row.get("status", "pending")
        try:
            status = WorkflowExecutionStatus(status_str)
        except ValueError:
            status = WorkflowExecutionStatus.pending

        return WorkflowExecutionResponse(
            id=str(row["id"]),
            workflow_id=str(row["workflow_id"]),
            user_id=str(row["user_id"]),
            triggered_by=str(row["triggered_by"]) if row.get("triggered_by") else None,
            status=status,
            execution_data=row.get("execution_data", {}),
            started_at=row.get("started_at"),
            completed_at=row.get("completed_at"),
            error_message=row.get("error_message"),
            created_at=row.get("created_at", utcnow_iso()),
            updated_at=row.get("updated_at", utcnow_iso()),
        )

    def _validate_workflow_structure(
        self, workflow_data: Dict[str, Any]
    ) -> List[str]:
        """Validate workflow structure and return list of errors."""
        errors: List[str] = []

        nodes = workflow_data.get("nodes", [])
        edges = workflow_data.get("edges", [])

        if not nodes:
            errors.append("Workflow must have at least one node")
            return errors

        # Check for start node
        start_nodes = [n for n in nodes if n.get("type") == "start"]
        if len(start_nodes) == 0:
            errors.append("Workflow must have exactly one start node")
        elif len(start_nodes) > 1:
            errors.append("Workflow must have exactly one start node")

        # Check for end node
        end_nodes = [n for n in nodes if n.get("type") == "end"]
        if len(end_nodes) == 0:
            errors.append("Workflow must have at least one end node")

        # Validate node IDs are unique
        node_ids = [n.get("id") for n in nodes]
        if len(node_ids) != len(set(node_ids)):
            errors.append("Node IDs must be unique")

        # Validate edges reference valid nodes
        node_id_set = set(node_ids)
        for edge in edges:
            source = edge.get("source")
            target = edge.get("target")
            if source and source not in node_id_set:
                errors.append(f"Edge references invalid source node: {source}")
            if target and target not in node_id_set:
                errors.append(f"Edge references invalid target node: {target}")

        # Validate decision nodes have exactly 2 outgoing edges
        for node in nodes:
            if node.get("type") == "decision":
                outgoing = [
                    e for e in edges if e.get("source") == node.get("id")
                ]
                if len(outgoing) != 2:
                    errors.append(
                        f"Decision node {node.get('id')} must have "
                        f"exactly 2 outgoing edges"
                    )

        return errors

    def list_workflows(
        self,
        user_id: Optional[UUID],
        category: Optional[str] = None,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        is_template: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> WorkflowListResponse:
        """List workflows with filtering."""
        try:
            filters: Dict[str, Any] = {}
            if category:
                filters["category"] = category
            if search:
                filters["search"] = search
            if is_active is not None:
                filters["is_active"] = is_active
            if is_template is not None:
                filters["is_template"] = is_template

            rows = self._repo.list_workflows(
                user_id=user_id,
                filters=filters,
                limit=limit,
                offset=offset,
            )

            total = self._repo.count_workflows(user_id)
            workflows = [
                self._convert_db_row_to_response(row) for row in rows
            ]

            return WorkflowListResponse(
                workflows=workflows,
                total=total,
            )
        except Exception as e:
            raise SupabaseError(
                message="Failed to list workflows",
                operation="list_workflows",
                original_error=e
            ) from e

    def get_workflow(
        self, workflow_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[WorkflowResponse]:
        """Get workflow by ID."""
        try:
            workflow = self._repo.get_workflow_by_id(workflow_id, user_id)
            if not workflow:
                return None

            return self._convert_db_row_to_response(workflow)
        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve workflow",
                operation="get_workflow_by_id",
                original_error=e
            ) from e

    def create_workflow(
        self,
        user_id: UUID,
        request: WorkflowCreateRequest,
    ) -> WorkflowResponse:
        """Create workflow."""
        try:
            # Validate workflow structure
            errors = self._validate_workflow_structure(request.workflow_data)
            if errors:
                raise WorkflowValidationError(
                    f"Workflow validation failed: {', '.join(errors)}"
                )

            # Check name uniqueness (case-insensitive)
            user_workflows = self._repo.list_workflows(
                user_id=user_id,
                filters={},
                limit=1000,
                offset=0,
            )
            for workflow in user_workflows:
                if workflow.get("name", "").lower() == request.name.lower():
                    raise ValueError(
                        f"Workflow name already exists: {request.name}"
                    )

            data = {
                "user_id": str(user_id),
                "name": request.name,
                "description": request.description,
                "category": request.category.value,
                "workflow_data": request.workflow_data or {},
                "is_active": request.is_active,
                "is_public": request.is_public,
                "is_template": request.is_template,
                "version": "1.0.0",
                "usage_count": 0,
            }

            row = self._repo.insert_workflow(data)
            return self._convert_db_row_to_response(row)
        except (ValueError, WorkflowValidationError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Failed to create workflow",
                operation="insert_workflow",
                original_error=e
            ) from e

    def update_workflow(
        self,
        workflow_id: UUID,
        user_id: UUID,
        request: WorkflowUpdateRequest,
    ) -> Optional[WorkflowResponse]:
        """Update workflow."""
        try:
            # Check workflow exists and user has access
            workflow = self._repo.get_workflow_by_id(workflow_id, user_id)
            if not workflow:
                return None

            update: Dict[str, Any] = {}

            if request.name is not None:
                # Check name uniqueness if changing
                workflow_name = workflow.get("name", "")
                if request.name.lower() != workflow_name.lower():
                    user_workflows = self._repo.list_workflows(
                        user_id=user_id,
                        filters={},
                        limit=1000,
                        offset=0,
                    )
                    for w in user_workflows:
                        if (
                            str(w["id"]) != str(workflow_id)
                            and w.get("name", "").lower()
                            == request.name.lower()
                        ):
                            raise ValueError(
                                f"Workflow name already exists: "
                                f"{request.name}"
                            )
                update["name"] = request.name

            if request.description is not None:
                update["description"] = request.description
            if request.category is not None:
                update["category"] = request.category.value
            if request.workflow_data is not None:
                # Validate workflow structure if updating
                errors = self._validate_workflow_structure(
                    request.workflow_data
                )
                if errors:
                    raise WorkflowValidationError(
                        f"Workflow validation failed: "
                        f"{', '.join(errors)}"
                    )
                update["workflow_data"] = request.workflow_data
            if request.is_active is not None:
                update["is_active"] = request.is_active
            if request.is_public is not None:
                update["is_public"] = request.is_public
            if request.is_template is not None:
                update["is_template"] = request.is_template

            if not update:
                # No changes, just return existing
                return self.get_workflow(workflow_id, user_id)

            row = self._repo.update_workflow(workflow_id, user_id, update)
            if not row:
                return None
            return self._convert_db_row_to_response(row)
        except (ValueError, WorkflowValidationError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Failed to update workflow",
                operation="update_workflow",
                original_error=e
            ) from e

    def delete_workflow(
        self, workflow_id: UUID, user_id: UUID
    ) -> bool:
        """Delete workflow (soft delete)."""
        try:
            row = self._repo.delete_workflow(workflow_id, user_id)
            return row is not None
        except Exception as e:
            raise SupabaseError(
                message="Failed to delete workflow",
                operation="delete_workflow",
                original_error=e
            ) from e

    def execute_workflow(
        self,
        workflow_id: UUID,
        user_id: UUID,
        request: WorkflowExecutionCreateRequest,
    ) -> WorkflowExecutionResponse:
        """Execute workflow (creates execution record)."""
        try:
            # Get workflow
            workflow = self._repo.get_workflow_by_id(workflow_id, user_id)
            if not workflow:
                raise ValueError(f"Workflow not found: {workflow_id}")

            if not workflow.get("is_active", True):
                raise ValueError("Workflow is not active")

            # Create execution record
            execution_data = {
                "workflow_id": str(workflow_id),
                "user_id": str(user_id),
                "triggered_by": str(user_id),
                "status": "pending",
                "execution_data": request.execution_data or {},
            }

            row = self._repo.insert_execution(execution_data)
            execution_id = UUID(row["id"])

            # Increment usage count
            self._repo.increment_usage_count(workflow_id)

            # Trigger background workflow execution (Celery task)
            try:
                from tasks.workflow_tasks import execute_workflow_task
                execution_id_str = str(execution_id)
                execute_workflow_task.delay(
                    execution_id_str,
                    str(workflow_id),
                    str(user_id),
                    request.execution_data or {},
                )
            except Exception as e:
                # Log error but don't fail execution record creation
                # Execution will remain in 'pending' status and can be processed manually
                import logging
                logger = logging.getLogger(__name__)
                logger.error(
                    f"Failed to trigger workflow execution task for execution {execution_id}: {e}"
                )

            return self._convert_execution_row_to_response(row)
        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Failed to execute workflow",
                operation="execute_workflow",
                original_error=e
            ) from e

    def get_execution(
        self, execution_id: UUID, user_id: UUID
    ) -> Optional[WorkflowExecutionResponse]:
        """Get execution by ID."""
        try:
            execution = self._repo.get_execution_by_id(execution_id, user_id)
            if not execution:
                return None

            return self._convert_execution_row_to_response(execution)
        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve execution",
                operation="get_execution_by_id",
                original_error=e
            ) from e

    def list_executions(
        self,
        workflow_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> WorkflowExecutionListResponse:
        """List executions with filters."""
        try:
            rows = self._repo.list_executions(
                workflow_id=workflow_id,
                user_id=user_id,
                status=status,
                limit=limit,
                offset=offset,
            )

            executions = [
                self._convert_execution_row_to_response(row) for row in rows
            ]

            # Note: Total count would require a count method
            # For now, use length of results as approximation
            total = len(executions)

            return WorkflowExecutionListResponse(
                executions=executions,
                total=total,
            )
        except Exception as e:
            raise SupabaseError(
                message="Failed to list executions",
                operation="list_executions",
                original_error=e
            ) from e

    def get_execution_logs(
        self,
        execution_id: UUID,
        user_id: UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> WorkflowExecutionLogsResponse:
        """Get logs for an execution."""
        try:
            # Verify execution belongs to user
            execution = self._repo.get_execution_by_id(execution_id, user_id)
            if not execution:
                raise ValueError(f"Execution not found: {execution_id}")

            rows = self._repo.get_execution_logs(
                execution_id=execution_id,
                limit=limit,
                offset=offset,
            )

            logs = []
            for row in rows:
                status_str = row.get("status", "pending")
                try:
                    status = WorkflowExecutionLogStatus(status_str)
                except ValueError:
                    status = WorkflowExecutionLogStatus.pending

                logs.append(WorkflowExecutionLogResponse(
                    id=str(row["id"]),
                    execution_id=str(row["execution_id"]),
                    node_id=str(row["node_id"]),
                    node_type=str(row["node_type"]),
                    status=status,
                    input_data=row.get("input_data"),
                    output_data=row.get("output_data"),
                    started_at=row.get("started_at"),
                    completed_at=row.get("completed_at"),
                    error_message=row.get("error_message"),
                    created_at=row.get("created_at", utcnow_iso()),
                ))

            return WorkflowExecutionLogsResponse(
                logs=logs,
                total=len(logs),
            )
        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Failed to get execution logs",
                operation="get_execution_logs",
                original_error=e
            ) from e
