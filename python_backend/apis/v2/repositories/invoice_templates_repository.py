from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from supabase import Client  # type: ignore


class InvoiceTemplatesRepository:
    """Persistence layer for invoice templates."""

    def __init__(self, supabase: Client):
        self._db = supabase

    # Template Creation
    def insert_template(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new invoice template."""
        resp = self._db.table("invoice_templates").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create invoice template")
        return rows[0]

    # Template Retrieval
    def get_template_by_id(
        self, template_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Get a template by ID."""
        # RLS policies handle access control (public or user's own)
        query = (
            self._db.table("invoice_templates")
            .select("*")
            .eq("id", str(template_id))
        )

        resp = query.execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            return None

        template = rows[0]
        # Check access: public OR user's own template
        is_public = template.get("is_public", False)
        template_user_id = template.get("user_id")

        if is_public:
            return template
        if user_id and template_user_id == str(user_id):
            return template

        return None  # Private template, user doesn't have access

    def list_templates(
        self,
        user_id: Optional[UUID] = None,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List templates with optional filters."""
        # Base query: public templates OR user's own templates
        # RLS policies handle deleted_at filtering

        if user_id:
            # Get public + user's own separately and merge
            public_query = (
                self._db.table("invoice_templates")
                .select("*")
                .eq("is_public", True)
            )
            user_query = (
                self._db.table("invoice_templates")
                .select("*")
                .eq("user_id", str(user_id))
            )

            if filters:
                # Apply filters to both queries
                if filters.get("category"):
                    cat = filters["category"]
                    public_query = public_query.eq("category", cat)
                    user_query = user_query.eq("category", cat)

            public_resp = public_query.execute()
            user_resp = user_query.execute()
            public_rows = getattr(public_resp, "data", []) or []
            user_rows = getattr(user_resp, "data", []) or []

            # Merge and deduplicate (user's templates take priority)
            template_map = {row["id"]: row for row in public_rows}
            template_map.update({row["id"]: row for row in user_rows})
            rows = list(template_map.values())

            # Apply search filter if provided
            if filters and filters.get("search"):
                search_term = filters["search"].lower()
                rows = [
                    r for r in rows
                    if search_term in r.get("name", "").lower()
                    or search_term in (r.get("description") or "").lower()
                ]

            # Sort by created_at DESC
            rows.sort(key=lambda x: x.get("created_at", ""), reverse=True)

            # Apply pagination
            return rows[offset : offset + limit]
        else:
            # Anonymous user: only public templates
            query = (
                self._db.table("invoice_templates")
                .select("*")
                .eq("is_public", True)
            )

            if filters:
                if filters.get("category"):
                    query = query.eq("category", filters["category"])

            query = (
                query.order("created_at", desc=True)
                .range(offset, offset + limit - 1)
            )
            resp = query.execute()
            return getattr(resp, "data", []) or []

    def count_templates(self, user_id: Optional[UUID] = None) -> int:
        """Count templates for a user."""
        if user_id:
            # Count public + user's own
            public_query = (
                self._db.table("invoice_templates")
                .select("*", count="exact", head=True)
                .eq("is_public", True)
            )
            user_query = (
                self._db.table("invoice_templates")
                .select("*", count="exact", head=True)
                .eq("user_id", str(user_id))
            )
            public_resp = public_query.execute()
            user_resp = user_query.execute()
            # Approximate count (may have duplicates)
            return (getattr(public_resp, "count", 0) or 0) + (
                getattr(user_resp, "count", 0) or 0
            )
        else:
            query = (
                self._db.table("invoice_templates")
                .select("*", count="exact", head=True)
                .eq("is_public", True)
            )
            resp = query.execute()
            return getattr(resp, "count", 0) or 0

    # Template Updates
    def update_template(
        self, template_id: UUID, user_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update template fields."""
        resp = (
            self._db.table("invoice_templates")
            .update(update)
            .eq("id", str(template_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def delete_template(
        self, template_id: UUID, user_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Soft delete template."""
        from datetime import datetime, timezone

        deleted_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        return self.update_template(template_id, user_id, {"deleted_at": deleted_at})

    def increment_usage_count(self, template_id: UUID) -> bool:
        """Increment usage count (service role only)."""
        # Get current count
        template = self.get_template_by_id(template_id)
        if not template:
            return False

        current_count = template.get("usage_count", 0)
        resp = (
            self._db.table("invoice_templates")
            .update({"usage_count": current_count + 1})
            .eq("id", str(template_id))
            .execute()
        )
        return len(getattr(resp, "data", []) or []) > 0
