/**
 * Project Templates API
 * 
 * Phase 3 Enterprise Features - Backend API Integration
 * Template storage, retrieval, creation, updating, and deletion.
 */

import { supabase } from "@/lib/supabase";
import type { ProjectTemplate, TemplateCategory } from "@/components/ui/ProjectTemplates";

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
 * Template response from backend
 */
export interface TemplateResponse {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  tags: string[];
  thumbnail?: string;
  projectData: any;
  authorId: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  isPublic: boolean;
}

/**
 * Template list response
 */
export interface TemplateListResponse {
  templates: TemplateResponse[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Create template request
 */
export interface TemplateCreateRequest {
  name: string;
  description?: string;
  category: TemplateCategory;
  tags?: string[];
  projectId: string;
  thumbnail?: string; // base64 image
}

/**
 * Update template request
 */
export interface TemplateUpdateRequest {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  tags?: string[];
  isPublic?: boolean;
}

/**
 * Clone template request
 */
export interface TemplateCloneRequest {
  projectName: string;
  projectDescription?: string;
}

/**
 * Clone template response
 */
export interface TemplateCloneResponse {
  projectId: string;
  templateId: string;
  projectName: string;
  createdAt: string;
}

/**
 * List templates
 */
export async function listTemplates(options?: {
  category?: TemplateCategory;
  tags?: string[];
  search?: string;
  includePublic?: boolean;
  limit?: number;
  offset?: number;
}): Promise<TemplateListResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const params = new URLSearchParams();
  if (options?.category) {
    params.append("category", options.category);
  }
  if (options?.tags && options.tags.length > 0) {
    params.append("tags", options.tags.join(","));
  }
  if (options?.search) {
    params.append("search", options.search);
  }
  if (options?.includePublic !== undefined) {
    params.append("includePublic", String(options.includePublic));
  }
  if (options?.limit) {
    params.append("limit", String(options.limit));
  }
  if (options?.offset) {
    params.append("offset", String(options.offset));
  }

  const url = `${API_BASE}/api/v2/project-templates${params.toString() ? `?${params.toString()}` : ''}`;
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
    throw new Error(errorData.detail || "Failed to list templates");
  }

  return await response.json();
}

/**
 * Get template by ID
 */
export async function getTemplate(templateId: string): Promise<TemplateResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/project-templates/${templateId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Template ${templateId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get template");
  }

  return await response.json();
}

/**
 * Create template from project
 */
export async function createTemplate(
  request: TemplateCreateRequest
): Promise<TemplateResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/project-templates`, {
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
    throw new Error(errorData.detail || "Failed to create template");
  }

  return await response.json();
}

/**
 * Update template
 */
export async function updateTemplate(
  templateId: string,
  request: TemplateUpdateRequest
): Promise<TemplateResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/project-templates/${templateId}`, {
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
    throw new Error(errorData.detail || "Failed to update template");
  }

  return await response.json();
}

/**
 * Delete template
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/project-templates/${templateId}`, {
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
    throw new Error(errorData.detail || "Failed to delete template");
  }
}

/**
 * Clone template (create project from template)
 */
export async function cloneTemplate(
  templateId: string,
  request: TemplateCloneRequest
): Promise<TemplateCloneResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/project-templates/${templateId}/clone`, {
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
    throw new Error(errorData.detail || "Failed to clone template");
  }

  return await response.json();
}

/**
 * Upload template thumbnail
 */
export async function uploadTemplateThumbnail(
  templateId: string,
  file: File
): Promise<{ thumbnail: string; updatedAt: string }> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/v2/project-templates/${templateId}/thumbnail`, {
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
    throw new Error(errorData.detail || "Failed to upload thumbnail");
  }

  return await response.json();
}

/**
 * Convert backend response to frontend ProjectTemplate
 */
export function convertToProjectTemplate(response: TemplateResponse): ProjectTemplate {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    category: response.category,
    tags: response.tags,
    thumbnail: response.thumbnail,
    projectData: response.projectData,
    authorId: response.authorId,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
    usageCount: response.usageCount,
    isPublic: response.isPublic,
  };
}
