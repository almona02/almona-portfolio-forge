"""Project Templates API (v2)

Provides endpoints for project template management: creation, listing, cloning,
metadata updates, and thumbnail uploads.
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
    UploadFile,
    File,
)
from typing import Optional, Dict, Any, List
from uuid import UUID

from supabase import Client

from models.api_v2_models import (
    TemplateResponse,
    TemplateCategory,
    TemplateCreateRequest,
    TemplateUpdateRequest,
    TemplateCloneRequest,
    TemplateCloneResponse,
    TemplateListResponse,
)
from apis.v2.services.project_template_service import (
    ProjectTemplateService
)
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


router = APIRouter(prefix="/project-templates", tags=["Project Templates"])


@router.get("/health")
async def project_templates_health_check() -> Dict[str, str]:
    """Lightweight health check for the Project Templates service."""
    return {"status": "healthy"}


def _service(supabase: Client) -> ProjectTemplateService:
    return ProjectTemplateService(supabase)


@router.get(
    "",
    response_model=TemplateListResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="List Templates",
    description="""
    List project templates with filtering and pagination.

    **Filtering:**
    - Filter by category
    - Filter by tags (AND logic for multiple tags)
    - Search in name and description
    - Include public templates (default: true)

    **Pagination:**
    - Default limit: 50, max: 100
    - Results sorted by usageCount descending, then updatedAt descending
    """
)
def list_templates(
    request: Request,
    category: Optional[TemplateCategory] = Query(
        None, description="Filter by category"
    ),
    tags: Optional[str] = Query(
        None, description="Comma-separated tags (e.g., tag1,tag2)"
    ),
    search: Optional[str] = Query(
        None, description="Search in name and description"
    ),
    includePublic: bool = Query(True, description="Include public templates"),
    limit: int = Query(50, ge=1, le=100, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List project templates."""
    try:
        user_id = _user_uuid(current_user)
        tag_list = tags.split(",") if tags else None

        svc = _service(supabase)
        return svc.list_templates(
            user_id=user_id,
            category=category.value if category else None,
            search=search,
            tags=tag_list,
            include_public=includePublic,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="list_templates",
        )
        raise handle_supabase_error(e, "list_templates", context)


@router.get(
    "/{template_id}",
    response_model=TemplateResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Get Template",
    description="""
    Get detailed information about a template, including full projectData.

    **Access:**
    - Public templates: accessible to all
    - Private templates: only accessible to owner
    """
)
def get_template(
    request: Request,
    template_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get template details."""
    try:
        user_id = _user_uuid(current_user)
        svc = _service(supabase)
        template = svc.get_template(template_id, user_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found or access denied"
            )
        return template
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="get_template",
        )
        raise handle_supabase_error(e, "get_template", context)


@router.post(
    "",
    response_model=TemplateResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Create Template from Project",
    description="""
    Create a template from an existing project.

    **Requirements:**
    - User must have access to source project
    - Template name must be unique per user (case-insensitive)
    - Thumbnail can be provided as base64 encoded image
    """
)
def create_template(
    request: Request,
    payload: TemplateCreateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create template from project."""
    try:
        svc = _service(supabase)
        return svc.create_template(
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
            operation="create_template",
        )
        raise handle_supabase_error(e, "create_template", context)


@router.put(
    "/{template_id}",
    response_model=TemplateResponse,
    responses=COMMON_ERROR_RESPONSES,
    summary="Update Template Metadata",
    description="""
    Update template metadata (name, description, category, tags, thumbnail).

    **Permissions:**
    - User can only update their own templates
    - Cannot update projectData (use create from project)
    """
)
def update_template(
    request: Request,
    template_id: UUID,
    payload: TemplateUpdateRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Update template metadata."""
    try:
        svc = _service(supabase)
        template = svc.update_template(
            template_id=template_id,
            user_id=_user_uuid(current_user),
            request=payload,
        )
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        return template
    except ValueError as e:
        error_msg = str(e)
        if "belongs to different user" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_msg
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="update_template",
        )
        raise handle_supabase_error(e, "update_template", context)


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=COMMON_ERROR_RESPONSES,
    summary="Delete Template",
    description="""
    Delete a template (soft delete).

    **Permissions:**
    - User can only delete their own templates
    - System templates cannot be deleted
    """
)
def delete_template(
    request: Request,
    template_id: UUID,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Delete a template."""
    try:
        svc = _service(supabase)
        success = svc.delete_template(
            template_id=template_id,
            user_id=_user_uuid(current_user),
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        return None
    except ValueError as e:
        error_msg = str(e)
        if "belongs to different user" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_msg
            )
        if "cannot be deleted" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except HTTPException:
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="delete_template",
        )
        raise handle_supabase_error(e, "delete_template", context)


@router.post(
    "/{template_id}/clone",
    response_model=TemplateCloneResponse,
    status_code=status.HTTP_201_CREATED,
    responses=COMMON_ERROR_RESPONSES,
    summary="Clone Template",
    description="""
    Create a new project from a template.

    **Behavior:**
    - Copies template's projectData to new project
    - Sets project name/description from request
    - Increments template usage count
    - Returns new project ID
    """
)
def clone_template(
    request: Request,
    template_id: UUID,
    payload: TemplateCloneRequest,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Clone template to create new project."""
    try:
        svc = _service(supabase)
        return svc.clone_template(
            template_id=template_id,
            user_id=_user_uuid(current_user),
            request=payload,
        )
    except ValueError as e:
        error_msg = str(e)
        if "access denied" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_msg
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="clone_template",
        )
        raise handle_supabase_error(e, "clone_template", context)


@router.post(
    "/{template_id}/thumbnail",
    response_model=Dict[str, str],
    responses=COMMON_ERROR_RESPONSES,
    summary="Upload Template Thumbnail",
    description="""
    Upload or replace template thumbnail image.

    **File Requirements:**
    - Formats: JPEG, PNG, WebP
    - Max size: 5MB
    - Recommended: 1280x720 (16:9 ratio)

    **Permissions:**
    - User can only update their own templates
    """
)
async def upload_thumbnail(
    request: Request,
    template_id: UUID,
    file: UploadFile = File(...),
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Upload template thumbnail."""
    try:
        # Validate file type
        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {allowed_types}"
            )

        # Validate file size (5MB max)
        content = await file.read()
        max_size = 5 * 1024 * 1024  # 5MB
        if len(content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Max size: 5MB"
            )

        # Convert to base64 for processing
        import base64
        thumbnail_base64 = (
            f"data:{file.content_type};base64,"
            f"{base64.b64encode(content).decode('utf-8')}"
        )

        # Update template with thumbnail
        from models.api_v2_models import TemplateUpdateRequest
        update_request = TemplateUpdateRequest(thumbnail=thumbnail_base64)

        svc = _service(supabase)
        template = svc.update_template(
            template_id=template_id,
            user_id=_user_uuid(current_user),
            request=update_request,
        )
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

        return {
            "thumbnail": template.thumbnail or "",
            "updatedAt": template.updatedAt,
        }

    except HTTPException:
        raise
    except ValueError as e:
        error_msg = str(e)
        if "belongs to different user" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_msg
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="upload_thumbnail",
        )
        raise handle_supabase_error(e, "upload_thumbnail", context)
