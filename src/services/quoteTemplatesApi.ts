/**
 * Quote Templates API
 * 
 * Commercial Page Enhancement - Backend API Integration
 * Quote template storage, retrieval, creation, updating, and deletion.
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
 * Quote template category
 */
export type QuoteTemplateCategory =
  | "standard"
  | "premium"
  | "custom"
  | "regional";

/**
 * Quote template response from backend
 */
export interface QuoteTemplateResponse {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category: QuoteTemplateCategory;
  template_config: Record<string, any>;
  is_public: boolean;
  is_default: boolean;
  version: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Quote template list response
 */
export interface QuoteTemplateListResponse {
  templates: QuoteTemplateResponse[];
  total: number;
}

/**
 * Create quote template request
 */
export interface QuoteTemplateCreateRequest {
  name: string;
  description?: string;
  category?: QuoteTemplateCategory;
  template_config?: Record<string, any>;
  is_public?: boolean;
  is_default?: boolean;
}

/**
 * Update quote template request
 */
export interface QuoteTemplateUpdateRequest {
  name?: string;
  description?: string;
  category?: QuoteTemplateCategory;
  template_config?: Record<string, any>;
  is_public?: boolean;
  is_default?: boolean;
}

/**
 * List quote templates
 */
export async function listQuoteTemplates(
  category?: QuoteTemplateCategory,
  search?: string,
  limit: number = 50,
  offset: number = 0
): Promise<QuoteTemplateListResponse> {
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

  const url = `${API_BASE}/api/v2/quote-templates${params.toString() ? `?${params.toString()}` : ''}`;
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
    throw new Error(errorData.detail || "Failed to list quote templates");
  }

  return await response.json();
}

/**
 * Get quote template by ID
 */
export async function getQuoteTemplate(
  templateId: string
): Promise<QuoteTemplateResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/quote-templates/${templateId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Quote template ${templateId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get quote template");
  }

  return await response.json();
}

/**
 * Create quote template
 */
export async function createQuoteTemplate(
  request: QuoteTemplateCreateRequest
): Promise<QuoteTemplateResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/quote-templates`, {
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
    throw new Error(errorData.detail || "Failed to create quote template");
  }

  return await response.json();
}

/**
 * Update quote template
 */
export async function updateQuoteTemplate(
  templateId: string,
  request: QuoteTemplateUpdateRequest
): Promise<QuoteTemplateResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/quote-templates/${templateId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Quote template ${templateId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to update quote template");
  }

  return await response.json();
}

/**
 * Delete quote template
 */
export async function deleteQuoteTemplate(
  templateId: string
): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/quote-templates/${templateId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Quote template ${templateId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to delete quote template");
  }
}
