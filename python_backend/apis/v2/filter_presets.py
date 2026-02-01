"""Filter Presets API (v2)

Provides endpoints for filter preset management: creation, listing, updating,
and deletion of saved filter configurations.
Phase 3 Enterprise Features Implementation.
"""
from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Request,
    Query,
)
from typing import Optional, Dict, Any
from uuid import UUID

from supabase import Client

from models.api_v2_models import (
    FilterPresetResponse,
    FilterDomain,
    FilterPresetCreateRequest,
    FilterPresetUpdateRequest,
    FilterPresetListResponse,
)
from apis.v2.services.filter_preset_service import FilterPresetService
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


router = APIRouter(prefix="/filter-presets", tags=["Filter Presets"])


@router.get("/health")
async def filter_presets_health_check() -> Dict[str, str]:
    """Lightweight health check for the Filter Presets service."""
    return {"status": "healthy"}


def _service(supabase: Client) -> FilterPresetService:
    return FilterPresetService(supabase)


@router.get(
    "",
    response_model=FilterPresetListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="List Filter Presets",
    description="""
    List filter presets for the current user.

    **Filtering:**
    - Filter by domain (projects, positions)
    - Results sorted by updatedAt descending (most recent first)

    **Use Cases:**
    - Load saved filter configurations
    - Display preset list in UI
    """
)
def list_filter_presets(
    request: Request,
    domain: Optional[FilterDomain] = Query(
        None, description="Filter by domain (projects, positions)"
    ),
    limit: int = Query(100, ge=1, le=500, description="Maximum results"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List filter presets."""
    try:
        svc = _service(supabase)
        return svc.list_presets(
            user_id=_user_uuid(current_user),
            domain=domain.value if domain else None,
            limit=limit,
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="list_filter_presets",
        )
        raise handle_supabase_error(e, "list_presets", context)


@router.get(
    "/{preset_id}",
    response_model=FilterPresetResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Filter Preset",
    description="""
    Get a specific filter preset by ID.

    **Access:**
    - Users can only access their own presets
    """
)
def get_filter_preset(
    request: Request,
    preset_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get filter preset details."""
    try:
        svc = _service(supabase)
        preset = svc.get_preset(
            preset_id=preset_id,
            user_id=_user_uuid(current_user),
        )
        if not preset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Filter preset not found"
            )
        return preset
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_filter_preset",
        )
        raise handle_supabase_error(e, "get_preset", context)


@router.post(
    "",
    response_model=FilterPresetResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Create Filter Preset",
    description="""
    Create a new filter preset.

    **Requirements:**
    - Preset name must be unique per user and domain (case-insensitive)
    - Filters must be a valid JSON object matching FilterSet interface
    """
)
def create_filter_preset(
    request: Request,
    payload: FilterPresetCreateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a filter preset."""
    try:
        svc = _service(supabase)
        return svc.create_preset(
            user_id=_user_uuid(current_user),
            request=payload,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="create_filter_preset",
        )
        raise handle_supabase_error(e, "create_preset", context)


@router.put(
    "/{preset_id}",
    response_model=FilterPresetResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Update Filter Preset",
    description="""
    Update a filter preset (name and/or filters).

    **Permissions:**
    - User can only update their own presets
    """
)
def update_filter_preset(
    request: Request,
    preset_id: UUID,
    payload: FilterPresetUpdateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update a filter preset."""
    try:
        svc = _service(supabase)
        preset = svc.update_preset(
            preset_id=preset_id,
            user_id=_user_uuid(current_user),
            request=payload,
        )
        if not preset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Filter preset not found"
            )
        return preset
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="update_filter_preset",
        )
        raise handle_supabase_error(e, "update_preset", context)


@router.delete(
    "/{preset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=COMMON_ERROR_RESPONSES,
    summary="Delete Filter Preset",
    description="""
    Delete a filter preset.

    **Permissions:**
    - User can only delete their own presets
    """
)
def delete_filter_preset(
    request: Request,
    preset_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete a filter preset."""
    try:
        svc = _service(supabase)
        success = svc.delete_preset(
            preset_id=preset_id,
            user_id=_user_uuid(current_user),
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Filter preset not found"
            )
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="delete_filter_preset",
        )
        raise handle_supabase_error(e, "delete_preset", context)
