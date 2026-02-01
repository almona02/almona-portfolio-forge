from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from supabase import Client  # type: ignore


class WorkflowsRepository:
    """Persistence layer for workflows."""

    def __init__(self, supabase: Client):
        self._db = supabase

    # Workflow Creation
    def insert_workflow(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new workflow."""
        resp = self._db.table("workflows").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create workflow")
        return rows[0]

    # Workflow Retrieval
    def get_workflow_by_id(
        self, workflow_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Get a workflow by ID."""
        # RLS policies handle access control (public or user's own)
        query = (
            self._db.table("workflows")
            .select("*")
            .eq("id", str(workflow_id))
        )

        resp = query.execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            return None

        workflow = rows[0]
        # Check access: public OR user's own workflow
        is_public = workflow.get("is_public", False)
        workflow_user_id = workflow.get("user_id")

        if is_public:
            return workflow
        if user_id and workflow_user_id == str(user_id):
            return workflow

        return None  # Private workflow, user doesn't have access

    def list_workflows(
        self,
        user_id: Optional[UUID] = None,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List workflows with optional filters."""
        # Base query: public workflows OR user's own workflows
        # RLS policies handle deleted_at filtering

        if user_id:
            # Get public + user's own separately and merge
            public_query = (
                self._db.table("workflows")
                .select("*")
                .eq("is_public", True)
            )
            user_query = (
                self._db.table("workflows")
                .select("*")
                .eq("user_id", str(user_id))
            )

            if filters:
                # Apply filters to both queries
                if filters.get("category"):
                    cat = filters["category"]
                    public_query = public_query.eq("category", cat)
                    user_query = user_query.eq("category", cat)
                if filters.get("is_active") is not None:
                    active = filters["is_active"]
                    public_query = public_query.eq("is_active", active)
                    user_query = user_query.eq("is_active", active)
                if filters.get("is_template") is not None:
                    template = filters["is_template"]
                    public_query = public_query.eq("is_template", template)
                    user_query = user_query.eq("is_template", template)

            public_resp = public_query.execute()
            user_resp = user_query.execute()
            public_rows = getattr(public_resp, "data", []) or []
            user_rows = getattr(user_resp, "data", []) or []

            # Merge and deduplicate (user's workflows take priority)
            workflow_map = {row["id"]: row for row in public_rows}
            workflow_map.update({row["id"]: row for row in user_rows})
            rows = list(workflow_map.values())

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
            # Anonymous user: only public workflows
            query = self._db.table("workflows").select("*").eq("is_public", True)

            if filters:
                if filters.get("category"):
                    query = query.eq("category", filters["category"])
                if filters.get("is_active") is not None:
                    query = query.eq("is_active", filters["is_active"])
                if filters.get("is_template") is not None:
                    query = query.eq("is_template", filters["is_template"])

            query = (
                query.order("created_at", desc=True)
                .range(offset, offset + limit - 1)
            )
            resp = query.execute()
            return getattr(resp, "data", []) or []

    def count_workflows(self, user_id: Optional[UUID] = None) -> int:
        """Count workflows for a user."""
        if user_id:
            # Count public + user's own
            public_query = (
                self._db.table("workflows")
                .select("*", count="exact", head=True)
                .eq("is_public", True)
            )
            user_query = (
                self._db.table("workflows")
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
                self._db.table("workflows")
                .select("*", count="exact", head=True)
                .eq("is_public", True)
            )
            resp = query.execute()
            return getattr(resp, "count", 0) or 0

    # Workflow Updates
    def update_workflow(
        self, workflow_id: UUID, user_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update workflow fields."""
        resp = (
            self._db.table("workflows")
            .update(update)
            .eq("id", str(workflow_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def delete_workflow(
        self, workflow_id: UUID, user_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Soft delete workflow."""
        from datetime import datetime, timezone

        deleted_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        return self.update_workflow(workflow_id, user_id, {"deleted_at": deleted_at})

    def increment_usage_count(self, workflow_id: UUID) -> bool:
        """Increment usage count."""
        # Get current count
        workflow = self.get_workflow_by_id(workflow_id)
        if not workflow:
            return False

        current_count = workflow.get("usage_count", 0)
        resp = (
            self._db.table("workflows")
            .update({"usage_count": current_count + 1})
            .eq("id", str(workflow_id))
            .execute()
        )
        return len(getattr(resp, "data", []) or []) > 0

    # Execution Management
    def insert_execution(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new workflow execution."""
        resp = self._db.table("workflow_executions").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create workflow execution")
        return rows[0]

    def get_execution_by_id(
        self, execution_id: UUID, user_id: Optional[UUID] = None
    ) -> Optional[Dict[str, Any]]:
        """Get execution by ID (user-scoped)."""
        query = (
            self._db.table("workflow_executions")
            .select("*")
            .eq("id", str(execution_id))
        )

        resp = query.execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            return None

        execution = rows[0]
        # RLS should handle this, but verify user_id matches
        execution_user_id = execution.get("user_id")
        if user_id and execution_user_id != str(user_id):
            return None

        return execution

    def update_execution(
        self, execution_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update execution fields (service role can update any)."""
        resp = (
            self._db.table("workflow_executions")
            .update(update)
            .eq("id", str(execution_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def list_executions(
        self,
        workflow_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List executions with optional filters."""
        query = self._db.table("workflow_executions").select("*")

        if workflow_id:
            query = query.eq("workflow_id", str(workflow_id))
        if user_id:
            query = query.eq("user_id", str(user_id))
        if status:
            query = query.eq("status", status)

        query = (
            query.order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        resp = query.execute()
        return getattr(resp, "data", []) or []

    # Execution Logs
    def insert_execution_log(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create execution log entry (service role only)."""
        resp = self._db.table("workflow_execution_logs").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create execution log")
        return rows[0]

    def get_execution_logs(
        self,
        execution_id: UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get logs for an execution."""
        query = (
            self._db.table("workflow_execution_logs")
            .select("*")
            .eq("execution_id", str(execution_id))
            .order("created_at", desc=False)  # Oldest first
            .range(offset, offset + limit - 1)
        )
        resp = query.execute()
        return getattr(resp, "data", []) or []
