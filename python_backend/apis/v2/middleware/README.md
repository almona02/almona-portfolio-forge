# V2 API Rate Limiting Middleware

This module provides enhanced rate limiting middleware specifically designed for the v2 APIs, offering user-based and IP-based rate limiting with proper quota headers and different rate limit tiers.

## Features

- **User-based Rate Limiting**: Authenticated users get higher rate limits based on JWT tokens
- **IP-based Fallback**: Anonymous users are rate limited by IP address
- **Multiple Rate Limit Tiers**: Different limits for anonymous, authenticated, premium, and admin users
- **Proper Quota Headers**: Standard `X-RateLimit-*` headers in all responses
- **Sliding Window Algorithm**: More accurate rate limiting than fixed windows
- **Burst Protection**: Prevents rapid-fire requests within short time periods
- **Configurable Limits**: All limits configurable via environment variables
- **Automatic Cleanup**: Periodic cleanup of old rate limit data

## Rate Limit Tiers

### Anonymous Users (IP-based)
- **Per Minute**: 30 requests
- **Per Hour**: 500 requests  
- **Burst Limit**: 5 requests per second

### Authenticated Users
- **Per Minute**: 100 requests
- **Per Hour**: 2000 requests
- **Burst Limit**: 15 requests per second

### Premium Users
- **Per Minute**: 200 requests
- **Per Hour**: 5000 requests
- **Burst Limit**: 30 requests per second

### Admin Users
- **Per Minute**: 500 requests
- **Per Hour**: 10000 requests
- **Burst Limit**: 50 requests per second

## Configuration

Rate limits can be configured via environment variables:

```bash
# Enable/disable rate limiting
RATE_LIMIT_ENABLED=true

# Anonymous user limits
RATE_LIMIT_ANONYMOUS_PER_MINUTE=30
RATE_LIMIT_ANONYMOUS_PER_HOUR=500
RATE_LIMIT_ANONYMOUS_BURST=5

# Authenticated user limits
RATE_LIMIT_AUTHENTICATED_PER_MINUTE=100
RATE_LIMIT_AUTHENTICATED_PER_HOUR=2000
RATE_LIMIT_AUTHENTICATED_BURST=15

# Premium user limits
RATE_LIMIT_PREMIUM_PER_MINUTE=200
RATE_LIMIT_PREMIUM_PER_HOUR=5000
RATE_LIMIT_PREMIUM_BURST=30

# Admin user limits
RATE_LIMIT_ADMIN_PER_MINUTE=500
RATE_LIMIT_ADMIN_PER_HOUR=10000
RATE_LIMIT_ADMIN_BURST=50

# Cleanup interval (seconds)
RATE_LIMIT_CLEANUP_INTERVAL=300
```

## Response Headers

The middleware adds the following headers to all responses:

- `X-RateLimit-Limit`: Maximum requests allowed per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets
- `X-RateLimit-Tier`: Current rate limit tier (anonymous, authenticated, premium, admin)
- `X-RateLimit-Burst-Limit`: Maximum burst requests per second
- `X-RateLimit-Hourly-Limit`: Maximum requests per hour

## Rate Limit Exceeded Response

When rate limits are exceeded, the API returns a 429 status code with the following response:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset_time": 1640995200,
      "retry_after": 45,
      "tier": "authenticated"
    }
  }
}
```

Additional headers:
- `Retry-After`: Seconds to wait before retrying

## User Identification

The middleware identifies users in the following priority order:

1. **JWT Token**: If a valid Bearer token is provided in the Authorization header
2. **IP Address**: Falls back to client IP address for anonymous users

### JWT Token Requirements

The JWT token must:
- Be valid and signed with the configured secret key
- Have `type: "access"` in the payload
- Have a `sub` or `id` field containing the user identifier
- Not be expired

## Implementation Details

### Sliding Window Algorithm

The middleware uses a sliding window algorithm for more accurate rate limiting:

1. Each request is recorded with a timestamp
2. Old requests outside the window are removed
3. Current request count is checked against the limit
4. Requests are allowed or denied based on the count

### Memory Management

- Rate limit data is stored in memory using `defaultdict(deque)`
- Periodic cleanup removes old data every 5 minutes (configurable)
- Empty rate limit entries are automatically removed

### Performance Considerations

- Rate limiting is performed before request processing
- Minimal overhead for each request
- Memory usage scales with active users/IPs
- Cleanup prevents memory leaks

## Usage

The middleware is automatically applied to all v2 API endpoints when the v2 app is created. No additional configuration is required.

### Testing Rate Limits

You can test rate limits using the `/api/v2/rate-limits` endpoint to see current configuration:

```bash
curl -X GET "http://localhost:8000/api/v2/rate-limits"
```

### Monitoring

The middleware provides statistics via the `get_rate_limit_stats()` method:

```python
from apis.v2.middleware.rate_limiting import V2RateLimitMiddleware

# Get current statistics
stats = middleware.get_rate_limit_stats()
print(f"Active users: {stats['active_users']}")
print(f"Active IPs: {stats['active_ips']}")
```

## Error Handling

Rate limit errors are handled by the v2 error handling system and return consistent error responses with proper HTTP status codes and headers.

## Security Considerations

- Rate limits help prevent abuse and DoS attacks
- Different tiers provide appropriate limits for different user types
- IP-based fallback ensures anonymous users are still limited
- Burst protection prevents rapid-fire attacks
- Cleanup prevents memory exhaustion attacks

## Troubleshooting

### Rate Limits Too Restrictive

If rate limits are too restrictive, adjust the configuration:

1. Increase the limits in environment variables
2. Restart the application
3. Monitor usage patterns

### Rate Limits Not Working

Check the following:

1. Ensure `RATE_LIMIT_ENABLED=true`
2. Verify middleware is properly configured in the v2 app
3. Check logs for any middleware errors
4. Test with the `/api/v2/rate-limits` endpoint

### Memory Usage

If memory usage is high:

1. Reduce the cleanup interval
2. Monitor the number of active users/IPs
3. Consider implementing Redis-based storage for production

## Future Enhancements

Potential improvements for the future:

- Redis-based storage for distributed rate limiting
- Dynamic rate limit adjustment based on user behavior
- Rate limit bypass for trusted IPs
- Integration with user subscription tiers
- Rate limit analytics and reporting
