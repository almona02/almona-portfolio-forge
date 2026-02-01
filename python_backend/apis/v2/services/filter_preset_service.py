from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import UUID
from datetime import datetime, timezone

from supabase import Client  # type: ignore

from apis.v2.repositories.filter_presets import FilterPresetsRepository
from apis.v2.core.errors import SupabaseError
from models.api_v2_models import (
    FilterPresetResponse,
    FilterDomain,
    FilterPresetCreateRequest,
    FilterPresetUpdateRequest,
    FilterPresetListResponse,
)


def utcnow_iso() -> str:
    """Get current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class FilterPresetService:
    """Service layer for filter presets."""

    def __init__(self, supabase: Client):
        self._repo = FilterPresetsRepository(supabase)

    def _convert_db_row_to_response(
        self, row: Dict[str, Any]
    ) -> FilterPresetResponse:
        """Convert database row to FilterPresetResponse model."""
        return FilterPresetResponse(
            id=str(row["id"]),
            userId=str(row["user_id"]),
            name=row.get("name", ""),
            domain=FilterDomain(row.get("domain", "projects")),
            filters=row.get("filters", {}),
            createdAt=row.get("created_at", utcnow_iso()),
            updatedAt=row.get("updated_at", utcnow_iso()),
        )

    def list_presets(
        self,
        user_id: UUID,
        domain: Optional[str] = None,
        limit: int = 100,
    ) -> FilterPresetListResponse:
        """List filter presets for a user."""
        try:
            rows = self._repo.list_user_presets(
                user_id=user_id,
                domain=domain,
                limit=limit,
            )
            presets = [
                self._convert_db_row_to_response(row) for row in rows
            ]
            return FilterPresetListResponse(
                presets=presets,
                total=len(presets),
            )

        except Exception as e:
            raise SupabaseError(
                message="Failed to list filter presets",
                operation="list_user_presets",
                original_error=e
            )

    def get_preset(
        self, preset_id: UUID, user_id: UUID
    ) -> Optional[FilterPresetResponse]:
        """Get preset by ID."""
        try:
            preset = self._repo.get_preset_by_id(preset_id, user_id)
            if not preset:
                return None

            return self._convert_db_row_to_response(preset)

        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve filter preset",
                operation="get_preset_by_id",
                original_error=e
            )

    def create_preset(
        self,
        user_id: UUID,
        request: FilterPresetCreateRequest,
    ) -> FilterPresetResponse:
        """Create a filter preset."""
        try:
            # Validate filters structure (basic validation)
            if not isinstance(request.filters, dict):
                raise ValueError("Filters must be a dictionary/object")

            # Check name uniqueness (case-insensitive)
            existing_presets = self._repo.list_user_presets(
                user_id=user_id,
                domain=request.domain.value,
                limit=1000,
            )
            for preset in existing_presets:
                if preset.get("name", "").lower() == request.name.lower():
                    raise ValueError(
                        f"Preset name already exists: {request.name}"
                    )

            preset_data: Dict[str, Any] = {
                "user_id": str(user_id),
                "name": request.name,
                "domain": request.domain.value,
                "filters": request.filters,
                "created_at": utcnow_iso(),
                "updated_at": utcnow_iso(),
            }

            try:
                row = self._repo.insert_preset(preset_data)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to create filter preset",
                    operation="insert_preset",
                    original_error=e
                )

            return self._convert_db_row_to_response(row)

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error creating filter preset",
                operation="create_preset",
                original_error=e
            )

    def update_preset(
        self,
        preset_id: UUID,
        user_id: UUID,
        request: FilterPresetUpdateRequest,
    ) -> Optional[FilterPresetResponse]:
        """Update a filter preset."""
        try:
            # Verify preset exists and belongs to user
            preset = self._repo.get_preset_by_id(preset_id, user_id)
            if not preset:
                return None

            # Check name uniqueness if name is being changed
            if request.name and request.name.lower() != preset.get("name", "").lower():
                existing_presets = self._repo.list_user_presets(
                    user_id=user_id,
                    domain=preset.get("domain"),
                    limit=1000,
                )
                for p in existing_presets:
                    if (p.get("id") != str(preset_id) and
                            p.get("name", "").lower() ==
                            request.name.lower()):
                        raise ValueError(
                            f"Preset name already exists: {request.name}"
                        )

            update: Dict[str, Any] = {
                "updated_at": utcnow_iso(),
            }

            if request.name is not None:
                update["name"] = request.name
            if request.filters is not None:
                if not isinstance(request.filters, dict):
                    raise ValueError("Filters must be a dictionary/object")
                update["filters"] = request.filters

            try:
                updated = self._repo.update_preset_fields(preset_id, update)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to update filter preset",
                    operation="update_preset_fields",
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
                message="Unexpected error updating filter preset",
                operation="update_preset",
                original_error=e
            )

    def delete_preset(
        self, preset_id: UUID, user_id: UUID
    ) -> bool:
        """Delete a filter preset."""
        try:
            # Verify preset exists and belongs to user
            preset = self._repo.get_preset_by_id(preset_id, user_id)
            if not preset:
                raise ValueError("Filter preset not found")

            try:
                self._repo.delete_preset(preset_id)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to delete filter preset",
                    operation="delete_preset",
                    original_error=e
                )

            return True

        except (ValueError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error deleting filter preset",
                operation="delete_preset",
                original_error=e
            )
