/**
 * Analytics Metrics API
 * 
 * Phase 4 Reporting & Analytics - Backend API Integration
 * Analytics metrics retrieval with caching support.
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
 * Metric period
 */
export type MetricPeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

/**
 * Currency amount
 */
export interface CurrencyAmount {
  value: number;
  currency: string;
  formatted?: string;
}

/**
 * Project volume metrics
 */
export interface ProjectVolumeMetrics {
  total: number;
  active: number;
  completed: number;
  growth_rate: number;
}

/**
 * Revenue metrics
 */
export interface RevenueMetrics {
  total: CurrencyAmount;
  average_per_project: CurrencyAmount;
  growth_rate: number;
}

/**
 * Analytics metrics response
 */
export interface AnalyticsMetricsResponse {
  project_volume: ProjectVolumeMetrics;
  revenue: RevenueMetrics;
  timestamp: string;
  period: MetricPeriod;
}

/**
 * Get analytics metrics
 */
export async function getAnalyticsMetrics(
  period: MetricPeriod = "monthly",
  startDate?: string,
  endDate?: string,
  includeCache: boolean = true
): Promise<AnalyticsMetricsResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const params = new URLSearchParams();
  params.append("period", period);
  if (startDate) {
    params.append("start_date", startDate);
  }
  if (endDate) {
    params.append("end_date", endDate);
  }
  params.append("include_cache", String(includeCache));

  const url = `${API_BASE}/api/v2/analytics/metrics?${params.toString()}`;
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
    throw new Error(errorData.detail || "Failed to get analytics metrics");
  }

  return await response.json();
}
