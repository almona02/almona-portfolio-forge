# Almona Industrial API Python SDK

A comprehensive Python client for the Almona Industrial API, providing easy access to all API endpoints with automatic authentication, error handling, and retry logic.

## Features

- 🔒 **Automatic Authentication**: JWT token management with automatic refresh
- 📝 **Type Safety**: Full type hints and Pydantic models for data validation
- 🔄 **Error Handling**: Structured error handling with detailed error information
- ⚡ **Retry Logic**: Automatic retry for failed requests with exponential backoff
- 🚀 **Async Support**: Both synchronous and asynchronous client implementations
- 📊 **Request/Response Logging**: Optional debug logging for development
- 🎯 **Zero Dependencies**: Uses only standard libraries and requests/aiohttp
- 📦 **Easy Installation**: Simple pip install with minimal dependencies

## Installation

```bash
pip install almona-industrial-api
```

For async support:
```bash
pip install almona-industrial-api[async]
```

For development:
```bash
pip install almona-industrial-api[dev]
```

## Quick Start

### Synchronous Client

```python
from almona import AlmonaAPIClient

# Create client instance
client = AlmonaAPIClient(base_url="https://api.almona.com")

# Authenticate
client.authenticate("user@example.com", "password")

# Create a support ticket
ticket = client.create_support_ticket({
    "category": "support",
    "payload": {
        "title": "Machine Issue",
        "description": "Hydraulic pump failure on CNC machine",
        "priority": "high",
        "machine_id": "550e8400-e29b-41d4-a716-446655440000"
    }
})

print(f"Created ticket: {ticket.ticket_number}")
```

### Asynchronous Client

```python
import asyncio
from almona import AsyncAlmonaAPIClient

async def main():
    async with AsyncAlmonaAPIClient(base_url="https://api.almona.com") as client:
        # Authenticate
        await client.authenticate("user@example.com", "password")
        
        # Create a support ticket
        ticket = await client.create_support_ticket({
            "category": "support",
            "payload": {
                "title": "Machine Issue",
                "description": "Hydraulic pump failure on CNC machine",
                "priority": "high",
                "machine_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        })
        
        print(f"Created ticket: {ticket.ticket_number}")

# Run the async function
asyncio.run(main())
```

## Configuration

```python
from almona import AlmonaAPIClient, AlmonaAPIConfig

# Using configuration object
config = AlmonaAPIConfig(
    base_url="https://api.almona.com",
    api_key="your-api-key",  # Optional
    timeout=30,              # Request timeout in seconds
    retries=3,               # Number of retries
    debug=False,             # Enable debug logging
    verify_ssl=True          # Verify SSL certificates
)

client = AlmonaAPIClient(config)

# Or using dictionary
client = AlmonaAPIClient({
    "base_url": "https://api.almona.com",
    "timeout": 30,
    "debug": True
})

# Or using just the base URL
client = AlmonaAPIClient("https://api.almona.com")
```

## Authentication

### Email/Password Authentication

```python
# Authenticate with email and password
token = client.authenticate("user@example.com", "password")

# Tokens are automatically stored and used for subsequent requests
print(f"Access token: {token.access_token}")
print(f"Token type: {token.token_type}")
```

### Manual Token Management

```python
# Set tokens manually
client.access_token = "your-access-token"
client.refresh_token = "your-refresh-token"

# Check authentication status
if client.access_token:
    print("Client is authenticated")

# Clear tokens
client.access_token = None
client.refresh_token = None
```

### Token Refresh

The client automatically handles token refresh when a 401 error is received. You can also manually refresh tokens:

```python
try:
    new_token = client.refresh_access_token()
    print("Token refreshed successfully")
except AuthenticationError as e:
    print(f"Token refresh failed: {e}")
    # Handle authentication failure
```

## Service Tickets

### Creating Tickets

```python
from almona import TicketCategory, TicketPriority

# Support ticket
support_ticket = client.create_support_ticket({
    "category": "support",
    "payload": {
        "title": "Machine Issue",
        "description": "Hydraulic pump failure",
        "priority": "high",
        "machine_id": "550e8400-e29b-41d4-a716-446655440000"
    }
})

# Preventive maintenance ticket
maintenance_ticket = client.create_preventive_maintenance_ticket({
    "category": "preventive_maintenance",
    "payload": {
        "title": "Monthly Maintenance",
        "description": "Scheduled monthly maintenance",
        "priority": "medium",
        "machine_id": "550e8400-e29b-41d4-a716-446655440000"
    },
    "maintenance_metadata": {
        "checklist_id": "checklist-001",
        "frequency_days": 30,
        "maintenance_type": "routine"
    }
})

# Emergency ticket
emergency_ticket = client.create_emergency_ticket({
    "category": "emergency_service",
    "payload": {
        "title": "Critical Machine Failure",
        "description": "Production line stopped",
        "priority": "critical",
        "machine_id": "550e8400-e29b-41d4-a716-446655440000"
    },
    "severity": "critical"
})
```

### Managing Tickets

```python
# Get ticket by ID
ticket = client.get_ticket("550e8400-e29b-41d4-a716-446655440001")

# List tickets with filters
tickets = client.list_tickets(
    filters={
        "category": "support",
        "status": "open",
        "priority": "high"
    }
)

# Update ticket status
updated_ticket = client.update_ticket_status(
    "550e8400-e29b-41d4-a716-446655440001",
    "in_progress",
    "Technician assigned and working on the issue"
)

# Assign ticket
assigned_ticket = client.assign_ticket(
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
)

# Add message to ticket
message = client.add_ticket_message(
    "550e8400-e29b-41d4-a716-446655440001",
    "Issue has been identified and parts are being ordered",
    "update"
)

# Get ticket messages
messages = client.get_ticket_messages("550e8400-e29b-41d4-a716-446655440001")
```

## Quote Management

### Creating Quotes

```python
quote = client.create_quote({
    "contact_name": "Ahmed Hassan",
    "contact_email": "ahmed.hassan@company.com",
    "contact_phone": "+20 123 456 7890",
    "company": "Egyptian Manufacturing Co.",
    "project_description": "Upgrade production line with new CNC machines",
    "urgency": "urgent",
    "delivery_location": "Cairo Industrial Zone, Building 15, Floor 3",
    "products": [
        {
            "product_id": "prod-cnc-xyz2000",
            "quantity": 2,
            "unit_price": 1500.00
        }
    ],
    "services": [
        {
            "service_id": "svc-maintenance-monthly",
            "quantity": 1,
            "unit_price": 500.00
        }
    ],
    "special_requirements": "Installation during weekend hours",
    "machine_id": "550e8400-e29b-41d4-a716-446655440000"
})

print(f"Created quote: {quote.quote_number}")
```

### Looking Up Quotes

```python
# Search quotes by number, twin code, or portal reference
search_results = client.lookup_quotes("QUO-2024-001")

print(f"Found {search_results.count} quotes:")
for quote in search_results.results:
    print(f"- {quote.quote_number}: {quote.status} (${quote.total_amount})")
```

## Error Handling

The SDK provides structured error handling with detailed error information:

```python
from almona import AlmonaAPIError, AuthenticationError, ValidationError

try:
    ticket = client.create_support_ticket(ticket_data)
except AuthenticationError as e:
    print(f"Authentication failed: {e.message}")
    print(f"Error code: {e.code}")
except ValidationError as e:
    print(f"Validation failed: {e.message}")
    print(f"Details: {e.details}")
except AlmonaAPIError as e:
    print(f"API Error: {e.message}")
    print(f"Code: {e.code}")
    print(f"Status: {e.status_code}")
    print(f"Context: {e.context}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Advanced Usage

### Using Pydantic Models

```python
from almona import (
    SupportTicketCreate,
    UnifiedTicketBase,
    TicketPriority,
    QuoteCreateRequest,
    QuoteItem
)

# Create ticket using Pydantic models
ticket_data = SupportTicketCreate(
    category="support",
    payload=UnifiedTicketBase(
        title="Machine Issue",
        description="Hydraulic pump failure",
        priority=TicketPriority.HIGH,
        machine_id="550e8400-e29b-41d4-a716-446655440000"
    )
)

ticket = client.create_support_ticket(ticket_data)

# Create quote using Pydantic models
quote_data = QuoteCreateRequest(
    contact_name="Ahmed Hassan",
    contact_email="ahmed.hassan@company.com",
    products=[
        QuoteItem(
            product_id="prod-cnc-xyz2000",
            quantity=2,
            unit_price=1500.00
        )
    ]
)

quote = client.create_quote(quote_data)
```

### Pagination

```python
# List tickets with pagination
tickets = client.list_tickets(
    filters={"category": "support"},
    pagination={"page": 1, "limit": 20}
)
```

### Context Manager

```python
# Using context manager for automatic cleanup
with AlmonaAPIClient("https://api.almona.com") as client:
    client.authenticate("user@example.com", "password")
    ticket = client.create_support_ticket(ticket_data)
    # Session is automatically closed
```

### Debug Mode

```python
client = AlmonaAPIClient({
    "base_url": "https://api.almona.com",
    "debug": True  # Enable request/response logging
})
```

## Async Usage

### Basic Async Operations

```python
import asyncio
from almona import AsyncAlmonaAPIClient

async def main():
    async with AsyncAlmonaAPIClient("https://api.almona.com") as client:
        # Authenticate
        await client.authenticate("user@example.com", "password")
        
        # Create multiple tickets concurrently
        tasks = [
            client.create_support_ticket(ticket_data_1),
            client.create_support_ticket(ticket_data_2),
            client.create_support_ticket(ticket_data_3)
        ]
        
        tickets = await asyncio.gather(*tasks)
        
        for ticket in tickets:
            print(f"Created ticket: {ticket.ticket_number}")

asyncio.run(main())
```

### Async Error Handling

```python
async def create_ticket_safely(client, ticket_data):
    try:
        return await client.create_support_ticket(ticket_data)
    except AlmonaAPIError as e:
        print(f"Failed to create ticket: {e.message}")
        return None

async def main():
    async with AsyncAlmonaAPIClient("https://api.almona.com") as client:
        await client.authenticate("user@example.com", "password")
        
        ticket = await create_ticket_safely(client, ticket_data)
        if ticket:
            print(f"Successfully created ticket: {ticket.ticket_number}")
```

## Type Hints and IDE Support

The SDK provides comprehensive type hints for better development experience:

```python
from typing import List
from almona import AlmonaAPIClient, TicketResponse, QuoteCreateResponse

def process_tickets(client: AlmonaAPIClient) -> List[TicketResponse]:
    """Process tickets with full type support."""
    tickets = client.list_tickets(filters={"status": "open"})
    # IDE will provide autocomplete and type checking
    return [ticket for ticket in tickets if ticket.priority == "high"]

def create_quote(client: AlmonaAPIClient, quote_data: dict) -> QuoteCreateResponse:
    """Create quote with type safety."""
    return client.create_quote(quote_data)
```

## Environment Support

### Production Environment

```python
import os
from almona import AlmonaAPIClient

client = AlmonaAPIClient({
    "base_url": os.getenv("ALMONA_API_URL", "https://api.almona.com"),
    "api_key": os.getenv("ALMONA_API_KEY"),
    "timeout": 30,
    "debug": False
})
```

### Development Environment

```python
client = AlmonaAPIClient({
    "base_url": "http://localhost:8000",
    "debug": True,
    "verify_ssl": False
})
```

## Testing

```python
import pytest
from unittest.mock import Mock, patch
from almona import AlmonaAPIClient, AlmonaAPIError

def test_create_ticket():
    client = AlmonaAPIClient("https://api.almona.com")
    
    with patch.object(client, '_make_request') as mock_request:
        mock_request.return_value.json.return_value = {
            "id": "123",
            "ticket_number": "TKT-001",
            "status": "open"
        }
        
        ticket = client.create_support_ticket({
            "category": "support",
            "payload": {"title": "Test", "priority": "medium"}
        })
        
        assert ticket.ticket_number == "TKT-001"
        mock_request.assert_called_once()
```

## API Reference

### Client Classes

- `AlmonaAPIClient` - Synchronous client
- `AsyncAlmonaAPIClient` - Asynchronous client

### Exception Classes

- `AlmonaAPIError` - Base API error
- `AuthenticationError` - Authentication failures
- `ValidationError` - Request validation errors
- `RateLimitError` - Rate limit exceeded
- `NotFoundError` - Resource not found
- `ServerError` - Server errors
- `NetworkError` - Network errors
- `TimeoutError` - Request timeout

### Model Classes

- `TicketCategory` - Ticket category enum
- `TicketPriority` - Ticket priority enum
- `TicketStatus` - Ticket status enum
- `MaintenanceType` - Maintenance type enum
- `UnifiedTicketBase` - Base ticket information
- `SupportTicketCreate` - Support ticket creation
- `PreventiveMaintenanceTicketCreate` - Preventive maintenance ticket creation
- `ScheduledMaintenanceTicketCreate` - Scheduled maintenance ticket creation
- `EmergencyServiceTicketCreate` - Emergency ticket creation
- `ProductQuoteTicketCreate` - Product quote ticket creation
- `AddToQuoteTicketCreate` - Add-to-quote ticket creation
- `TicketResponse` - Ticket response
- `QuoteItem` - Quote item
- `QuoteCreateRequest` - Quote creation request
- `QuoteCreateResponse` - Quote creation response
- `QuoteSummary` - Quote summary
- `QuoteLookupResponse` - Quote lookup response
- `Token` - Authentication token
- `AlmonaAPIConfig` - Client configuration

### Client Methods

#### Authentication
- `authenticate(email, password)` - Authenticate with email/password
- `refresh_access_token()` - Refresh access token
- `get_current_user()` - Get current user information

#### Tickets
- `create_support_ticket(ticket)` - Create support ticket
- `create_preventive_maintenance_ticket(ticket)` - Create preventive maintenance ticket
- `create_scheduled_maintenance_ticket(ticket)` - Create scheduled maintenance ticket
- `create_emergency_ticket(ticket)` - Create emergency ticket
- `create_product_quote_ticket(ticket)` - Create product quote ticket
- `create_add_to_quote_ticket(ticket)` - Create add-to-quote ticket
- `get_ticket(ticket_id)` - Get ticket by ID
- `list_tickets(filters?, pagination?)` - List tickets
- `update_ticket_status(ticket_id, status, resolution?)` - Update ticket status
- `assign_ticket(ticket_id, assignee_id)` - Assign ticket
- `add_ticket_message(ticket_id, message, type?, internal?)` - Add message to ticket
- `get_ticket_messages(ticket_id)` - Get ticket messages

#### Quotes
- `create_quote(quote)` - Create quote
- `lookup_quotes(query)` - Lookup quotes

#### System
- `get_health_status()` - Get system health
- `get_metrics()` - Get system metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: https://docs.almona.com/api/python
- Issues: https://github.com/almona/industrial-api-client-python/issues
- Email: api-support@almona.com
