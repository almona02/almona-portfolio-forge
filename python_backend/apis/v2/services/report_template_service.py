from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import UUID
from datetime import datetime, timezone

from supabase import Client  # type: ignore

from apis.v2.repositories.report_templates_repository import (
    ReportTemplatesRepository
)
from apis.v2.core.errors import SupabaseError
from models.api_v2_models import (
    ReportTemplateResponse,
    ReportTemplateCategory,
    ReportTemplateCreateRequest,
    ReportTemplateUpdateRequest,
    ReportTemplateListResponse,
)


def utcnow_iso() -> str:
    """Get current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class ReportTemplateService:
    """Service layer for report templates."""

    def __init__(self, supabase: Client):
        self._repo = ReportTemplatesRepository(supabase)
        self._db = supabase

    def _convert_db_row_to_response(
        self, row: Dict[str, Any]
    ) -> ReportTemplateResponse:
        """Convert database row to ReportTemplateResponse model."""
        return ReportTemplateResponse(
            id=str(row["id"]),
            name=row.get("name", ""),
            description=row.get("description"),
            category=ReportTemplateCategory(row.get("category", "custom")),
            template_schema=row.get("template_schema", {}),
            version=row.get("version", "1.0.0"),
            is_public=row.get("is_public", False),
            usage_count=row.get("usage_count", 0),
            user_id=str(row["user_id"]),
            created_at=row.get("created_at", utcnow_iso()),
            updated_at=row.get("updated_at", utcnow_iso()),
        )

    def list_templates(
        self,
        user_id: Optional[UUID],
        category: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> ReportTemplateListResponse:
        """List templates with filtering."""
        try:
            filters: Dict[str, Any] = {}
            if category:
                filters["category"] = category
            if search:
                filters["search"] = search

            rows = self._repo.list_templates(
                user_id=user_id,
                filters=filters,
                limit=limit,
                offset=offset,
            )

            total = self._repo.count_templates(user_id)
            templates = [
                self._convert_db_row_to_response(row) for row in rows
            ]

            return ReportTemplateListResponse(
                templates=templates,
                total=total,
            )

        except Exception as e:
            raise SupabaseError(
                message="Failed to list report templates",
                operation="list_templates",
                original_error=e
            )

    def get_template(
        self, template_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[ReportTemplateResponse]:
        """Get template by ID."""
        try:
            template = self._repo.get_template_by_id(template_id, user_id)
            if not template:
                return None

            return self._convert_db_row_to_response(template)

        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve report template",
                operation="get_template_by_id",
                original_error=e
            )

    def create_template(
        self,
        user_id: UUID,
        request: ReportTemplateCreateRequest,
    ) -> ReportTemplateResponse:
        """Create report template."""
        try:
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

            template_data: Dict[str, Any] = {
                "name": request.name,
                "description": request.description,
                "category": request.category.value,
                "template_schema": request.template_schema,
                "version": "1.0.0",
                "is_public": request.is_public,
                "is_system": False,
                "usage_count": 0,
                "user_id": str(user_id),
                "created_at": utcnow_iso(),
                "updated_at": utcnow_iso(),
            }

            try:
                row = self._repo.insert_template(template_data)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to create report template",
                    operation="insert_template",
                    original_error=e
                )

            return self._convert_db_row_to_response(row)

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error creating report template",
                operation="create_template",
                original_error=e
            )

    def update_template(
        self,
        template_id: UUID,
        user_id: UUID,
        request: ReportTemplateUpdateRequest,
    ) -> Optional[ReportTemplateResponse]:
        """Update template metadata."""
        try:
            # Verify template exists and belongs to user
            template = self._repo.get_template_by_id(template_id, user_id)
            if not template:
                return None

            if template.get("user_id") != str(user_id):
                raise ValueError("Template belongs to different user")

            # System templates cannot be updated
            if template.get("is_system", False):
                raise ValueError("System templates cannot be updated")

            # Check name uniqueness if name is being changed
            template_name = template.get("name", "").lower()
            if request.name and request.name.lower() != template_name:
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

            update: Dict[str, Any] = {
                "updated_at": utcnow_iso(),
            }

            if request.name is not None:
                update["name"] = request.name
            if request.description is not None:
                update["description"] = request.description
            if request.category is not None:
                update["category"] = request.category.value
            if request.template_schema is not None:
                update["template_schema"] = request.template_schema
            if request.is_public is not None:
                update["is_public"] = request.is_public

            try:
                updated = self._repo.update_template_fields(
                    template_id, update
                )
            except Exception as e:
                raise SupabaseError(
                    message="Failed to update report template",
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
                message="Unexpected error updating report template",
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

            if template.get("user_id") != str(user_id):
                raise ValueError("Template belongs to different user")

            # System templates cannot be deleted
            if template.get("is_system", False):
                raise ValueError("System templates cannot be deleted")

            try:
                self._repo.delete_template(template_id)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to delete report template",
                    operation="delete_template",
                    original_error=e
                )

            return True

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error deleting report template",
                operation="delete_template",
                original_error=e
            )
