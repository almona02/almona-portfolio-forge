# Almona Industrial API SDKs

This directory contains client SDKs for the Almona Industrial API, providing easy access to all API endpoints with automatic authentication, error handling, and retry logic.

## Available SDKs

### TypeScript SDK
- **Location**: `typescript/`
- **Target**: Frontend applications, Node.js applications
- **Features**: Type safety, async/await support, automatic token management
- **Installation**: `npm install @almona/industrial-api-client`

### Python SDK
- **Location**: `python/`
- **Target**: Integration partners, backend services, data analysis
- **Features**: Both sync and async support, Pydantic models, comprehensive error handling
- **Installation**: `pip install almona-industrial-api`

## Quick Start Examples

### TypeScript (Frontend)

```typescript
import { createAlmonaAPIClient } from '@almona/industrial-api-client';

const client = createAlmonaAPIClient({
  baseURL: 'https://api.almona.com'
});

// Authenticate
await client.authenticate('user@example.com', 'password');

// Create a support ticket
const ticket = await client.createSupportTicket({
  category: 'support',
  payload: {
    title: 'Machine Issue',
    description: 'Hydraulic pump failure',
    priority: 'high'
  }
});

console.log('Created ticket:', ticket.ticket_number);
```

### Python (Integration)

```python
from almona import AlmonaAPIClient

client = AlmonaAPIClient(base_url="https://api.almona.com")

# Authenticate
client.authenticate("user@example.com", "password")

# Create a support ticket
ticket = client.create_support_ticket({
    "category": "support",
    "payload": {
        "title": "Machine Issue",
        "description": "Hydraulic pump failure",
        "priority": "high"
    }
})

print(f"Created ticket: {ticket.ticket_number}")
```

## Common Features

Both SDKs provide:

- 🔒 **Automatic Authentication**: JWT token management with automatic refresh
- 📝 **Type Safety**: Full type definitions and validation
- 🔄 **Error Handling**: Structured error handling with detailed information
- ⚡ **Retry Logic**: Automatic retry for failed requests
- 📊 **Debug Logging**: Optional request/response logging
- 🎯 **Zero Dependencies**: Minimal external dependencies

## API Endpoints Covered

### Authentication
- Token-based authentication with automatic refresh
- User information retrieval

### Service Tickets
- Support tickets
- Preventive maintenance tickets
- Scheduled maintenance tickets
- Emergency service tickets
- Product quote tickets
- Add-to-quote tickets

### Quote Management
- Quote creation with products and services
- Quote lookup and search
- Digital twin integration

### System Monitoring
- Health status checks
- System metrics
- Performance monitoring

## Error Handling

Both SDKs provide comprehensive error handling:

### TypeScript
```typescript
try {
  const ticket = await client.createSupportTicket(ticketData);
} catch (error) {
  if (error instanceof AlmonaAPIError) {
    console.error('API Error:', error.code, error.message);
  }
}
```

### Python
```python
try:
    ticket = client.create_support_ticket(ticket_data)
except AlmonaAPIError as e:
    print(f"API Error: {e.code} - {e.message}")
```

## Configuration

### TypeScript
```typescript
const client = createAlmonaAPIClient({
  baseURL: 'https://api.almona.com',
  apiKey: 'your-api-key',
  timeout: 30000,
  retries: 3,
  debug: false
});
```

### Python
```python
client = AlmonaAPIClient({
    "base_url": "https://api.almona.com",
    "api_key": "your-api-key",
    "timeout": 30,
    "retries": 3,
    "debug": False
})
```

## Development

### Building the SDKs

#### TypeScript SDK
```bash
cd typescript
npm install
npm run build
```

#### Python SDK
```bash
cd python
pip install -e .
```

### Testing

#### TypeScript SDK
```bash
cd typescript
npm test
```

#### Python SDK
```bash
cd python
pytest
```

## Documentation

- **TypeScript SDK**: [typescript/README.md](typescript/README.md)
- **Python SDK**: [python/README.md](python/README.md)
- **API Documentation**: https://docs.almona.com/api

## Support

- **Issues**: https://github.com/almona/industrial-api-sdks/issues
- **Email**: api-support@almona.com
- **Documentation**: https://docs.almona.com/api

## License

MIT License - see individual SDK directories for details.
