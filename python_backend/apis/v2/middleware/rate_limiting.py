"""
Enhanced rate limiting middleware for v2 APIs.

Provides user-based and IP-based rate limiting with proper quota headers
and different rate limit tiers based on user authentication status.
"""
import time
import logging
from typing import Dict, Optional, Callable, Tuple
from collections import defaultdict, deque
from dataclasses import dataclass

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from jose import JWTError, jwt

from core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    """Rate limit configuration for different user tiers."""
    requests_per_minute: int
    requests_per_hour: int
    burst_limit: int
    window_size_seconds: int = 60


class RateLimitTiers:
    """Predefined rate limit tiers."""

    # Anonymous users (IP-based only)
    ANONYMOUS = RateLimitConfig(
        requests_per_minute=30,
        requests_per_hour=500,
        burst_limit=5
    )

    # Authenticated users
    AUTHENTICATED = RateLimitConfig(
        requests_per_minute=100,
        requests_per_hour=2000,
        burst_limit=15
    )

    # Premium users (could be extended based on user roles)
    PREMIUM = RateLimitConfig(
        requests_per_minute=200,
        requests_per_hour=5000,
        burst_limit=30
    )

    # Admin users
    ADMIN = RateLimitConfig(
        requests_per_minute=500,
        requests_per_hour=10000,
        burst_limit=50
    )


@dataclass
class RateLimitInfo:
    """Information about current rate limit status."""
    limit: int
    remaining: int
    reset_time: int
    retry_after: Optional[int] = None


class V2RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Enhanced rate limiting middleware for v2 APIs.

    Features:
    - User-based rate limiting (when authenticated)
    - IP-based fallback rate limiting
    - Different rate limit tiers based on user status
    - Proper quota headers in responses
    - Sliding window algorithm
    """

    def __init__(
        self,
        app,
        default_tier: RateLimitConfig = RateLimitTiers.ANONYMOUS,
        cleanup_interval: int = 300  # 5 minutes
    ):
        super().__init__(app)
        self.default_tier = default_tier
        self.cleanup_interval = cleanup_interval
        self.last_cleanup = time.time()

        # Storage for rate limit data
        # Structure: {identifier: deque of timestamps}
        self.rate_limits: Dict[str, deque] = defaultdict(deque)
        self.burst_limits: Dict[str, deque] = defaultdict(deque)

        # Track user tiers for authenticated users
        self.user_tiers: Dict[str, RateLimitConfig] = {}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request through rate limiting."""
        # Skip rate limiting for health checks and metrics
        if self._should_skip_rate_limit(request):
            return await call_next(request)

        # Get rate limit configuration for this request
        identifier, tier = self._get_rate_limit_identifier_and_tier(request)

        # Check rate limits
        rate_limit_info = self._check_rate_limits(identifier, tier)

        if rate_limit_info.retry_after is not None:
            # Rate limit exceeded
            return self._create_rate_limit_response(rate_limit_info, tier)

        # Record the request
        self._record_request(identifier, tier)

        # Process the request
        response = await call_next(request)

        # Add quota headers to response
        self._add_quota_headers(response, rate_limit_info, tier)

        # Periodic cleanup
        self._periodic_cleanup()

        return response
    
    def _should_skip_rate_limit(self, request: Request) -> bool:
        """Check if request should skip rate limiting."""
        skip_paths = [
            "/health",
            "/metrics",
            "/docs",
            "/openapi.json",
            "/redoc"
        ]

        path = request.url.path
        return any(path.startswith(skip_path) for skip_path in skip_paths)
    
    def _get_rate_limit_identifier_and_tier(
        self,
        request: Request
    ) -> Tuple[str, RateLimitConfig]:
        """
        Get rate limit identifier and tier for the request.

        Returns:
            Tuple of (identifier, rate_limit_config)
        """
        # Try to get user from JWT token
        user_id = self._extract_user_from_token(request)

        if user_id:
            # User is authenticated - use user-based rate limiting
            identifier = f"user:{user_id}"
            tier = self._get_user_tier(user_id)
        else:
            # Anonymous user - use IP-based rate limiting
            identifier = f"ip:{self._get_client_ip(request)}"
            tier = self.default_tier

        return identifier, tier
    
    def _extract_user_from_token(self, request: Request) -> Optional[str]:
        """Extract user ID from JWT token in Authorization header."""
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]

        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=["HS256"]
            )

            # Check if it's an access token
            if payload.get("type") != "access":
                return None

            return payload.get("sub") or payload.get("id")

        except JWTError:
            return None
    
    def _get_user_tier(self, user_id: str) -> RateLimitConfig:
        """
        Get rate limit tier for a user.

        This could be extended to check user roles, subscription status, etc.
        For now, returns authenticated tier for all authenticated users.
        """
        if user_id in self.user_tiers:
            return self.user_tiers[user_id]

        # Default to authenticated tier
        # In a real implementation, you might check user roles here
        tier = RateLimitTiers.AUTHENTICATED
        self.user_tiers[user_id] = tier
        return tier
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address with proxy support."""
        # Check for forwarded headers first (for reverse proxies)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fallback to direct connection
        return request.client.host if request.client else "unknown"
    
    def _check_rate_limits(
        self,
        identifier: str,
        tier: RateLimitConfig
    ) -> RateLimitInfo:
        """Check if request exceeds rate limits."""
        now = time.time()

        # Get current request windows
        rate_window = self.rate_limits[identifier]
        burst_window = self.burst_limits[identifier]

        # Clean old requests
        self._clean_old_requests(
            rate_window, now - tier.window_size_seconds
        )
        self._clean_old_requests(burst_window, now - 1)  # 1 second burst

        # Check burst limit (requests per second)
        if len(burst_window) >= tier.burst_limit:
            return RateLimitInfo(
                limit=tier.burst_limit,
                remaining=0,
                reset_time=int(now + 1),
                retry_after=1
            )

        # Check rate limit (requests per minute)
        if len(rate_window) >= tier.requests_per_minute:
            oldest_request = rate_window[0] if rate_window else now
            reset_time = int(oldest_request + tier.window_size_seconds)
            retry_after = max(1, int(reset_time - now))

            return RateLimitInfo(
                limit=tier.requests_per_minute,
                remaining=0,
                reset_time=reset_time,
                retry_after=retry_after
            )

        # Calculate remaining requests
        remaining = tier.requests_per_minute - len(rate_window)
        reset_time = int(now + tier.window_size_seconds)

        return RateLimitInfo(
            limit=tier.requests_per_minute,
            remaining=remaining,
            reset_time=reset_time
        )
    
    def _record_request(self, identifier: str, tier: RateLimitConfig):
        """Record a request for rate limiting."""
        now = time.time()

        # Add to both windows
        self.rate_limits[identifier].append(now)
        self.burst_limits[identifier].append(now)
    
    def _clean_old_requests(self, window: deque, cutoff_time: float):
        """Remove old requests from the window."""
        while window and window[0] < cutoff_time:
            window.popleft()
    
    def _create_rate_limit_response(
        self,
        rate_limit_info: RateLimitInfo,
        tier: RateLimitConfig
    ) -> JSONResponse:
        """Create rate limit exceeded response."""
        headers = {
            "Retry-After": str(rate_limit_info.retry_after),
            "X-RateLimit-Limit": str(rate_limit_info.limit),
            "X-RateLimit-Remaining": str(rate_limit_info.remaining),
            "X-RateLimit-Reset": str(rate_limit_info.reset_time),
            "X-RateLimit-Tier": self._get_tier_name(tier)
        }

        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Rate limit exceeded. Please try again later.",
                    "details": {
                        "limit": rate_limit_info.limit,
                        "remaining": rate_limit_info.remaining,
                        "reset_time": rate_limit_info.reset_time,
                        "retry_after": rate_limit_info.retry_after,
                        "tier": self._get_tier_name(tier)
                    }
                }
            },
            headers=headers
        )
    
    def _add_quota_headers(
        self,
        response: Response,
        rate_limit_info: RateLimitInfo,
        tier: RateLimitConfig
    ):
        """Add quota information headers to response."""
        response.headers["X-RateLimit-Limit"] = str(rate_limit_info.limit)
        response.headers["X-RateLimit-Remaining"] = str(rate_limit_info.remaining)
        response.headers["X-RateLimit-Reset"] = str(rate_limit_info.reset_time)
        response.headers["X-RateLimit-Tier"] = self._get_tier_name(tier)

        # Add additional quota information
        response.headers["X-RateLimit-Burst-Limit"] = str(tier.burst_limit)
        response.headers["X-RateLimit-Hourly-Limit"] = str(tier.requests_per_hour)
    
    def _get_tier_name(self, tier: RateLimitConfig) -> str:
        """Get human-readable tier name."""
        if tier == RateLimitTiers.ANONYMOUS:
            return "anonymous"
        elif tier == RateLimitTiers.AUTHENTICATED:
            return "authenticated"
        elif tier == RateLimitTiers.PREMIUM:
            return "premium"
        elif tier == RateLimitTiers.ADMIN:
            return "admin"
        else:
            return "custom"
    
    def _periodic_cleanup(self):
        """Periodically clean up old rate limit data."""
        now = time.time()
        if now - self.last_cleanup < self.cleanup_interval:
            return

        self.last_cleanup = now

        # Clean up empty rate limit entries
        cutoff_time = now - 3600  # 1 hour ago

        identifiers_to_remove = []
        for identifier, window in self.rate_limits.items():
            self._clean_old_requests(window, cutoff_time)
            if not window:
                identifiers_to_remove.append(identifier)

        for identifier in identifiers_to_remove:
            self.rate_limits.pop(identifier, None)
            self.burst_limits.pop(identifier, None)
            self.user_tiers.pop(identifier.replace("user:", ""), None)

        logger.info(
            f"Rate limit cleanup completed. "
            f"Active identifiers: {len(self.rate_limits)}"
        )
    
    def get_rate_limit_stats(self) -> Dict:
        """Get current rate limiting statistics."""
        stats = {
            "total_identifiers": len(self.rate_limits),
            "active_users": 0,
            "active_ips": 0,
            "tier_distribution": defaultdict(int)
        }

        for identifier in self.rate_limits.keys():
            if identifier.startswith("user:"):
                stats["active_users"] += 1
            elif identifier.startswith("ip:"):
                stats["active_ips"] += 1

        return stats


# Factory function for easy configuration
def create_v2_rate_limit_middleware(
    default_tier: RateLimitConfig = RateLimitTiers.ANONYMOUS,
    cleanup_interval: int = 300
) -> V2RateLimitMiddleware:
    """
    Factory function to create V2RateLimitMiddleware with custom configuration.

    Args:
        default_tier: Default rate limit tier for anonymous users
        cleanup_interval: Interval in seconds for periodic cleanup

    Returns:
        Configured V2RateLimitMiddleware instance
    """
    def middleware_factory(app):
        return V2RateLimitMiddleware(
            app=app,
            default_tier=default_tier,
            cleanup_interval=cleanup_interval
        )

    return middleware_factory
