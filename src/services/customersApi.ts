/**
 * Customers API
 * 
 * Priority 4: Customers Page Upgrade - Backend API Integration
 * Customer management, analytics, tags, communications, segments, and reminders.
 */

import { supabase } from "@/lib/supabase";

const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return "http://localhost:8003";
  }
  console.error(
    "⚠️ VITE_API_URL not set in production! API calls will fail."
  );
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin;
};

const API_BASE = getApiBase();

async function getAuthToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || "";
}

// ============================================================================
// Types
// ============================================================================

/**
 * Sector type
 */
export type SectorType = "ALUMINIUM" | "UPVC" | "STEEL" | "GLASS" | "GENERAL";

/**
 * Communication type
 */
export type CommunicationType = "email" | "call" | "meeting" | "note" | "quote" | "invoice";

/**
 * Customer response
 */
export interface CustomerResponse {
  id: string;
  owner_user_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  sector?: SectorType;
  billing_info?: Record<string, any>;
  shipping_info?: Record<string, any>;
  notes?: string;
  created_at: string;
  updated_at: string;
  total_revenue?: number;
  order_count?: number;
  last_order_date?: string;
}

/**
 * Customer list response
 */
export interface CustomerListResponse {
  customers: CustomerResponse[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

/**
 * Create customer request
 */
export interface CustomerCreateRequest {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  sector?: SectorType;
  billing_info?: Record<string, any>;
  shipping_info?: Record<string, any>;
  notes?: string;
}

/**
 * Update customer request
 */
export interface CustomerUpdateRequest {
  name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  sector?: SectorType;
  billing_info?: Record<string, any>;
  shipping_info?: Record<string, any>;
  notes?: string;
}

/**
 * Customer tag response
 */
export interface CustomerTagResponse {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

/**
 * Customer tag list response
 */
export interface CustomerTagListResponse {
  tags: CustomerTagResponse[];
}

/**
 * Create tag request
 */
export interface CustomerTagCreateRequest {
  name: string;
  color?: string;
}

/**
 * Update tag request
 */
export interface CustomerTagUpdateRequest {
  name?: string;
  color?: string;
}

/**
 * Tag assignment request
 */
export interface CustomerTagAssignmentRequest {
  tag_id: string;
}

/**
 * Customer communication response
 */
export interface CustomerCommunicationResponse {
  id: string;
  customer_id: string;
  user_id: string;
  type: CommunicationType;
  subject?: string;
  message?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Customer communication list response
 */
export interface CustomerCommunicationListResponse {
  communications: CustomerCommunicationResponse[];
  total: number;
}

/**
 * Create communication request
 */
export interface CustomerCommunicationCreateRequest {
  type: CommunicationType;
  subject?: string;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * Update communication request
 */
export interface CustomerCommunicationUpdateRequest {
  subject?: string;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * Customer segment response
 */
export interface CustomerSegmentResponse {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  criteria: Record<string, any>;
  is_dynamic: boolean;
  customer_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Customer segment list response
 */
export interface CustomerSegmentListResponse {
  segments: CustomerSegmentResponse[];
}

/**
 * Create segment request
 */
export interface CustomerSegmentCreateRequest {
  name: string;
  description?: string;
  criteria: Record<string, any>;
  is_dynamic?: boolean;
}

/**
 * Update segment request
 */
export interface CustomerSegmentUpdateRequest {
  name?: string;
  description?: string;
  criteria?: Record<string, any>;
  is_dynamic?: boolean;
}

/**
 * Segment customers response
 */
export interface CustomerSegmentCustomersResponse {
  customers: CustomerResponse[];
  total: number;
}

/**
 * Customer reminder response
 */
export interface CustomerReminderResponse {
  id: string;
  customer_id: string;
  user_id: string;
  title: string;
  description?: string;
  reminder_date: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Customer reminder list response
 */
export interface CustomerReminderListResponse {
  reminders: CustomerReminderResponse[];
  total: number;
}

/**
 * Create reminder request
 */
export interface CustomerReminderCreateRequest {
  title: string;
  description?: string;
  reminder_date: string;
}

/**
 * Update reminder request
 */
export interface CustomerReminderUpdateRequest {
  title?: string;
  description?: string;
  reminder_date?: string;
  is_completed?: boolean;
}

/**
 * Customer analytics response
 */
export interface CustomerAnalyticsResponse {
  customer_id: string;
  total_revenue: number;
  order_count: number;
  average_order_value: number;
  lifetime_value: number;
  last_order_date?: string;
  first_order_date?: string;
}

/**
 * Customer purchase history item
 */
export interface CustomerPurchaseHistoryItem {
  project_id: string;
  project_name: string;
  order_date: string;
  total_amount: number;
  status: string;
}

/**
 * Customer purchase history response
 */
export interface CustomerPurchaseHistoryResponse {
  customer_id: string;
  purchases: CustomerPurchaseHistoryItem[];
  total: number;
}

/**
 * Customer revenue response
 */
export interface CustomerRevenueResponse {
  customer_id: string;
  total_revenue: number;
  revenue_by_period: Array<{
    period: string;
    revenue: number;
  }>;
}

/**
 * Analytics summary response
 */
export interface CustomerAnalyticsSummaryResponse {
  total_customers: number;
  total_revenue: number;
  average_lifetime_value: number;
  top_customers: Array<{
    customer_id: string;
    customer_name: string;
    revenue: number;
  }>;
}

// ============================================================================
// Customer Management API
// ============================================================================

/**
 * List customers
 */
export async function listCustomers(
  options?: {
    page?: number;
    page_size?: number;
    search?: string;
    sector?: SectorType;
    order_by?: string;
    order_desc?: boolean;
  }
): Promise<CustomerListResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const params = new URLSearchParams();
  if (options?.page) params.append("page", String(options.page));
  if (options?.page_size) params.append("page_size", String(options.page_size));
  if (options?.search) params.append("search", options.search);
  if (options?.sector) params.append("sector", options.sector);
  if (options?.order_by) params.append("order_by", options.order_by);
  if (options?.order_desc !== undefined) {
    params.append("order_desc", String(options.order_desc));
  }

  const url = `${API_BASE}/api/v2/customers${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to list customers");
  }

  return await response.json();
}

/**
 * Get customer by ID
 */
export async function getCustomer(customerId: string): Promise<CustomerResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/${customerId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get customer");
  }

  return await response.json();
}

/**
 * Create customer
 */
export async function createCustomer(
  request: CustomerCreateRequest
): Promise<CustomerResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to create customer");
  }

  return await response.json();
}

/**
 * Update customer
 */
export async function updateCustomer(
  customerId: string,
  request: CustomerUpdateRequest
): Promise<CustomerResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/${customerId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to update customer");
  }

  return await response.json();
}

/**
 * Delete customer
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/${customerId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to delete customer");
  }
}

// ============================================================================
// Customer Analytics API
// ============================================================================

/**
 * Get customer analytics
 */
export async function getCustomerAnalytics(
  customerId: string
): Promise<CustomerAnalyticsResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/${customerId}/analytics`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get customer analytics");
  }

  return await response.json();
}

/**
 * Get analytics summary
 */
export async function getAnalyticsSummary(): Promise<CustomerAnalyticsSummaryResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/analytics/summary`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get analytics summary");
  }

  return await response.json();
}

/**
 * Get customer purchase history
 */
export async function getCustomerPurchaseHistory(
  customerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<CustomerPurchaseHistoryResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const params = new URLSearchParams();
  if (limit) params.append("limit", String(limit));
  if (offset) params.append("offset", String(offset));

  const url = `${API_BASE}/api/v2/customers/${customerId}/purchase-history${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get purchase history");
  }

  return await response.json();
}

/**
 * Get customer revenue
 */
export async function getCustomerRevenue(
  customerId: string
): Promise<CustomerRevenueResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/${customerId}/revenue`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get customer revenue");
  }

  return await response.json();
}

// ============================================================================
// Tags API
// ============================================================================

/**
 * List tags
 */
export async function listTags(): Promise<CustomerTagListResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/tags`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to list tags");
  }

  return await response.json();
}

/**
 * Get tag by ID
 */
export async function getTag(tagId: string): Promise<CustomerTagResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/tags/${tagId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get tag");
  }

  return await response.json();
}

/**
 * Create tag
 */
export async function createTag(
  request: CustomerTagCreateRequest
): Promise<CustomerTagResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/tags`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to create tag");
  }

  return await response.json();
}

/**
 * Update tag
 */
export async function updateTag(
  tagId: string,
  request: CustomerTagUpdateRequest
): Promise<CustomerTagResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/tags/${tagId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to update tag");
  }

  return await response.json();
}

/**
 * Delete tag
 */
export async function deleteTag(tagId: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/tags/${tagId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to delete tag");
  }
}

/**
 * Assign tag to customer
 */
export async function assignTagToCustomer(
  customerId: string,
  request: CustomerTagAssignmentRequest
): Promise<CustomerTagResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/${customerId}/tags`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to assign tag");
  }

  return await response.json();
}

/**
 * Get customer tags
 */
export async function getCustomerTags(
  customerId: string
): Promise<CustomerTagListResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/${customerId}/tags`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get customer tags");
  }

  return await response.json();
}

/**
 * Remove tag from customer
 */
export async function removeTagFromCustomer(
  customerId: string,
  tagId: string
): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/${customerId}/tags/${tagId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to remove tag");
  }
}

// ============================================================================
// Communications API
// ============================================================================

/**
 * List communications for customer
 */
export async function listCommunications(
  customerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<CustomerCommunicationListResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const params = new URLSearchParams();
  if (limit) params.append("limit", String(limit));
  if (offset) params.append("offset", String(offset));

  const url = `${API_BASE}/api/v2/customers/${customerId}/communications${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to list communications");
  }

  return await response.json();
}

/**
 * Get communication by ID
 */
export async function getCommunication(
  communicationId: string
): Promise<CustomerCommunicationResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/communications/${communicationId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get communication");
  }

  return await response.json();
}

/**
 * Create communication
 */
export async function createCommunication(
  customerId: string,
  request: CustomerCommunicationCreateRequest
): Promise<CustomerCommunicationResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/${customerId}/communications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to create communication");
  }

  return await response.json();
}

/**
 * Update communication
 */
export async function updateCommunication(
  communicationId: string,
  request: CustomerCommunicationUpdateRequest
): Promise<CustomerCommunicationResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/communications/${communicationId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to update communication");
  }

  return await response.json();
}

// ============================================================================
// Segments API
// ============================================================================

/**
 * List segments
 */
export async function listSegments(): Promise<CustomerSegmentListResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/segments`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to list segments");
  }

  return await response.json();
}

/**
 * Get segment by ID
 */
export async function getSegment(segmentId: string): Promise<CustomerSegmentResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/segments/${segmentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get segment");
  }

  return await response.json();
}

/**
 * Create segment
 */
export async function createSegment(
  request: CustomerSegmentCreateRequest
): Promise<CustomerSegmentResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/segments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to create segment");
  }

  return await response.json();
}

/**
 * Update segment
 */
export async function updateSegment(
  segmentId: string,
  request: CustomerSegmentUpdateRequest
): Promise<CustomerSegmentResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/segments/${segmentId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to update segment");
  }

  return await response.json();
}

/**
 * Delete segment
 */
export async function deleteSegment(segmentId: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/segments/${segmentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to delete segment");
  }
}

/**
 * Get segment customers
 */
export async function getSegmentCustomers(
  segmentId: string
): Promise<CustomerSegmentCustomersResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/segments/${segmentId}/customers`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get segment customers");
  }

  return await response.json();
}

// ============================================================================
// Reminders API
// ============================================================================

/**
 * List reminders for customer
 */
export async function listReminders(
  customerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<CustomerReminderListResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const params = new URLSearchParams();
  if (limit) params.append("limit", String(limit));
  if (offset) params.append("offset", String(offset));

  const url = `${API_BASE}/api/v2/customers/${customerId}/reminders${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to list reminders");
  }

  return await response.json();
}

/**
 * Get reminder by ID
 */
export async function getReminder(reminderId: string): Promise<CustomerReminderResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/reminders/${reminderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get reminder");
  }

  return await response.json();
}

/**
 * Create reminder
 */
export async function createReminder(
  customerId: string,
  request: CustomerReminderCreateRequest
): Promise<CustomerReminderResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/${customerId}/reminders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to create reminder");
  }

  return await response.json();
}

/**
 * Update reminder
 */
export async function updateReminder(
  reminderId: string,
  request: CustomerReminderUpdateRequest
): Promise<CustomerReminderResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/reminders/${reminderId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to update reminder");
  }

  return await response.json();
}

/**
 * Delete reminder
 */
export async function deleteReminder(reminderId: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/customers/reminders/${reminderId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to delete reminder");
  }
}
