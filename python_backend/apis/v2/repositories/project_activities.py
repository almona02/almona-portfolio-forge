from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from supabase import Client  # type: ignore


class ProjectActivitiesRepository:
    """Persistence layer for project activities and comments."""

    def __init__(self, supabase: Client):
        self._db = supabase

    # Activity Creation
    def insert_activity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new project activity."""
        resp = self._db.table("project_activities").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create project activity")
        return rows[0]

    # Activity Retrieval
    def get_activity_by_id(
        self, activity_id: UUID, user_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get an activity by ID (user-scoped for RLS)."""
        resp = (
            self._db.table("project_activities")
            .select("*")
            .eq("id", str(activity_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def list_project_activities(
        self,
        project_id: UUID,
        user_id: UUID,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List activities for a project with optional filters."""
        query = (
            self._db.table("project_activities")
            .select("*")
            .eq("project_id", str(project_id))
            .eq("user_id", str(user_id))
        )

        if filters:
            if filters.get("activity_type"):
                query = query.eq("type", filters["activity_type"])
            if filters.get("user_id"):
                query = query.eq("user_id", filters["user_id"])
            if filters.get("date_from"):
                query = query.gte("created_at", filters["date_from"])
            if filters.get("date_to"):
                query = query.lte("created_at", filters["date_to"])

        resp = (
            query.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return getattr(resp, "data", []) or []

    def count_project_activities(
        self, project_id: UUID, user_id: UUID
    ) -> int:
        """Count total activities for a project."""
        resp = (
            self._db.table("project_activities")
            .select("id", count="exact")
            .eq("project_id", str(project_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        return getattr(resp, "count", 0) or 0

    # Activity Updates
    def update_activity_fields(
        self, activity_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update activity fields."""
        resp = (
            self._db.table("project_activities")
            .update(update)
            .eq("id", str(activity_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    # Comment Creation
    def insert_comment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new activity comment."""
        resp = self._db.table("activity_comments").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create activity comment")
        return rows[0]

    # Comment Retrieval
    def list_activity_comments(
        self, activity_id: UUID
    ) -> List[Dict[str, Any]]:
        """List comments for an activity."""
        resp = (
            self._db.table("activity_comments")
            .select("*")
            .eq("activity_id", str(activity_id))
            .order("created_at", desc=False)
            .execute()
        )
        return getattr(resp, "data", []) or []

    # Comment Updates
    def update_comment_fields(
        self, comment_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update comment fields."""
        resp = (
            self._db.table("activity_comments")
            .update(update)
            .eq("id", str(comment_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    # Comment Deletion (hard delete - schema doesn't have deleted_at)
    def delete_comment(self, comment_id: UUID) -> bool:
        """Delete a comment (hard delete)."""
        resp = (
            self._db.table("activity_comments")
            .delete()
            .eq("id", str(comment_id))
            .execute()
        )
        return True
