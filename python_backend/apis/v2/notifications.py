"""Notifications API (v2)

Provides endpoints for notification management: list, get, create, mark as read.
Notification Infrastructure Implementation.
"""
from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
)
from typing import Dict, Any, Optional
from uuid import UUID

from supabase import Client

from models.api_v2_models import (
    NotificationResponse,
    NotificationCreateRequest,
    NotificationUpdateRequest,
    NotificationListResponse,
    NotificationChannel,
)
from apis.v2.services.notification_service import NotificationService
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


router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/health")
async def notifications_health_check() -> Dict[str, str]:
    """Lightweight health check for the Notifications service."""
    return {"status": "healthy"}


def _service(supabase: Client) -> NotificationService:
    return NotificationService(supabase)


@router.get(
    "",
    response_model=NotificationListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="List Notifications",
    description="""
    List notifications for the current user with filtering and pagination.

    **Filtering:**
    - Filter by read/unread status
    - Filter by channel (email, in_app, push, sms)

    **Pagination:**
    - Default limit: 50, max: 100
    - Default offset: 0
    """,
)
async def list_notifications(
    read: Optional[bool] = Query(
        None, description="Filter by read status"
    ),
    channel: Optional[NotificationChannel] = Query(
        None, description="Filter by channel"
    ),
    limit: int = Query(50, ge=1, le=100, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List notifications."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.list_notifications(
            user_id=user_id,
            read=read,
            channel=channel.value if channel else None,
            limit=limit,
            offset=offset,
        )
        return result
    except Exception as e:
        context = create_error_context(
            operation="list_notifications",
            user_id=str(user_id),
        )
        handle_supabase_error(e, context)
        raise


@router.get(
    "/{notification_id}",
    response_model=NotificationResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Notification",
    description="Get a notification by ID.",
)
async def get_notification(
    notification_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get notification by ID."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.get_notification(notification_id, user_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            operation="get_notification",
            user_id=str(user_id),
            notification_id=str(notification_id),
        )
        handle_supabase_error(e, context)
        raise


@router.post(
    "",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Create Notification",
    description="Create a new notification.",
)
async def create_notification(
    request: NotificationCreateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create notification."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.create_notification(user_id, request)
        return result
    except Exception as e:
        context = create_error_context(
            operation="create_notification",
            user_id=str(user_id),
        )
        handle_supabase_error(e, context)
        raise


@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Mark Notification as Read",
    description="Mark a notification as read.",
)
async def mark_notification_as_read(
    notification_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Mark notification as read."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.mark_as_read(notification_id, user_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            operation="mark_notification_as_read",
            user_id=str(user_id),
            notification_id=str(notification_id),
        )
        handle_supabase_error(e, context)
        raise


@router.put(
    "/read-all",
    responses=COMMON_ERROR_RESPONSES,
    summary="Mark All Notifications as Read",
    description="Mark all notifications as read for the current user.",
)
async def mark_all_notifications_as_read(
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Mark all notifications as read."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        count = service.mark_all_as_read(user_id)
        return {"updated_count": count}
    except Exception as e:
        context = create_error_context(
            operation="mark_all_notifications_as_read",
            user_id=str(user_id),
        )
        handle_supabase_error(e, context)
        raise


@router.get(
    "/unread/count",
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Unread Count",
    description="Get the count of unread notifications for the current user.",
)
async def get_unread_count(
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get unread notification count."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        count = service.get_unread_count(user_id)
        return {"unread_count": count}
    except Exception as e:
        context = create_error_context(
            operation="get_unread_count",
            user_id=str(user_id),
        )
        handle_supabase_error(e, context)
        raise
