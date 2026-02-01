"""Quote Templates API (v2)

Provides endpoints for quote template management: creation, listing, updates,
and deletion. Commercial Page Enhancement Implementation.
"""
from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
)
from typing import Optional, Dict, Any
from uuid import UUID

from supabase import Client

from models.api_v2_models import (
    QuoteTemplateResponse,
    QuoteInvoiceTemplateCategory,
    QuoteTemplateCreateRequest,
    QuoteTemplateUpdateRequest,
    QuoteTemplateListResponse,
)
from apis.v2.services.quote_template_service import QuoteTemplateService
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


router = APIRouter(prefix="/quote-templates", tags=["Quote Templates"])


@router.get("/health")
async def quote_templates_health_check() -> Dict[str, str]:
    """Lightweight health check for the Quote Templates service."""
    return {"status": "healthy"}


def _service(supabase: Client) -> QuoteTemplateService:
    return QuoteTemplateService(supabase)


@router.get(
    "",
    response_model=QuoteTemplateListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="List Quote Templates",
    description="""
    List quote templates with filtering and pagination.

    **Filtering:**
    - Filter by category
    - Search in name and description
    - Shows public templates + user's own templates

    **Pagination:**
    - Default limit: 50, max: 100
    - Default offset: 0
    """,
)
async def list_quote_templates(
    category: Optional[QuoteInvoiceTemplateCategory] = Query(
        None, description="Filter by category"
    ),
    search: Optional[str] = Query(
        None, description="Search in name and description"
    ),
    limit: int = Query(50, ge=1, le=100, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List quote templates."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.list_templates(
            user_id=user_id,
            category=category.value if category else None,
            search=search,
            limit=limit,
            offset=offset,
        )
        return result
    except Exception as e:
        context = create_error_context(
            operation="list_quote_templates",
            user_id=str(user_id),
        )
        handle_supabase_error(e, context)
        raise


@router.get(
    "/{template_id}",
    response_model=QuoteTemplateResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Quote Template",
    description="Get a quote template by ID.",
)
async def get_quote_template(
    template_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get quote template by ID."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.get_template(template_id, user_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote template not found",
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            operation="get_quote_template",
            user_id=str(user_id),
            template_id=str(template_id),
        )
        handle_supabase_error(e, context)
        raise


@router.post(
    "",
    response_model=QuoteTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Create Quote Template",
    description="Create a new quote template.",
)
async def create_quote_template(
    request: QuoteTemplateCreateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create quote template."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.create_template(user_id, request)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        context = create_error_context(
            operation="create_quote_template",
            user_id=str(user_id),
        )
        handle_supabase_error(e, context)
        raise


@router.put(
    "/{template_id}",
    response_model=QuoteTemplateResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Update Quote Template",
    description="Update a quote template.",
)
async def update_quote_template(
    template_id: UUID,
    request: QuoteTemplateUpdateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update quote template."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        result = service.update_template(template_id, user_id, request)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote template not found",
            )
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        context = create_error_context(
            operation="update_quote_template",
            user_id=str(user_id),
            template_id=str(template_id),
        )
        handle_supabase_error(e, context)
        raise


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=COMMON_ERROR_RESPONSES,
    summary="Delete Quote Template",
    description="Delete a quote template (soft delete).",
)
async def delete_quote_template(
    template_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete quote template."""
    user_id = _user_uuid(current_user)
    service = _service(supabase)

    try:
        success = service.delete_template(template_id, user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quote template not found",
            )
        return None
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            operation="delete_quote_template",
            user_id=str(user_id),
            template_id=str(template_id),
        )
        handle_supabase_error(e, context)
        raise
