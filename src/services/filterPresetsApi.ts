/**
 * Filter Presets API
 * 
 * Phase 3 Enterprise Features - Backend API Integration
 * Server-side filter preset storage, sharing, and cross-device synchronization.
 */

import { supabase } from "@/lib/supabase";
import type { FilterDomain, FilterSet, FilterPreset } from "./FilterService";

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
 * Filter preset response from backend
 */
export interface FilterPresetResponse {
  id: string;
  userId: string;
  name: string;
  domain: FilterDomain;
  filters: FilterSet;
  createdAt: string;
  updatedAt: string;
}

/**
 * Filter preset list response
 */
export interface FilterPresetListResponse {
  presets: FilterPresetResponse[];
  total: number;
}

/**
 * Create filter preset request
 */
export interface FilterPresetCreateRequest {
  name: string;
  domain: FilterDomain;
  filters: FilterSet;
}

/**
 * Update filter preset request
 */
export interface FilterPresetUpdateRequest {
  name?: string;
  filters?: FilterSet;
}

/**
 * List filter presets
 */
export async function listFilterPresets(
  domain?: FilterDomain,
  limit: number = 100
): Promise<FilterPresetListResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const params = new URLSearchParams();
  if (domain) {
    params.append("domain", domain);
  }
  if (limit) {
    params.append("limit", String(limit));
  }

  const url = `${API_BASE}/api/v2/filter-presets${params.toString() ? `?${params.toString()}` : ''}`;
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
    throw new Error(errorData.detail ?? "Failed to list filter presets");
  }

  return await response.json();
}

/**
 * Get filter preset by ID
 */
export async function getFilterPreset(presetId: string): Promise<FilterPresetResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/filter-presets/${presetId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Filter preset ${presetId} not found`);
    }
    const errorData = (await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }))) as { detail?: string };
    throw new Error(errorData.detail ?? "Failed to get filter preset");
  }

  return await response.json();
}

/**
 * Create filter preset
 */
export async function createFilterPreset(
  request: FilterPresetCreateRequest
): Promise<FilterPresetResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/filter-presets`, {
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
    
    if (response.status === 409) {
      throw new Error(errorData.detail ?? "Preset name already exists");
    }
    throw new Error(errorData.detail ?? "Failed to create filter preset");
  }

  return await response.json();
}

/**
 * Update filter preset
 */
export async function updateFilterPreset(
  presetId: string,
  request: FilterPresetUpdateRequest
): Promise<FilterPresetResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/filter-presets/${presetId}`, {
    method: "PUT",
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
    throw new Error(errorData.detail ?? "Failed to update filter preset");
  }

  return await response.json();
}

/**
 * Delete filter preset
 */
export async function deleteFilterPreset(presetId: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/filter-presets/${presetId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }))) as { detail?: string };
    throw new Error(errorData.detail ?? "Failed to delete filter preset");
  }
}

/**
 * Convert backend response to frontend FilterPreset
 */
export function convertToFilterPreset(response: FilterPresetResponse): FilterPreset {
  return {
    id: response.id,
    name: response.name,
    domain: response.domain,
    filters: response.filters,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}
