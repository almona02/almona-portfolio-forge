# Rate Limiting Implementation for V2 APIs

## Overview

A comprehensive rate limiting middleware has been implemented for the v2 APIs that provides user-based and IP-based rate limiting with proper quota headers and different rate limit tiers.

## Files Created/Modified

### New Files Created

1. **`python_backend/apis/v2/middleware/rate_limiting.py`**
   - Main rate limiting middleware implementation
   - Supports user-based and IP-based rate limiting
   - Implements sliding window algorithm
   - Provides proper quota headers

2. **`python_backend/apis/v2/middleware/config.py`**
   - Configuration helpers for rate limiting
   - Integrates with main settings
   - Provides tier management

3. **`python_backend/apis/v2/middleware/__init__.py`**
   - Package initialization for middleware

4. **`python_backend/apis/v2/app.py`**
   - V2-specific FastAPI application factory
   - Includes rate limiting middleware
   - Provides rate limit info endpoints

5. **`python_backend/apis/v2/middleware/README.md`**
   - Comprehensive documentation for the rate limiting system

6. **`python_backend/apis/v2/tests/test_rate_limiting.py`**
   - Test suite for rate limiting functionality

7. **`python_backend/test_rate_limiting.py`**
   - Simple test script for manual testing

### Modified Files

1. **`python_backend/core/config.py`**
   - Added rate limiting configuration settings
   - Environment variable support for all rate limits

2. **`python_backend/apis/main.py`**
   - Updated to mount v2 app with rate limiting middleware

## Features Implemented

### Rate Limiting Tiers

- **Anonymous Users (IP-based)**: 30/min, 500/hour, 5 burst
- **Authenticated Users**: 100/min, 2000/hour, 15 burst  
- **Premium Users**: 200/min, 5000/hour, 30 burst
- **Admin Users**: 500/min, 10000/hour, 50 burst

### User Identification

- **JWT Token**: Extracts user ID from Bearer tokens
- **IP Fallback**: Uses client IP for anonymous users
- **Proxy Support**: Handles X-Forwarded-For and X-Real-IP headers

### Quota Headers

All responses include standard rate limit headers:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when rate limit resets
- `X-RateLimit-Tier`: Current rate limit tier
- `X-RateLimit-Burst-Limit`: Maximum burst requests per second
- `X-RateLimit-Hourly-Limit`: Maximum requests per hour

### Error Handling

- **429 Status Code**: Rate limit exceeded
- **Retry-After Header**: Seconds to wait before retrying
- **Structured Error Response**: JSON with error details
- **Consistent Format**: Follows v2 API error format

### Configuration

All rate limits configurable via environment variables:
```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_ANONYMOUS_PER_MINUTE=30
RATE_LIMIT_AUTHENTICATED_PER_MINUTE=100
# ... and more
```

## API Endpoints

### Rate Limit Information
- **GET** `/api/v2/rate-limits` - Get current rate limiting configuration
- **GET** `/api/v2/health` - Health check with rate limiting status

## Technical Implementation

### Sliding Window Algorithm
- Uses `deque` for efficient timestamp storage
- Automatic cleanup of old requests
- More accurate than fixed windows

### Memory Management
- In-memory storage with periodic cleanup
- Prevents memory leaks
- Scales with active users/IPs

### Performance
- Minimal overhead per request
- Rate limiting performed before request processing
- Efficient data structures

## Testing

### Automated Tests
- Comprehensive test suite in `test_rate_limiting.py`
- Tests all rate limiting scenarios
- Mock JWT tokens for authenticated users

### Manual Testing
- Simple test script for verification
- Can be run against running server

## Security Considerations

- **DoS Protection**: Prevents abuse and rapid-fire attacks
- **User Isolation**: Different users have separate rate limits
- **IP Fallback**: Anonymous users still limited by IP
- **Burst Protection**: Prevents rapid-fire attacks
- **Configurable Limits**: Easy to adjust based on needs

## Usage

The rate limiting middleware is automatically applied to all v2 API endpoints. No additional configuration is required beyond setting environment variables.

### Example Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
X-RateLimit-Tier: authenticated
X-RateLimit-Burst-Limit: 15
X-RateLimit-Hourly-Limit: 2000
```

### Example Rate Limit Exceeded Response
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

## Future Enhancements

- Redis-based storage for distributed rate limiting
- Dynamic rate limit adjustment based on user behavior
- Rate limit bypass for trusted IPs
- Integration with user subscription tiers
- Rate limit analytics and reporting

## Monitoring

The middleware provides statistics via the `get_rate_limit_stats()` method:
- Total active identifiers
- Active users vs IPs
- Tier distribution

## Troubleshooting

### Common Issues
1. **Rate limits too restrictive**: Adjust environment variables
2. **Rate limits not working**: Check `RATE_LIMIT_ENABLED=true`
3. **Memory usage**: Monitor active users/IPs, adjust cleanup interval

### Debugging
- Check `/api/v2/rate-limits` endpoint for configuration
- Monitor logs for middleware errors
- Use test script for verification
