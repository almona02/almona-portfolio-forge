"""
Unit tests for CustomerService.

Tests the business logic layer for customer-related operations.
"""

from __future__ import annotations

from uuid import UUID, uuid4
from datetime import datetime, timezone

import pytest

from apis.v2.services.customer_service import CustomerService
from models.api_v2_models import (
    CustomerCreateRequest,
    CustomerUpdateRequest,
    SectorType,
    CustomerTagCreateRequest,
    CustomerCommunicationCreateRequest,
    CommunicationType,
    CustomerSegmentCreateRequest,
    CustomerReminderCreateRequest,
)


# Reuse DummySupabase from repository tests
from test_customers_repository import DummySupabase


@pytest.fixture
def service():
    """Create a service instance with mocked Supabase."""
    supabase = DummySupabase()
    return CustomerService(supabase)  # type: ignore


@pytest.fixture
def sample_user_id():
    """Sample user ID for testing."""
    return uuid4()


class TestCustomerService:
    """Test customer service methods."""

    def test_create_customer(self, service, sample_user_id):
        """Test creating a customer."""
        request = CustomerCreateRequest(
            name="Test Customer",
            contact_person="John Doe",
            email="john@example.com",
            phone="+1234567890",
            sector=SectorType.ALUMINIUM,
        )
        result = service.create_customer(sample_user_id, request)
        assert result.id is not None
        assert result.name == "Test Customer"
        assert result.email == "john@example.com"
        assert result.sector == SectorType.ALUMINIUM

    def test_get_customer(self, service, sample_user_id):
        """Test retrieving a customer."""
        request = CustomerCreateRequest(
            name="Test Customer",
            contact_person="John Doe",
            email="john@example.com",
        )
        created = service.create_customer(sample_user_id, request)
        customer_id = UUID(created.id)

        result = service.get_customer(customer_id, sample_user_id)
        assert result is not None
        assert result.id == created.id
        assert result.name == "Test Customer"

    def test_list_customers(self, service, sample_user_id):
        """Test listing customers."""
        for i in range(3):
            request = CustomerCreateRequest(
                name=f"Customer {i}",
                contact_person=f"Person {i}",
                email=f"customer{i}@example.com",
            )
            service.create_customer(sample_user_id, request)

        result = service.list_customers(sample_user_id, page=1, page_size=10)
        assert len(result.customers) == 3
        assert result.total == 3

    def test_update_customer(self, service, sample_user_id):
        """Test updating a customer."""
        request = CustomerCreateRequest(
            name="Test Customer",
            email="test@example.com",
        )
        created = service.create_customer(sample_user_id, request)
        customer_id = UUID(created.id)

        update_request = CustomerUpdateRequest(
            name="Updated Customer",
            email="updated@example.com",
        )
        result = service.update_customer(customer_id, sample_user_id, update_request)
        assert result is not None
        assert result.name == "Updated Customer"
        assert result.email == "updated@example.com"

    def test_delete_customer(self, service, sample_user_id):
        """Test deleting a customer."""
        request = CustomerCreateRequest(
            name="Test Customer",
            email="test@example.com",
        )
        created = service.create_customer(sample_user_id, request)
        customer_id = UUID(created.id)

        result = service.delete_customer(customer_id, sample_user_id)
        assert result is True

        # Verify deletion
        retrieved = service.get_customer(customer_id, sample_user_id)
        assert retrieved is None


class TestTagService:
    """Test tag service methods."""

    def test_create_tag(self, service, sample_user_id):
        """Test creating a tag."""
        request = CustomerTagCreateRequest(
            name="VIP",
            color="#FF0000",
        )
        result = service.create_tag(sample_user_id, request)
        assert result.id is not None
        assert result.name == "VIP"
        assert result.color == "#FF0000"

    def test_list_tags(self, service, sample_user_id):
        """Test listing tags."""
        for i in range(3):
            request = CustomerTagCreateRequest(
                name=f"Tag {i}",
                color="#000000",
            )
            service.create_tag(sample_user_id, request)

        result = service.list_tags(sample_user_id)
        assert len(result.tags) == 3


class TestCommunicationService:
    """Test communication service methods."""

    def test_create_communication(self, service, sample_user_id):
        """Test creating a communication."""
        # Create customer first
        customer_request = CustomerCreateRequest(
            name="Test Customer",
            email="test@example.com",
        )
        customer = service.create_customer(sample_user_id, customer_request)
        customer_id = UUID(customer.id)

        comm_request = CustomerCommunicationCreateRequest(
            type=CommunicationType.email,
            subject="Test Email",
            message="Test message",
        )
        result = service.create_communication(
            customer_id, sample_user_id, comm_request
        )
        assert result.id is not None
        assert result.type == CommunicationType.email
        assert result.subject == "Test Email"


class TestSegmentService:
    """Test segment service methods."""

    def test_create_segment(self, service, sample_user_id):
        """Test creating a segment."""
        request = CustomerSegmentCreateRequest(
            name="High Value",
            description="High value customers",
            criteria={"min_revenue": 10000},
            is_dynamic=True,
        )
        result = service.create_segment(sample_user_id, request)
        assert result.id is not None
        assert result.name == "High Value"
        assert result.is_dynamic is True


class TestReminderService:
    """Test reminder service methods."""

    def test_create_reminder(self, service, sample_user_id):
        """Test creating a reminder."""
        # Create customer first
        customer_request = CustomerCreateRequest(
            name="Test Customer",
            email="test@example.com",
        )
        customer = service.create_customer(sample_user_id, customer_request)
        customer_id = UUID(customer.id)

        reminder_request = CustomerReminderCreateRequest(
            title="Follow up",
            description="Follow up with customer",
            reminder_date=datetime.now(timezone.utc).isoformat(),
        )
        result = service.create_reminder(
            customer_id, sample_user_id, reminder_request
        )
        assert result.id is not None
        assert result.title == "Follow up"
        assert result.is_completed is False
