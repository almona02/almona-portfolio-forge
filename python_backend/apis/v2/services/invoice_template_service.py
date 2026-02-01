from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import UUID
from datetime import datetime, timezone

from supabase import Client  # type: ignore

from apis.v2.repositories.invoice_templates_repository import (
    InvoiceTemplatesRepository
)
from apis.v2.core.errors import SupabaseError
from models.api_v2_models import (
    InvoiceTemplateResponse,
    QuoteInvoiceTemplateCategory,
    InvoiceTemplateCreateRequest,
    InvoiceTemplateUpdateRequest,
    InvoiceTemplateListResponse,
)


def utcnow_iso() -> str:
    """Get current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class InvoiceTemplateService:
    """Service layer for invoice templates."""

    def __init__(self, supabase: Client):
        self._repo = InvoiceTemplatesRepository(supabase)
        self._db = supabase

    def _convert_db_row_to_response(
        self, row: Dict[str, Any]
    ) -> InvoiceTemplateResponse:
        """Convert database row to InvoiceTemplateResponse model."""
        return InvoiceTemplateResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            name=row.get("name", ""),
            description=row.get("description"),
            category=QuoteInvoiceTemplateCategory(
                row.get("category", "custom")
            ),
            template_config=row.get("template_config", {}),
            is_public=row.get("is_public", False),
            is_default=row.get("is_default", False),
            version=row.get("version", "1.0.0"),
            usage_count=row.get("usage_count", 0),
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
    ) -> InvoiceTemplateListResponse:
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

            return InvoiceTemplateListResponse(
                templates=templates,
                total=total,
            )
        except Exception as e:
            raise SupabaseError(
                message="Failed to list invoice templates",
                operation="list_templates",
                original_error=e
            ) from e

    def get_template(
        self, template_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[InvoiceTemplateResponse]:
        """Get template by ID."""
        try:
            template = self._repo.get_template_by_id(template_id, user_id)
            if not template:
                return None

            return self._convert_db_row_to_response(template)
        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve invoice template",
                operation="get_template_by_id",
                original_error=e
            ) from e

    def create_template(
        self,
        user_id: UUID,
        request: InvoiceTemplateCreateRequest,
    ) -> InvoiceTemplateResponse:
        """Create invoice template."""
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

            data = {
                "user_id": str(user_id),
                "name": request.name,
                "description": request.description,
                "category": request.category.value,
                "template_config": request.template_config or {},
                "is_public": request.is_public,
                "is_default": request.is_default,
                "version": "1.0.0",
                "usage_count": 0,
            }

            row = self._repo.insert_template(data)
            return self._convert_db_row_to_response(row)
        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Failed to create invoice template",
                operation="insert_template",
                original_error=e
            ) from e

    def update_template(
        self,
        template_id: UUID,
        user_id: UUID,
        request: InvoiceTemplateUpdateRequest,
    ) -> Optional[InvoiceTemplateResponse]:
        """Update invoice template."""
        try:
            # Check template exists and user has access
            template = self._repo.get_template_by_id(template_id, user_id)
            if not template:
                return None

            update: Dict[str, Any] = {}

            if request.name is not None:
                # Check name uniqueness if changing
                template_name = template.get("name", "")
                if request.name.lower() != template_name.lower():
                    user_templates = self._repo.list_templates(
                        user_id=user_id,
                        filters={},
                        limit=1000,
                        offset=0,
                    )
                    for t in user_templates:
                        if (
                            str(t["id"]) != str(template_id)
                            and t.get("name", "").lower()
                            == request.name.lower()
                        ):
                            raise ValueError(
                                f"Template name already exists: "
                                f"{request.name}"
                            )
                update["name"] = request.name

            if request.description is not None:
                update["description"] = request.description
            if request.category is not None:
                update["category"] = request.category.value
            if request.template_config is not None:
                update["template_config"] = request.template_config
            if request.is_public is not None:
                update["is_public"] = request.is_public
            if request.is_default is not None:
                update["is_default"] = request.is_default

            if not update:
                # No changes, just return existing
                return self.get_template(template_id, user_id)

            row = self._repo.update_template(template_id, user_id, update)
            if not row:
                return None
            return self._convert_db_row_to_response(row)
        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Failed to update invoice template",
                operation="update_template",
                original_error=e
            ) from e

    def delete_template(
        self, template_id: UUID, user_id: UUID
    ) -> bool:
        """Delete invoice template (soft delete)."""
        try:
            row = self._repo.delete_template(template_id, user_id)
            return row is not None
        except Exception as e:
            raise SupabaseError(
                message="Failed to delete invoice template",
                operation="delete_template",
                original_error=e
            ) from e
