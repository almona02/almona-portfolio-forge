import { supabase } from "@/lib/supabase";
import type { AssemblyResponse, AssemblyComponent } from "@/types/assembly";

const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  if (import.meta.env.DEV) return "http://localhost:8002";
  return window.location.origin;
};

const API_BASE = getApiBase();
console.log(`📡 SmartScan API configured for: ${API_BASE}`);

export interface SmartScanDimensions {
  width_mm: number;
  height_mm: number;
  scale_mm_per_px: number;
  scale_source: "user_input" | "heuristic" | "ocr" | "scale_detector" | string;
  enhanced_scale?: {
    method: string;
    scale_mm_per_px: number;
    confidence: number;
  };
  scale_confidence?: number;
  width_px?: number;
  height_px?: number;
}

export interface SmartScanQuality {
  confidence_score: number;
  requires_verification: boolean;
  validation_errors: string[];
  accuracy_tier?: "production" | "verified_required" | "review_required" | string;
  verification_notes?: string[];
}

export interface SmartScanResult {
  success: boolean;
  filename: string;
  file_size_bytes: number;
  processing_time_ms: number;
  data: ScanResultData;
}

export interface ScanResultData {
  svg_path: string;
  view_box: string;
  dimensions: SmartScanDimensions;
  quality: SmartScanQuality;
  metadata: {
    resolution?: string;
    contour_area?: number;
    processing_time_ms?: number;
    [key: string]: any;
  };
  technical_data?: {
    profile_name?: string;
    dimension_labels?: any[];
    material_hints?: string[];
    thermal_break_mentions?: string[];
    confidence?: number;
    [key: string]: any;
  };
  suggestions?: {
    profile_name?: string;
    likely_material?: string;
    likely_role?: string;
    egyptian_standard_match?: string;
    [key: string]: any;
  };
}

export interface BatchScanResponse {
  success: boolean;
  session_id: string;
  total_files: number;
  successful: number;
  failed: number;
  results: Array<{
    filename: string;
    success: boolean;
    data?: SmartScanResult["data"];
    error?: string;
  }>;
}

async function getAuthToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || "";
}

/**
 * Job status response from async endpoints
 */
export interface ScanJobStatusResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown';
  message?: string;
  result?: SmartScanResult;
  error?: string;
  estimated_time_seconds?: number;
  completed_at?: string;
  processing_time_ms?: number;
}

/**
 * Enqueue single profile scan job for async processing.
 * Returns immediately with job_id for status tracking.
 */
export async function enqueueSingleProfileScan(
  file: File,
  knownWidthMm?: number,
): Promise<{ job_id: string; estimated_time_seconds: number; filename: string }> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const formData = new FormData();
  formData.append("file", file);
  if (knownWidthMm) {
    formData.append("known_width_mm", String(knownWidthMm));
  }
  formData.append("auto_detect_scale", "true");

  const response = await fetch(`${API_BASE}/api/v2/smart-scan/single`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to enqueue scan job");
  }

  const data = await response.json();
  return {
    job_id: data.job_id,
    estimated_time_seconds: data.estimated_time_seconds || 10,
    filename: data.filename
  };
}

/**
 * Check status of scan job
 */
export async function getScanJobStatus(jobId: string): Promise<ScanJobStatusResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/smart-scan/job/${jobId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Job ${jobId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get job status");
  }

  return await response.json();
}

/**
 * Poll for scan job completion with timeout
 */
export async function waitForScanJob(
  jobId: string,
  timeoutMs: number = 60000, // 1 minute default
  pollIntervalMs: number = 2000 // poll every 2 seconds
): Promise<SmartScanResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await getScanJobStatus(jobId);

    if (status.status === 'completed' && status.result) {
      return status.result;
    }

    if (status.status === 'failed') {
      throw new Error(status.error || 'Scan job failed');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`);
}

/**
 * Legacy function for backward compatibility - now uses async flow
 * @deprecated Use enqueueSingleProfileScan + waitForScanJob instead
 */
export async function scanSingleProfile(
  file: File,
  knownWidthMm?: number,
): Promise<SmartScanResult> {
  console.warn('scanSingleProfile is deprecated. Use enqueueSingleProfileScan + waitForScanJob for better UX.');

  const { job_id } = await enqueueSingleProfileScan(file, knownWidthMm);
  return await waitForScanJob(job_id);
}

export async function scanBatchProfiles(
  files: File[],
  knownWidthMm?: number,
  onProgress?: (processed: number, total: number) => void,
): Promise<BatchScanResponse> {
  const results: BatchScanResponse["results"] = [];
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i += 1) {
    try {
      const result = await scanSingleProfile(files[i], knownWidthMm);
      results.push({
        filename: files[i].name,
        success: true,
        data: result.data,
      });
      successful += 1;
    } catch (error: any) {
      results.push({
        filename: files[i].name,
        success: false,
        error: error?.message || "Unknown error",
      });
      failed += 1;
    }

    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }

  return {
    success: failed === 0,
    session_id: `batch_${Date.now()}`,
    total_files: files.length,
    successful,
    failed,
    results,
  };
}

export async function getSupportedFormats() {
  const response = await fetch(`${API_BASE}/api/v2/smart-scan/supported-formats`);
  if (!response.ok) throw new Error("Failed to get supported formats");
  return response.json();
}

export async function enhancedSmartScan(
  file: File,
  knownWidthMm?: number,
  options?: { enableOCR?: boolean; requireValidation?: boolean },
): Promise<SmartScanResult> {
  const token = await getAuthToken();

  const formData = new FormData();
  formData.append("file", file);
  if (knownWidthMm) {
    formData.append("known_width_mm", String(knownWidthMm));
  }
  formData.append("enable_ocr", String(options?.enableOCR ?? true));
  formData.append("require_validation", String(options?.requireValidation ?? true));

  const response = await fetch(`${API_BASE}/api/v2/smart-scan/enhanced`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      detail: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(errorData.detail || "Enhanced SmartScan failed");
  }

  return response.json();
}

export async function compareScans(file: File): Promise<{
  basic: SmartScanResult;
  enhanced: SmartScanResult;
  improvement: {
    confidence_improvement: number;
    processing_time_difference: number;
    has_ocr_data: boolean;
  };
}> {
  const [basicResult, enhancedResult] = await Promise.all([
    scanSingleProfile(file),
    enhancedSmartScan(file, undefined, { enableOCR: true, requireValidation: true }),
  ]);

  return {
    basic: basicResult,
    enhanced: enhancedResult,
    improvement: {
      confidence_improvement:
        (enhancedResult.data?.quality?.confidence_score || 0) -
        (basicResult.data?.quality?.confidence_score || 0),
      processing_time_difference:
        (enhancedResult.data?.metadata?.processing_time_ms || 0) -
        (basicResult.data?.metadata?.processing_time_ms || 0),
      has_ocr_data: Boolean(enhancedResult.data?.technical_data?.profile_name),
    },
  };
}

/**
 * Smart assembly scan: analyze a shop drawing for components and system type.
 */
export async function scanAssembly(file: File): Promise<AssemblyResponse> {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/v2/smart-scan/assembly`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      detail: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(errorData.detail || "Assembly scan failed");
  }

  return response.json();
}

/**
 * Confirm assembly with user-reviewed components.
 */
export async function confirmAssembly(
  assemblyId: string,
  confirmedComponents: AssemblyComponent[],
): Promise<{
  success: boolean;
  assembly_id: string;
  confirmed_at: string;
  user_corrections: number;
  message: string;
}> {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE}/api/v2/smart-scan/assembly/${assemblyId}/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(confirmedComponents),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      detail: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(errorData.detail || "Confirm assembly failed");
  }

  return response.json();
}

