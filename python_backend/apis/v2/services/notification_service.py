from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timezone

from supabase import Client  # type: ignore

from apis.v2.repositories.notifications_repository import (
    NotificationsRepository
)
from apis.v2.core.errors import SupabaseError, handle_supabase_error
from models.api_v2_models import (
    NotificationResponse,
    NotificationCreateRequest,
    NotificationUpdateRequest,
    NotificationListResponse,
    NotificationChannel,
)


def utcnow_iso() -> str:
    """Get current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class NotificationService:
    """Service layer for notifications."""

    def __init__(self, supabase: Client):
        self._repo = NotificationsRepository(supabase)
        self._db = supabase

    def _convert_db_row_to_response(
        self, row: Dict[str, Any]
    ) -> NotificationResponse:
        """Convert database row to NotificationResponse model."""
        read_at = row.get("read_at")
        created_at = row.get("created_at", utcnow_iso())

        return NotificationResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            channel=NotificationChannel(row.get("channel", "in_app")),
            type=row.get("type", ""),
            title=row.get("title", ""),
            message=row.get("message", ""),
            metadata=row.get("metadata", {}),
            read=row.get("read", False),
            read_at=datetime.fromisoformat(read_at.replace("Z", "+00:00"))
            if read_at
            else None,
            created_at=datetime.fromisoformat(
                created_at.replace("Z", "+00:00")
            ),
        )

    def list_notifications(
        self,
        user_id: UUID,
        read: Optional[bool] = None,
        channel: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> NotificationListResponse:
        """List notifications with filtering."""
        try:
            rows = self._repo.list_notifications(
                user_id=user_id,
                read=read,
                channel=channel,
                limit=limit,
                offset=offset,
            )

            total = self._repo.count_notifications(user_id)
            unread_count = self._repo.get_unread_count(user_id)

            notifications = [
                self._convert_db_row_to_response(row) for row in rows
            ]

            return NotificationListResponse(
                notifications=notifications,
                total=total,
                unread_count=unread_count,
            )
        except Exception as e:
            raise SupabaseError(
                message="Failed to list notifications",
                operation="list_notifications",
                original_error=e
            ) from e

    def get_notification(
        self, notification_id: UUID, user_id: UUID
    ) -> Optional[NotificationResponse]:
        """Get a notification by ID."""
        try:
            row = self._repo.get_notification_by_id(notification_id, user_id)
            if not row:
                return None
            return self._convert_db_row_to_response(row)
        except Exception as e:
            raise SupabaseError(
                message="Failed to get notification",
                operation="get_notification",
                original_error=e
            ) from e

    def create_notification(
        self, user_id: UUID, request: NotificationCreateRequest
    ) -> NotificationResponse:
        """Create a new notification."""
        try:
            data = {
                "user_id": str(user_id),
                "channel": request.channel.value,
                "type": request.type,
                "title": request.title,
                "message": request.message,
                "metadata": request.metadata or {},
                "read": False,
            }

            row = self._repo.insert_notification(data)
            return self._convert_db_row_to_response(row)
        except Exception as e:
            raise SupabaseError(
                message="Failed to create notification",
                operation="create_notification",
                original_error=e
            ) from e

    def update_notification(
        self,
        notification_id: UUID,
        user_id: UUID,
        request: NotificationUpdateRequest,
    ) -> Optional[NotificationResponse]:
        """Update a notification."""
        try:
            update: Dict[str, Any] = {}
            if request.read is not None:
                update["read"] = request.read

            if not update:
                # No changes, just return existing
                return self.get_notification(notification_id, user_id)

            row = self._repo.update_notification(
                notification_id, user_id, update
            )
            if not row:
                return None
            return self._convert_db_row_to_response(row)
        except Exception as e:
            raise SupabaseError(
                message="Failed to update notification",
                operation="update_notification",
                original_error=e
            ) from e

    def mark_as_read(
        self, notification_id: UUID, user_id: UUID
    ) -> Optional[NotificationResponse]:
        """Mark a notification as read."""
        try:
            row = self._repo.mark_as_read(notification_id, user_id)
            if not row:
                return None
            return self._convert_db_row_to_response(row)
        except Exception as e:
            raise SupabaseError(
                message="Failed to mark notification as read",
                operation="mark_as_read",
                original_error=e
            ) from e

    def mark_all_as_read(self, user_id: UUID) -> int:
        """Mark all notifications as read for a user."""
        try:
            return self._repo.mark_all_as_read(user_id)
        except Exception as e:
            raise SupabaseError(
                message="Failed to mark all notifications as read",
                operation="mark_all_as_read",
                original_error=e
            ) from e

    def get_unread_count(self, user_id: UUID) -> int:
        """Get unread notification count."""
        try:
            return self._repo.get_unread_count(user_id)
        except Exception as e:
            raise SupabaseError(
                message="Failed to get unread count",
                operation="get_unread_count",
                original_error=e
            ) from e
