"""
Redis Caching Layer for FastAPI
Provides caching decorator and dependency for API endpoints
"""

import json
import hashlib
from functools import wraps
from typing import Any, Callable, Optional

import redis
from core.config import settings

# Redis connection pool (singleton)
_redis_pool: Optional[redis.Redis] = None


def get_redis_client() -> redis.Redis:
    """Get or create Redis client connection."""
    global _redis_pool
    if _redis_pool is None:
        redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
        _redis_pool = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
    return _redis_pool


def cache_key_generator(func: Callable, *args, **kwargs) -> str:
    """Generate cache key from function name and arguments."""
    # Create a hash of function name and arguments
    key_parts = [func.__name__]
    key_parts.extend(str(arg) for arg in args)
    key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
    key_string = ":".join(key_parts)
    return f"cache:{hashlib.md5(key_string.encode()).hexdigest()}"


def cached(
    ttl: int = 300,
    key_prefix: Optional[str] = None,
    key_builder: Optional[Callable] = None
):
    """
    Decorator to cache function results in Redis.

    Args:
        ttl: Time to live in seconds (default: 5 minutes)
        key_prefix: Optional prefix for cache keys
        key_builder: Custom function to build cache key from args/kwargs
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                redis_client = get_redis_client()

                # Build cache key
                if key_builder:
                    cache_key = key_builder(*args, **kwargs)
                else:
                    cache_key = cache_key_generator(func, *args, **kwargs)

                if key_prefix:
                    cache_key = f"{key_prefix}:{cache_key}"

                # Try to get from cache
                cached_value = redis_client.get(cache_key)
                if cached_value:
                    return json.loads(cached_value)

                # Execute function and cache result
                if hasattr(func, '__call__'):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)

                # Cache the result
                redis_client.setex(
                    cache_key,
                    ttl,
                    json.dumps(result, default=str)
                    # default=str handles non-serializable types
                )

                return result
            except (
                redis.ConnectionError, redis.TimeoutError, Exception
            ) as e:
                # If Redis fails, just execute the function without caching
                # Log error but don't break the request
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(
                    f"Cache error for {func.__name__}: {e}. "
                    "Executing without cache."
                )
                if hasattr(func, '__call__'):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)

        return wrapper
    return decorator


def invalidate_cache(pattern: str):
    """
    Invalidate cache entries matching a pattern.

    Args:
        pattern: Redis key pattern (e.g., "cache:system_packs:*")
    """
    try:
        redis_client = get_redis_client()
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Cache invalidation error: {e}")


class CacheManager:
    """Centralized cache management."""

    @staticmethod
    async def get(key: str) -> Optional[Any]:
        """Get value from cache."""
        try:
            redis_client = get_redis_client()
            value = redis_client.get(key)
            return json.loads(value) if value else None
        except Exception:
            return None

    @staticmethod
    async def set(key: str, value: Any, ttl: int = 300):
        """Set value in cache with TTL."""
        try:
            redis_client = get_redis_client()
            redis_client.setex(key, ttl, json.dumps(value, default=str))
        except Exception:
            pass  # Fail silently

    @staticmethod
    async def delete(key: str):
        """Delete key from cache."""
        try:
            redis_client = get_redis_client()
            redis_client.delete(key)
        except Exception:
            pass

    @staticmethod
    async def clear_pattern(pattern: str):
        """Clear all keys matching pattern."""
        invalidate_cache(pattern)


# Cache TTL constants
CACHE_TTL = {
    'system_packs': 3600,  # 1 hour (rarely changes)
    'machine_profiles': 1800,  # 30 minutes
    'regional_config': 7200,  # 2 hours (very static)
    'profile_templates': 1800,  # 30 minutes
    'analytics_aggregate': 300,  # 5 minutes (more dynamic)
}
