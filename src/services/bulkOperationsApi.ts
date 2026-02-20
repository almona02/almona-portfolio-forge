/**
 * Bulk Operations API
 * 
 * Phase 3 Enterprise Features - Backend API Integration
 * Async bulk operations with job tracking, progress monitoring, and error handling.
 */

import { supabase } from "@/lib/supabase";
import type {
  BulkOperation,
  BulkJob,
  BulkJobStatus,
  BulkJobError,
  BulkJobResult,
} from "./BulkOperationServiceTypes";

const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (typeof envUrl === 'string' && envUrl) {
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
 * Bulk job progress
 */
export interface BulkJobProgress {
  completed: number;
  total: number;
  percentage: number;
}

/**
 * Backend result shape (may vary from BulkJobResult)
 */
interface BulkJobResultBackend {
  errors?: BulkJobError[];
  summary?: { errors?: BulkJobError[]; succeeded?: number; failed?: number } & Record<string, unknown>;
  downloadUrl?: string;
  fileSize?: number;
  expiresAt?: string;
  downloadExpiresAt?: string;
  succeeded?: number;
  failed?: number;
}

/**
 * Bulk job response from backend
 */
export interface BulkJobResponse {
  jobId: string;
  status: BulkJobStatus;
  operation: Record<string, unknown>;
  itemCount: number;
  progress: BulkJobProgress;
  result?: BulkJobResultBackend;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  estimatedCompletion?: string;
  originalJobId?: string;
}


/**
 * Bulk operation retry request
 */
export interface BulkOperationRetryRequest {
  itemIds?: string[];
}

/**
 * Bulk job list response
 */
export interface BulkJobListResponse {
  jobs: BulkJobResponse[];
  total: number;
}

/**
 * Convert frontend BulkOperation to backend format
 */
function convertBulkOperationToBackend(operation: BulkOperation): Record<string, unknown> {
  if (operation.op === 'edit') {
    return {
      type: 'edit',
      params: {
        fields: operation.fields,
      },
    };
  } else if (operation.op === 'export') {
    return {
      type: 'export',
      params: {
        format: operation.format,
        ...operation.options,
      },
    };
  } else if (operation.op === 'delete') {
    return {
      type: 'delete',
      params: {
        softDelete: operation.softDelete !== false,
      },
    };
  } else if (operation.op === 'status') {
    return {
      type: 'status_change',
      params: {
        status: operation.status,
      },
    };
  }
  throw new Error(`Unsupported operation type: ${'op' in operation ? operation.op : 'unknown'}`);
}

/**
 * Start bulk operation
 */
export async function startBulkOperation(
  itemIds: string[],
  operation: BulkOperation
): Promise<BulkJobResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const backendRequest = {
    itemIds,
    operation: convertBulkOperationToBackend(operation),
  };

  const response = await fetch(`${API_BASE}/api/v2/bulk-operations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(backendRequest),
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }))) as { detail?: string };
    if (response.status === 429) {
      throw new Error(errorData.detail ?? "Too many concurrent jobs");
    }
    throw new Error(errorData.detail ?? "Failed to start bulk operation");
  }

  return (await response.json()) as BulkJobResponse;
}

/**
 * Get bulk operation job status
 */
export async function getBulkOperationStatus(jobId: string): Promise<BulkJobResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/bulk-operations/${jobId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Bulk operation job ${jobId} not found`);
    }
    const errorData = (await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }))) as { detail?: string };
    throw new Error(errorData.detail ?? "Failed to get bulk operation status");
  }

  return (await response.json()) as BulkJobResponse;
}

/**
 * Cancel bulk operation job
 */
export async function cancelBulkOperation(jobId: string): Promise<BulkJobResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/bulk-operations/${jobId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }))) as { detail?: string };
    throw new Error(errorData.detail ?? "Failed to cancel bulk operation");
  }

  return (await response.json()) as BulkJobResponse;
}

/**
 * Retry failed items in bulk operation
 */
export async function retryBulkOperation(
  jobId: string,
  request?: BulkOperationRetryRequest
): Promise<BulkJobResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/bulk-operations/${jobId}/retry`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request || {}),
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }))) as { detail?: string };
    throw new Error(errorData.detail ?? "Failed to retry bulk operation");
  }

  return (await response.json()) as BulkJobResponse;
}

/**
 * List bulk operation jobs
 */
export async function listBulkOperations(
  options?: { status?: BulkJobStatus; limit?: number }
): Promise<BulkJobListResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const params = new URLSearchParams();
  if (options?.status) {
    params.append("status", options.status);
  }
  if (options?.limit) {
    params.append("limit", String(options.limit));
  }

  const url = `${API_BASE}/api/v2/bulk-operations${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }))) as { detail?: string };
    throw new Error(errorData.detail ?? "Failed to list bulk operations");
  }

  return (await response.json()) as BulkJobListResponse;
}

/**
 * Convert backend response to frontend BulkJob
 */
export function convertToBulkJob(response: BulkJobResponse): BulkJob {
  const res = response.result;
  // Extract errors from result if present
  const errors: BulkJobError[] = [];
  if (res) {
    const resultErrors = res.errors;
    if (Array.isArray(resultErrors)) {
      errors.push(...resultErrors);
    }
    const summaryErrors = res.summary?.errors;
    if (Array.isArray(summaryErrors)) {
      errors.push(...summaryErrors);
    }
  }

  // Extract result data
  const result: BulkJobResult | undefined = res
    ? {
        downloadUrl: res.downloadUrl,
        fileSize: res.fileSize,
        expiresAt: res.expiresAt ?? res.downloadExpiresAt,
        summary: (res.summary as Record<string, unknown>) ?? {},
      }
    : undefined;

  // Calculate successful/failed from result or progress
  const successfulItems = res?.summary?.succeeded ?? res?.succeeded ?? 0;
  const failedItems = res?.summary?.failed ?? res?.failed ?? 0;

  return {
    jobId: response.jobId,
    status: response.status,
    progress: response.progress.percentage,
    totalItems: response.itemCount,
    processedItems: response.progress.completed,
    successfulItems,
    failedItems,
    errors: errors.length > 0 ? errors : undefined,
    result,
    createdAt: response.createdAt,
    updatedAt: response.completedAt || response.startedAt || response.createdAt,
    estimatedCompletionAt: response.estimatedCompletion,
  };
}
