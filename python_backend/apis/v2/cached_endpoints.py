"""
Cached API Endpoints
Endpoints that benefit from Redis caching for improved performance
"""

from fastapi import APIRouter
from typing import List, Dict, Any
from core.cache import CacheManager, CACHE_TTL

router = APIRouter(prefix="/cached", tags=["Cached Data"])


@router.get("/system-packs")
async def get_system_packs() -> List[Dict[str, Any]]:
    """
    Get list of available system packs (cached).
    This data changes rarely, so it's cached for 1 hour.
    """
    cache_key = "system_packs:list"

    # Try cache first
    cached_data = await CacheManager.get(cache_key)
    if cached_data:
        return cached_data

    # Fetch from database (or static data)
    # This is a placeholder - replace with actual database query
    system_packs = [
        {
            "id": "rock60",
            "name": "ROCK 60",
            "category": "sliding",
            "region": "turkish"
        },
        {
            "id": "jumbo100",
            "name": "JUMBO 100",
            "category": "sliding",
            "region": "turkish"
        },
        {
            "id": "ps9600",
            "name": "PS 9600",
            "category": "sliding",
            "region": "egyptian"
        }
    ]

    # Cache the result
    await CacheManager.set(
        cache_key, system_packs, CACHE_TTL['system_packs']
    )

    return system_packs


@router.get("/machine-export-profiles")
async def get_machine_export_profiles() -> List[Dict[str, Any]]:
    """
    Get machine export profiles (cached).
    These are static configurations, cached for 30 minutes.
    """
    cache_key = "machine_export_profiles:list"

    cached_data = await CacheManager.get(cache_key)
    if cached_data:
        return cached_data

    # Fetch from database or static config
    export_profiles = [
        {
            "id": "yilmaz_cnc",
            "name": "YILMAZ CNC",
            "format": "gcode",
            "version": "1.0"
        },
        {
            "id": "dxf_standard",
            "name": "DXF Standard",
            "format": "dxf",
            "version": "1.0"
        }
    ]

    await CacheManager.set(
        cache_key, export_profiles, CACHE_TTL['machine_profiles']
    )

    return export_profiles


@router.get("/regional-config/{region}")
async def get_regional_config(region: str) -> Dict[str, Any]:
    """
    Get regional configuration (cached).
    Very static data, cached for 2 hours.
    """
    cache_key = f"regional_config:{region}"

    cached_data = await CacheManager.get(cache_key)
    if cached_data:
        return cached_data

    # Fetch from database or static config
    config = {
        "region": region,
        "currency": "EGP" if region == "egypt" else "TRY",
        "standards": [],
        "tax_rate": 0.14 if region == "egypt" else 0.20
    }

    await CacheManager.set(
        cache_key, config, CACHE_TTL['regional_config']
    )

    return config


@router.post("/cache/invalidate")
async def invalidate_cache_endpoint(pattern: str) -> Dict[str, str]:
    """
    Invalidate cache entries matching a pattern.
    Admin-only endpoint for cache management.
    """
    from core.cache import invalidate_cache
    invalidate_cache(pattern)
    return {"message": f"Cache invalidated for pattern: {pattern}"}
