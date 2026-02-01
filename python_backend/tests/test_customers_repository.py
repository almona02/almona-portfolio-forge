"""
Unit tests for CustomersRepository.

Tests the data access layer for customer-related operations.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone

import pytest

from apis.v2.repositories.customers_repository import CustomersRepository


class DummyTable:
    """Mock Supabase table for testing."""

    def __init__(self, name: str, store: Dict[str, list]):
        self.name = name
        self.store = store

    def insert(self, data):
        """Insert data into the mock table."""
        if isinstance(data, list):
            items = data
        else:
            items = [data]
        # Assign ID if not present
        for item in items:
            if "id" not in item:
                item["id"] = str(uuid4())
            if "created_at" not in item:
                item["created_at"] = datetime.now(timezone.utc).isoformat()
        self.store.setdefault(self.name, []).extend(items)

        class Response:
            def __init__(self, data):
                self.data = data

            def execute(self):
                return self

        return Response(items)

    def select(self, *cols):
        """Create a query builder."""
        # Handle count queries
        if len(cols) == 2 and cols[1] == ("count", "exact"):
            return self._count_query()

        class Query:
            def __init__(self, table: DummyTable):
                self.table = table
                self.filters: Dict[str, Any] = {}
                self.ordering: List[tuple] = []
                self.range_start: Optional[int] = None
                self.range_end: Optional[int] = None
                self.ilike_filters: Dict[str, str] = {}

            def eq(self, key, value):
                self.filters[key] = value
                return self

            def gte(self, key, value):
                if key not in self.filters:
                    self.filters[key] = {}
                self.filters[key]["gte"] = value
                return self

            def lte(self, key, value):
                if key not in self.filters:
                    self.filters[key] = {}
                self.filters[key]["lte"] = value
                return self

            def ilike(self, key, value):
                self.ilike_filters[key] = value
                return self

            def is_(self, key, value):
                if value is None:
                    self.filters[key] = None  # IS NULL
                return self

            def order(self, column, desc: bool = True):
                self.ordering.append((column, desc))
                return self

            def range(self, start: int, end: int):
                self.range_start = start
                self.range_end = end + 1  # end is inclusive
                return self

            def execute(self):
                data = self.table.store.get(self.table.name, [])

                # Apply filters
                filtered = []
                for row in data:
                    match = True
                    for key, value in self.filters.items():
                        if isinstance(value, dict):
                            if "gte" in value and row.get(key) < value["gte"]:
                                match = False
                                break
                            if "lte" in value and row.get(key) > value["lte"]:
                                match = False
                                break
                        elif value is None:
                            if row.get(key) is not None:
                                match = False
                                break
                        elif str(row.get(key)) != str(value):
                            match = False
                            break

                    # Apply ilike filters
                    for key, pattern in self.ilike_filters.items():
                        if key in row:
                            value = str(row[key]).lower()
                            pattern_lower = pattern.lower().replace("%", "")
                            if pattern_lower not in value:
                                match = False
                                break

                    if match:
                        filtered.append(row)

                # Apply ordering
                for column, desc in reversed(self.ordering):
                    filtered.sort(key=lambda x: x.get(column, ""), reverse=desc)

                # Apply range
                if self.range_start is not None and self.range_end is not None:
                    filtered = filtered[self.range_start : self.range_end]

                class Response:
                    def __init__(self, data):
                        self.data = data

                return Response(filtered)

        return Query(self)

    def _count_query(self):
        """Create a count query builder."""
        class CountQuery:
            def __init__(self, table: DummyTable):
                self.table = table
                self.filters: Dict[str, Any] = {}
                self.head = False

            def eq(self, key, value):
                self.filters[key] = value
                return self

            def gte(self, key, value):
                if key not in self.filters:
                    self.filters[key] = {}
                self.filters[key]["gte"] = value
                return self

            def lte(self, key, value):
                if key not in self.filters:
                    self.filters[key] = {}
                self.filters[key]["lte"] = value
                return self

            def ilike(self, key, value):
                # For count, we just track the filter
                return self

            def execute(self):
                data = self.table.store.get(self.table.name, [])
                filtered = [
                    row
                    for row in data
                    if all(
                        str(row.get(k)) == str(v)
                        if not isinstance(v, dict)
                        else True  # Simplified for count
                        for k, v in self.filters.items()
                    )
                ]
                return len(filtered)

        return CountQuery(self)

    def update(self, update):
        """Create an update query builder."""
        class UpdateQuery:
            def __init__(self, table: DummyTable, update: Dict[str, Any]):
                self.table = table
                self.update = update
                self.filters: Dict[str, Any] = {}

            def eq(self, key, value):
                self.filters[key] = value
                return self

            def execute(self):
                rows = self.table.store.get(self.table.name, [])
                updated = []
                for row in rows:
                    if all(
                        str(row.get(k)) == str(v) for k, v in self.filters.items()
                    ):
                        row.update(self.update)
                        updated.append(row)

                class Response:
                    def __init__(self, data):
                        self.data = data

                return Response(updated)

        return UpdateQuery(self, update)


class DummyClient:
    """Mock Supabase client."""

    def __init__(self):
        self.store: Dict[str, list] = {}

    def table(self, name: str):
        return DummyTable(name, self.store)


class DummySupabase:
    """Mock Supabase instance."""

    def __init__(self):
        self._client = DummyClient()

    def table(self, name: str):
        return self._client.table(name)


@pytest.fixture
def repo():
    """Create a repository instance with mocked Supabase."""
    supabase = DummySupabase()
    return CustomersRepository(supabase)  # type: ignore


@pytest.fixture
def sample_user_id():
    """Sample user ID for testing."""
    return uuid4()


@pytest.fixture
def sample_customer_data(sample_user_id):
    """Sample customer data."""
    return {
        "owner_user_id": str(sample_user_id),
        "name": "Test Customer",
        "contact_person": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "address": "123 Test St",
        "city": "Test City",
        "country": "Test Country",
        "sector": "ALUMINIUM",
        "notes": "Test notes",
    }


class TestCustomerCRUD:
    """Test customer CRUD operations."""

    def test_insert_customer(self, repo, sample_customer_data):
        """Test creating a customer."""
        result = repo.insert_customer(sample_customer_data)
        assert result["id"] is not None
        assert result["name"] == "Test Customer"
        assert result["owner_user_id"] == sample_customer_data["owner_user_id"]

    def test_get_customer_by_id(self, repo, sample_user_id, sample_customer_data):
        """Test retrieving a customer by ID."""
        created = repo.insert_customer(sample_customer_data)
        customer_id = UUID(created["id"])

        result = repo.get_customer_by_id(customer_id, sample_user_id)
        assert result is not None
        assert result["id"] == created["id"]
        assert result["name"] == "Test Customer"

    def test_get_customer_not_found(self, repo, sample_user_id):
        """Test retrieving a non-existent customer."""
        customer_id = uuid4()
        result = repo.get_customer_by_id(customer_id, sample_user_id)
        assert result is None

    def test_list_customers(self, repo, sample_user_id, sample_customer_data):
        """Test listing customers."""
        # Create multiple customers
        for i in range(3):
            data = sample_customer_data.copy()
            data["name"] = f"Customer {i}"
            repo.insert_customer(data)

        results = repo.list_customers(sample_user_id, limit=10, offset=0)
        assert len(results) == 3

    def test_list_customers_with_search(self, repo, sample_user_id, sample_customer_data):
        """Test listing customers with search."""
        # Create customers with different names
        data1 = sample_customer_data.copy()
        data1["name"] = "Alpha Company"
        repo.insert_customer(data1)

        data2 = sample_customer_data.copy()
        data2["name"] = "Beta Corporation"
        repo.insert_customer(data2)

        results = repo.list_customers(sample_user_id, search="Alpha", limit=10)
        assert len(results) == 1
        assert results[0]["name"] == "Alpha Company"

    def test_list_customers_with_filter(self, repo, sample_user_id, sample_customer_data):
        """Test listing customers with sector filter."""
        data1 = sample_customer_data.copy()
        data1["name"] = "Aluminium Co"
        data1["sector"] = "ALUMINIUM"
        repo.insert_customer(data1)

        data2 = sample_customer_data.copy()
        data2["name"] = "UPVC Co"
        data2["sector"] = "UPVC"
        repo.insert_customer(data2)

        results = repo.list_customers(
            sample_user_id, filters={"sector": "ALUMINIUM"}, limit=10
        )
        assert len(results) == 1
        assert results[0]["sector"] == "ALUMINIUM"

    def test_count_customers(self, repo, sample_user_id, sample_customer_data):
        """Test counting customers."""
        for i in range(5):
            data = sample_customer_data.copy()
            data["name"] = f"Customer {i}"
            repo.insert_customer(data)

        count = repo.count_customers(sample_user_id)
        assert count == 5

    def test_update_customer(self, repo, sample_user_id, sample_customer_data):
        """Test updating a customer."""
        created = repo.insert_customer(sample_customer_data)
        customer_id = UUID(created["id"])

        update_data = {"name": "Updated Customer", "email": "updated@example.com"}
        result = repo.update_customer(customer_id, sample_user_id, update_data)
        assert result is not None
        assert result["name"] == "Updated Customer"
        assert result["email"] == "updated@example.com"

    def test_delete_customer(self, repo, sample_user_id, sample_customer_data):
        """Test deleting a customer."""
        created = repo.insert_customer(sample_customer_data)
        customer_id = UUID(created["id"])

        result = repo.delete_customer(customer_id, sample_user_id)
        assert result is True

        # Verify deletion
        retrieved = repo.get_customer_by_id(customer_id, sample_user_id)
        assert retrieved is None


class TestTagManagement:
    """Test tag management operations."""

    def test_insert_tag(self, repo, sample_user_id):
        """Test creating a tag."""
        tag_data = {
            "user_id": str(sample_user_id),
            "name": "VIP",
            "color": "#FF0000",
        }
        result = repo.insert_tag(tag_data)
        assert result["id"] is not None
        assert result["name"] == "VIP"

    def test_list_tags(self, repo, sample_user_id):
        """Test listing tags."""
        for i in range(3):
            tag_data = {
                "user_id": str(sample_user_id),
                "name": f"Tag {i}",
                "color": "#000000",
            }
            repo.insert_tag(tag_data)

        results = repo.list_tags(sample_user_id)
        assert len(results) == 3

    def test_assign_tag_to_customer(
        self, repo, sample_user_id, sample_customer_data
    ):
        """Test assigning a tag to a customer."""
        customer = repo.insert_customer(sample_customer_data)
        customer_id = UUID(customer["id"])

        tag_data = {
            "user_id": str(sample_user_id),
            "name": "VIP",
            "color": "#FF0000",
        }
        tag = repo.insert_tag(tag_data)
        tag_id = UUID(tag["id"])

        result = repo.assign_tag_to_customer(customer_id, tag_id)
        assert result["customer_id"] == str(customer_id)
        assert result["tag_id"] == str(tag_id)

    def test_get_customer_tags(self, repo, sample_user_id, sample_customer_data):
        """Test getting tags for a customer."""
        customer = repo.insert_customer(sample_customer_data)
        customer_id = UUID(customer["id"])

        # Create and assign tags
        for i in range(2):
            tag_data = {
                "user_id": str(sample_user_id),
                "name": f"Tag {i}",
                "color": "#000000",
            }
            tag = repo.insert_tag(tag_data)
            repo.assign_tag_to_customer(customer_id, UUID(tag["id"]))

        results = repo.get_customer_tags(customer_id)
        assert len(results) == 2


class TestCommunicationManagement:
    """Test communication management operations."""

    def test_insert_communication(self, repo, sample_user_id, sample_customer_data):
        """Test creating a communication."""
        customer = repo.insert_customer(sample_customer_data)
        customer_id = UUID(customer["id"])

        comm_data = {
            "customer_id": str(customer_id),
            "user_id": str(sample_user_id),
            "type": "email",
            "subject": "Test Email",
            "message": "Test message",
        }
        result = repo.insert_communication(comm_data)
        assert result["id"] is not None
        assert result["type"] == "email"

    def test_list_communications(self, repo, sample_user_id, sample_customer_data):
        """Test listing communications for a customer."""
        customer = repo.insert_customer(sample_customer_data)
        customer_id = UUID(customer["id"])

        for i in range(3):
            comm_data = {
                "customer_id": str(customer_id),
                "user_id": str(sample_user_id),
                "type": "email",
                "subject": f"Email {i}",
                "message": f"Message {i}",
            }
            repo.insert_communication(comm_data)

        results = repo.list_communications(customer_id, limit=10)
        assert len(results) == 3


class TestSegmentManagement:
    """Test segment management operations."""

    def test_insert_segment(self, repo, sample_user_id):
        """Test creating a segment."""
        segment_data = {
            "user_id": str(sample_user_id),
            "name": "High Value",
            "description": "High value customers",
            "criteria": {"min_revenue": 10000},
            "is_dynamic": True,
        }
        result = repo.insert_segment(segment_data)
        assert result["id"] is not None
        assert result["name"] == "High Value"

    def test_list_segments(self, repo, sample_user_id):
        """Test listing segments."""
        for i in range(2):
            segment_data = {
                "user_id": str(sample_user_id),
                "name": f"Segment {i}",
                "criteria": {},
                "is_dynamic": True,
            }
            repo.insert_segment(segment_data)

        results = repo.list_segments(sample_user_id)
        assert len(results) == 2


class TestReminderManagement:
    """Test reminder management operations."""

    def test_insert_reminder(self, repo, sample_user_id, sample_customer_data):
        """Test creating a reminder."""
        customer = repo.insert_customer(sample_customer_data)
        customer_id = UUID(customer["id"])

        reminder_data = {
            "customer_id": str(customer_id),
            "user_id": str(sample_user_id),
            "title": "Follow up",
            "description": "Follow up with customer",
            "reminder_date": datetime.now(timezone.utc).isoformat(),
            "is_completed": False,
        }
        result = repo.insert_reminder(reminder_data)
        assert result["id"] is not None
        assert result["title"] == "Follow up"

    def test_list_reminders(self, repo, sample_user_id, sample_customer_data):
        """Test listing reminders for a customer."""
        customer = repo.insert_customer(sample_customer_data)
        customer_id = UUID(customer["id"])

        for i in range(2):
            reminder_data = {
                "customer_id": str(customer_id),
                "user_id": str(sample_user_id),
                "title": f"Reminder {i}",
                "reminder_date": datetime.now(timezone.utc).isoformat(),
                "is_completed": False,
            }
            repo.insert_reminder(reminder_data)

        results = repo.list_reminders(customer_id, limit=10)
        assert len(results) == 2
