# Almona Industrial API Client - TypeScript SDK

A comprehensive TypeScript client for the Almona Industrial API, providing type-safe access to all API endpoints with automatic authentication, error handling, and retry logic.

## Features

- 🔒 **Automatic Authentication**: JWT token management with automatic refresh
- 📝 **Type Safety**: Full TypeScript support with comprehensive type definitions
- 🔄 **Error Handling**: Structured error handling with detailed error information
- ⚡ **Retry Logic**: Automatic retry for failed requests with exponential backoff
- 📊 **Request/Response Logging**: Optional debug logging for development
- 🎯 **Zero Dependencies**: Uses only axios for HTTP requests
- 📦 **Tree Shaking**: Optimized bundle size with tree-shaking support

## Installation

```bash
npm install @almona/industrial-api-client
```

## Quick Start

```typescript
import { createAlmonaAPIClient } from '@almona/industrial-api-client';

// Create client instance
const client = createAlmonaAPIClient({
  baseURL: 'https://api.almona.com',
  apiKey: 'your-api-key' // Optional
});

// Authenticate
await client.authenticate('user@example.com', 'password');

// Create a support ticket
const ticket = await client.createSupportTicket({
  category: 'support',
  payload: {
    title: 'Machine Issue',
    description: 'Hydraulic pump failure on CNC machine',
    priority: 'high',
    machine_id: '550e8400-e29b-41d4-a716-446655440000'
  }
});

console.log('Created ticket:', ticket.ticket_number);
```

## Configuration

```typescript
import { AlmonaAPIConfig } from '@almona/industrial-api-client';

const config: AlmonaAPIConfig = {
  baseURL: 'https://api.almona.com',     // API base URL
  apiKey: 'your-api-key',                // Optional API key
  timeout: 30000,                        // Request timeout in ms
  retries: 3,                           // Number of retries
  debug: false                          // Enable debug logging
};

const client = createAlmonaAPIClient(config);
```

## Authentication

### Email/Password Authentication

```typescript
// Authenticate with email and password
const token = await client.authenticate('user@example.com', 'password');

// Tokens are automatically stored and used for subsequent requests
console.log('Access token:', token.access_token);
```

### Manual Token Management

```typescript
// Set tokens manually
client.setTokens(accessToken, refreshToken);

// Check authentication status
if (client.isAuthenticated()) {
  console.log('Client is authenticated');
}

// Clear tokens
client.clearTokens();
```

### Token Refresh

The client automatically handles token refresh when a 401 error is received. You can also manually refresh tokens:

```typescript
try {
  const newToken = await client.refreshAccessToken();
  console.log('Token refreshed successfully');
} catch (error) {
  console.error('Token refresh failed:', error);
  // Handle authentication failure
}
```

## Service Tickets

### Creating Tickets

```typescript
// Support ticket
const supportTicket = await client.createSupportTicket({
  category: 'support',
  payload: {
    title: 'Machine Issue',
    description: 'Hydraulic pump failure',
    priority: 'high',
    machine_id: '550e8400-e29b-41d4-a716-446655440000'
  }
});

// Preventive maintenance ticket
const maintenanceTicket = await client.createPreventiveMaintenanceTicket({
  category: 'preventive_maintenance',
  payload: {
    title: 'Monthly Maintenance',
    description: 'Scheduled monthly maintenance',
    priority: 'medium',
    machine_id: '550e8400-e29b-41d4-a716-446655440000'
  },
  maintenance_metadata: {
    checklist_id: 'checklist-001',
    frequency_days: 30,
    maintenance_type: 'routine'
  }
});

// Emergency ticket
const emergencyTicket = await client.createEmergencyTicket({
  category: 'emergency_service',
  payload: {
    title: 'Critical Machine Failure',
    description: 'Production line stopped',
    priority: 'critical',
    machine_id: '550e8400-e29b-41d4-a716-446655440000'
  },
  severity: 'critical'
});
```

### Managing Tickets

```typescript
// Get ticket by ID
const ticket = await client.getTicket('550e8400-e29b-41d4-a716-446655440001');

// List tickets with filters
const tickets = await client.listTickets({
  category: 'support',
  status: 'open',
  priority: 'high'
});

// Update ticket status
const updatedTicket = await client.updateTicketStatus(
  '550e8400-e29b-41d4-a716-446655440001',
  'in_progress',
  'Technician assigned and working on the issue'
);

// Assign ticket
const assignedTicket = await client.assignTicket(
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002'
);

// Add message to ticket
await client.addTicketMessage(
  '550e8400-e29b-41d4-a716-446655440001',
  'Issue has been identified and parts are being ordered',
  'update'
);

// Get ticket messages
const messages = await client.getTicketMessages('550e8400-e29b-41d4-a716-446655440001');
```

## Quote Management

### Creating Quotes

```typescript
const quote = await client.createQuote({
  contact_name: 'Ahmed Hassan',
  contact_email: 'ahmed.hassan@company.com',
  contact_phone: '+20 123 456 7890',
  company: 'Egyptian Manufacturing Co.',
  project_description: 'Upgrade production line with new CNC machines',
  urgency: 'urgent',
  delivery_location: 'Cairo Industrial Zone, Building 15, Floor 3',
  products: [
    {
      product_id: 'prod-cnc-xyz2000',
      quantity: 2,
      unit_price: 1500.00
    }
  ],
  services: [
    {
      service_id: 'svc-maintenance-monthly',
      quantity: 1,
      unit_price: 500.00
    }
  ],
  special_requirements: 'Installation during weekend hours',
  machine_id: '550e8400-e29b-41d4-a716-446655440000'
});

console.log('Created quote:', quote.quote_number);
```

### Looking Up Quotes

```typescript
// Search quotes by number, twin code, or portal reference
const searchResults = await client.lookupQuotes('QUO-2024-001');

console.log(`Found ${searchResults.count} quotes:`);
searchResults.results.forEach(quote => {
  console.log(`- ${quote.quote_number}: ${quote.status} (${quote.total_amount})`);
});
```

## Error Handling

The SDK provides structured error handling with detailed error information:

```typescript
import { AlmonaAPIError } from '@almona/industrial-api-client';

try {
  const ticket = await client.createSupportTicket(ticketData);
} catch (error) {
  if (error instanceof AlmonaAPIError) {
    console.error('API Error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      context: error.context,
      status: error.status
    });
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Advanced Usage

### Custom Request Options

```typescript
// Make raw API requests
const response = await client.request({
  method: 'GET',
  url: '/api/v2/custom-endpoint',
  timeout: 10000,
  headers: {
    'Custom-Header': 'value'
  }
});
```

### Pagination

```typescript
// List tickets with pagination
const tickets = await client.listTickets(
  { category: 'support' },
  { page: 1, limit: 20 }
);
```

### Debug Mode

```typescript
const client = createAlmonaAPIClient({
  baseURL: 'https://api.almona.com',
  debug: true // Enable request/response logging
});
```

## Type Definitions

The SDK provides comprehensive TypeScript types:

```typescript
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UnifiedTicketCreate,
  TicketResponse,
  QuoteCreateRequest,
  QuoteCreateResponse,
  AlmonaAPIConfig
} from '@almona/industrial-api-client';

// Use types for better development experience
const ticketData: UnifiedTicketCreate = {
  category: TicketCategory.SUPPORT,
  payload: {
    title: 'Machine Issue',
    priority: TicketPriority.HIGH
  }
};
```

## Environment Support

### Node.js

```typescript
import { createAlmonaAPIClient } from '@almona/industrial-api-client';

const client = createAlmonaAPIClient({
  baseURL: process.env.ALMONA_API_URL || 'https://api.almona.com'
});
```

### Browser

```typescript
import { createAlmonaAPIClient } from '@almona/industrial-api-client';

const client = createAlmonaAPIClient({
  baseURL: 'https://api.almona.com'
});
```

### React

```typescript
import { createAlmonaAPIClient } from '@almona/industrial-api-client';
import { useEffect, useState } from 'react';

function useAlmonaAPI() {
  const [client] = useState(() => createAlmonaAPIClient({
    baseURL: 'https://api.almona.com'
  }));

  useEffect(() => {
    // Authenticate on mount
    client.authenticate('user@example.com', 'password');
  }, [client]);

  return client;
}
```

## API Reference

### Client Methods

- `authenticate(email, password)` - Authenticate with email/password
- `refreshAccessToken()` - Refresh access token
- `getCurrentUser()` - Get current user information
- `createSupportTicket(ticket)` - Create support ticket
- `createPreventiveMaintenanceTicket(ticket)` - Create preventive maintenance ticket
- `createScheduledMaintenanceTicket(ticket)` - Create scheduled maintenance ticket
- `createEmergencyTicket(ticket)` - Create emergency ticket
- `createProductQuoteTicket(ticket)` - Create product quote ticket
- `createAddToQuoteTicket(ticket)` - Create add-to-quote ticket
- `getTicket(ticketId)` - Get ticket by ID
- `listTickets(filters?, pagination?)` - List tickets
- `updateTicketStatus(ticketId, status, resolution?)` - Update ticket status
- `assignTicket(ticketId, assigneeId)` - Assign ticket
- `addTicketMessage(ticketId, message, type?, internal?)` - Add message to ticket
- `getTicketMessages(ticketId)` - Get ticket messages
- `createQuote(quote)` - Create quote
- `lookupQuotes(query)` - Lookup quotes
- `getHealthStatus()` - Get system health
- `getMetrics()` - Get system metrics
- `request(config)` - Make raw API request

### Types

- `TicketCategory` - Ticket category enum
- `TicketPriority` - Ticket priority enum
- `TicketStatus` - Ticket status enum
- `MaintenanceType` - Maintenance type enum
- `UnifiedTicketCreate` - Union type for all ticket creation types
- `TicketResponse` - Ticket response interface
- `QuoteCreateRequest` - Quote creation request interface
- `QuoteCreateResponse` - Quote creation response interface
- `QuoteLookupResponse` - Quote lookup response interface
- `AlmonaAPIConfig` - Client configuration interface
- `AlmonaAPIError` - API error class

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: https://docs.almona.com/api
- Issues: https://github.com/almona/industrial-api-client-ts/issues
- Email: api-support@almona.com
