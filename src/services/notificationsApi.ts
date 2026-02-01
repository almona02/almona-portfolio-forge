/**
 * Notifications API
 * 
 * Notification Infrastructure - Backend API Integration
 * Notification management, retrieval, and status updates.
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
 * Notification channel
 */
export type NotificationChannel = 'email' | 'in_app' | 'push' | 'sms';

/**
 * Notification priority
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Notification response from backend
 */
export interface NotificationResponse {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  read: boolean;
  read_at?: string;
  created_at: string;
}

/**
 * Notification list response
 */
export interface NotificationListResponse {
  notifications: NotificationResponse[];
  total: number;
  unread_count: number;
}

/**
 * Create notification request
 */
export interface NotificationCreateRequest {
  channel: NotificationChannel;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Update notification request
 */
export interface NotificationUpdateRequest {
  read?: boolean;
}

/**
 * List notifications
 */
export async function getNotifications(
  read?: boolean,
  channel?: NotificationChannel,
  limit: number = 50,
  offset: number = 0
): Promise<NotificationListResponse> {
  const token = await getAuthToken();
  const params = new URLSearchParams();
  if (read !== undefined) {
    params.append('read', read.toString());
  }
  if (channel) {
    params.append('channel', channel);
  }
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const response = await fetch(
    `${API_BASE}/api/v2/notifications?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'Failed to fetch notifications',
    }));
    throw new Error(error.detail || 'Failed to fetch notifications');
  }

  return response.json();
}

/**
 * Get notification by ID
 */
export async function getNotification(
  notificationId: string
): Promise<NotificationResponse> {
  const token = await getAuthToken();
  const response = await fetch(
    `${API_BASE}/api/v2/notifications/${notificationId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'Notification not found',
    }));
    throw new Error(error.detail || 'Notification not found');
  }

  return response.json();
}

/**
 * Create notification
 */
export async function createNotification(
  request: NotificationCreateRequest
): Promise<NotificationResponse> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/api/v2/notifications`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'Failed to create notification',
    }));
    throw new Error(error.detail || 'Failed to create notification');
  }

  return response.json();
}

/**
 * Mark notification as read
 */
export async function markAsRead(
  notificationId: string
): Promise<NotificationResponse> {
  const token = await getAuthToken();
  const response = await fetch(
    `${API_BASE}/api/v2/notifications/${notificationId}/read`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'Failed to mark notification as read',
    }));
    throw new Error(error.detail || 'Failed to mark notification as read');
  }

  return response.json();
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<{ updated_count: number }> {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE}/api/v2/notifications/read-all`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'Failed to mark all notifications as read',
    }));
    throw new Error(
      error.detail || 'Failed to mark all notifications as read'
    );
  }

  return response.json();
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<{ unread_count: number }> {
  const token = await getAuthToken();
  const response = await fetch(
    `${API_BASE}/api/v2/notifications/unread/count`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'Failed to get unread count',
    }));
    throw new Error(error.detail || 'Failed to get unread count');
  }

  return response.json();
}
