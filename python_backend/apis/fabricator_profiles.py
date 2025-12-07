"""
Fabricator Profiles and Accessories API
Provides full CRUD operations for user-defined profiles and accessories
with Supabase integration and real-time updates support.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import logging

from core.supabase_client import get_enhanced_supabase_client
from apis.v2.deps import get_industrial_supabase, get_current_user
from apis.v2.core.errors import SupabaseError, create_error_context
from core.fabricator_validation import ProductionConstraints

logger = logging.getLogger(__name__)

# This router is included in the v2 router, which is mounted under `/api/v2`.
# Use a relative `/fabricator` prefix so final paths are `/api/v2/fabricator/*`.
router = APIRouter(prefix="/fabricator", tags=["fabricator"])


# ============================================================================
# Pydantic Models
# ============================================================================

class ProfileBase(BaseModel):
    name: str = Field(..., description="Profile name")
    material: str = Field(..., description="Material type: aluminum, upvc, or wood")
    width: float = Field(..., gt=0, description="Profile width in mm")
    height: Optional[float] = Field(None, gt=0, description="Profile height in mm")
    thickness: Optional[float] = Field(None, gt=0, description="Profile thickness in mm")
    color: str = Field(default="#C0C0C0", description="Profile color (hex code)")
    cost_per_meter: float = Field(default=0, ge=0, description="Cost per meter")
    cutting_allowance: float = Field(default=3.0, ge=0, description="Cutting allowance in mm")
    grain_direction: Optional[str] = Field(None, description="Grain direction: horizontal, vertical, or null")
    supplier: Optional[str] = Field(None, description="Supplier name")
    stock_quantity: float = Field(default=0, ge=0, description="Current stock quantity in meters")
    min_stock_level: float = Field(default=0, ge=0, description="Minimum stock level in meters")
    max_stock_level: Optional[float] = Field(None, ge=0, description="Maximum stock level in meters")
    system_brand: Optional[str] = Field(None, description="System brand (Yilmaz, Kale, etc.)")
    specifications: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional specifications")


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    material: Optional[str] = None
    width: Optional[float] = Field(None, gt=0)
    height: Optional[float] = Field(None, gt=0)
    thickness: Optional[float] = Field(None, gt=0)
    color: Optional[str] = None
    cost_per_meter: Optional[float] = Field(None, ge=0)
    cutting_allowance: Optional[float] = Field(None, ge=0)
    grain_direction: Optional[str] = None
    supplier: Optional[str] = None
    stock_quantity: Optional[float] = Field(None, ge=0)
    min_stock_level: Optional[float] = Field(None, ge=0)
    max_stock_level: Optional[float] = Field(None, ge=0)
    system_brand: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None


class ProfileResponse(ProfileBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AccessoryBase(BaseModel):
    name: str = Field(..., description="Accessory name")
    type: str = Field(..., description="Accessory type: hinge, lock, handle, seal, spacer, corner, other")
    category: Optional[str] = Field(None, description="Accessory category")
    base_cost: float = Field(..., ge=0, description="Base cost")
    markup_percentage: float = Field(default=30.0, ge=0, description="Markup percentage")
    supplier: Optional[str] = Field(None, description="Supplier name")
    sku: Optional[str] = Field(None, description="Product SKU")
    description: Optional[str] = Field(None, description="Accessory description")
    compatible_materials: List[str] = Field(default_factory=list, description="Compatible materials list")
    region: List[str] = Field(default_factory=lambda: ["global"], description="Region availability")
    image_url: Optional[str] = Field(None, description="Image URL")
    specifications: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional specifications")


class AccessoryCreate(AccessoryBase):
    pass


class AccessoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    base_cost: Optional[float] = Field(None, ge=0)
    markup_percentage: Optional[float] = Field(None, ge=0)
    supplier: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    compatible_materials: Optional[List[str]] = None
    region: Optional[List[str]] = None
    image_url: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None


class AccessoryResponse(AccessoryBase):
    id: str
    user_id: str
    unit_price: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProfileThumbnailPayload(BaseModel):
    thumbnail_url: str = Field(..., description="Public URL for the profile thumbnail")


class CompatibilityRequest(BaseModel):
    profile_id: str
    accessory_id: str


# ============================================================================
# Profile Endpoints
# ============================================================================

@router.get("/profiles", response_model=List[ProfileResponse])
async def get_profiles(
    request: Request,
    material: Optional[str] = Query(None, description="Filter by material"),
    system_brand: Optional[str] = Query(None, description="Filter by system brand"),
    low_stock: Optional[bool] = Query(None, description="Filter low stock items"),
    user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_industrial_supabase),
):
    """Get all profiles for the current user."""
    try:
        async with supabase:
            user_id = user.get("sub") or user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found in token")

            query = supabase.table("fabricator_profiles").select("*").eq("user_id", user_id)

            if material:
                query = query.eq("material", material)
            if system_brand:
                query = query.eq("system_brand", system_brand)
            if low_stock:
                query = query.lt("stock_quantity", "min_stock_level")

            result = query.order("created_at", desc=True).execute()

            if result.data is None:
                return []

            profiles = []
            for item in result.data:
                profiles.append(ProfileResponse(
                    id=item["id"],
                    user_id=item["user_id"],
                    name=item["name"],
                    material=item["material"],
                    width=float(item["width"]),
                    height=float(item["height"]) if item.get("height") else None,
                    thickness=float(item["thickness"]) if item.get("thickness") else None,
                    color=item.get("color", "#C0C0C0"),
                    cost_per_meter=float(item["cost_per_meter"]),
                    cutting_allowance=float(item["cutting_allowance"]),
                    grain_direction=item.get("grain_direction"),
                    supplier=item.get("supplier"),
                    stock_quantity=float(item["stock_quantity"]),
                    min_stock_level=float(item["min_stock_level"]),
                    max_stock_level=float(item["max_stock_level"]) if item.get("max_stock_level") else None,
                    system_brand=item.get("system_brand"),
                    specifications=item.get("specifications", {}),
                    created_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
                    updated_at=datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00")),
                ))

            return profiles

    except Exception as e:
        logger.error(f"Error fetching profiles: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch profiles: {str(e)}")


@router.post("/profiles", response_model=ProfileResponse, status_code=201)
async def create_profile(
    request: Request,
    profile: ProfileCreate,
    user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_industrial_supabase),
):
    """Create a new profile."""
    try:
        async with supabase:
            user_id = user.get("sub") or user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found in token")

            # Validate material type
            if profile.material not in ["aluminum", "upvc", "wood"]:
                raise HTTPException(status_code=400, detail="Invalid material type")

            # Server-side guardrails for dimensions (mirror frontend constraints loosely)
            try:
                ProductionConstraints.validate_profile_dimensions(
                    width_mm=profile.width,
                    height_mm=profile.height,
                )
            except ValueError as ve:
                raise HTTPException(status_code=400, detail=str(ve))

            profile_data = {
                "user_id": user_id,
                "name": profile.name,
                "material": profile.material,
                "width": profile.width,
                "height": profile.height,
                "thickness": profile.thickness,
                "color": profile.color,
                "cost_per_meter": profile.cost_per_meter,
                "cutting_allowance": profile.cutting_allowance,
                "grain_direction": profile.grain_direction,
                "supplier": profile.supplier,
                "stock_quantity": profile.stock_quantity,
                "min_stock_level": profile.min_stock_level,
                "max_stock_level": profile.max_stock_level,
                "system_brand": profile.system_brand,
                "specifications": profile.specifications or {},
            }

            result = supabase.table("fabricator_profiles").insert(profile_data).execute()

            if not result.data or len(result.data) == 0:
                raise HTTPException(status_code=500, detail="Failed to create profile")

            item = result.data[0]
            return ProfileResponse(
                id=item["id"],
                user_id=item["user_id"],
                name=item["name"],
                material=item["material"],
                width=float(item["width"]),
                height=float(item["height"]) if item.get("height") else None,
                thickness=float(item["thickness"]) if item.get("thickness") else None,
                color=item.get("color", "#C0C0C0"),
                cost_per_meter=float(item["cost_per_meter"]),
                cutting_allowance=float(item["cutting_allowance"]),
                grain_direction=item.get("grain_direction"),
                supplier=item.get("supplier"),
                stock_quantity=float(item["stock_quantity"]),
                min_stock_level=float(item["min_stock_level"]),
                max_stock_level=float(item["max_stock_level"]) if item.get("max_stock_level") else None,
                system_brand=item.get("system_brand"),
                specifications=item.get("specifications", {}),
                created_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00")),
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create profile: {str(e)}")


@router.put("/profiles/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    request: Request,
    profile_id: str,
    profile_update: ProfileUpdate,
    user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_industrial_supabase),
):
    """Update an existing profile."""
    try:
        async with supabase:
            user_id = user.get("sub") or user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found in token")

            # Build update data (only include non-None fields)
            update_data = {}
            for field, value in profile_update.model_dump(exclude_unset=True).items():
                if value is not None:
                    update_data[field] = value

            # Server-side guardrails for updated dimensions if present
            try:
                ProductionConstraints.validate_profile_dimensions(
                    width_mm=update_data.get("width"),
                    height_mm=update_data.get("height"),
                )
            except ValueError as ve:
                raise HTTPException(status_code=400, detail=str(ve))

            if not update_data:
                raise HTTPException(status_code=400, detail="No fields to update")

            # Verify ownership
            check_result = supabase.table("fabricator_profiles").select("id").eq("id", profile_id).eq("user_id", user_id).execute()
            if not check_result.data or len(check_result.data) == 0:
                raise HTTPException(status_code=404, detail="Profile not found or access denied")

            result = supabase.table("fabricator_profiles").update(update_data).eq("id", profile_id).eq("user_id", user_id).execute()

            if not result.data or len(result.data) == 0:
                raise HTTPException(status_code=500, detail="Failed to update profile")

            item = result.data[0]
            return ProfileResponse(
                id=item["id"],
                user_id=item["user_id"],
                name=item["name"],
                material=item["material"],
                width=float(item["width"]),
                height=float(item["height"]) if item.get("height") else None,
                thickness=float(item["thickness"]) if item.get("thickness") else None,
                color=item.get("color", "#C0C0C0"),
                cost_per_meter=float(item["cost_per_meter"]),
                cutting_allowance=float(item["cutting_allowance"]),
                grain_direction=item.get("grain_direction"),
                supplier=item.get("supplier"),
                stock_quantity=float(item["stock_quantity"]),
                min_stock_level=float(item["min_stock_level"]),
                max_stock_level=float(item["max_stock_level"]) if item.get("max_stock_level") else None,
                system_brand=item.get("system_brand"),
                specifications=item.get("specifications", {}),
                created_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00")),
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


@router.post("/profiles/{profile_id}/thumbnail")
async def upload_profile_thumbnail(
    request: Request,
    profile_id: str,
    payload: ProfileThumbnailPayload,
    user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_industrial_supabase),
):
    """
    Attach a thumbnail URL to a profile record. The asset should already be in profile-thumbnails storage.
    """
    try:
        async with supabase:
            user_id = user.get("sub") or user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found in token")

            result = (
                supabase.table("fabricator_profiles")
                .update({"thumbnail_url": payload.thumbnail_url})
                .eq("id", profile_id)
                .eq("user_id", user_id)
                .execute()
            )

            if not result.data:
                raise HTTPException(status_code=404, detail="Profile not found or access denied")

            return {"thumbnail_url": payload.thumbnail_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update profile thumbnail: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update profile thumbnail")


@router.delete("/profiles/{profile_id}", status_code=204)
async def delete_profile(
    request: Request,
    profile_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_industrial_supabase),
):
    """Delete a profile."""
    try:
        async with supabase:
            user_id = user.get("sub") or user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found in token")

            # Verify ownership and delete
            result = supabase.table("fabricator_profiles").delete().eq("id", profile_id).eq("user_id", user_id).execute()

            if result.data is None:
                raise HTTPException(status_code=404, detail="Profile not found or access denied")

            return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete profile: {str(e)}")


# ============================================================================
# Accessory Endpoints
# ============================================================================

@router.get("/accessories", response_model=List[AccessoryResponse])
async def get_accessories(
    request: Request,
    type: Optional[str] = Query(None, description="Filter by type"),
    region: Optional[str] = Query(None, description="Filter by region"),
    user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_industrial_supabase),
):
    """Get all accessories for the current user."""
    try:
        async with supabase:
            user_id = user.get("sub") or user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found in token")

            query = supabase.table("fabricator_accessories").select("*").eq("user_id", user_id)

            if type:
                query = query.eq("type", type)
            if region:
                query = query.contains("region", [region])

            result = query.order("created_at", desc=True).execute()

            if result.data is None:
                return []

            accessories = []
            for item in result.data:
                accessories.append(AccessoryResponse(
                    id=item["id"],
                    user_id=item["user_id"],
                    name=item["name"],
                    type=item["type"],
                    category=item.get("category"),
                    base_cost=float(item["base_cost"]),
                    markup_percentage=float(item["markup_percentage"]),
                    unit_price=float(item["unit_price"]),
                    supplier=item.get("supplier"),
                    sku=item.get("sku"),
                    description=item.get("description"),
                    compatible_materials=item.get("compatible_materials", []),
                    region=item.get("region", ["global"]),
                    image_url=item.get("image_url"),
                    specifications=item.get("specifications", {}),
                    created_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
                    updated_at=datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00")),
                ))

            return accessories

    except Exception as e:
        logger.error(f"Error fetching accessories: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch accessories: {str(e)}")


@router.post("/accessories", response_model=AccessoryResponse, status_code=201)
async def create_accessory(
    request: Request,
    accessory: AccessoryCreate,
    user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_industrial_supabase),
):
    """Create a new accessory."""
    try:
        async with supabase:
            user_id = user.get("sub") or user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found in token")

            # Validate type
            valid_types = ["hinge", "lock", "handle", "seal", "spacer", "corner", "other"]
            if accessory.type not in valid_types:
                raise HTTPException(status_code=400, detail="Invalid accessory type")

            # Calculate unit price
            unit_price = accessory.base_cost * (1 + accessory.markup_percentage / 100)

            accessory_data = {
                "user_id": user_id,
                "name": accessory.name,
                "type": accessory.type,
                "category": accessory.category,
                "base_cost": accessory.base_cost,
                "markup_percentage": accessory.markup_percentage,
                "unit_price": unit_price,
                "supplier": accessory.supplier,
                "sku": accessory.sku,
                "description": accessory.description,
                "compatible_materials": accessory.compatible_materials or [],
                "region": accessory.region or ["global"],
                "image_url": accessory.image_url,
                "specifications": accessory.specifications or {},
            }

            result = supabase.table("fabricator_accessories").insert(accessory_data).execute()

            if not result.data or len(result.data) == 0:
                raise HTTPException(status_code=500, detail="Failed to create accessory")

            item = result.data[0]
            return AccessoryResponse(
                id=item["id"],
                user_id=item["user_id"],
                name=item["name"],
                type=item["type"],
                category=item.get("category"),
                base_cost=float(item["base_cost"]),
                markup_percentage=float(item["markup_percentage"]),
                unit_price=float(item["unit_price"]),
                supplier=item.get("supplier"),
                sku=item.get("sku"),
                description=item.get("description"),
                compatible_materials=item.get("compatible_materials", []),
                region=item.get("region", ["global"]),
                image_url=item.get("image_url"),
                specifications=item.get("specifications", {}),
                created_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00")),
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating accessory: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create accessory: {str(e)}")


@router.put("/accessories/{accessory_id}", response_model=AccessoryResponse)
async def update_accessory(
    request: Request,
    accessory_id: str,
    accessory_update: AccessoryUpdate,
    user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_industrial_supabase),
):
    """Update an existing accessory."""
    try:
        async with supabase:
            user_id = user.get("sub") or user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found in token")

            # Build update data
            update_data = {}
            for field, value in accessory_update.model_dump(exclude_unset=True).items():
                if value is not None:
                    update_data[field] = value

            # Recalculate unit_price if base_cost or markup_percentage changed
            if "base_cost" in update_data or "markup_percentage" in update_data:
                # Get current values
                current = supabase.table("fabricator_accessories").select("base_cost, markup_percentage").eq("id", accessory_id).eq("user_id", user_id).execute()
                if current.data and len(current.data) > 0:
                    base_cost = update_data.get("base_cost", float(current.data[0]["base_cost"]))
                    markup = update_data.get("markup_percentage", float(current.data[0]["markup_percentage"]))
                    update_data["unit_price"] = base_cost * (1 + markup / 100)

            if not update_data:
                raise HTTPException(status_code=400, detail="No fields to update")

            # Verify ownership
            check_result = supabase.table("fabricator_accessories").select("id").eq("id", accessory_id).eq("user_id", user_id).execute()
            if not check_result.data or len(check_result.data) == 0:
                raise HTTPException(status_code=404, detail="Accessory not found or access denied")

            result = supabase.table("fabricator_accessories").update(update_data).eq("id", accessory_id).eq("user_id", user_id).execute()

            if not result.data or len(result.data) == 0:
                raise HTTPException(status_code=500, detail="Failed to update accessory")

            item = result.data[0]
            return AccessoryResponse(
                id=item["id"],
                user_id=item["user_id"],
                name=item["name"],
                type=item["type"],
                category=item.get("category"),
                base_cost=float(item["base_cost"]),
                markup_percentage=float(item["markup_percentage"]),
                unit_price=float(item["unit_price"]),
                supplier=item.get("supplier"),
                sku=item.get("sku"),
                description=item.get("description"),
                compatible_materials=item.get("compatible_materials", []),
                region=item.get("region", ["global"]),
                image_url=item.get("image_url"),
                specifications=item.get("specifications", {}),
                created_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00")),
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating accessory: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update accessory: {str(e)}")


@router.delete("/accessories/{accessory_id}", status_code=204)
async def delete_accessory(
    request: Request,
    accessory_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_industrial_supabase),
):
    """Delete an accessory."""
    try:
        async with supabase:
            user_id = user.get("sub") or user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found in token")

            # Delete compatibility relationships first
            supabase.table("profile_accessory_compatibility").delete().eq("accessory_id", accessory_id).execute()

            # Delete the accessory
            result = supabase.table("fabricator_accessories").delete().eq("id", accessory_id).eq("user_id", user_id).execute()

            if result.data is None:
                raise HTTPException(status_code=404, detail="Accessory not found or access denied")

            return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting accessory: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete accessory: {str(e)}")


# ============================================================================
# Compatibility Endpoints
# ============================================================================

@router.post("/compatibility", status_code=201)
async def add_compatibility(
    request: Request,
    compatibility: CompatibilityRequest,
    user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_industrial_supabase),
):
    """Add compatibility between a profile and accessory."""
    try:
        async with supabase:
            user_id = user.get("sub") or user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found in token")

            # Verify ownership of profile
            profile_check = supabase.table("fabricator_profiles").select("id").eq("id", compatibility.profile_id).eq("user_id", user_id).execute()
            if not profile_check.data or len(profile_check.data) == 0:
                raise HTTPException(status_code=404, detail="Profile not found or access denied")

            # Insert compatibility
            result = supabase.table("profile_accessory_compatibility").insert({
                "profile_id": compatibility.profile_id,
                "accessory_id": compatibility.accessory_id,
            }).execute()

            return {"message": "Compatibility added successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding compatibility: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add compatibility: {str(e)}")


@router.delete("/compatibility", status_code=204)
async def remove_compatibility(
    request: Request,
    profile_id: str = Query(..., description="Profile ID"),
    accessory_id: str = Query(..., description="Accessory ID"),
    user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_industrial_supabase),
):
    """Remove compatibility between a profile and accessory."""
    try:
        async with supabase:
            user_id = user.get("sub") or user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found in token")

            # Verify ownership
            profile_check = supabase.table("fabricator_profiles").select("id").eq("id", profile_id).eq("user_id", user_id).execute()
            if not profile_check.data or len(profile_check.data) == 0:
                raise HTTPException(status_code=404, detail="Profile not found or access denied")

            # Delete compatibility
            supabase.table("profile_accessory_compatibility").delete().eq("profile_id", profile_id).eq("accessory_id", accessory_id).execute()

            return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing compatibility: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to remove compatibility: {str(e)}")


@router.get("/profiles/{profile_id}/accessories", response_model=List[AccessoryResponse])
async def get_profile_accessories(
    request: Request,
    profile_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_industrial_supabase),
):
    """Get all accessories compatible with a profile."""
    try:
        async with supabase:
            user_id = user.get("sub") or user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found in token")

            # Verify ownership
            profile_check = supabase.table("fabricator_profiles").select("id").eq("id", profile_id).eq("user_id", user_id).execute()
            if not profile_check.data or len(profile_check.data) == 0:
                raise HTTPException(status_code=404, detail="Profile not found or access denied")

            # Get compatible accessories
            compat_result = supabase.table("profile_accessory_compatibility").select("accessory_id").eq("profile_id", profile_id).execute()
            accessory_ids = [item["accessory_id"] for item in (compat_result.data or [])]

            if not accessory_ids:
                return []

            accessories_result = supabase.table("fabricator_accessories").select("*").in_("id", accessory_ids).execute()

            if accessories_result.data is None:
                return []

            accessories = []
            for item in accessories_result.data:
                accessories.append(AccessoryResponse(
                    id=item["id"],
                    user_id=item["user_id"],
                    name=item["name"],
                    type=item["type"],
                    category=item.get("category"),
                    base_cost=float(item["base_cost"]),
                    markup_percentage=float(item["markup_percentage"]),
                    unit_price=float(item["unit_price"]),
                    supplier=item.get("supplier"),
                    sku=item.get("sku"),
                    description=item.get("description"),
                    compatible_materials=item.get("compatible_materials", []),
                    region=item.get("region", ["global"]),
                    image_url=item.get("image_url"),
                    specifications=item.get("specifications", {}),
                    created_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
                    updated_at=datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00")),
                ))

            return accessories

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching profile accessories: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile accessories: {str(e)}")

