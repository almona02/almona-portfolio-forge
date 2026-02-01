/**
 * Invoice Templates API
 * 
 * Commercial Page Enhancement - Backend API Integration
 * Invoice template storage, retrieval, creation, updating, and deletion.
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

/**
 * Invoice template category
 */
export type InvoiceTemplateCategory =
  | "standard"
  | "premium"
  | "custom"
  | "regional";

/**
 * Invoice template response from backend
 */
export interface InvoiceTemplateResponse {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category: InvoiceTemplateCategory;
  template_config: Record<string, any>;
  is_public: boolean;
  is_default: boolean;
  version: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Invoice template list response
 */
export interface InvoiceTemplateListResponse {
  templates: InvoiceTemplateResponse[];
  total: number;
}

/**
 * Create invoice template request
 */
export interface InvoiceTemplateCreateRequest {
  name: string;
  description?: string;
  category?: InvoiceTemplateCategory;
  template_config?: Record<string, any>;
  is_public?: boolean;
  is_default?: boolean;
}

/**
 * Update invoice template request
 */
export interface InvoiceTemplateUpdateRequest {
  name?: string;
  description?: string;
  category?: InvoiceTemplateCategory;
  template_config?: Record<string, any>;
  is_public?: boolean;
  is_default?: boolean;
}

/**
 * List invoice templates
 */
export async function listInvoiceTemplates(
  category?: InvoiceTemplateCategory,
  search?: string,
  limit: number = 50,
  offset: number = 0
): Promise<InvoiceTemplateListResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const params = new URLSearchParams();
  if (category) {
    params.append("category", category);
  }
  if (search) {
    params.append("search", search);
  }
  if (limit) {
    params.append("limit", String(limit));
  }
  if (offset) {
    params.append("offset", String(offset));
  }

  const url = `${API_BASE}/api/v2/invoice-templates${params.toString() ? `?${params.toString()}` : ''}`;
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
    throw new Error(errorData.detail || "Failed to list invoice templates");
  }

  return await response.json();
}

/**
 * Get invoice template by ID
 */
export async function getInvoiceTemplate(
  templateId: string
): Promise<InvoiceTemplateResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/invoice-templates/${templateId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Invoice template ${templateId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get invoice template");
  }

  return await response.json();
}

/**
 * Create invoice template
 */
export async function createInvoiceTemplate(
  request: InvoiceTemplateCreateRequest
): Promise<InvoiceTemplateResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/invoice-templates`, {
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
    throw new Error(errorData.detail || "Failed to create invoice template");
  }

  return await response.json();
}

/**
 * Update invoice template
 */
export async function updateInvoiceTemplate(
  templateId: string,
  request: InvoiceTemplateUpdateRequest
): Promise<InvoiceTemplateResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/invoice-templates/${templateId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Invoice template ${templateId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to update invoice template");
  }

  return await response.json();
}

/**
 * Delete invoice template
 */
export async function deleteInvoiceTemplate(
  templateId: string
): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/invoice-templates/${templateId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Invoice template ${templateId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to delete invoice template");
  }
}
