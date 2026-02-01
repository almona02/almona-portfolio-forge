from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timezone

from supabase import Client  # type: ignore

from apis.v2.repositories.project_activities import (
    ProjectActivitiesRepository
)
from apis.v2.core.errors import SupabaseError
from models.api_v2_models import (
    ActivityResponse,
    ActivityType,
    ActivityCommentResponse,
    ActivityCreateRequest,
    ActivityCommentCreateRequest,
    ActivityCommentUpdateRequest,
    ActivityListResponse,
)


def utcnow_iso() -> str:
    """Get current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _get_user_info(
    supabase: Client, user_id: UUID
) -> Dict[str, Optional[str]]:
    """Get user name and avatar from profiles table."""
    try:
        # Try common column name variations
        resp = (
            supabase.table("profiles")
            .select("id, full_name, name, avatar_url, avatar")
            .eq("id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        if rows:
            row = rows[0]
            return {
                "userName": (
                    row.get("full_name") or
                    row.get("name") or
                    None
                ),
                "userAvatar": (
                    row.get("avatar_url") or
                    row.get("avatar") or
                    None
                ),
            }
    except Exception:
        pass
    return {"userName": None, "userAvatar": None}


class ProjectActivityService:
    """Service layer for project activities."""

    def __init__(self, supabase: Client):
        self._repo = ProjectActivitiesRepository(supabase)
        self._db = supabase

    def _convert_comment_row_to_response(
        self, row: Dict[str, Any]
    ) -> ActivityCommentResponse:
        """Convert comment database row to response model."""
        user_info = _get_user_info(self._db, UUID(row["user_id"]))
        return ActivityCommentResponse(
            id=str(row["id"]),
            activityId=str(row["activity_id"]),
            authorId=str(row["user_id"]),
            authorName=user_info.get("userName"),
            authorAvatar=user_info.get("userAvatar"),
            content=row.get("text", ""),  # DB column is 'text'
            createdAt=row.get("created_at", utcnow_iso()),
            updatedAt=None,  # Schema doesn't have updated_at
            deletedAt=None,  # Schema doesn't have deleted_at
        )

    def _convert_activity_row_to_response(
        self, row: Dict[str, Any], include_comments: bool = False
    ) -> ActivityResponse:
        """Convert activity database row to response model."""
        user_id = UUID(row["user_id"]) if row.get("user_id") else None
        user_info = _get_user_info(self._db, user_id) if user_id else {
            "userName": None, "userAvatar": None
        }

        # Determine revertibility (field_changed, status_changed are revertible)
        activity_type = row.get("type", "")
        is_revertible = activity_type in [
            "field_changed", "status_changed"
        ]
        revert_data = None
        if is_revertible and row.get("metadata"):
            metadata = row.get("metadata", {})
            revert_data = {
                "fieldName": metadata.get("fieldName"),
                "oldValue": metadata.get("oldValue"),
            }

        comments = []
        if include_comments:
            comment_rows = self._repo.list_activity_comments(
                UUID(row["id"])
            )
            comments = [
                self._convert_comment_row_to_response(cr)
                for cr in comment_rows
            ]

        return ActivityResponse(
            id=str(row["id"]),
            projectId=str(row["project_id"]),
            activityType=ActivityType(row.get("type", "updated")),
            userId=str(row["user_id"]) if row.get("user_id") else "",
            userName=user_info.get("userName"),
            userAvatar=user_info.get("userAvatar"),
            title=row.get("title"),
            description=row.get("description"),
            metadata=row.get("metadata", {}),
            createdAt=row.get("created_at", utcnow_iso()),
            comments=comments,
            isRevertible=is_revertible,
            revertData=revert_data,
        )

    def create_activity(
        self,
        project_id: UUID,
        user_id: UUID,
        request: ActivityCreateRequest,
    ) -> ActivityResponse:
        """Create a new activity."""
        try:
            activity_data: Dict[str, Any] = {
                "project_id": str(project_id),
                "type": request.activityType.value,
                "user_id": str(user_id),
                "title": request.title or "",
                "description": request.description,
                "metadata": request.metadata,
                "created_at": utcnow_iso(),
            }

            try:
                row = self._repo.insert_activity(activity_data)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to create activity",
                    operation="insert_activity",
                    original_error=e
                )

            return self._convert_activity_row_to_response(row)

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error creating activity",
                operation="create_activity",
                original_error=e
            )

    def list_activities(
        self,
        project_id: UUID,
        user_id: UUID,
        activity_type: Optional[str] = None,
        user_filter: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> ActivityListResponse:
        """List activities for a project."""
        try:
            filters: Dict[str, Any] = {}
            if activity_type:
                filters["activity_type"] = activity_type
            if user_filter:
                filters["user_id"] = user_filter
            if date_from:
                filters["date_from"] = date_from
            if date_to:
                filters["date_to"] = date_to

            rows = self._repo.list_project_activities(
                project_id=project_id,
                user_id=user_id,
                filters=filters,
                limit=limit,
                offset=offset,
            )

            total = self._repo.count_project_activities(project_id, user_id)
            activities = [
                self._convert_activity_row_to_response(row)
                for row in rows
            ]

            return ActivityListResponse(
                activities=activities,
                total=total,
                limit=limit,
                offset=offset,
            )

        except Exception as e:
            raise SupabaseError(
                message="Failed to list activities",
                operation="list_project_activities",
                original_error=e
            )

    def get_activity(
        self, project_id: UUID, activity_id: UUID, user_id: UUID
    ) -> Optional[ActivityResponse]:
        """Get activity by ID."""
        try:
            activity = self._repo.get_activity_by_id(activity_id, user_id)
            if not activity:
                return None

            # Verify it belongs to the project
            if activity.get("project_id") != str(project_id):
                return None

            return self._convert_activity_row_to_response(
                activity, include_comments=True
            )

        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve activity",
                operation="get_activity_by_id",
                original_error=e
            )

    def add_comment(
        self,
        project_id: UUID,
        activity_id: UUID,
        user_id: UUID,
        request: ActivityCommentCreateRequest,
    ) -> ActivityCommentResponse:
        """Add a comment to an activity."""
        try:
            # Verify activity exists and belongs to project
            activity = self._repo.get_activity_by_id(activity_id, user_id)
            if not activity or activity.get("project_id") != str(project_id):
                raise ValueError("Activity not found")

            comment_data: Dict[str, Any] = {
                "activity_id": str(activity_id),
                "user_id": str(user_id),
                "text": request.content,
                "created_at": utcnow_iso(),
            }

            try:
                row = self._repo.insert_comment(comment_data)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to create comment",
                    operation="insert_comment",
                    original_error=e
                )

            return self._convert_comment_row_to_response(row)

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error adding comment",
                operation="add_comment",
                original_error=e
            )

    def update_comment(
        self,
        project_id: UUID,
        activity_id: UUID,
        comment_id: UUID,
        user_id: UUID,
        request: ActivityCommentUpdateRequest,
    ) -> Optional[ActivityCommentResponse]:
        """Update a comment."""
        try:
            # Verify activity belongs to project
            activity = self._repo.get_activity_by_id(activity_id, user_id)
            if not activity or activity.get("project_id") != str(project_id):
                raise ValueError("Activity not found")

            # Get comment to verify ownership
            comments = self._repo.list_activity_comments(activity_id)
            comment = next(
                (c for c in comments if c.get("id") == str(comment_id)), None
            )
            if not comment:
                raise ValueError("Comment not found")
            if comment.get("user_id") != str(user_id):
                raise ValueError("Comment belongs to different user")

            update: Dict[str, Any] = {
                "text": request.content,
            }

            try:
                updated = self._repo.update_comment_fields(
                    comment_id, update
                )
            except Exception as e:
                raise SupabaseError(
                    message="Failed to update comment",
                    operation="update_comment_fields",
                    original_error=e
                )

            return (
                self._convert_comment_row_to_response(updated)
                if updated
                else None
            )

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error updating comment",
                operation="update_comment",
                original_error=e
            )

    def delete_comment(
        self,
        project_id: UUID,
        activity_id: UUID,
        comment_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Delete a comment."""
        try:
            # Verify activity belongs to project
            activity = self._repo.get_activity_by_id(activity_id, user_id)
            if not activity or activity.get("project_id") != str(project_id):
                raise ValueError("Activity not found")

            # Get comment to verify ownership
            comments = self._repo.list_activity_comments(activity_id)
            comment = next(
                (c for c in comments if c.get("id") == str(comment_id)), None
            )
            if not comment:
                raise ValueError("Comment not found")
            if comment.get("user_id") != str(user_id):
                raise ValueError("Comment belongs to different user")

            try:
                self._repo.delete_comment(comment_id)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to delete comment",
                    operation="delete_comment",
                    original_error=e
                )

            return True

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error deleting comment",
                operation="delete_comment",
                original_error=e
            )
