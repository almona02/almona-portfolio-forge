"""Workflows API (v2)

Provides endpoints for workflow management: creation, listing, updates, deletion,
and execution. Priority 3: Workflow Builder Implementation.
"""
from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
)
from typing import Optional, Dict, Any
from uuid import UUID

from supabase import Client

from models.api_v2_models import (
    WorkflowResponse,
    WorkflowCategory,
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
    WorkflowListResponse,
    WorkflowExecutionResponse,
    WorkflowExecutionCreateRequest,
    WorkflowExecutionListResponse,
    WorkflowExecutionLogsResponse,
    WorkflowExecutionStatus,
)
from apis.v2.services.workflow_service import (
    WorkflowService,
    WorkflowValidationError,
)
from apis.v2.core.errors import (
    handle_supabase_error,
    create_error_context,
    COMMON_ERROR_RESPONSES,
)

# Dependency providers
from apis.v2.deps import get_supabase, get_current_user


def _user_uuid(current_user: Dict[str, Any]) -> UUID:
    """Extract UUID from user claims."""
    raw = current_user.get("id") or current_user.get("sub")
    return UUID(raw)


router = APIRouter(prefix="/workflows", tags=["Workflows"])


@router.get("/health")
async def workflows_health_check() -> Dict[str, str]:
    """Lightweight health check for the Workflows service."""
    return {"status": "healthy"}


def _service(supabase: Client) -> WorkflowService:
    return WorkflowService(supabase)


@router.get(
    "",
    response_model=WorkflowListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="List Workflows",
    description="""
    List workflows with filtering and pagination.

    **Filtering:**
    - Filter by category
    - Filter by is_active
    - Filter by is_template
    - Search in name and description
    - Shows public workflows + user's own workflows

    **Pagination:**
    - Default limit: 50, max: 100
    - Default offset: 0
    """,
)
async def list_workflows(
    category: Optional[WorkflowCategory] = Query(
        None, description="Filter by category"
    ),
    search: Optional[str] = Query(
        None, description="Search in name and description"
    ),
    is_active: Optional[bool] = Query(
        None, description="Filter by active status"
    ),
    is_template: Optional[bool] = Query(
        None, description="Filter by template status"
    ),
    limit: int = Query(50, ge=1, le=100, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List workflows."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.list_workflows(
            user_id=user_id,
            category=category.value if category else None,
            search=search,
            is_active=is_active,
            is_template=is_template,
            limit=limit,
            offset=offset,
        )
        return result
    except Exception as e:
        context = create_error_context(
            operation="list_workflows",
            user_id=str(user_id),
        )
        handle_supabase_error(e, context)
        raise


@router.get(
    "/{workflow_id}",
    response_model=WorkflowResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Workflow",
    description="Get a workflow by ID.",
)
async def get_workflow(
    workflow_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get workflow by ID."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.get_workflow(workflow_id, user_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found",
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            operation="get_workflow",
            user_id=str(user_id),
            workflow_id=str(workflow_id),
        )
        handle_supabase_error(e, context)
        raise


@router.post(
    "",
    response_model=WorkflowResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Create Workflow",
    description="Create a new workflow. Workflow structure will be validated.",
)
async def create_workflow(
    request: WorkflowCreateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create workflow."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.create_workflow(user_id, request)
        return result
    except (ValueError, WorkflowValidationError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        context = create_error_context(
            operation="create_workflow",
            user_id=str(user_id),
        )
        handle_supabase_error(e, context)
        raise


@router.put(
    "/{workflow_id}",
    response_model=WorkflowResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Update Workflow",
    description="Update a workflow. Workflow structure will be validated if workflow_data is updated.",
)
async def update_workflow(
    workflow_id: UUID,
    request: WorkflowUpdateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update workflow."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.update_workflow(workflow_id, user_id, request)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found",
            )
        return result
    except HTTPException:
        raise
    except (ValueError, WorkflowValidationError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        context = create_error_context(
            operation="update_workflow",
            user_id=str(user_id),
            workflow_id=str(workflow_id),
        )
        handle_supabase_error(e, context)
        raise


@router.delete(
    "/{workflow_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=COMMON_ERROR_RESPONSES,
    summary="Delete Workflow",
    description="Delete a workflow (soft delete).",
)
async def delete_workflow(
    workflow_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete workflow."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        success = service.delete_workflow(workflow_id, user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found",
            )
        return None
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            operation="delete_workflow",
            user_id=str(user_id),
            workflow_id=str(workflow_id),
        )
        handle_supabase_error(e, context)
        raise


@router.post(
    "/{workflow_id}/execute",
    response_model=WorkflowExecutionResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Execute Workflow",
    description="Execute a workflow. Creates an execution record.",
)
async def execute_workflow(
    workflow_id: UUID,
    request: WorkflowExecutionCreateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Execute workflow."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.execute_workflow(workflow_id, user_id, request)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        context = create_error_context(
            operation="execute_workflow",
            user_id=str(user_id),
            workflow_id=str(workflow_id),
        )
        handle_supabase_error(e, context)
        raise


@router.get(
    "/{workflow_id}/executions",
    response_model=WorkflowExecutionListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="List Workflow Executions",
    description="List executions for a workflow.",
)
async def list_workflow_executions(
    workflow_id: UUID,
    status_filter: Optional[WorkflowExecutionStatus] = Query(
        None, alias="status", description="Filter by execution status"
    ),
    limit: int = Query(50, ge=1, le=100, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List workflow executions."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.list_executions(
            workflow_id=workflow_id,
            user_id=user_id,
            status=status_filter.value if status_filter else None,
            limit=limit,
            offset=offset,
        )
        return result
    except Exception as e:
        context = create_error_context(
            operation="list_workflow_executions",
            user_id=str(user_id),
            workflow_id=str(workflow_id),
        )
        handle_supabase_error(e, context)
        raise


@router.get(
    "/executions/{execution_id}",
    response_model=WorkflowExecutionResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Workflow Execution",
    description="Get a workflow execution by ID.",
)
async def get_workflow_execution(
    execution_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get workflow execution by ID."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.get_execution(execution_id, user_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow execution not found",
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            operation="get_workflow_execution",
            user_id=str(user_id),
            execution_id=str(execution_id),
        )
        handle_supabase_error(e, context)
        raise


@router.get(
    "/executions/{execution_id}/logs",
    response_model=WorkflowExecutionLogsResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Workflow Execution Logs",
    description="Get execution logs for a workflow execution.",
)
async def get_workflow_execution_logs(
    execution_id: UUID,
    limit: int = Query(100, ge=1, le=500, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get workflow execution logs."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.get_execution_logs(
            execution_id=execution_id,
            user_id=user_id,
            limit=limit,
            offset=offset,
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        context = create_error_context(
            operation="get_workflow_execution_logs",
            user_id=str(user_id),
            execution_id=str(execution_id),
        )
        handle_supabase_error(e, context)
        raise
