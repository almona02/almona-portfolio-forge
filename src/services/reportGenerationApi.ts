/**
 * Report Generation API
 * 
 * Phase 4 Reporting & Analytics - Backend API Integration
 * Report generation job management, status tracking, and download.
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
 * Report format
 */
export type ReportFormat = "pdf" | "excel" | "csv";

/**
 * Report job status
 */
export type ReportJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "canceled";

/**
 * Report generation request
 */
export interface ReportGenerationRequest {
  template_id?: string;
  report_type: string;
  report_data: Record<string, any>;
  format?: ReportFormat;
}

/**
 * Report job response
 */
export interface ReportJobResponse {
  id: string;
  status: ReportJobStatus;
  template_id?: string;
  report_type: string;
  format: ReportFormat;
  file_size_bytes?: number;
  page_count?: number;
  download_url?: string;
  download_expires_at?: string;
  error_message?: string;
  generation_time_ms?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

/**
 * Generate report
 */
export async function generateReport(
  request: ReportGenerationRequest
): Promise<ReportJobResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/reports/generate`, {
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
    throw new Error(errorData.detail || "Failed to generate report");
  }

  return await response.json();
}

/**
 * Get report job status
 */
export async function getReportJob(
  jobId: string
): Promise<ReportJobResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/reports/${jobId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Report job ${jobId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get report job");
  }

  return await response.json();
}

/**
 * Download report
 * Returns the download URL (redirect response from backend)
 */
export async function downloadReport(jobId: string): Promise<string> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/reports/${jobId}/download`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Report ${jobId} not available for download`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to download report");
  }

  // Backend returns a redirect, extract the location
  const location = response.headers.get("Location");
  if (location) {
    return location;
  }

  // If no redirect, return the response URL
  return response.url;
}
