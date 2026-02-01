from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timedelta, timezone
from supabase import Client  # type: ignore


class CustomersRepository:
    """Persistence layer for customers and related data."""

    def __init__(self, supabase: Client):
        self._db = supabase

    # Customer CRUD
    def insert_customer(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new customer."""
        resp = self._db.table("fabricator_customers").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create customer")
        return rows[0]

    def get_customer_by_id(
        self, customer_id: UUID, user_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get a customer by ID (user-scoped for RLS)."""
        resp = (
            self._db.table("fabricator_customers")
            .select("*")
            .eq("id", str(customer_id))
            .eq("owner_user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def list_customers(
        self,
        user_id: UUID,
        filters: Optional[Dict[str, Any]] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        order_by: Optional[str] = "created_at",
        order_desc: bool = True,
    ) -> List[Dict[str, Any]]:
        """List customers with optional filtering and search."""
        query = (
            self._db.table("fabricator_customers")
            .select("*")
            .eq("owner_user_id", str(user_id))
        )

        # Apply filters
        if filters:
            if filters.get("sector"):
                query = query.eq("sector", filters["sector"])
            if filters.get("created_from"):
                query = query.gte("created_at", filters["created_from"])
            if filters.get("created_to"):
                query = query.lte("created_at", filters["created_to"])

        # Apply search (name, contact_person, email, phone, notes)
        if search:
            search_lower = search.lower()
            # Use OR conditions for search - Supabase doesn't support OR directly,
            # so we'll filter in Python for now (or use multiple queries)
            # For MVP, use ilike on name field
            query = query.ilike("name", f"%{search}%")

        # Apply ordering
        if order_by:
            if order_desc:
                query = query.order(order_by, desc=True)
            else:
                query = query.order(order_by, desc=False)

        resp = query.range(offset, offset + limit - 1).execute()
        return getattr(resp, "data", []) or []

    def count_customers(
        self,
        user_id: UUID,
        filters: Optional[Dict[str, Any]] = None,
        search: Optional[str] = None,
    ) -> int:
        """Count customers matching filters."""
        query = (
            self._db.table("fabricator_customers")
            .select("id", count="exact", head=False)
            .eq("owner_user_id", str(user_id))
        )

        if filters:
            if filters.get("sector"):
                query = query.eq("sector", filters["sector"])
            if filters.get("created_from"):
                query = query.gte("created_at", filters["created_from"])
            if filters.get("created_to"):
                query = query.lte("created_at", filters["created_to"])

        if search:
            query = query.ilike("name", f"%{search}%")

        resp = query.execute()
        return resp.count or 0

    def update_customer(
        self, customer_id: UUID, user_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update customer fields."""
        resp = (
            self._db.table("fabricator_customers")
            .update(update)
            .eq("id", str(customer_id))
            .eq("owner_user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def delete_customer(self, customer_id: UUID, user_id: UUID) -> bool:
        """Delete a customer (hard delete)."""
        (
            self._db.table("fabricator_customers")
            .delete()
            .eq("id", str(customer_id))
            .eq("owner_user_id", str(user_id))
            .execute()
        )
        return True

    # Tag Management
    def insert_tag(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new tag."""
        resp = self._db.table("customer_tags").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create tag")
        return rows[0]

    def get_tag_by_id(self, tag_id: UUID, user_id: UUID) -> Optional[Dict[str, Any]]:
        """Get a tag by ID."""
        resp = (
            self._db.table("customer_tags")
            .select("*")
            .eq("id", str(tag_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def list_tags(self, user_id: UUID) -> List[Dict[str, Any]]:
        """List user's tags."""
        # RLS policies handle deleted_at filtering
        resp = (
            self._db.table("customer_tags")
            .select("*")
            .eq("user_id", str(user_id))
            .order("name", desc=False)
            .execute()
        )
        # Filter out deleted in Python (RLS should handle this, but defensive)
        rows = getattr(resp, "data", []) or []
        return [r for r in rows if not r.get("deleted_at")]

    def update_tag(
        self, tag_id: UUID, user_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update tag fields."""
        resp = (
            self._db.table("customer_tags")
            .update(update)
            .eq("id", str(tag_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def delete_tag(self, tag_id: UUID, user_id: UUID) -> bool:
        """Soft delete a tag."""
        update_data = {"deleted_at": datetime.now(timezone.utc).isoformat()}
        (
            self._db.table("customer_tags")
            .update(update_data)
            .eq("id", str(tag_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        return True

    def assign_tag_to_customer(
        self, customer_id: UUID, tag_id: UUID
    ) -> Dict[str, Any]:
        """Assign tag to customer."""
        data = {
            "customer_id": str(customer_id),
            "tag_id": str(tag_id),
        }
        resp = self._db.table("customer_tag_assignments").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to assign tag")
        return rows[0]

    def remove_tag_from_customer(self, customer_id: UUID, tag_id: UUID) -> bool:
        """Remove tag assignment from customer."""
        (
            self._db.table("customer_tag_assignments")
            .delete()
            .eq("customer_id", str(customer_id))
            .eq("tag_id", str(tag_id))
            .execute()
        )
        return True

    def get_customer_tags(self, customer_id: UUID) -> List[Dict[str, Any]]:
        """Get all tags for a customer."""
        resp = (
            self._db.table("customer_tag_assignments")
            .select("*, customer_tags(*)")
            .eq("customer_id", str(customer_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows

    # Communication Management
    def insert_communication(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new communication record."""
        resp = self._db.table("customer_communications").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create communication")
        return rows[0]

    def get_communication_by_id(
        self, comm_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get a communication by ID."""
        resp = (
            self._db.table("customer_communications")
            .select("*")
            .eq("id", str(comm_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def list_communications(
        self,
        customer_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List communications for a customer."""
        resp = (
            self._db.table("customer_communications")
            .select("*")
            .eq("customer_id", str(customer_id))
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return getattr(resp, "data", []) or []

    def count_communications(self, customer_id: UUID) -> int:
        """Count communications for a customer."""
        resp = (
            self._db.table("customer_communications")
            .select("id", count="exact", head=False)
            .eq("customer_id", str(customer_id))
            .execute()
        )
        return resp.count or 0

    def update_communication(
        self, comm_id: UUID, user_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update communication fields."""
        resp = (
            self._db.table("customer_communications")
            .update(update)
            .eq("id", str(comm_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    # Segment Management
    def insert_segment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new segment."""
        resp = self._db.table("customer_segments").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create segment")
        return rows[0]

    def get_segment_by_id(
        self, segment_id: UUID, user_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get a segment by ID."""
        # RLS policies handle deleted_at filtering
        resp = (
            self._db.table("customer_segments")
            .select("*")
            .eq("id", str(segment_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        if rows and not rows[0].get("deleted_at"):
            return rows[0]
        return None

    def list_segments(self, user_id: UUID) -> List[Dict[str, Any]]:
        """List user's segments."""
        # RLS policies handle deleted_at filtering
        resp = (
            self._db.table("customer_segments")
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        # Filter out deleted in Python (defensive)
        return [r for r in rows if not r.get("deleted_at")]

    def update_segment(
        self, segment_id: UUID, user_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update segment fields."""
        resp = (
            self._db.table("customer_segments")
            .update(update)
            .eq("id", str(segment_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def delete_segment(self, segment_id: UUID, user_id: UUID) -> bool:
        """Soft delete a segment."""
        update_data = {"deleted_at": datetime.now(timezone.utc).isoformat()}
        (
            self._db.table("customer_segments")
            .update(update_data)
            .eq("id", str(segment_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        return True

    def assign_customer_to_segment(
        self, segment_id: UUID, customer_id: UUID
    ) -> Dict[str, Any]:
        """Assign customer to segment (for static segments)."""
        data = {
            "segment_id": str(segment_id),
            "customer_id": str(customer_id),
        }
        resp = self._db.table("customer_segment_assignments").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to assign customer to segment")
        return rows[0]

    def remove_customer_from_segment(
        self, segment_id: UUID, customer_id: UUID
    ) -> bool:
        """Remove customer from segment."""
        (
            self._db.table("customer_segment_assignments")
            .delete()
            .eq("segment_id", str(segment_id))
            .eq("customer_id", str(customer_id))
            .execute()
        )
        return True

    def get_segment_customers_static(
        self, segment_id: UUID, limit: int = 100, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get customers in segment (static segments)."""
        resp = (
            self._db.table("customer_segment_assignments")
            .select("*, fabricator_customers(*)")
            .eq("segment_id", str(segment_id))
            .range(offset, offset + limit - 1)
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        # Extract customer data from join
        customers = []
        for row in rows:
            customer = row.get("fabricator_customers")
            if customer:
                customers.append(customer)
        return customers

    def update_segment_count(
        self, segment_id: UUID, user_id: UUID, count: int
    ) -> Optional[Dict[str, Any]]:
        """Update cached customer count for segment."""
        update_data = {"customer_count": count}
        resp = (
            self._db.table("customer_segments")
            .update(update_data)
            .eq("id", str(segment_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    # Reminder Management
    def insert_reminder(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new reminder."""
        resp = self._db.table("customer_reminders").insert(data).execute()
        rows = getattr(resp, "data", []) or []
        if not rows:
            raise RuntimeError("Failed to create reminder")
        return rows[0]

    def get_reminder_by_id(
        self, reminder_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get a reminder by ID."""
        resp = (
            self._db.table("customer_reminders")
            .select("*")
            .eq("id", str(reminder_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def list_reminders(
        self,
        customer_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List reminders for a customer."""
        resp = (
            self._db.table("customer_reminders")
            .select("*")
            .eq("customer_id", str(customer_id))
            .order("reminder_date", desc=False)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return getattr(resp, "data", []) or []

    def update_reminder(
        self, reminder_id: UUID, user_id: UUID, update: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update reminder fields."""
        resp = (
            self._db.table("customer_reminders")
            .update(update)
            .eq("id", str(reminder_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        rows = getattr(resp, "data", []) or []
        return rows[0] if rows else None

    def delete_reminder(self, reminder_id: UUID, user_id: UUID) -> bool:
        """Delete a reminder."""
        (
            self._db.table("customer_reminders")
            .delete()
            .eq("id", str(reminder_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        return True

    def get_upcoming_reminders(
        self, user_id: UUID, days: int = 7, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get upcoming reminders (not completed, due within days)."""
        now = datetime.now(timezone.utc)
        future_date = (now + timedelta(days=days)).isoformat()
        now_iso = now.isoformat()

        resp = (
            self._db.table("customer_reminders")
            .select("*, fabricator_customers(*)")
            .eq("user_id", str(user_id))
            .eq("is_completed", False)
            .gte("reminder_date", now_iso)
            .lte("reminder_date", future_date)
            .order("reminder_date", desc=False)
            .limit(limit)
            .execute()
        )
        return getattr(resp, "data", []) or []
