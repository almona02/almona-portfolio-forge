"""Customers API (v2)

Provides endpoints for customer management: CRUD operations, analytics, tags,
communications, segments, and reminders. Priority 4: Customers Page Upgrade Implementation.
"""
from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
    Request,
)
from typing import Optional, Dict, Any
from uuid import UUID

from supabase import Client

from models.api_v2_models import (
    CustomerResponse,
    CustomerCreateRequest,
    CustomerUpdateRequest,
    CustomerListResponse,
    CustomerTagResponse,
    CustomerTagCreateRequest,
    CustomerTagUpdateRequest,
    CustomerTagListResponse,
    CustomerTagAssignmentRequest,
    CustomerCommunicationResponse,
    CustomerCommunicationCreateRequest,
    CustomerCommunicationUpdateRequest,
    CustomerCommunicationListResponse,
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
    CustomerRevenueResponse,
    CustomerAnalyticsSummaryResponse,
    SectorType,
)
from apis.v2.services.customer_service import CustomerService
from apis.v2.core.errors import (
    handle_supabase_error,
    create_error_context,
    COMMON_ERROR_RESPONSES,
)

# Dependency providers
from apis.v2.deps import get_supabase, get_current_user


def _user_uuid(current_user: Dict[str, Any]) -> UUID:
    """Extract UUID from user claims."""
    raw = current_user.get("id") or current_user.get("sub")
    return UUID(raw)


router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("/health")
async def customers_health_check() -> Dict[str, str]:
    """Lightweight health check for the Customers service."""
    return {"status": "healthy"}


def _service(supabase: Client) -> CustomerService:
    return CustomerService(supabase)


# Customer Management Endpoints

@router.get(
    "",
    response_model=CustomerListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="List Customers",
    description="""
    List customers with optional filtering, search, and pagination.

    **Filtering:**
    - Sector filtering
    - Date range filtering (created_from, created_to)
    - Search (name, contact, email, phone, notes)

    **Pagination:**
    - page: Page number (default: 1)
    - page_size: Items per page (default: 50, max: 100)

    **Sorting:**
    - order_by: Field to sort by (default: created_at)
    - order_desc: Sort descending (default: true)
    """
)
async def list_customers(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search query"),
    sector: Optional[SectorType] = Query(None, description="Filter by sector"),
    order_by: Optional[str] = Query("created_at", description="Sort field"),
    order_desc: bool = Query(True, description="Sort descending"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List customers."""
    try:
        filters: Dict[str, Any] = {}
        if sector:
            filters["sector"] = sector.value

        svc = _service(supabase)
        return svc.list_customers(
            user_id=_user_uuid(current_user),
            filters=filters if filters else None,
            search=search,
            page=page,
            page_size=page_size,
            order_by=order_by,
            order_desc=order_desc,
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="list_customers",
        )
        raise handle_supabase_error(e, "list_customers", context)


@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Customer",
    description="Get customer by ID."
)
async def get_customer(
    request: Request,
    customer_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get customer details."""
    try:
        svc = _service(supabase)
        customer = svc.get_customer(
            customer_id=customer_id,
            user_id=_user_uuid(current_user),
        )
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        return customer
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_customer",
        )
        raise handle_supabase_error(e, "get_customer", context)


@router.post(
    "",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Create Customer",
    description="Create a new customer."
)
async def create_customer(
    request: Request,
    customer_data: CustomerCreateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create customer."""
    try:
        svc = _service(supabase)
        return svc.create_customer(
            user_id=_user_uuid(current_user),
            request=customer_data,
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="create_customer",
        )
        raise handle_supabase_error(e, "create_customer", context)


@router.put(
    "/{customer_id}",
    response_model=CustomerResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Update Customer",
    description="Update customer information."
)
async def update_customer(
    request: Request,
    customer_id: UUID,
    customer_data: CustomerUpdateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update customer."""
    try:
        svc = _service(supabase)
        customer = svc.update_customer(
            customer_id=customer_id,
            user_id=_user_uuid(current_user),
            request=customer_data,
        )
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        return customer
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="update_customer",
        )
        raise handle_supabase_error(e, "update_customer", context)


@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=COMMON_ERROR_RESPONSES,
    summary="Delete Customer",
    description="Delete a customer."
)
async def delete_customer(
    request: Request,
    customer_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete customer."""
    try:
        svc = _service(supabase)
        deleted = svc.delete_customer(
            customer_id=customer_id,
            user_id=_user_uuid(current_user),
        )
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        return None
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="delete_customer",
        )
        raise handle_supabase_error(e, "delete_customer", context)


# Customer Analytics Endpoints

@router.get(
    "/{customer_id}/analytics",
    response_model=CustomerAnalyticsResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Customer Analytics",
    description="Get analytics and metrics for a customer (revenue, orders, LTV, etc.)."
)
async def get_customer_analytics(
    request: Request,
    customer_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get customer analytics."""
    try:
        svc = _service(supabase)
        analytics = svc.get_customer_analytics(
            customer_id=customer_id,
            user_id=_user_uuid(current_user),
        )
        if not analytics:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_customer_analytics",
        )
        raise handle_supabase_error(e, "get_customer_analytics", context)


@router.get(
    "/analytics/summary",
    response_model=CustomerAnalyticsSummaryResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Analytics Summary",
    description="Get overall customer analytics summary (total customers, active, new, revenue, etc.)."
)
async def get_analytics_summary(
    request: Request,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get analytics summary."""
    try:
        svc = _service(supabase)
        return svc.get_analytics_summary(user_id=_user_uuid(current_user))
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_analytics_summary",
        )
        raise handle_supabase_error(e, "get_analytics_summary", context)


@router.get(
    "/{customer_id}/purchase-history",
    response_model=CustomerPurchaseHistoryResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Purchase History",
    description="Get customer purchase/order history."
)
async def get_customer_purchase_history(
    request: Request,
    customer_id: UUID,
    limit: int = Query(50, ge=1, le=100, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get customer purchase history."""
    try:
        svc = _service(supabase)
        history = svc.get_customer_purchase_history(
            customer_id=customer_id,
            user_id=_user_uuid(current_user),
            limit=limit,
            offset=offset,
        )
        if not history:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        return history
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_customer_purchase_history",
        )
        raise handle_supabase_error(e, "get_customer_purchase_history", context)


@router.get(
    "/{customer_id}/revenue",
    response_model=CustomerRevenueResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Customer Revenue",
    description="Get customer revenue data."
)
async def get_customer_revenue(
    request: Request,
    customer_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get customer revenue."""
    try:
        svc = _service(supabase)
        revenue = svc.get_customer_revenue(
            customer_id=customer_id,
            user_id=_user_uuid(current_user),
        )
        if not revenue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        return revenue
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_customer_revenue",
        )
        raise handle_supabase_error(e, "get_customer_revenue", context)


# Tag Endpoints

@router.get(
    "/tags",
    response_model=CustomerTagListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="List Tags",
    description="List all customer tags for the current user."
)
async def list_tags(
    request: Request,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List tags."""
    try:
        svc = _service(supabase)
        return svc.list_tags(user_id=_user_uuid(current_user))
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="list_tags",
        )
        raise handle_supabase_error(e, "list_tags", context)


@router.get(
    "/tags/{tag_id}",
    response_model=CustomerTagResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Tag",
    description="Get tag by ID."
)
async def get_tag(
    request: Request,
    tag_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get tag details."""
    try:
        svc = _service(supabase)
        tag = svc.get_tag(tag_id=tag_id, user_id=_user_uuid(current_user))
        if not tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag not found"
            )
        return tag
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_tag",
        )
        raise handle_supabase_error(e, "get_tag", context)


@router.post(
    "/tags",
    response_model=CustomerTagResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Create Tag",
    description="Create a new customer tag."
)
async def create_tag(
    request: Request,
    tag_data: CustomerTagCreateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create tag."""
    try:
        svc = _service(supabase)
        return svc.create_tag(
            user_id=_user_uuid(current_user),
            request=tag_data,
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="create_tag",
        )
        raise handle_supabase_error(e, "create_tag", context)


@router.put(
    "/tags/{tag_id}",
    response_model=CustomerTagResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Update Tag",
    description="Update tag information."
)
async def update_tag(
    request: Request,
    tag_id: UUID,
    tag_data: CustomerTagUpdateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update tag."""
    try:
        svc = _service(supabase)
        tag = svc.update_tag(
            tag_id=tag_id,
            user_id=_user_uuid(current_user),
            request=tag_data,
        )
        if not tag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag not found"
            )
        return tag
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="update_tag",
        )
        raise handle_supabase_error(e, "update_tag", context)


@router.delete(
    "/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=COMMON_ERROR_RESPONSES,
    summary="Delete Tag",
    description="Delete a tag."
)
async def delete_tag(
    request: Request,
    tag_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete tag."""
    try:
        svc = _service(supabase)
        deleted = svc.delete_tag(
            tag_id=tag_id,
            user_id=_user_uuid(current_user),
        )
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tag not found"
            )
        return None
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="delete_tag",
        )
        raise handle_supabase_error(e, "delete_tag", context)


@router.post(
    "/{customer_id}/tags",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=COMMON_ERROR_RESPONSES,
    summary="Assign Tag to Customer",
    description="Assign a tag to a customer."
)
async def assign_tag_to_customer(
    request: Request,
    customer_id: UUID,
    tag_id: UUID = Query(..., description="Tag ID to assign"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Assign tag to customer."""
    try:
        svc = _service(supabase)
        assigned = svc.assign_tag(
            customer_id=customer_id,
            tag_id=tag_id,
            user_id=_user_uuid(current_user),
        )
        if not assigned:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer or tag not found"
            )
        return None
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="assign_tag",
        )
        raise handle_supabase_error(e, "assign_tag", context)


@router.get(
    "/{customer_id}/tags",
    response_model=CustomerTagListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Customer Tags",
    description="Get all tags assigned to a customer."
)
async def get_customer_tags(
    request: Request,
    customer_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get customer tags."""
    try:
        svc = _service(supabase)
        tags = svc.get_customer_tags(
            customer_id=customer_id,
            user_id=_user_uuid(current_user),
        )
        return tags
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_customer_tags",
        )
        raise handle_supabase_error(e, "get_customer_tags", context)


@router.delete(
    "/{customer_id}/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=COMMON_ERROR_RESPONSES,
    summary="Remove Tag from Customer",
    description="Remove a tag from a customer."
)
async def remove_tag_from_customer(
    request: Request,
    customer_id: UUID,
    tag_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Remove tag from customer."""
    try:
        svc = _service(supabase)
        removed = svc.remove_tag(
            customer_id=customer_id,
            tag_id=tag_id,
            user_id=_user_uuid(current_user),
        )
        if not removed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer or tag not found"
            )
        return None
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="remove_tag",
        )
        raise handle_supabase_error(e, "remove_tag", context)


# Communication Endpoints

@router.get(
    "/{customer_id}/communications",
    response_model=CustomerCommunicationListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Communication History",
    description="Get communication history for a customer."
)
async def list_communications(
    request: Request,
    customer_id: UUID,
    limit: int = Query(50, ge=1, le=100, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List communications."""
    try:
        svc = _service(supabase)
        communications = svc.list_communications(
            customer_id=customer_id,
            user_id=_user_uuid(current_user),
            limit=limit,
            offset=offset,
        )
        if not communications:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        return communications
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="list_communications",
        )
        raise handle_supabase_error(e, "list_communications", context)


@router.get(
    "/communications/{comm_id}",
    response_model=CustomerCommunicationResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Communication",
    description="Get communication by ID."
)
async def get_communication(
    request: Request,
    comm_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get communication details."""
    try:
        svc = _service(supabase)
        comm = svc.get_communication(
            comm_id=comm_id,
            user_id=_user_uuid(current_user),
        )
        if not comm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Communication not found"
            )
        return comm
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_communication",
        )
        raise handle_supabase_error(e, "get_communication", context)


@router.post(
    "/{customer_id}/communications",
    response_model=CustomerCommunicationResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Create Communication",
    description="Create a new communication record for a customer."
)
async def create_communication(
    request: Request,
    customer_id: UUID,
    comm_data: CustomerCommunicationCreateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create communication."""
    try:
        svc = _service(supabase)
        comm = svc.create_communication(
            customer_id=customer_id,
            user_id=_user_uuid(current_user),
            request=comm_data,
        )
        if not comm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        return comm
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="create_communication",
        )
        raise handle_supabase_error(e, "create_communication", context)


@router.put(
    "/communications/{comm_id}",
    response_model=CustomerCommunicationResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Update Communication",
    description="Update communication record."
)
async def update_communication(
    request: Request,
    comm_id: UUID,
    comm_data: CustomerCommunicationUpdateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update communication."""
    try:
        svc = _service(supabase)
        update_dict = comm_data.dict(exclude_unset=True)
        comm = svc.update_communication(
            comm_id=comm_id,
            user_id=_user_uuid(current_user),
            request=update_dict,
        )
        if not comm:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Communication not found"
            )
        return comm
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="update_communication",
        )
        raise handle_supabase_error(e, "update_communication", context)


# Segment Endpoints

@router.get(
    "/segments",
    response_model=CustomerSegmentListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="List Segments",
    description="List all customer segments for the current user."
)
async def list_segments(
    request: Request,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List segments."""
    try:
        svc = _service(supabase)
        return svc.list_segments(user_id=_user_uuid(current_user))
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="list_segments",
        )
        raise handle_supabase_error(e, "list_segments", context)


@router.get(
    "/segments/{segment_id}",
    response_model=CustomerSegmentResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Segment",
    description="Get segment by ID."
)
async def get_segment(
    request: Request,
    segment_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get segment details."""
    try:
        svc = _service(supabase)
        segment = svc.get_segment(
            segment_id=segment_id,
            user_id=_user_uuid(current_user),
        )
        if not segment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Segment not found"
            )
        return segment
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_segment",
        )
        raise handle_supabase_error(e, "get_segment", context)


@router.post(
    "/segments",
    response_model=CustomerSegmentResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Create Segment",
    description="Create a new customer segment."
)
async def create_segment(
    request: Request,
    segment_data: CustomerSegmentCreateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create segment."""
    try:
        svc = _service(supabase)
        return svc.create_segment(
            user_id=_user_uuid(current_user),
            request=segment_data,
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="create_segment",
        )
        raise handle_supabase_error(e, "create_segment", context)


@router.put(
    "/segments/{segment_id}",
    response_model=CustomerSegmentResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Update Segment",
    description="Update segment information."
)
async def update_segment(
    request: Request,
    segment_id: UUID,
    segment_data: CustomerSegmentUpdateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update segment."""
    try:
        svc = _service(supabase)
        segment = svc.update_segment(
            segment_id=segment_id,
            user_id=_user_uuid(current_user),
            request=segment_data,
        )
        if not segment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Segment not found"
            )
        return segment
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="update_segment",
        )
        raise handle_supabase_error(e, "update_segment", context)


@router.delete(
    "/segments/{segment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=COMMON_ERROR_RESPONSES,
    summary="Delete Segment",
    description="Delete a segment."
)
async def delete_segment(
    request: Request,
    segment_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete segment."""
    try:
        svc = _service(supabase)
        deleted = svc.delete_segment(
            segment_id=segment_id,
            user_id=_user_uuid(current_user),
        )
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Segment not found"
            )
        return None
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="delete_segment",
        )
        raise handle_supabase_error(e, "delete_segment", context)


@router.get(
    "/segments/{segment_id}/customers",
    response_model=CustomerSegmentCustomersResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Segment Customers",
    description="Get customers in a segment (dynamic or static)."
)
async def get_segment_customers(
    request: Request,
    segment_id: UUID,
    limit: int = Query(100, ge=1, le=500, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get segment customers."""
    try:
        svc = _service(supabase)
        result = svc.get_segment_customers(
            segment_id=segment_id,
            user_id=_user_uuid(current_user),
            limit=limit,
            offset=offset,
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Segment not found"
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_segment_customers",
        )
        raise handle_supabase_error(e, "get_segment_customers", context)


# Reminder Endpoints

@router.get(
    "/{customer_id}/reminders",
    response_model=CustomerReminderListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Reminders",
    description="Get reminders for a customer."
)
async def list_reminders(
    request: Request,
    customer_id: UUID,
    limit: int = Query(50, ge=1, le=100, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List reminders."""
    try:
        svc = _service(supabase)
        reminders = svc.list_reminders(
            customer_id=customer_id,
            user_id=_user_uuid(current_user),
            limit=limit,
            offset=offset,
        )
        if not reminders:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        return reminders
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="list_reminders",
        )
        raise handle_supabase_error(e, "list_reminders", context)


@router.get(
    "/reminders/{reminder_id}",
    response_model=CustomerReminderResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Reminder",
    description="Get reminder by ID."
)
async def get_reminder(
    request: Request,
    reminder_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get reminder details."""
    try:
        svc = _service(supabase)
        reminder = svc.get_reminder(
            reminder_id=reminder_id,
            user_id=_user_uuid(current_user),
        )
        if not reminder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reminder not found"
            )
        return reminder
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_reminder",
        )
        raise handle_supabase_error(e, "get_reminder", context)


@router.post(
    "/{customer_id}/reminders",
    response_model=CustomerReminderResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Create Reminder",
    description="Create a new reminder for a customer."
)
async def create_reminder(
    request: Request,
    customer_id: UUID,
    reminder_data: CustomerReminderCreateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create reminder."""
    try:
        svc = _service(supabase)
        reminder = svc.create_reminder(
            customer_id=customer_id,
            user_id=_user_uuid(current_user),
            request=reminder_data,
        )
        if not reminder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        return reminder
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="create_reminder",
        )
        raise handle_supabase_error(e, "create_reminder", context)


@router.put(
    "/reminders/{reminder_id}",
    response_model=CustomerReminderResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Update Reminder",
    description="Update reminder information."
)
async def update_reminder(
    request: Request,
    reminder_id: UUID,
    reminder_data: CustomerReminderUpdateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update reminder."""
    try:
        svc = _service(supabase)
        reminder = svc.update_reminder(
            reminder_id=reminder_id,
            user_id=_user_uuid(current_user),
            request=reminder_data,
        )
        if not reminder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reminder not found"
            )
        return reminder
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="update_reminder",
        )
        raise handle_supabase_error(e, "update_reminder", context)


@router.delete(
    "/reminders/{reminder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=COMMON_ERROR_RESPONSES,
    summary="Delete Reminder",
    description="Delete a reminder."
)
async def delete_reminder(
    request: Request,
    reminder_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete reminder."""
    try:
        svc = _service(supabase)
        deleted = svc.delete_reminder(
            reminder_id=reminder_id,
            user_id=_user_uuid(current_user),
        )
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reminder not found"
            )
        return None
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="delete_reminder",
        )
        raise handle_supabase_error(e, "delete_reminder", context)
