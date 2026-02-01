"""Project Activities API (v2)

Provides endpoints for project activity tracking, comments, and revert operations.
Phase 3 Enterprise Features Implementation.
"""
from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Request,
    Query,
)
from typing import Optional, Dict, Any
from uuid import UUID

from supabase import Client

from models.api_v2_models import (
    ActivityCreateRequest,
    ActivityCommentCreateRequest,
    ActivityCommentUpdateRequest,
    ActivityResponse,
    ActivityListResponse,
    ActivityCommentResponse,
    ActivityType,
)
from apis.v2.services.project_activity_service import (
    ProjectActivityService
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


router = APIRouter(
    prefix="/projects/{project_id}/activities",
    tags=["Project Activities"]
)


@router.get("/health")
async def project_activities_health_check() -> Dict[str, str]:
    """Lightweight health check for the Project Activities service."""
    return {"status": "healthy"}


def _service(supabase: Client) -> ProjectActivityService:
    return ProjectActivityService(supabase)


@router.get(
    "",
    response_model=ActivityListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="List Project Activities",
    description="""
    List activities for a project with filtering and pagination.

    **Filtering:**
    - Filter by activity type
    - Filter by user ID (who made the change)
    - Filter by date range (from/to)
    - Search in descriptions (future enhancement)

    **Pagination:**
    - Default limit: 100, max: 500
    - Results sorted by createdAt descending (newest first)
    """
)
def list_project_activities(
    request: Request,
    project_id: UUID,
    type: Optional[ActivityType] = Query(
        None, description="Filter by activity type"
    ),
    userId: Optional[UUID] = Query(
        None, description="Filter by user ID"
    ),
    from_date: Optional[str] = Query(
        None, alias="from", description="Start date (ISO 8601)"
    ),
    to_date: Optional[str] = Query(
        None, alias="to", description="End date (ISO 8601)"
    ),
    limit: int = Query(100, ge=1, le=500, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List project activities."""
    try:
        svc = _service(supabase)
        return svc.list_activities(
            project_id=project_id,
            user_id=_user_uuid(current_user),
            activity_type=type.value if type else None,
            user_filter=str(userId) if userId else None,
            date_from=from_date,
            date_to=to_date,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="list_project_activities",
        )
        raise handle_supabase_error(e, "list_activities", context)


@router.get(
    "/{activity_id}",
    response_model=ActivityResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Activity Details",
    description="""
    Get detailed information about a specific activity, including comments.

    **Response includes:**
    - Full activity details and metadata
    - All comments for this activity
    - Revert capability flag
    - User information (name, avatar)
    """
)
def get_activity(
    request: Request,
    project_id: UUID,
    activity_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get activity details."""
    try:
        svc = _service(supabase)
        activity = svc.get_activity(
            project_id=project_id,
            activity_id=activity_id,
            user_id=_user_uuid(current_user),
        )
        if not activity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Activity not found"
            )
        return activity
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_activity",
        )
        raise handle_supabase_error(e, "get_activity", context)


@router.post(
    "",
    response_model=ActivityResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Create Activity",
    description="""
    Create a new activity record for a project.

    **Use Cases:**
    - Track field changes
    - Track status changes
    - Track file uploads
    - Track custom events

    **Metadata:**
    - Store activity-specific data as JSONB
    - For field changes: include fieldName, oldValue, newValue
    - For file uploads: include fileName, fileSize, fileUrl
    """
)
def create_activity(
    request: Request,
    project_id: UUID,
    payload: ActivityCreateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new activity."""
    try:
        svc = _service(supabase)
        return svc.create_activity(
            project_id=project_id,
            user_id=_user_uuid(current_user),
            request=payload,
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="create_activity",
        )
        raise handle_supabase_error(e, "create_activity", context)


@router.post(
    "/{activity_id}/comments",
    response_model=ActivityCommentResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Add Comment to Activity",
    description="""
    Add a comment to an activity.

    **Validation:**
    - Comment text: 1-5000 characters
    - Activity must exist and be accessible
    - User must have access to the project
    """
)
def add_comment(
    request: Request,
    project_id: UUID,
    activity_id: UUID,
    payload: ActivityCommentCreateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Add a comment to an activity."""
    try:
        svc = _service(supabase)
        return svc.add_comment(
            project_id=project_id,
            activity_id=activity_id,
            user_id=_user_uuid(current_user),
            request=payload,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="add_comment",
        )
        raise handle_supabase_error(e, "add_comment", context)


@router.put(
    "/{activity_id}/comments/{comment_id}",
    response_model=ActivityCommentResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Update Comment",
    description="""
    Update a comment on an activity.

    **Permissions:**
    - User can only update their own comments
    - Comment must belong to the specified activity
    """
)
def update_comment(
    request: Request,
    project_id: UUID,
    activity_id: UUID,
    comment_id: UUID,
    payload: ActivityCommentUpdateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update a comment."""
    try:
        svc = _service(supabase)
        comment = svc.update_comment(
            project_id=project_id,
            activity_id=activity_id,
            comment_id=comment_id,
            user_id=_user_uuid(current_user),
            request=payload,
        )
        if not comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        return comment
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="update_comment",
        )
        raise handle_supabase_error(e, "update_comment", context)


@router.delete(
    "/{activity_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=COMMON_ERROR_RESPONSES,
    summary="Delete Comment",
    description="""
    Delete a comment from an activity.

    **Permissions:**
    - User can only delete their own comments
    - Comment must belong to the specified activity
    """
)
def delete_comment(
    request: Request,
    project_id: UUID,
    activity_id: UUID,
    comment_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete a comment."""
    try:
        svc = _service(supabase)
        success = svc.delete_comment(
            project_id=project_id,
            activity_id=activity_id,
            comment_id=comment_id,
            user_id=_user_uuid(current_user),
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found"
            )
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="delete_comment",
        )
        raise handle_supabase_error(e, "delete_comment", context)
