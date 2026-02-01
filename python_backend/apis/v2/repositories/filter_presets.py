from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from supabase import Client  # type: ignore


class FilterPresetsRepository:
    """Persistence layer for filter presets."""

    def __init__(self, supabase: Client):
        self._db = supabase

    # Preset Creation
    def insert_preset(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new filter preset."""
        resp = self._db.table("filter_presets").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create filter preset")
        return rows[0]

    # Preset Retrieval
    def get_preset_by_id(
        self, preset_id: UUID, user_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get a filter preset by ID (user-scoped for RLS)."""
        resp = (
            self._db.table("filter_presets")
            .select("*")
            .eq("id", str(preset_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def list_user_presets(
        self,
        user_id: UUID,
        domain: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """List filter presets for a user with optional domain filter."""
        query = (
            self._db.table("filter_presets")
            .select("*")
            .eq("user_id", str(user_id))
        )

        if domain:
            query = query.eq("domain", domain)

        resp = (
            query.order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )
        return getattr(resp, "data", []) or []

    # Preset Updates
    def update_preset_fields(
        self, preset_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update preset fields."""
        resp = (
            self._db.table("filter_presets")
            .update(update)
            .eq("id", str(preset_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    # Preset Deletion
    def delete_preset(self, preset_id: UUID) -> bool:
        """Delete a filter preset."""
        (
            self._db.table("filter_presets")
            .delete()
            .eq("id", str(preset_id))
            .execute()
        )
        return True
