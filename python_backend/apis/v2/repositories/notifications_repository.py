from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timezone
from supabase import Client  # type: ignore


class NotificationsRepository:
    """Persistence layer for notifications."""

    def __init__(self, supabase: Client):
        self._db = supabase

    # Notification Creation
    def insert_notification(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new notification."""
        resp = self._db.table("notifications").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create notification")
        return rows[0]

    # Notification Retrieval
    def get_notification_by_id(
        self, notification_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Get a notification by ID."""
        # RLS policies handle user access control
        query = (
            self._db.table("notifications")
            .select("*")
            .eq("id", str(notification_id))
        )

        resp = query.execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            return None

        notification = rows[0]
        # Verify user_id matches (RLS should handle this)
        notification_user_id = notification.get("user_id")
        if user_id and notification_user_id != str(user_id):
            return None

        return notification

    def list_notifications(
        self,
        user_id: UUID,
        read: Optional[bool] = None,
        channel: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List notifications for a user with optional filters."""
        query = (
            self._db.table("notifications")
            .select("*")
            .eq("user_id", str(user_id))
        )

        if read is not None:
            query = query.eq("read", read)
        if channel:
            query = query.eq("channel", channel)

        query = (
            query.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        resp = query.execute()
        return getattr(resp, "data", []) or []

    def count_notifications(
        self, user_id: UUID, read: Optional[bool] = None
    ) -> int:
        """Count notifications for a user."""
        query = (
            self._db.table("notifications")
            .select("*", count="exact", head=True)
            .eq("user_id", str(user_id))
        )

        if read is not None:
            query = query.eq("read", read)

        resp = query.execute()
        return getattr(resp, "count", 0) or 0

    def get_unread_count(self, user_id: UUID) -> int:
        """Get unread notification count for a user."""
        return self.count_notifications(user_id, read=False)

    # Notification Updates
    def update_notification(
        self, notification_id: UUID, user_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update notification fields."""
        # Add updated timestamp if marking as read
        if update.get("read") is True and "read_at" not in update:
            update["read_at"] = datetime.now(timezone.utc).isoformat()

        resp = (
            self._db.table("notifications")
            .update(update)
            .eq("id", str(notification_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def mark_as_read(
        self, notification_id: UUID, user_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Mark a notification as read."""
        return self.update_notification(
            notification_id,
            user_id,
            {
                "read": True,
                "read_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    def mark_all_as_read(self, user_id: UUID) -> int:
        """Mark all notifications as read for a user."""
        read_at = datetime.now(timezone.utc).isoformat()
        resp = (
            self._db.table("notifications")
            .update({"read": True, "read_at": read_at})
            .eq("user_id", str(user_id))
            .eq("read", False)
            .execute()
        )
        # Return count of updated rows (Supabase doesn't return this easily)
        # So we'll count before updating
        count = self.get_unread_count(user_id)
        return count
