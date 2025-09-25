/**
 * Almona Industrial API Client - TypeScript SDK
 * 
 * A comprehensive TypeScript client for the Almona Industrial API,
 * providing type-safe access to all API endpoints with automatic
 * authentication, error handling, and retry logic.
 * 
 * @example
 * ```typescript
 * import { createAlmonaAPIClient } from '@almona/industrial-api-client';
 * 
 * const client = createAlmonaAPIClient({
 *   baseURL: 'https://api.almona.com',
 *   apiKey: 'your-api-key'
 * });
 * 
 * // Authenticate
 * await client.authenticate('user@example.com', 'password');
 * 
 * // Create a support ticket
 * const ticket = await client.createSupportTicket({
 *   category: 'support',
 *   payload: {
 *     title: 'Machine Issue',
 *     description: 'Hydraulic pump failure',
 *     priority: 'high'
 *   }
 * });
 * 
 * // Create a quote
 * const quote = await client.createQuote({
 *   contact_name: 'John Doe',
 *   contact_email: 'john@example.com',
 *   products: [{
 *     product_id: 'prod-001',
 *     quantity: 2,
 *     unit_price: 1500.00
 *   }]
 * });
 * ```
 */

// Main client class
export { AlmonaAPIClient, createAlmonaAPIClient, AlmonaAPIError } from './client';

// Types and interfaces
export * from './types';

// Re-export commonly used types for convenience
export type {
  AlmonaAPIConfig,
  RequestOptions,
  APIError,
  Token,
  TicketResponse,
  UnifiedTicketCreate,
  TicketFilters,
  QuoteCreateRequest,
  QuoteCreateResponse,
  QuoteLookupResponse,
  QuoteFilters,
  PaginationParams,
  PaginatedResponse
} from './types';

// Version information
export const VERSION = '2.0.0';
export const API_VERSION = '2.0.0';
