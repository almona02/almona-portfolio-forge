"""
Advanced rate limiting with Redis for distributed environments
"""

import redis
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, Request
import hashlib

class AdvancedRateLimiter:
    def __init__(self, redis_client: redis.Redis, prefix: str = "rate_limit"):
        self.redis = redis_client
        self.prefix = prefix
        
    def is_rate_limited(
        self,
        key: str,
        limit: int = 100,
        window: int = 60,  # seconds
        cost: int = 1
    ) -> Dict[str, Any]:
        """
        Check if request is rate limited using sliding window algorithm
        
        Returns:
            Dict with rate limit info and whether request is allowed
        """
        redis_key = f"{self.prefix}:{key}"
        current_time = datetime.utcnow().timestamp()
        window_start = current_time - window
        
        # Remove old requests
        self.redis.zremrangebyscore(redis_key, 0, window_start)
        
        # Count requests in window
        request_count = self.redis.zcard(redis_key)
        
        if request_count + cost > limit:
            # Calculate retry after
            oldest_request = self.redis.zrange(redis_key, 0, 0, withscores=True)
            retry_after = int(window_start + window - current_time) if oldest_request else window
            
            return {
                "allowed": False,
                "limit": limit,
                "remaining": 0,
                "reset_in": retry_after,
                "retry_after": retry_after
            }
        
        # Add current request
        self.redis.zadd(redis_key, {f"{current_time}:{cost}": current_time})
        self.redis.expire(redis_key, window)
        
        return {
            "allowed": True,
            "limit": limit,
            "remaining": limit - (request_count + cost),
            "reset_in": window,
            "retry_after": None
        }
    
    def get_client_key(self, request: Request) -> str:
        """Generate rate limit key from request"""
        # Use client IP + user agent
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        
        # For authenticated users, use user ID
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            return f"user:{user_id}"
        
        # For API keys
        api_key = request.headers.get("x-api-key")
        if api_key:
            return f"api_key:{api_key}"
        
        # Fallback to IP + user agent hash
        key_str = f"{client_ip}:{user_agent}"
        return f"ip:{hashlib.sha256(key_str.encode()).hexdigest()[:16]}"

