from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timezone, timedelta

from supabase import Client  # type: ignore

from apis.v2.repositories.customers_repository import CustomersRepository
from apis.v2.core.errors import SupabaseError
from models.api_v2_models import (
    CustomerResponse,
    CustomerCreateRequest,
    CustomerUpdateRequest,
    CustomerListResponse,
    CustomerTagResponse,
    CustomerTagCreateRequest,
    CustomerTagUpdateRequest,
    CustomerTagListResponse,
    CustomerCommunicationResponse,
    CustomerCommunicationCreateRequest,
    CustomerCommunicationListResponse,
    CommunicationType,
    CustomerSegmentResponse,
    CustomerSegmentCreateRequest,
    CustomerSegmentUpdateRequest,
    CustomerSegmentListResponse,
    CustomerSegmentCustomersResponse,
    CustomerReminderResponse,
    CustomerReminderCreateRequest,
    CustomerReminderUpdateRequest,
    CustomerReminderListResponse,
    CustomerAnalyticsResponse,
    CustomerPurchaseHistoryResponse,
    CustomerPurchaseHistoryItem,
    CustomerRevenueResponse,
    CustomerAnalyticsSummaryResponse,
    SectorType,
)


def utcnow_iso() -> str:
    """Get current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class CustomerService:
    """Service layer for customers and related data."""

    def __init__(self, supabase: Client):
        self._repo = CustomersRepository(supabase)
        self._db = supabase

    # Customer Management

    def _convert_db_row_to_customer_response(
        self, row: Dict[str, Any]
    ) -> CustomerResponse:
        """Convert database row to CustomerResponse model."""
        return CustomerResponse(
            id=str(row["id"]),
            owner_user_id=str(row["owner_user_id"]),
            name=row.get("name", ""),
            contact_person=row.get("contact_person"),
            email=row.get("email"),
            phone=row.get("phone"),
            sector=SectorType(row.get("sector")) if row.get("sector") else None,
            billing_info=row.get("billing_info") or {},
            shipping_info=row.get("shipping_info") or {},
            notes=row.get("notes"),
            created_at=row.get("created_at", utcnow_iso()),
            updated_at=row.get("updated_at", utcnow_iso()),
            total_revenue=None,  # Calculated separately
            order_count=None,  # Calculated separately
            last_order_date=None,  # Calculated separately
        )

    def list_customers(
        self,
        user_id: UUID,
        filters: Optional[Dict[str, Any]] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
        order_by: Optional[str] = "created_at",
        order_desc: bool = True,
    ) -> CustomerListResponse:
        """List customers with optional filtering and search."""
        try:
            offset = (page - 1) * page_size
            rows = self._repo.list_customers(
                user_id=user_id,
                filters=filters,
                search=search,
                limit=page_size,
                offset=offset,
                order_by=order_by,
                order_desc=order_desc,
            )
            total = self._repo.count_customers(
                user_id=user_id, filters=filters, search=search
            )

            customers = [
                self._convert_db_row_to_customer_response(row) for row in rows
            ]

            return CustomerListResponse(
                customers=customers,
                total=total,
                page=page,
                page_size=page_size,
                has_more=(offset + page_size) < total,
            )

        except Exception as e:
            raise SupabaseError(
                message="Failed to list customers",
                operation="list_customers",
                original_error=e
            )

    def get_customer(
        self, customer_id: UUID, user_id: UUID
    ) -> Optional[CustomerResponse]:
        """Get customer by ID."""
        try:
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return None

            return self._convert_db_row_to_customer_response(customer)

        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve customer",
                operation="get_customer_by_id",
                original_error=e
            )

    def create_customer(
        self, user_id: UUID, request: CustomerCreateRequest
    ) -> CustomerResponse:
        """Create a new customer."""
        try:
            data: Dict[str, Any] = {
                "owner_user_id": str(user_id),
                "name": request.name,
                "contact_person": request.contact_person,
                "email": request.email,
                "phone": request.phone,
                "sector": request.sector.value if request.sector else None,
                "billing_info": request.billing_info or {},
                "shipping_info": request.shipping_info or {},
                "notes": request.notes,
            }

            row = self._repo.insert_customer(data)
            return self._convert_db_row_to_customer_response(row)

        except Exception as e:
            raise SupabaseError(
                message="Failed to create customer",
                operation="create_customer",
                original_error=e
            )

    def update_customer(
        self,
        customer_id: UUID,
        user_id: UUID,
        request: CustomerUpdateRequest,
    ) -> Optional[CustomerResponse]:
        """Update customer."""
        try:
            # Verify customer exists and belongs to user
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return None

            update: Dict[str, Any] = {}
            if request.name is not None:
                update["name"] = request.name
            if request.contact_person is not None:
                update["contact_person"] = request.contact_person
            if request.email is not None:
                update["email"] = request.email
            if request.phone is not None:
                update["phone"] = request.phone
            if request.sector is not None:
                update["sector"] = request.sector.value
            if request.billing_info is not None:
                update["billing_info"] = request.billing_info
            if request.shipping_info is not None:
                update["shipping_info"] = request.shipping_info
            if request.notes is not None:
                update["notes"] = request.notes

            if not update:
                # No changes, return existing
                return self.get_customer(customer_id, user_id)

            row = self._repo.update_customer(customer_id, user_id, update)
            if not row:
                return None

            return self._convert_db_row_to_customer_response(row)

        except Exception as e:
            raise SupabaseError(
                message="Failed to update customer",
                operation="update_customer",
                original_error=e
            )

    def delete_customer(self, customer_id: UUID, user_id: UUID) -> bool:
        """Delete customer."""
        try:
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return False

            self._repo.delete_customer(customer_id, user_id)
            return True

        except Exception as e:
            raise SupabaseError(
                message="Failed to delete customer",
                operation="delete_customer",
                original_error=e
            )

    # Customer Analytics

    def _calculate_customer_metrics(
        self, customer_id: UUID, user_id: UUID
    ) -> Dict[str, Any]:
        """Calculate customer metrics from projects and payments."""
        try:
            # Get customer
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return {}

            customer_name = customer.get("name", "")

            # Get projects for this customer (match by client_name)
            projects_resp = (
                self._db.table("fabricator_projects")
                .select("id, project_code, project_name, created_at, status, currency")
                .eq("owner_user_id", str(user_id))
                .ilike("client_name", customer_name)
                .execute()
            )
            projects = projects_resp.data or []

            # Get payments for projects (if payments table links to projects)
            # For MVP, aggregate revenue from projects metadata or payments table
            # Note: This is simplified - full implementation would link payments to projects
            project_ids = [p["id"] for p in projects]
            total_revenue = 0.0
            currency = "USD"

            # Try to get revenue from payments table if it exists and links to projects
            # For now, use projects count as proxy for orders
            order_count = len(projects)
            first_order_date = None
            last_order_date = None

            if projects:
                dates = [p.get("created_at") for p in projects if p.get("created_at")]
                if dates:
                    dates.sort()
                    first_order_date = dates[0]
                    last_order_date = dates[-1]

            return {
                "total_revenue": total_revenue,
                "order_count": order_count,
                "first_order_date": first_order_date,
                "last_order_date": last_order_date,
                "currency": currency,
            }

        except Exception as e:
            # Return defaults on error
            return {
                "total_revenue": 0.0,
                "order_count": 0,
                "first_order_date": None,
                "last_order_date": None,
                "currency": "USD",
            }

    def get_customer_analytics(
        self, customer_id: UUID, user_id: UUID
    ) -> Optional[CustomerAnalyticsResponse]:
        """Get customer analytics/metrics."""
        try:
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return None

            metrics = self._calculate_customer_metrics(customer_id, user_id)
            total_revenue = metrics.get("total_revenue", 0.0)
            order_count = metrics.get("order_count", 0)
            first_order_date = metrics.get("first_order_date")
            last_order_date = metrics.get("last_order_date")
            currency = metrics.get("currency", "USD")

            average_order_value = (
                total_revenue / order_count if order_count > 0 else 0.0
            )

            days_since_last_order = None
            if last_order_date:
                try:
                    last_date = datetime.fromisoformat(
                        last_order_date.replace("Z", "+00:00")
                    )
                    now = datetime.now(timezone.utc)
                    days_since_last_order = (now - last_date).days
                except Exception:
                    pass

            return CustomerAnalyticsResponse(
                customer_id=str(customer_id),
                total_revenue=total_revenue,
                order_count=order_count,
                average_order_value=average_order_value,
                first_order_date=first_order_date,
                last_order_date=last_order_date,
                days_since_last_order=days_since_last_order,
                lifetime_value=total_revenue,  # Same as total_revenue for now
                currency=currency,
            )

        except Exception as e:
            raise SupabaseError(
                message="Failed to calculate customer analytics",
                operation="get_customer_analytics",
                original_error=e
            )

    def get_customer_purchase_history(
        self, customer_id: UUID, user_id: UUID, limit: int = 50, offset: int = 0
    ) -> Optional[CustomerPurchaseHistoryResponse]:
        """Get customer purchase history."""
        try:
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return None

            customer_name = customer.get("name", "")

            # Get projects for this customer
            projects_resp = (
                self._db.table("fabricator_projects")
                .select("*")
                .eq("owner_user_id", str(user_id))
                .ilike("client_name", customer_name)
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            projects = projects_resp.data or []

            items: List[CustomerPurchaseHistoryItem] = []
            total_revenue = 0.0
            currency = "USD"

            for project in projects:
                items.append(
                    CustomerPurchaseHistoryItem(
                        project_id=str(project.get("id", "")),
                        project_code=project.get("project_code"),
                        project_name=project.get("project_name"),
                        order_date=project.get("created_at", utcnow_iso()),
                        amount=None,  # Would come from payments table
                        currency=project.get("currency") or "USD",
                        status=project.get("status"),
                    )
                )

            return CustomerPurchaseHistoryResponse(
                items=items,
                total=len(projects),
                total_revenue=total_revenue,
                currency=currency,
            )

        except Exception as e:
            raise SupabaseError(
                message="Failed to get customer purchase history",
                operation="get_customer_purchase_history",
                original_error=e
            )

    def get_customer_revenue(
        self, customer_id: UUID, user_id: UUID
    ) -> Optional[CustomerRevenueResponse]:
        """Get customer revenue data."""
        try:
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return None

            metrics = self._calculate_customer_metrics(customer_id, user_id)
            total_revenue = metrics.get("total_revenue", 0.0)
            currency = metrics.get("currency", "USD")

            return CustomerRevenueResponse(
                customer_id=str(customer_id),
                total_revenue=total_revenue,
                currency=currency,
                revenue_by_period={},  # Could be enhanced with time-series data
            )

        except Exception as e:
            raise SupabaseError(
                message="Failed to get customer revenue",
                operation="get_customer_revenue",
                original_error=e
            )

    def get_analytics_summary(self, user_id: UUID) -> CustomerAnalyticsSummaryResponse:
        """Get overall customer analytics summary."""
        try:
            # Get total customers
            total_customers = self._repo.count_customers(user_id, None, None)

            # Get active customers (customers with projects in last 90 days)
            now = datetime.now(timezone.utc)
            ninety_days_ago = (now - timedelta(days=90)).isoformat()

            customers = self._repo.list_customers(
                user_id=user_id, filters=None, search=None, limit=10000, offset=0
            )

            active_customer_names = set()
            new_customer_names = set()

            # Get recent projects to identify active and new customers
            projects_resp = (
                self._db.table("fabricator_projects")
                .select("client_name, created_at")
                .eq("owner_user_id", str(user_id))
                .gte("created_at", ninety_days_ago)
                .execute()
            )
            recent_projects = projects_resp.data or []

            for project in recent_projects:
                client_name = project.get("client_name", "")
                if client_name:
                    active_customer_names.add(client_name)
                    # New customers (first project in last 30 days)
                    project_date = project.get("created_at")
                    if project_date:
                        try:
                            proj_date = datetime.fromisoformat(
                                project_date.replace("Z", "+00:00")
                            )
                            thirty_days_ago = now - timedelta(days=30)
                            if proj_date >= thirty_days_ago:
                                # Check if this is customer's first project
                                # Simplified: assume new if project in last 30 days
                                new_customer_names.add(client_name)
                        except Exception:
                            pass

            active_customers = len(active_customer_names)
            new_customers = len(new_customer_names)

            # Calculate total revenue (simplified)
            total_revenue = 0.0
            currency = "USD"

            average_revenue_per_customer = (
                total_revenue / total_customers if total_customers > 0 else 0.0
            )

            return CustomerAnalyticsSummaryResponse(
                total_customers=total_customers,
                active_customers=active_customers,
                new_customers=new_customers,
                total_revenue=total_revenue,
                average_revenue_per_customer=average_revenue_per_customer,
                currency=currency,
            )

        except Exception as e:
            raise SupabaseError(
                message="Failed to get analytics summary",
                operation="get_analytics_summary",
                original_error=e
            )

    # Tag Management

    def _convert_db_row_to_tag_response(
        self, row: Dict[str, Any]
    ) -> CustomerTagResponse:
        """Convert database row to CustomerTagResponse model."""
        return CustomerTagResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            name=row.get("name", ""),
            color=row.get("color", "#3b82f6"),
            created_at=row.get("created_at", utcnow_iso()),
            updated_at=row.get("updated_at", utcnow_iso()),
        )

    def list_tags(self, user_id: UUID) -> CustomerTagListResponse:
        """List user's tags."""
        try:
            rows = self._repo.list_tags(user_id)
            tags = [self._convert_db_row_to_tag_response(row) for row in rows]
            return CustomerTagListResponse(tags=tags, total=len(tags))

        except Exception as e:
            raise SupabaseError(
                message="Failed to list tags",
                operation="list_tags",
                original_error=e
            )

    def get_tag(
        self, tag_id: UUID, user_id: UUID
    ) -> Optional[CustomerTagResponse]:
        """Get tag by ID."""
        try:
            tag = self._repo.get_tag_by_id(tag_id, user_id)
            if not tag:
                return None
            return self._convert_db_row_to_tag_response(tag)

        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve tag",
                operation="get_tag_by_id",
                original_error=e
            )

    def create_tag(
        self, user_id: UUID, request: CustomerTagCreateRequest
    ) -> CustomerTagResponse:
        """Create a tag."""
        try:
            data: Dict[str, Any] = {
                "user_id": str(user_id),
                "name": request.name,
                "color": request.color or "#3b82f6",
            }

            row = self._repo.insert_tag(data)
            return self._convert_db_row_to_tag_response(row)

        except Exception as e:
            raise SupabaseError(
                message="Failed to create tag",
                operation="create_tag",
                original_error=e
            )

    def update_tag(
        self,
        tag_id: UUID,
        user_id: UUID,
        request: CustomerTagUpdateRequest,
    ) -> Optional[CustomerTagResponse]:
        """Update tag."""
        try:
            tag = self._repo.get_tag_by_id(tag_id, user_id)
            if not tag:
                return None

            update: Dict[str, Any] = {}
            if request.name is not None:
                update["name"] = request.name
            if request.color is not None:
                update["color"] = request.color

            if not update:
                return self.get_tag(tag_id, user_id)

            row = self._repo.update_tag(tag_id, user_id, update)
            if not row:
                return None

            return self._convert_db_row_to_tag_response(row)

        except Exception as e:
            raise SupabaseError(
                message="Failed to update tag",
                operation="update_tag",
                original_error=e
            )

    def delete_tag(self, tag_id: UUID, user_id: UUID) -> bool:
        """Delete tag."""
        try:
            tag = self._repo.get_tag_by_id(tag_id, user_id)
            if not tag:
                return False

            self._repo.delete_tag(tag_id, user_id)
            return True

        except Exception as e:
            raise SupabaseError(
                message="Failed to delete tag",
                operation="delete_tag",
                original_error=e
            )

    def assign_tag(self, customer_id: UUID, tag_id: UUID, user_id: UUID) -> bool:
        """Assign tag to customer."""
        try:
            # Verify customer belongs to user
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return False

            # Verify tag belongs to user
            tag = self._repo.get_tag_by_id(tag_id, user_id)
            if not tag:
                return False

            self._repo.assign_tag_to_customer(customer_id, tag_id)
            return True

        except Exception as e:
            raise SupabaseError(
                message="Failed to assign tag",
                operation="assign_tag",
                original_error=e
            )

    def remove_tag(self, customer_id: UUID, tag_id: UUID, user_id: UUID) -> bool:
        """Remove tag from customer."""
        try:
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return False

            self._repo.remove_tag_from_customer(customer_id, tag_id)
            return True

        except Exception as e:
            raise SupabaseError(
                message="Failed to remove tag",
                operation="remove_tag",
                original_error=e
            )

    def get_customer_tags(
        self, customer_id: UUID, user_id: UUID
    ) -> CustomerTagListResponse:
        """Get tags for customer."""
        try:
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return CustomerTagListResponse(tags=[], total=0)

            rows = self._repo.get_customer_tags(customer_id)
            tags = []
            for row in rows:
                tag_data = row.get("customer_tags")
                if tag_data:
                    tags.append(self._convert_db_row_to_tag_response(tag_data))

            return CustomerTagListResponse(tags=tags, total=len(tags))

        except Exception as e:
            raise SupabaseError(
                message="Failed to get customer tags",
                operation="get_customer_tags",
                original_error=e
            )

    # Communication Management

    def _convert_db_row_to_communication_response(
        self, row: Dict[str, Any]
    ) -> CustomerCommunicationResponse:
        """Convert database row to CustomerCommunicationResponse model."""
        comm_type = row.get("type", "note")
        try:
            comm_type_enum = CommunicationType(comm_type)
        except ValueError:
            comm_type_enum = CommunicationType.NOTE

        return CustomerCommunicationResponse(
            id=str(row["id"]),
            customer_id=str(row["customer_id"]),
            user_id=str(row["user_id"]),
            type=comm_type_enum,
            subject=row.get("subject"),
            message=row.get("message"),
            metadata=row.get("metadata") or {},
            created_at=row.get("created_at", utcnow_iso()),
            updated_at=row.get("updated_at", utcnow_iso()),
        )

    def list_communications(
        self,
        customer_id: UUID,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> Optional[CustomerCommunicationListResponse]:
        """List communications for customer."""
        try:
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return None

            rows = self._repo.list_communications(customer_id, limit, offset)
            total = self._repo.count_communications(customer_id)

            communications = [
                self._convert_db_row_to_communication_response(row) for row in rows
            ]

            return CustomerCommunicationListResponse(
                communications=communications, total=total
            )

        except Exception as e:
            raise SupabaseError(
                message="Failed to list communications",
                operation="list_communications",
                original_error=e
            )

    def get_communication(
        self, comm_id: UUID, user_id: UUID
    ) -> Optional[CustomerCommunicationResponse]:
        """Get communication by ID."""
        try:
            comm = self._repo.get_communication_by_id(comm_id)
            if not comm:
                return None

            # Verify user has access (via customer ownership)
            customer = self._repo.get_customer_by_id(
                UUID(comm["customer_id"]), user_id
            )
            if not customer:
                return None

            return self._convert_db_row_to_communication_response(comm)

        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve communication",
                operation="get_communication_by_id",
                original_error=e
            )

    def create_communication(
        self,
        customer_id: UUID,
        user_id: UUID,
        request: CustomerCommunicationCreateRequest,
    ) -> Optional[CustomerCommunicationResponse]:
        """Create communication record."""
        try:
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return None

            data: Dict[str, Any] = {
                "customer_id": str(customer_id),
                "user_id": str(user_id),
                "type": request.type.value if hasattr(request.type, 'value') else request.type,
                "subject": request.subject,
                "message": request.message,
                "metadata": request.metadata or {},
            }

            row = self._repo.insert_communication(data)
            return self._convert_db_row_to_communication_response(row)

        except Exception as e:
            raise SupabaseError(
                message="Failed to create communication",
                operation="create_communication",
                original_error=e
            )

    def update_communication(
        self,
        comm_id: UUID,
        user_id: UUID,
        request: Dict[str, Any],
    ) -> Optional[CustomerCommunicationResponse]:
        """Update communication."""
        try:
            comm = self._repo.get_communication_by_id(comm_id)
            if not comm:
                return None

            # Verify user owns the communication
            if str(comm.get("user_id")) != str(user_id):
                return None

            row = self._repo.update_communication(comm_id, user_id, request)
            if not row:
                return None

            return self._convert_db_row_to_communication_response(row)

        except Exception as e:
            raise SupabaseError(
                message="Failed to update communication",
                operation="update_communication",
                original_error=e
            )

    # Segment Management

    def _convert_db_row_to_segment_response(
        self, row: Dict[str, Any]
    ) -> CustomerSegmentResponse:
        """Convert database row to CustomerSegmentResponse model."""
        return CustomerSegmentResponse(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            name=row.get("name", ""),
            description=row.get("description"),
            criteria=row.get("criteria") or {},
            is_dynamic=row.get("is_dynamic", True),
            customer_count=row.get("customer_count", 0),
            created_at=row.get("created_at", utcnow_iso()),
            updated_at=row.get("updated_at", utcnow_iso()),
        )

    def _calculate_dynamic_segment(
        self, criteria: Dict[str, Any], user_id: UUID
    ) -> List[Dict[str, Any]]:
        """Calculate customers for dynamic segment based on criteria."""
        try:
            # Build query based on criteria
            # Simplified implementation - can be enhanced
            filters: Dict[str, Any] = {}

            if criteria.get("sector"):
                filters["sector"] = criteria["sector"]

            # Get all customers matching criteria
            customers = self._repo.list_customers(
                user_id=user_id, filters=filters, search=None, limit=10000, offset=0
            )

            # Apply additional criteria filters
            filtered = []
            for customer in customers:
                match = True

                # Add more criteria matching here (revenue range, tags, etc.)
                if criteria.get("min_revenue"):
                    # Would need to calculate revenue per customer
                    pass

                if match:
                    filtered.append(customer)

            return filtered

        except Exception as e:
            return []

    def list_segments(self, user_id: UUID) -> CustomerSegmentListResponse:
        """List user's segments."""
        try:
            rows = self._repo.list_segments(user_id)
            segments = [
                self._convert_db_row_to_segment_response(row) for row in rows
            ]
            return CustomerSegmentListResponse(segments=segments, total=len(segments))

        except Exception as e:
            raise SupabaseError(
                message="Failed to list segments",
                operation="list_segments",
                original_error=e
            )

    def get_segment(
        self, segment_id: UUID, user_id: UUID
    ) -> Optional[CustomerSegmentResponse]:
        """Get segment by ID."""
        try:
            segment = self._repo.get_segment_by_id(segment_id, user_id)
            if not segment:
                return None
            return self._convert_db_row_to_segment_response(segment)

        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve segment",
                operation="get_segment_by_id",
                original_error=e
            )

    def create_segment(
        self, user_id: UUID, request: CustomerSegmentCreateRequest
    ) -> CustomerSegmentResponse:
        """Create segment."""
        try:
            data: Dict[str, Any] = {
                "user_id": str(user_id),
                "name": request.name,
                "description": request.description,
                "criteria": request.criteria or {},
                "is_dynamic": request.is_dynamic,
                "customer_count": 0,
            }

            row = self._repo.insert_segment(data)

            # Calculate initial customer count
            if request.is_dynamic:
                customers = self._calculate_dynamic_segment(
                    request.criteria or {}, user_id
                )
                count = len(customers)
                segment_uuid = UUID(row["id"])
                self._repo.update_segment_count(segment_uuid, user_id, count)
                row["customer_count"] = count

            return self._convert_db_row_to_segment_response(row)

        except Exception as e:
            raise SupabaseError(
                message="Failed to create segment",
                operation="create_segment",
                original_error=e
            )

    def update_segment(
        self,
        segment_id: UUID,
        user_id: UUID,
        request: CustomerSegmentUpdateRequest,
    ) -> Optional[CustomerSegmentResponse]:
        """Update segment."""
        try:
            segment = self._repo.get_segment_by_id(segment_id, user_id)
            if not segment:
                return None

            update: Dict[str, Any] = {}
            if request.name is not None:
                update["name"] = request.name
            if request.description is not None:
                update["description"] = request.description
            if request.criteria is not None:
                update["criteria"] = request.criteria
            if request.is_dynamic is not None:
                update["is_dynamic"] = request.is_dynamic

            if not update:
                return self.get_segment(segment_id, user_id)

            row = self._repo.update_segment(segment_id, user_id, update)

            # Recalculate customer count if criteria changed
            if request.criteria is not None and segment.get("is_dynamic"):
                customers = self._calculate_dynamic_segment(
                    request.criteria, user_id
                )
                count = len(customers)
                self._repo.update_segment_count(segment_id, user_id, count)

            if not row:
                return None

            return self._convert_db_row_to_segment_response(row)

        except Exception as e:
            raise SupabaseError(
                message="Failed to update segment",
                operation="update_segment",
                original_error=e
            )

    def delete_segment(self, segment_id: UUID, user_id: UUID) -> bool:
        """Delete segment."""
        try:
            segment = self._repo.get_segment_by_id(segment_id, user_id)
            if not segment:
                return False

            self._repo.delete_segment(segment_id, user_id)
            return True

        except Exception as e:
            raise SupabaseError(
                message="Failed to delete segment",
                operation="delete_segment",
                original_error=e
            )

    def get_segment_customers(
        self,
        segment_id: UUID,
        user_id: UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> Optional[CustomerSegmentCustomersResponse]:
        """Get customers in segment."""
        try:
            segment = self._repo.get_segment_by_id(segment_id, user_id)
            if not segment:
                return None

            is_dynamic = segment.get("is_dynamic", True)
            criteria = segment.get("criteria") or {}

            if is_dynamic:
                # Calculate dynamic segment
                all_customers = self._calculate_dynamic_segment(criteria, user_id)
                customers = all_customers[offset : offset + limit]
                customers_list = [
                    self._convert_db_row_to_customer_response(c) for c in customers
                ]
                total = len(all_customers)
            else:
                # Get static segment customers
                rows = self._repo.get_segment_customers_static(
                    segment_id, limit, offset
                )
                customers_list = [
                    self._convert_db_row_to_customer_response(row) for row in rows
                ]
                total = segment.get("customer_count", 0)

            return CustomerSegmentCustomersResponse(
                customers=customers_list, total=total
            )

        except Exception as e:
            raise SupabaseError(
                message="Failed to get segment customers",
                operation="get_segment_customers",
                original_error=e
            )

    # Reminder Management

    def _convert_db_row_to_reminder_response(
        self, row: Dict[str, Any]
    ) -> CustomerReminderResponse:
        """Convert database row to CustomerReminderResponse model."""
        return CustomerReminderResponse(
            id=str(row["id"]),
            customer_id=str(row["customer_id"]),
            user_id=str(row["user_id"]),
            title=row.get("title", ""),
            description=row.get("description"),
            reminder_date=row.get("reminder_date", utcnow_iso()),
            is_completed=row.get("is_completed", False),
            completed_at=row.get("completed_at"),
            created_at=row.get("created_at", utcnow_iso()),
            updated_at=row.get("updated_at", utcnow_iso()),
        )

    def list_reminders(
        self,
        customer_id: UUID,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> Optional[CustomerReminderListResponse]:
        """List reminders for customer."""
        try:
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return None

            rows = self._repo.list_reminders(customer_id, limit, offset)
            reminders = [
                self._convert_db_row_to_reminder_response(row) for row in rows
            ]

            # Count total (simplified - would need count method)
            total = len(reminders)

            return CustomerReminderListResponse(reminders=reminders, total=total)

        except Exception as e:
            raise SupabaseError(
                message="Failed to list reminders",
                operation="list_reminders",
                original_error=e
            )

    def get_reminder(
        self, reminder_id: UUID, user_id: UUID
    ) -> Optional[CustomerReminderResponse]:
        """Get reminder by ID."""
        try:
            reminder = self._repo.get_reminder_by_id(reminder_id)
            if not reminder:
                return None

            # Verify user has access (via customer ownership)
            customer = self._repo.get_customer_by_id(
                UUID(reminder["customer_id"]), user_id
            )
            if not customer:
                return None

            return self._convert_db_row_to_reminder_response(reminder)

        except Exception as e:
            raise SupabaseError(
                message="Failed to retrieve reminder",
                operation="get_reminder_by_id",
                original_error=e
            )

    def create_reminder(
        self,
        customer_id: UUID,
        user_id: UUID,
        request: CustomerReminderCreateRequest,
    ) -> Optional[CustomerReminderResponse]:
        """Create reminder."""
        try:
            customer = self._repo.get_customer_by_id(customer_id, user_id)
            if not customer:
                return None

            data: Dict[str, Any] = {
                "customer_id": str(customer_id),
                "user_id": str(user_id),
                "title": request.title,
                "description": request.description,
                "reminder_date": request.reminder_date,
                "is_completed": False,
            }

            row = self._repo.insert_reminder(data)
            return self._convert_db_row_to_reminder_response(row)

        except Exception as e:
            raise SupabaseError(
                message="Failed to create reminder",
                operation="create_reminder",
                original_error=e
            )

    def update_reminder(
        self,
        reminder_id: UUID,
        user_id: UUID,
        request: CustomerReminderUpdateRequest,
    ) -> Optional[CustomerReminderResponse]:
        """Update reminder."""
        try:
            reminder = self._repo.get_reminder_by_id(reminder_id)
            if not reminder:
                return None

            # Verify user owns the reminder
            if str(reminder.get("user_id")) != str(user_id):
                return None

            update: Dict[str, Any] = {}
            if request.title is not None:
                update["title"] = request.title
            if request.description is not None:
                update["description"] = request.description
            if request.reminder_date is not None:
                update["reminder_date"] = request.reminder_date
            if request.is_completed is not None:
                update["is_completed"] = request.is_completed
                if request.is_completed:
                    update["completed_at"] = utcnow_iso()
                else:
                    update["completed_at"] = None

            if not update:
                return self.get_reminder(reminder_id, user_id)

            row = self._repo.update_reminder(reminder_id, user_id, update)
            if not row:
                return None

            return self._convert_db_row_to_reminder_response(row)

        except Exception as e:
            raise SupabaseError(
                message="Failed to update reminder",
                operation="update_reminder",
                original_error=e
            )

    def delete_reminder(self, reminder_id: UUID, user_id: UUID) -> bool:
        """Delete reminder."""
        try:
            reminder = self._repo.get_reminder_by_id(reminder_id)
            if not reminder:
                return False

            # Verify user owns the reminder
            if str(reminder.get("user_id")) != str(user_id):
                return False

            self._repo.delete_reminder(reminder_id, user_id)
            return True

        except Exception as e:
            raise SupabaseError(
                message="Failed to delete reminder",
                operation="delete_reminder",
                original_error=e
            )
