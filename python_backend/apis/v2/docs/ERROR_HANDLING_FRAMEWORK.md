# V2 API Error Handling Framework

## Overview

The V2 API error handling framework provides a comprehensive, consistent, and internationalized approach to error handling across all v2 endpoints. It includes custom exception hierarchies, global error handlers, and Arabic/English language support.

## Features

- **Custom Exception Hierarchy**: Domain-specific error types with proper HTTP status mapping
- **Global Error Handler Middleware**: Consistent error response formatting
- **Internationalization**: Arabic and English error message support
- **Structured Error Responses**: Consistent JSON error format with contextual information
- **Error Context**: Rich error context including user information, request details, and correlation IDs
- **Rate Limiting Integration**: Proper handling of rate limit exceeded errors
- **Database Error Handling**: Conversion of Supabase errors to user-friendly messages

## Architecture

### 1. Exception Hierarchy

```python
DomainError (base)
├── V2APIError (v2 base)
│   ├── V2ValidationError
│   ├── V2NotFoundError
│   ├── V2UnauthorizedError
│   ├── V2ForbiddenError
│   ├── QuoteValidationError
│   ├── QuoteNotFoundError
│   ├── QuoteAlreadyExistsError
│   ├── TicketValidationError
│   ├── TicketNotFoundError
│   ├── TicketPermissionError
│   ├── RateLimitError
│   ├── SupabaseError
│   └── ExternalServiceError
```

### 2. Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message",
    "timestamp": "2024-01-01T12:00:00Z",
    "path": "/api/v2/quotes/create",
    "method": "POST",
    "request_id": "req_123456",
    "correlation_id": "corr_789012",
    "details": {
      "field": "contact_name",
      "validation_errors": [...]
    },
    "messages": {
      "en": "English error message",
      "ar": "Arabic error message"
    },
    "retry_after": 60
  }
}
```

## Usage Examples

### 1. Quote Validation Errors

```python
# Missing required fields
raise QuoteValidationError(
    message="Contact name is required",
    field="contact_name"
)

# Multiple validation errors
raise QuoteValidationError(
    message="Validation failed",
    field="contact_email",
    validation_errors=[
        {
            "type": "value_error.email",
            "message": "Invalid email format",
            "input": "invalid-email"
        }
    ]
)
```

### 2. Ticket Permission Errors

```python
# Insufficient permissions
raise TicketPermissionError(
    message="Only staff can assign tickets",
    required_role="admin, technician, or sales_rep",
    user_role="customer"
)
```

### 3. Database Errors

```python
# Supabase error handling
try:
    result = supabase.table("quotes").insert(data).execute()
except Exception as e:
    raise SupabaseError(
        message="Failed to create quote",
        operation="insert_quote",
        original_error=e
    )
```

### 4. Rate Limiting Errors

```python
# Rate limit exceeded
raise RateLimitError(
    message="Rate limit exceeded",
    retry_after=60,
    limit_type="per_minute"
)
```

## Internationalization

### Error Message Files

Error messages are stored in locale files:

- `locales/en/errors.json` - English messages
- `locales/ar/errors.json` - Arabic messages

### Using Localized Messages

```python
# Get localized error message
localized = error_translator.get_localized_error(
    "QUOTE_VALIDATION_ERROR",
    field="contact_name"
)

# English: "Quote validation failed for field: contact_name"
# Arabic: "فشل التحقق من صحة عرض السعر للحقل: contact_name"
```

### Language Detection

The framework automatically detects the user's language preference from the `Accept-Language` header:

```http
Accept-Language: ar  # Returns Arabic messages
Accept-Language: en  # Returns English messages
```

## Error Context

### Creating Error Context

```python
context = create_error_context(
    request=request,
    user_id="user123",
    user_role="customer",
    operation="create_quote",
    resource_id="quote456",
    additional_data={"test": "value"}
)
```

### Context Information

The error context includes:

- **User Information**: `user_id`, `user_role`
- **Request Details**: `endpoint`, `method`, `request_id`
- **Operation Context**: `operation`, `resource_id`
- **Additional Data**: Custom context information
- **Correlation ID**: For request tracing

## Global Error Handler

### Middleware Integration

The error handling middleware is automatically integrated into the v2 app:

```python
# In apis/v2/app.py
app.add_middleware(V2ErrorHandlerMiddleware)
```

### Exception Handlers

The framework includes handlers for:

- `V2APIError` - Custom v2 API errors
- `RequestValidationError` - Pydantic validation errors
- `HTTPException` - FastAPI HTTP exceptions
- `Exception` - Unexpected errors

## Service Layer Integration

### Quote Service Example

```python
class QuoteService:
    def create_quote_with_items(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            # Validate required fields
            if not payload.get("contact_name"):
                raise QuoteValidationError(
                    message="Contact name is required",
                    field="contact_name"
                )
            
            # Database operations
            try:
                row = self._repo.insert_quote(insert_data)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to create quote",
                    operation="insert_quote",
                    original_error=e
                )
            
            return result
            
        except (QuoteValidationError, SupabaseError):
            # Re-raise our custom errors
            raise
        except Exception as e:
            # Convert unexpected errors
            raise SupabaseError(
                message="Unexpected error in quote creation",
                operation="create_quote_with_items",
                original_error=e
            )
```

### Ticket Service Example

```python
class TicketService:
    def create_ticket(self, category: TicketCategory, payload: UnifiedTicketBase, user_id: UUID) -> TicketResponse:
        try:
            # Validate required fields
            if not payload.title:
                raise TicketValidationError(
                    message="Ticket title is required",
                    field="title"
                )
            
            # Create ticket
            try:
                row = self._repo.insert_ticket(data)
            except Exception as e:
                raise SupabaseError(
                    message="Failed to create ticket",
                    operation="insert_ticket",
                    original_error=e
                )
            
            return TicketResponse(**row)
            
        except (TicketValidationError, SupabaseError):
            raise
        except Exception as e:
            raise SupabaseError(
                message="Unexpected error in ticket creation",
                operation="create_ticket",
                original_error=e
            )
```

## Router Integration

### Quote Router Example

```python
@router.post("/create", response_model=QuoteCreateResponse, responses=COMMON_ERROR_RESPONSES)
def create_quote(
    request: Request,
    payload: QuoteCreateRequest = Body(...),
    supabase: Client = Depends(get_supabase),
):
    service = QuoteService(supabase)
    
    # Validate payload
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
    
    try:
        result = service.create_quote_with_items(payload.dict())
    except (QuoteValidationError, QuoteAlreadyExistsError):
        # Re-raise our custom errors directly
        raise
    except Exception as exc:
        context = create_error_context(
            request=request,
            operation="create_quote",
            additional_data={
                "contact_email": payload.contact_email,
                "products_count": len(payload.products),
                "services_count": len(payload.services)
            }
        )
        raise handle_supabase_error(exc, "create_quote_with_items", context)
    
    return QuoteCreateResponse(**result)
```

### Ticket Router Example

```python
@router.post("/support", response_model=TicketResponse, responses=COMMON_ERROR_RESPONSES)
def create_support_ticket(
    request: Request,
    ticket: SupportTicketCreate,
    supabase: Client = Depends(get_supabase),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        svc = TicketService(supabase)
        return svc.create_ticket(
            category=ticket.category,
            payload=ticket.payload,
            user_id=_user_uuid(current_user),
        )
    except (TicketValidationError, TicketPermissionError):
        # Re-raise our custom errors directly
        raise
    except Exception as e:
        context = create_error_context(
            request=request,
            user_id=str(_user_uuid(current_user)),
            operation="create_support_ticket",
            additional_data={
                "category": ticket.category.value
            }
        )
        raise handle_supabase_error(e, "create_ticket", context)
```

## Testing

### Test Examples

```python
def test_quote_validation_error_english(client):
    """Test quote validation error in English."""
    response = client.post(
        "/api/v2/quotes/create",
        json={
            "contact_name": "",  # Empty name should trigger validation error
            "contact_email": "test@example.com",
            "products": []
        },
        headers={"Accept-Language": "en"}
    )
    
    assert response.status_code == 422
    data = response.json()
    
    # Check error structure
    assert "error" in data
    assert data["error"]["code"] == "QUOTE_ITEM_VALIDATION_FAILED"
    assert "Contact name is required" in data["error"]["message"]
    assert data["error"]["path"] == "/api/v2/quotes/create"
    assert data["error"]["method"] == "POST"
    assert "timestamp" in data["error"]
    
    # Check details
    assert "details" in data["error"]
    assert data["error"]["details"]["field"] == "contact_name"

def test_quote_validation_error_arabic(client):
    """Test quote validation error in Arabic."""
    response = client.post(
        "/api/v2/quotes/create",
        json={
            "contact_name": "",
            "contact_email": "test@example.com",
            "products": []
        },
        headers={"Accept-Language": "ar"}
    )
    
    assert response.status_code == 422
    data = response.json()
    
    # Check error structure
    assert "error" in data
    assert data["error"]["code"] == "QUOTE_ITEM_VALIDATION_FAILED"
    # Should contain Arabic message
    assert "messages" in data["error"]
    assert "ar" in data["error"]["messages"]
    assert "en" in data["error"]["messages"]
```

## Error Codes

### General Errors
- `VALIDATION_ERROR` - General validation error
- `INTERNAL_ERROR` - Internal server error
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions

### Quote-Specific Errors
- `QUOTE_NOT_FOUND` - Quote not found
- `QUOTE_ALREADY_EXISTS` - Quote already exists
- `QUOTE_VALIDATION_ERROR` - Quote validation failed
- `QUOTE_CALCULATION_ERROR` - Quote calculation error

### Ticket-Specific Errors
- `TICKET_NOT_FOUND` - Ticket not found
- `TICKET_VALIDATION_ERROR` - Ticket validation failed
- `TICKET_PERMISSION_DENIED` - Ticket permission denied
- `TICKET_ASSIGNMENT_FAILED` - Ticket assignment failed

### External Service Errors
- `SUPABASE_ERROR` - Database error
- `EXTERNAL_API_ERROR` - External service error
- `INTEGRATION_ERROR` - Integration service error

### Rate Limiting Errors
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `QUOTA_EXCEEDED` - Quota exceeded

## Best Practices

### 1. Use Specific Error Types

```python
# Good: Use specific error type
raise QuoteValidationError(
    message="Contact name is required",
    field="contact_name"
)

# Avoid: Generic error
raise HTTPException(status_code=422, detail="Validation failed")
```

### 2. Include Rich Context

```python
# Good: Include context information
context = create_error_context(
    request=request,
    user_id=user_id,
    operation="create_quote",
    resource_id=quote_id
)
raise QuoteNotFoundError(quote_id, context)

# Avoid: Minimal context
raise QuoteNotFoundError(quote_id)
```

### 3. Handle Errors at the Right Level

```python
# Service layer: Convert database errors to domain errors
try:
    result = self._repo.insert_quote(data)
except Exception as e:
    raise SupabaseError(
        message="Failed to create quote",
        operation="insert_quote",
        original_error=e
    )

# Router layer: Handle domain errors
try:
    result = service.create_quote(payload)
except (QuoteValidationError, QuoteAlreadyExistsError):
    raise  # Re-raise domain errors
except Exception as e:
    raise handle_supabase_error(e, "create_quote", context)
```

### 4. Use Localized Messages

```python
# Good: Use localized messages
error = QuoteValidationError(
    message="Contact name is required",
    field="contact_name"
)
# Automatically includes English and Arabic messages

# Avoid: Hard-coded messages
error = QuoteValidationError(
    message="Contact name is required",  # Only English
    field="contact_name"
)
```

## Configuration

### Environment Variables

```bash
# Error handling configuration
ERROR_LOG_LEVEL=INFO
ERROR_INCLUDE_TRACEBACK=false
ERROR_CORRELATION_ID_HEADER=X-Correlation-ID
```

### Middleware Configuration

```python
# In apis/v2/app.py
app.add_middleware(
    V2ErrorHandlerMiddleware,
    include_traceback=settings.DEBUG,
    log_errors=True
)
```

## Monitoring and Logging

### Error Logging

All errors are automatically logged with structured information:

```python
{
    "error_code": "QUOTE_VALIDATION_ERROR",
    "error_message": "Contact name is required",
    "status_code": 422,
    "user_id": "user123",
    "request_id": "req_456",
    "operation": "create_quote",
    "resource_id": "quote789",
    "details": {"field": "contact_name"}
}
```

### Error Metrics

The framework tracks error metrics:

- Error counts by type
- Error rates by endpoint
- User error patterns
- Performance impact of errors

## Troubleshooting

### Common Issues

1. **Missing Error Messages**: Ensure locale files are properly loaded
2. **Incorrect Status Codes**: Check error type inheritance
3. **Missing Context**: Verify error context creation
4. **Language Detection**: Check Accept-Language header handling

### Debug Mode

Enable debug mode for detailed error information:

```python
# In development
ERROR_LOG_LEVEL=DEBUG
ERROR_INCLUDE_TRACEBACK=true
```

This will include full stack traces and additional debugging information in error responses.

## Migration Guide

### From v1 to v2 Error Handling

1. **Replace HTTPException**: Use domain-specific error types
2. **Add Error Context**: Include request and user context
3. **Implement Localization**: Add Arabic/English support
4. **Update Tests**: Test error responses and localization

### Example Migration

```python
# v1: Basic error handling
@router.post("/quotes")
def create_quote(payload: QuoteRequest):
    if not payload.contact_name:
        raise HTTPException(status_code=422, detail="Contact name required")
    # ...

# v2: Comprehensive error handling
@router.post("/quotes", responses=COMMON_ERROR_RESPONSES)
def create_quote(request: Request, payload: QuoteRequest):
    if not payload.contact_name:
        context = create_error_context(request=request, operation="create_quote")
        raise QuoteValidationError(
            message="Contact name is required",
            field="contact_name",
            context=context
        )
    # ...
```

## Conclusion

The V2 API error handling framework provides a robust, consistent, and user-friendly approach to error handling. It ensures that all errors are properly categorized, localized, and include rich contextual information for debugging and monitoring.

Key benefits:

- **Consistency**: All errors follow the same format and structure
- **Internationalization**: Support for Arabic and English languages
- **Rich Context**: Detailed error information for debugging
- **Type Safety**: Domain-specific error types with proper inheritance
- **Monitoring**: Structured logging and error tracking
- **User Experience**: Clear, actionable error messages

This framework significantly improves the developer experience and makes the API more accessible to international users.
