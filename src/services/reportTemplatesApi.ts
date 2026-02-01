/**
 * Report Templates API
 * 
 * Phase 4 Reporting & Analytics - Backend API Integration
 * Report template storage, retrieval, creation, updating, and deletion.
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
 * Report template category
 */
export type ReportTemplateCategory =
  | "revenue"
  | "conversion"
  | "customer"
  | "profitability"
  | "pipeline"
  | "executive"
  | "custom";

/**
 * Report template response from backend
 */
export interface ReportTemplateResponse {
  id: string;
  name: string;
  description?: string;
  category: ReportTemplateCategory;
  template_schema: Record<string, any>;
  version: string;
  is_public: boolean;
  usage_count: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Report template list response
 */
export interface ReportTemplateListResponse {
  templates: ReportTemplateResponse[];
  total: number;
}

/**
 * Create report template request
 */
export interface ReportTemplateCreateRequest {
  name: string;
  description?: string;
  category: ReportTemplateCategory;
  template_schema: Record<string, any>;
  is_public?: boolean;
}

/**
 * Update report template request
 */
export interface ReportTemplateUpdateRequest {
  name?: string;
  description?: string;
  category?: ReportTemplateCategory;
  template_schema?: Record<string, any>;
  is_public?: boolean;
}

/**
 * List report templates
 */
export async function listReportTemplates(
  category?: ReportTemplateCategory,
  search?: string,
  limit: number = 50,
  offset: number = 0
): Promise<ReportTemplateListResponse> {
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

  const url = `${API_BASE}/api/v2/report-templates${params.toString() ? `?${params.toString()}` : ''}`;
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
    throw new Error(errorData.detail || "Failed to list report templates");
  }

  return await response.json();
}

/**
 * Get report template by ID
 */
export async function getReportTemplate(
  templateId: string
): Promise<ReportTemplateResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/report-templates/${templateId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Report template ${templateId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get report template");
  }

  return await response.json();
}

/**
 * Create report template
 */
export async function createReportTemplate(
  request: ReportTemplateCreateRequest
): Promise<ReportTemplateResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/report-templates`, {
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
    throw new Error(errorData.detail || "Failed to create report template");
  }

  return await response.json();
}

/**
 * Update report template
 */
export async function updateReportTemplate(
  templateId: string,
  request: ReportTemplateUpdateRequest
): Promise<ReportTemplateResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/report-templates/${templateId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Report template ${templateId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to update report template");
  }

  return await response.json();
}

/**
 * Delete report template
 */
export async function deleteReportTemplate(
  templateId: string
): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/report-templates/${templateId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Report template ${templateId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to delete report template");
  }
}
