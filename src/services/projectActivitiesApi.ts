/**
 * Project Activities API
 * 
 * Phase 3 Enterprise Features - Backend API Integration
 * Activity/audit log storage, retrieval, filtering, comments, and revert operations.
 */

import { supabase } from "@/lib/supabase";
import type {
  Activity,
  ActivityType as FrontendActivityType,
  Comment,
  ActivityDetails,
} from "@/components/ui/ProjectActivityTimeline";

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
 * Backend activity type (maps to frontend ActivityType)
 */
type BackendActivityType =
  | "created"
  | "updated"
  | "status_changed"
  | "assigned"
  | "comment_added"
  | "file_attached"
  | "field_changed"
  | "deleted"
  | "restored";

/**
 * Activity comment response from backend
 */
export interface ActivityCommentResponse {
  id: string;
  activityId: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

/**
 * Activity response from backend
 */
export interface ActivityResponse {
  id: string;
  projectId: string;
  activityType: BackendActivityType;
  userId: string;
  userName?: string;
  userAvatar?: string;
  title?: string;
  description?: string;
  metadata: Record<string, any>;
  createdAt: string;
  comments: ActivityCommentResponse[];
  isRevertible: boolean;
  revertData?: Record<string, any>;
}

/**
 * Activity list response
 */
export interface ActivityListResponse {
  activities: ActivityResponse[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Create activity request
 */
export interface ActivityCreateRequest {
  projectId: string;
  activityType: BackendActivityType;
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Create comment request
 */
export interface ActivityCommentCreateRequest {
  content: string;
}

/**
 * Update comment request
 */
export interface ActivityCommentUpdateRequest {
  content: string;
}

/**
 * Map backend activity type to frontend
 */
function mapActivityType(backendType: BackendActivityType): FrontendActivityType {
  const mapping: Record<BackendActivityType, FrontendActivityType> = {
    created: 'project_created',
    updated: 'field_changed',
    status_changed: 'status_changed',
    assigned: 'field_changed',
    comment_added: 'comment_added',
    file_attached: 'file_uploaded',
    field_changed: 'field_changed',
    deleted: 'field_changed',
    restored: 'reverted',
  };
  return mapping[backendType] || 'field_changed';
}

/**
 * Convert backend activity to frontend Activity
 */
function convertToActivity(response: ActivityResponse): Activity {
  const comments: Comment[] = (response.comments || []).map((c) => ({
    id: c.id,
    activityId: c.activityId,
    userId: c.authorId,
    userName: c.authorName || 'Unknown',
    userAvatar: c.authorAvatar,
    text: c.content,
    timestamp: c.createdAt,
  }));

  return {
    id: response.id,
    type: mapActivityType(response.activityType),
    projectId: response.projectId,
    userId: response.userId,
    userName: response.userName || 'Unknown',
    userAvatar: response.userAvatar,
    timestamp: response.createdAt,
    title: response.title || '',
    description: response.description,
    details: response.metadata as ActivityDetails,
    comments,
    canRevert: response.isRevertible,
    revertData: response.revertData,
  };
}

/**
 * List project activities
 */
export async function listProjectActivities(
  projectId: string,
  options?: {
    type?: FrontendActivityType;
    userId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ActivityListResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const params = new URLSearchParams();
  // Note: Backend uses different activity types, but we'll let it handle the conversion
  // For now, we'll pass through if provided
  if (options?.type) {
    // Map frontend type to backend type (simplified - backend may handle multiple)
    params.append("type", options.type);
  }
  if (options?.userId) {
    params.append("userId", options.userId);
  }
  if (options?.from) {
    params.append("from", options.from);
  }
  if (options?.to) {
    params.append("to", options.to);
  }
  if (options?.limit) {
    params.append("limit", String(options.limit));
  }
  if (options?.offset) {
    params.append("offset", String(options.offset));
  }

  const url = `${API_BASE}/api/v2/projects/${projectId}/activities${params.toString() ? `?${params.toString()}` : ''}`;
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
    throw new Error(errorData.detail || "Failed to list project activities");
  }

  return await response.json();
}

/**
 * Get activity by ID
 */
export async function getActivity(
  projectId: string,
  activityId: string
): Promise<ActivityResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(
    `${API_BASE}/api/v2/projects/${projectId}/activities/${activityId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Activity ${activityId} not found`);
    }
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to get activity");
  }

  return await response.json();
}

/**
 * Create activity
 */
export async function createActivity(
  projectId: string,
  request: ActivityCreateRequest
): Promise<ActivityResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(`${API_BASE}/api/v2/projects/${projectId}/activities`, {
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
    throw new Error(errorData.detail || "Failed to create activity");
  }

  return await response.json();
}

/**
 * Add comment to activity
 */
export async function addActivityComment(
  projectId: string,
  activityId: string,
  request: ActivityCommentCreateRequest
): Promise<ActivityCommentResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(
    `${API_BASE}/api/v2/projects/${projectId}/activities/${activityId}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to add comment");
  }

  return await response.json();
}

/**
 * Update activity comment
 */
export async function updateActivityComment(
  projectId: string,
  activityId: string,
  commentId: string,
  request: ActivityCommentUpdateRequest
): Promise<ActivityCommentResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(
    `${API_BASE}/api/v2/projects/${projectId}/activities/${activityId}/comments/${commentId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to update comment");
  }

  return await response.json();
}

/**
 * Delete activity comment
 */
export async function deleteActivityComment(
  projectId: string,
  activityId: string,
  commentId: string
): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("No auth token");

  const response = await fetch(
    `${API_BASE}/api/v2/projects/${projectId}/activities/${activityId}/comments/${commentId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || "Failed to delete comment");
  }
}

/**
 * Export conversion functions
 */
export { convertToActivity, mapActivityType };
