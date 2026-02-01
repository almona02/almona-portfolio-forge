from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timezone
import base64
import re

from supabase import Client  # type: ignore

from apis.v2.repositories.project_templates import (
    ProjectTemplatesRepository
)
from apis.v2.core.errors import SupabaseError
from models.api_v2_models import (
    TemplateResponse,
    TemplateCategory,
    TemplateCreateRequest,
    TemplateUpdateRequest,
    TemplateCloneRequest,
    TemplateCloneResponse,
    TemplateListResponse,
)


def utcnow_iso() -> str:
    """Get current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _get_user_info(
    supabase: Client, user_id: UUID
) -> Dict[str, Optional[str]]:
    """Get user name from profiles table."""
    try:
        resp = (
            supabase.table("profiles")
            .select("id, full_name, name")
            .eq("id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        if rows:
            row = rows[0]
            return {
                "authorName": (
                    row.get("full_name") or row.get("name") or None
                ),
            }
    except Exception:
        pass
    return {"authorName": None}


def _get_project_data(
    supabase: Client, project_id: UUID, user_id: UUID
) -> Optional[Dict[str, Any]]:
    """Get project data by ID (user-scoped)."""
    try:
        # Note: This assumes a projects table exists
        # For now, return None if table doesn't exist
        resp = (
            supabase.table("projects")
            .select("*")
            .eq("id", str(project_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None
    except Exception:
        # Table might not exist yet, return None
        return None


def _process_thumbnail_base64(
    thumbnail_base64: Optional[str],
) -> Optional[str]:
    """Process base64 thumbnail and return URL (placeholder)."""
    if not thumbnail_base64:
        return None

    # Extract data URL format: data:image/jpeg;base64,<data>
    match = re.match(r"data:image/(\w+);base64,(.+)", thumbnail_base64)
    if not match:
        # Assume it's raw base64
        image_data = thumbnail_base64
    else:
        image_data = match.group(2)

    try:
        # Decode to verify it's valid base64
        base64.b64decode(image_data)
        # TODO: Upload to Supabase Storage and return URL
        # For now, return placeholder
        return "https://storage.example.com/templates/thumbnail.jpg"
    except Exception:
        return None


class ProjectTemplateService:
    """Service layer for project templates."""

    def __init__(self, supabase: Client):
        self._repo = ProjectTemplatesRepository(supabase)
        self._db = supabase

    def _convert_db_row_to_response(
        self, row: Dict[str, Any]
    ) -> TemplateResponse:
        """Convert database row to TemplateResponse model."""
        author_id = UUID(row["author_id"]) if row.get("author_id") else None
        user_info = _get_user_info(self._db, author_id) if author_id else {
            "authorName": None
        }

        return TemplateResponse(
            id=str(row["id"]),
            name=row.get("name", ""),
            description=row.get("description"),
            category=TemplateCategory(row.get("category", "custom")),
            tags=row.get("tags", []) or [],
            thumbnail=row.get("thumbnail"),
            projectData=row.get("project_data", {}),
            authorId=str(row["author_id"]),
            authorName=user_info.get("authorName"),
            createdAt=row.get("created_at", utcnow_iso()),
            updatedAt=row.get("updated_at", utcnow_iso()),
            usageCount=row.get("usage_count", 0),
            isPublic=row.get("is_public", False),
        )

    def list_templates(
        self,
        user_id: Optional[UUID],
        category: Optional[str] = None,
        search: Optional[str] = None,
        tags: Optional[List[str]] = None,
        include_public: bool = True,
        limit: int = 50,
        offset: int = 0,
    ) -> TemplateListResponse:
        """List templates with filtering."""
        try:
            filters: Dict[str, Any] = {}
            if category:
                filters["category"] = category
            if search:
                filters["search"] = search
            if tags:
                filters["tags"] = tags

            rows = self._repo.list_templates(
                user_id=user_id,
                filters=filters,
                limit=limit,
                offset=offset,
            )

            # Apply tag filtering (AND logic)
            if tags:
                filtered_rows = []
                for row in rows:
                    template_tags = row.get("tags", []) or []
                    if all(tag in template_tags for tag in tags):
                        filtered_rows.append(row)
                rows = filtered_rows

            total = self._repo.count_templates(user_id)
            templates = [
                self._convert_db_row_to_response(row) for row in rows
            ]

            return TemplateListResponse(
                templates=templates,
                total=total,
                limit=limit,
                offset=offset,
            )

        except Exception as e:
            raise SupabaseError(
                message="Failed to list templates",
                operation="list_templates",
                original_error=e
            )

    def get_template(
        self, template_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[TemplateResponse]:
        """Get template by ID."""
        try:
            template = self._repo.get_template_by_id(template_id, user_id)
            if not template:
                return None

            return self._convert_db_row_to_response(template)

        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve template",
                operation="get_template_by_id",
                original_error=e
            )

    def create_template(
        self,
        user_id: UUID,
        request: TemplateCreateRequest,
    ) -> TemplateResponse:
        """Create template from project."""
        try:
            # Validate project exists and user has access
            project_data = _get_project_data(
                self._db, UUID(request.projectId), user_id
            )
            if not project_data:
                raise ValueError(
                    f"Project not found or access denied: {request.projectId}"
                )

            # Check name uniqueness (case-insensitive)
            user_templates = self._repo.list_templates(
                user_id=user_id,
                filters={},
                limit=1000,
                offset=0,
            )
            for template in user_templates:
                if template.get("name", "").lower() == request.name.lower():
                    raise ValueError(
                        f"Template name already exists: {request.name}"
                    )

            # Process thumbnail if provided
            thumbnail_url = _process_thumbnail_base64(request.thumbnail)

            # Extract project data (full structure)
            template_data: Dict[str, Any] = {
                "name": request.name,
                "description": request.description,
                "category": request.category.value,
                "tags": request.tags or [],
                "thumbnail": thumbnail_url,
                "project_data": project_data,  # Store full project structure
                "author_id": str(user_id),
                "usage_count": 0,
                "is_public": False,
                "is_system": False,
                "created_at": utcnow_iso(),
                "updated_at": utcnow_iso(),
            }

            try:
                row = self._repo.insert_template(template_data)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to create template",
                    operation="insert_template",
                    original_error=e
                )

            return self._convert_db_row_to_response(row)

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error creating template",
                operation="create_template",
                original_error=e
            )

    def update_template(
        self,
        template_id: UUID,
        user_id: UUID,
        request: TemplateUpdateRequest,
    ) -> Optional[TemplateResponse]:
        """Update template metadata."""
        try:
            # Verify template exists and belongs to user
            template = self._repo.get_template_by_id(template_id, user_id)
            if not template:
                return None

            if template.get("author_id") != str(user_id):
                raise ValueError("Template belongs to different user")

            # Check name uniqueness if name is being changed
            if request.name and request.name.lower() != template.get("name", "").lower():
                user_templates = self._repo.list_templates(
                    user_id=user_id,
                    filters={},
                    limit=1000,
                    offset=0,
                )
                for t in user_templates:
                    if (t.get("id") != str(template_id) and
                            t.get("name", "").lower() == request.name.lower()):
                        raise ValueError(
                            f"Template name already exists: {request.name}"
                        )

            # Process thumbnail if provided
            thumbnail_url = template.get("thumbnail")
            if request.thumbnail is not None:
                thumbnail_url = _process_thumbnail_base64(request.thumbnail)

            update: Dict[str, Any] = {
                "updated_at": utcnow_iso(),
            }

            if request.name is not None:
                update["name"] = request.name
            if request.description is not None:
                update["description"] = request.description
            if request.category is not None:
                update["category"] = request.category.value
            if request.tags is not None:
                update["tags"] = request.tags
            if thumbnail_url is not None:
                update["thumbnail"] = thumbnail_url

            try:
                updated = self._repo.update_template_fields(
                    template_id, update
                )
            except Exception as e:
                raise SupabaseError(
                    message="Failed to update template",
                    operation="update_template_fields",
                    original_error=e
                )

            return (
                self._convert_db_row_to_response(updated)
                if updated
                else None
            )

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error updating template",
                operation="update_template",
                original_error=e
            )

    def delete_template(
        self, template_id: UUID, user_id: UUID
    ) -> bool:
        """Delete a template (soft delete)."""
        try:
            # Verify template exists and belongs to user
            template = self._repo.get_template_by_id(template_id, user_id)
            if not template:
                raise ValueError("Template not found")

            if template.get("author_id") != str(user_id):
                raise ValueError("Template belongs to different user")

            # System templates cannot be deleted
            if template.get("is_system", False):
                raise ValueError("System templates cannot be deleted")

            try:
                self._repo.delete_template(template_id)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to delete template",
                    operation="delete_template",
                    original_error=e
                )

            return True

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error deleting template",
                operation="delete_template",
                original_error=e
            )

    def clone_template(
        self,
        template_id: UUID,
        user_id: UUID,
        request: TemplateCloneRequest,
    ) -> TemplateCloneResponse:
        """Clone template to create a new project."""
        try:
            # Get template
            template = self._repo.get_template_by_id(template_id, user_id)
            if not template:
                raise ValueError("Template not found or access denied")

            # Increment usage count
            self._repo.increment_usage_count(template_id)

            # TODO: Create project in projects table
            # 1. Create new project record
            # 2. Copy template.project_data structure
            # 3. Set project name/description from request
            # 4. Return new project ID
            # For now, generate placeholder UUID
            from uuid import uuid4
            new_project_id = str(uuid4())

            return TemplateCloneResponse(
                projectId=new_project_id,
                templateId=str(template_id),
                projectName=request.projectName,
                createdAt=utcnow_iso(),
            )

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error cloning template",
                operation="clone_template",
                original_error=e
            )
