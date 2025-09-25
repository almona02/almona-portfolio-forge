/**
 * TypeScript types for Almona Industrial API
 * Generated from OpenAPI specification
 */

// Enums
export enum TicketCategory {
  SUPPORT = 'support',
  PREVENTIVE_MAINTENANCE = 'preventive_maintenance',
  SCHEDULED_MAINTENANCE = 'scheduled_maintenance',
  EMERGENCY_SERVICE = 'emergency_service',
  PRODUCT_QUOTE = 'product_quote',
  ADD_TO_QUOTE = 'add_to_quote'
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELED = 'canceled'
}

export enum MaintenanceType {
  ROUTINE = 'routine',
  INSPECTION = 'inspection',
  LUBRICATION = 'lubrication',
  CALIBRATION = 'calibration',
  SAFETY_CHECK = 'safety_check'
}

// Base interfaces
export interface UnifiedTicketBase {
  title: string;
  description?: string;
  priority: TicketPriority;
  machine_id?: string;
  machine_serial_number?: string;
}

export interface PreventiveMaintenanceMetadata {
  checklist_id?: string;
  frequency_days?: number;
  plan_id?: string;
  maintenance_type?: MaintenanceType;
}

// Ticket creation interfaces
export interface SupportTicketCreate {
  category: TicketCategory.SUPPORT;
  payload: UnifiedTicketBase;
}

export interface PreventiveMaintenanceTicketCreate {
  category: TicketCategory.PREVENTIVE_MAINTENANCE;
  payload: UnifiedTicketBase;
  maintenance_metadata: PreventiveMaintenanceMetadata;
}

export interface ScheduledMaintenanceTicketCreate {
  category: TicketCategory.SCHEDULED_MAINTENANCE;
  payload: UnifiedTicketBase;
  scheduled_for: string; // ISO 8601 datetime
  maintenance_metadata: PreventiveMaintenanceMetadata;
}

export interface EmergencyServiceTicketCreate {
  category: TicketCategory.EMERGENCY_SERVICE;
  payload: UnifiedTicketBase;
  severity: TicketPriority;
}

export interface ProductQuoteTicketCreate {
  category: TicketCategory.PRODUCT_QUOTE;
  payload: UnifiedTicketBase;
  related_product_id?: string;
}

export interface AddToQuoteTicketCreate {
  category: TicketCategory.ADD_TO_QUOTE;
  payload: UnifiedTicketBase;
  related_quote_id?: string;
}

export type UnifiedTicketCreate = 
  | SupportTicketCreate
  | PreventiveMaintenanceTicketCreate
  | ScheduledMaintenanceTicketCreate
  | EmergencyServiceTicketCreate
  | ProductQuoteTicketCreate
  | AddToQuoteTicketCreate;

// Ticket response interface
export interface TicketResponse {
  id: string;
  ticket_number: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  title: string;
  description?: string;
  digital_twin_code?: string;
  scheduled_for?: string;
  machine_id?: string;
  machine_serial_number?: string;
  created_at: string;
  updated_at: string;
}

// Quote interfaces
export interface QuoteItem {
  product_id?: string;
  service_id?: string;
  quantity: number;
  unit_price?: number;
}

export interface QuoteCreateRequest {
  products: QuoteItem[];
  services: QuoteItem[];
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  company?: string;
  project_description?: string;
  urgency?: string;
  delivery_location?: string;
  special_requirements?: string;
  related_service_ticket_id?: string;
  machine_id?: string;
}

export interface QuoteCreateResponse {
  id: string;
  quote_number: string;
  digital_twin_code?: string;
  portal_reference?: string;
  status: string;
  total_amount?: number;
  related_service_ticket_id?: string;
  created_at: string;
}

export interface QuoteSummary {
  id: string;
  quote_number: string;
  status: string;
  digital_twin_code?: string;
  portal_reference?: string;
  total_amount?: number;
  created_at: string;
}

export interface QuoteLookupResponse {
  results: QuoteSummary[];
  count: number;
}

// Authentication interfaces
export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TokenData {
  username?: string;
}

// Error interfaces
export interface APIError {
  error: {
    code: string;
    message: string;
    details?: any;
    context?: {
      request_id?: string;
      user_id?: string;
      operation?: string;
      timestamp?: string;
    };
  };
}

// Configuration interface
export interface AlmonaAPIConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

// Request options
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Filter interfaces
export interface TicketFilters {
  category?: TicketCategory;
  status?: TicketStatus;
  priority?: TicketPriority;
  machine_id?: string;
  created_after?: string;
  created_before?: string;
}

export interface QuoteFilters {
  status?: string;
  created_after?: string;
  created_before?: string;
  contact_email?: string;
}
