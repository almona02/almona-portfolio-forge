"""
Rate limiting configuration for v2 APIs.

Provides configuration helpers that integrate with the main settings.
"""
from apis.v2.middleware.rate_limiting import RateLimitConfig, RateLimitTiers
from core.config import settings


def get_rate_limit_tiers() -> dict[str, RateLimitConfig]:
    """
    Get rate limit tiers configured from settings.

    Returns:
        Dictionary mapping tier names to RateLimitConfig objects
    """
    return {
        "anonymous": RateLimitConfig(
            requests_per_minute=settings.RATE_LIMIT_ANONYMOUS_PER_MINUTE,
            requests_per_hour=settings.RATE_LIMIT_ANONYMOUS_PER_HOUR,
            burst_limit=settings.RATE_LIMIT_ANONYMOUS_BURST
        ),
        "authenticated": RateLimitConfig(
            requests_per_minute=settings.RATE_LIMIT_AUTHENTICATED_PER_MINUTE,
            requests_per_hour=settings.RATE_LIMIT_AUTHENTICATED_PER_HOUR,
            burst_limit=settings.RATE_LIMIT_AUTHENTICATED_BURST
        ),
        "premium": RateLimitConfig(
            requests_per_minute=settings.RATE_LIMIT_PREMIUM_PER_MINUTE,
            requests_per_hour=settings.RATE_LIMIT_PREMIUM_PER_HOUR,
            burst_limit=settings.RATE_LIMIT_PREMIUM_BURST
        ),
        "admin": RateLimitConfig(
            requests_per_minute=settings.RATE_LIMIT_ADMIN_PER_MINUTE,
            requests_per_hour=settings.RATE_LIMIT_ADMIN_PER_HOUR,
            burst_limit=settings.RATE_LIMIT_ADMIN_BURST
        )
    }


def get_default_rate_limit_tier() -> RateLimitConfig:
    """
    Get the default rate limit tier for anonymous users.

    Returns:
        RateLimitConfig for anonymous users
    """
    return get_rate_limit_tiers()["anonymous"]


def is_rate_limiting_enabled() -> bool:
    """
    Check if rate limiting is enabled.

    Returns:
        True if rate limiting is enabled, False otherwise
    """
    return settings.RATE_LIMIT_ENABLED


def get_cleanup_interval() -> int:
    """
    Get the cleanup interval for rate limit data.

    Returns:
        Cleanup interval in seconds
    """
    return settings.RATE_LIMIT_CLEANUP_INTERVAL


# Update the RateLimitTiers class with settings-based configuration
def update_rate_limit_tiers():
    """Update the RateLimitTiers class with settings-based configuration."""
    tiers = get_rate_limit_tiers()

    RateLimitTiers.ANONYMOUS = tiers["anonymous"]
    RateLimitTiers.AUTHENTICATED = tiers["authenticated"]
    RateLimitTiers.PREMIUM = tiers["premium"]
    RateLimitTiers.ADMIN = tiers["admin"]


# Initialize tiers on module import
update_rate_limit_tiers()
