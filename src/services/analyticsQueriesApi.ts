/**
 * Analytics Queries API
 * 
 * Phase 4 Reporting & Analytics - Backend API Integration
 * Analytics query execution, result retrieval, and export.
 */

import { supabase } from "@/lib/supabase";

const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
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
 * Query type
 */
export type QueryType =
  | "revenue"
  | "project_volume"
  | "waste"
  | "production_time"
  | "customer"
  | "custom";

/**
 * Query metadata
 */
export interface QueryMetadata {
  total: number;
  filtered: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

/**
 * Query performance
 */
export interface QueryPerformance {
  query_time_ms: number;
  cache_hit: boolean;
  data_freshness: string;
}

/**
 * Analytics query request
 */
export interface AnalyticsQueryRequest {
  type: QueryType;
  filters?: Record<string, unknown>;
  group_by?: string[];
  date_range?: Record<string, string>;
  limit?: number;
  offset?: number;
}

/**
 * Analytics query response
 */
export interface AnalyticsQueryResponse {
  data: Record<string, unknown>[];
  metadata: QueryMetadata;
  performance: QueryPerformance;
}

/**
 * Execute analytics query
 */
export async function executeAnalyticsQuery(
  request: AnalyticsQueryRequest
): Promise<AnalyticsQueryResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/analytics/queries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }))) as { detail?: string };
    throw new Error(errorData.detail ?? "Failed to execute analytics query");
  }

  return (await response.json()) as AnalyticsQueryResponse;
}

/**
 * Get query result by query ID
 */
export async function getQueryResult(
  queryId: string
): Promise<AnalyticsQueryResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/analytics/queries/${queryId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Query ${queryId} not found`);
    }
    const errorData = (await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }))) as { detail?: string };
    throw new Error(errorData.detail ?? "Failed to get query result");
  }

  return await response.json();
}

/**
 * Export query results
 */
export async function exportQueryResults(
  queryId: string,
  format: "csv" | "excel" | "pdf" = "csv"
): Promise<Blob> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(
    `${API_BASE}/api/v2/analytics/queries/${queryId}/export?format=${format}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Query ${queryId} not found`);
    }
    const errorData = await response
      .text()
      .catch(() => `HTTP ${response.status}: ${response.statusText}`);
    throw new Error(errorData || "Failed to export query results");
  }

  return await response.blob();
}
