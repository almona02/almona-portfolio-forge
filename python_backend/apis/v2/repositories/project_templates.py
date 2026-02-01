from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from supabase import Client  # type: ignore


class ProjectTemplatesRepository:
    """Persistence layer for project templates."""

    def __init__(self, supabase: Client):
        self._db = supabase

    # Template Creation
    def insert_template(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new project template."""
        resp = self._db.table("project_templates").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create project template")
        return rows[0]

    # Template Retrieval
    def get_template_by_id(
        self, template_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Get a template by ID."""
        # Get template (RLS policies handle deleted_at filtering)
        query = (
            self._db.table("project_templates")
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
        author_id = template.get("author_id")

        if is_public:
            return template
        if user_id and author_id == str(user_id):
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
        # Note: deleted_at filtering handled by RLS policies

        # If user_id provided, show public + user's own
        # Otherwise (anonymous), show only public
        if user_id:
            # Use OR condition: is_public OR author_id = user_id
            # Supabase PostgREST doesn't support OR directly, so we filter in app
            # For now, get all public + user's own separately and merge
            # RLS policies handle deleted_at filtering
            public_query = (
                self._db.table("project_templates")
                .select("*")
                .eq("is_public", True)
            )
            user_query = (
                self._db.table("project_templates")
                .select("*")
                .eq("author_id", str(user_id))
            )

            if filters:
                # Apply filters to both queries
                if filters.get("category"):
                    public_query = public_query.eq("category", filters["category"])
                    user_query = user_query.eq("category", filters["category"])
                if filters.get("search"):
                    # Simple search on name (full-text search can be added later)
                    search_term = filters["search"].lower()
                    # Note: Full-text search handled in application logic

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
                    if search_term in r.get("name", "").lower() or
                    search_term in (r.get("description", "") or "").lower()
                ]

            # Sort by usage_count DESC, then updated_at DESC
            rows.sort(
                key=lambda x: (
                    x.get("usage_count", 0),
                    x.get("updated_at", "") or x.get("created_at", "")
                ),
                reverse=True,
            )

            # Apply limit and offset
            return rows[offset:offset + limit]

        else:
            # Anonymous user: only public templates
            query = (
                self._db.table("project_templates")
                .select("*")
                .eq("is_public", True)
            )

            if filters:
                if filters.get("category"):
                    query = query.eq("category", filters["category"])

            resp = (
                query.order("usage_count", desc=True)
                .order("updated_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            rows = getattr(resp, "data", []) or []

            # Apply search filter if provided
            if filters and filters.get("search"):
                search_term = filters["search"].lower()
                rows = [
                    r for r in rows
                    if search_term in r.get("name", "").lower() or
                    search_term in (r.get("description", "") or "").lower()
                ]

            return rows

    def count_templates(
        self, user_id: Optional[UUID] = None
    ) -> int:
        """Count total templates (public + user's own if user_id provided)."""
        if user_id:
            # Count public + user's own
            # RLS policies handle deleted_at filtering
            public_resp = (
                self._db.table("project_templates")
                .select("id", count="exact")
                .eq("is_public", True)
                .execute()
            )
            user_resp = (
                self._db.table("project_templates")
                .select("id", count="exact")
                .eq("author_id", str(user_id))
                .execute()
            )
            public_count = getattr(public_resp, "count", 0) or 0
            user_count = getattr(user_resp, "count", 0) or 0
            # Note: May double-count templates that are both public and user's
            # For exact count, would need query with OR condition
            return public_count + user_count
        else:
            # RLS policies handle deleted_at filtering
            resp = (
                self._db.table("project_templates")
                .select("id", count="exact")
                .eq("is_public", True)
                .execute()
            )
            return getattr(resp, "count", 0) or 0

    # Template Updates
    def update_template_fields(
        self, template_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update template fields."""
        # RLS policies handle deleted_at filtering
        resp = (
            self._db.table("project_templates")
            .update(update)
            .eq("id", str(template_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    # Template Deletion (soft delete)
    def delete_template(self, template_id: UUID) -> bool:
        """Soft delete a template."""
        from datetime import datetime, timezone
        deleted_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        resp = (
            self._db.table("project_templates")
            .update({"deleted_at": deleted_at})
            .eq("id", str(template_id))
            .execute()
        )
        return True

    # Usage Count Increment
    def increment_usage_count(self, template_id: UUID) -> bool:
        """Increment template usage count."""
        # Get current count and update (atomic increment via RPC possible)
        template = self.get_template_by_id(template_id)
        if not template:
            return False

        current_count = template.get("usage_count", 0)
        self.update_template_fields(
            template_id, {"usage_count": current_count + 1}
        )
        return True
