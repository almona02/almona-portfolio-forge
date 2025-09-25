# V2 API Error Handling Framework

This module provides a comprehensive error handling framework for the v2 APIs, ensuring consistent error responses across all endpoints.

## Features

- **Custom Exception Classes**: Domain-specific error classes for different types of errors
- **Global Error Handlers**: Consistent error response formatting across all v2 endpoints
- **Structured Error Responses**: Standardized JSON error responses with detailed context
- **Request Context**: Automatic capture of request context for better debugging
- **Supabase Integration**: Specialized error handling for Supabase database operations
- **Rate Limiting**: Built-in rate limiting error handling
- **OpenAPI Documentation**: Automatic error response documentation

## Error Classes

### Base Classes

- `V2APIError`: Base class for all v2 API errors
- `V2ErrorContext`: Extended error context with v2-specific fields

### Quote-Specific Errors

- `QuoteNotFoundError`: Quote not found (404)
- `QuoteAlreadyExistsError`: Quote already exists (409)
- `QuoteValidationError`: Quote validation failed (422)

### Ticket-Specific Errors

- `TicketNotFoundError`: Ticket not found (404)
- `TicketPermissionError`: Ticket permission denied (403)
- `TicketValidationError`: Ticket validation failed (422)

### Authentication/Authorization Errors

- `V2UnauthorizedError`: Authentication required (401)
- `V2ForbiddenError`: Insufficient permissions (403)

### External Service Errors

- `SupabaseError`: Supabase database errors (502)
- `ExternalServiceError`: External API errors (502)

### Rate Limiting Errors

- `RateLimitError`: Rate limit exceeded (429)

## Error Response Format

All v2 API errors follow a consistent JSON response format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2024-01-01T00:00:00Z",
    "path": "/api/v2/endpoint",
    "method": "GET",
    "request_id": "req_123456789",
    "correlation_id": "corr_123456789",
    "details": {
      "field": "field_name",
      "validation_errors": [...],
      "resource_type": "quote",
      "resource_id": "123"
    },
    "retry_after": 60
  }
}
```

## Usage Examples

### Basic Error Handling

```python
from apis.v2.core.errors import QuoteNotFoundError, create_error_context

# In your endpoint
def get_quote(quote_id: str, request: Request):
    quote = quote_service.get_quote(quote_id)
    if not quote:
        context = create_error_context(
            request=request,
            operation="get_quote",
            resource_id=quote_id
        )
        raise QuoteNotFoundError(quote_id, context)
    return quote
```

### Validation Error Handling

```python
from apis.v2.core.errors import QuoteValidationError, create_error_context

# In your endpoint
def create_quote(payload: QuoteCreateRequest, request: Request):
    if not payload.products and not payload.services:
        context = create_error_context(
            request=request,
            operation="create_quote"
        )
        raise QuoteValidationError(
            message="At least one product or service must be specified",
            field="products,services",
            context=context
        )
```

### Supabase Error Handling

```python
from apis.v2.core.errors import handle_supabase_error, create_error_context

# In your endpoint
def create_quote(payload: QuoteCreateRequest, request: Request):
    try:
        result = quote_service.create_quote(payload)
        return result
    except Exception as e:
        context = create_error_context(
            request=request,
            operation="create_quote"
        )
        raise handle_supabase_error(e, "create_quote", context)
```

## Error Handlers

The framework includes several error handlers that are automatically registered with the v2 router:

- `v2_error_handler`: Handles V2APIError instances
- `v2_validation_error_handler`: Handles Pydantic validation errors
- `v2_http_exception_handler`: Handles FastAPI HTTP exceptions
- `v2_general_exception_handler`: Handles unexpected errors

## Utility Functions

### `create_error_context()`

Creates an error context with request information and additional parameters:

```python
context = create_error_context(
    request=request,
    user_id="user-123",
    user_role="admin",
    operation="create_quote",
    resource_id="quote-456",
    additional_data={"field": "value"}
)
```

### `handle_supabase_error()`

Converts Supabase errors to appropriate V2 API errors:

```python
try:
    result = supabase.table("quotes").insert(data).execute()
except Exception as e:
    raise handle_supabase_error(e, "insert_quote", context)
```

## Error Codes

The framework uses standardized error codes:

### Validation Errors (4xx)
- `VALIDATION_ERROR`: General validation error
- `INVALID_INPUT`: Invalid input data
- `MISSING_REQUIRED_FIELD`: Required field missing
- `INVALID_FORMAT`: Invalid data format

### Authentication/Authorization (4xx)
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `INVALID_CREDENTIALS`: Invalid credentials
- `TOKEN_EXPIRED`: Token expired

### Resource Errors (4xx)
- `NOT_FOUND`: Resource not found
- `RESOURCE_CONFLICT`: Resource conflict
- `DUPLICATE_RESOURCE`: Duplicate resource

### Business Logic (4xx)
- `BUSINESS_RULE_VIOLATION`: Business rule violation
- `INSUFFICIENT_PERMISSIONS`: Insufficient permissions
- `OPERATION_NOT_ALLOWED`: Operation not allowed

### Server Errors (5xx)
- `INTERNAL_ERROR`: Internal server error
- `DATABASE_ERROR`: Database error
- `EXTERNAL_SERVICE_ERROR`: External service error
- `SERVICE_UNAVAILABLE`: Service unavailable

### V2-Specific Error Codes
- `QUOTE_NOT_FOUND`: Quote not found
- `QUOTE_ALREADY_EXISTS`: Quote already exists
- `QUOTE_VALIDATION_FAILED`: Quote validation failed
- `TICKET_NOT_FOUND`: Ticket not found
- `TICKET_PERMISSION_DENIED`: Ticket permission denied
- `SUPABASE_ERROR`: Supabase error
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded

## Testing

The framework includes comprehensive tests in `tests/test_error_handling.py`:

```bash
# Run error handling tests
pytest python_backend/apis/v2/tests/test_error_handling.py -v
```

## Integration

The error handling framework is automatically integrated with the v2 router in `apis/v2/routers/__init__.py`:

```python
from apis.v2.core.errors import (
    v2_error_handler,
    v2_validation_error_handler,
    v2_http_exception_handler,
    v2_general_exception_handler,
    V2APIError
)

router = APIRouter(prefix="/api/v2")

# Add error handlers
router.add_exception_handler(V2APIError, v2_error_handler)
router.add_exception_handler(RequestValidationError, v2_validation_error_handler)
router.add_exception_handler(HTTPException, v2_http_exception_handler)
router.add_exception_handler(Exception, v2_general_exception_handler)
```

## Best Practices

1. **Always use the error context**: Include request information for better debugging
2. **Use specific error types**: Choose the most appropriate error class for your use case
3. **Include helpful details**: Add relevant information to the error details
4. **Handle Supabase errors**: Use `handle_supabase_error()` for database operations
5. **Test error scenarios**: Write tests for error conditions
6. **Document error responses**: Use `COMMON_ERROR_RESPONSES` in your endpoint documentation

## Migration from v1

When migrating from v1 error handling:

1. Replace `HTTPException` with appropriate V2 error classes
2. Add error context using `create_error_context()`
3. Use `handle_supabase_error()` for database operations
4. Update error response expectations in tests
5. Add error response documentation to endpoints
