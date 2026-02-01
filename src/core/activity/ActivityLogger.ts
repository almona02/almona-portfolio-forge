/**
 * Activity Logger Service
 * 
 * Centralized service for logging all user activities across the application.
 * Provides enterprise-grade audit trail capabilities.
 * 
 * Usage:
 * ```typescript
 * await ActivityLogger.log({
 *   entityType: 'customer',
 *   entityId: customer.id,
 *   eventType: ActivityEventTypes.CUSTOMER_UPDATED,
 *   metadata: { changes: { name: 'Old -> New' } }
 * });
 * ```
 */

import { supabase } from '@/lib/supabase';
import type { ActivityEntityType, ActivityEventType } from './activityTypes';

export interface ActivityEvent {
  entityType: ActivityEntityType;
  entityId: string;
  eventType: ActivityEventType | string;
  userId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ActivityLogEntry extends ActivityEvent {
  id: string;
  timestamp: Date;
}

/**
 * Activity Logger Service
 * 
 * Provides methods to log and retrieve activity events.
 * All methods are static for easy access throughout the application.
 */
export class ActivityLogger {
  /**
   * Log an activity event
   * 
   * @param event - The activity event to log
   * @returns Promise that resolves when the event is logged
   * 
   * @example
   * ```typescript
   * await ActivityLogger.log({
   *   entityType: 'customer',
   *   entityId: customer.id,
   *   eventType: ActivityEventTypes.CUSTOMER_UPDATED,
   *   metadata: {
   *     description: `Updated customer ${customer.name}`,
   *     changes: { name: 'Old Name -> New Name' }
   *   }
   * });
   * ```
   */
  static async log(event: ActivityEvent): Promise<void> {
    try {
      // Get current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.warn('ActivityLogger: No authenticated user, skipping log');
        return;
      }

      const userId = event.userId || user.id;

      // Get IP address and user agent if available
      const ipAddress = event.ipAddress || (typeof window !== 'undefined' ? undefined : undefined);
      const userAgent = event.userAgent || (typeof window !== 'undefined' ? navigator.userAgent : undefined);

      const { error } = await supabase.from('activity_events').insert({
        entity_type: event.entityType,
        entity_id: event.entityId,
        event_type: event.eventType,
        user_id: userId,
        metadata: event.metadata || {},
        ip_address: ipAddress,
        user_agent: userAgent
      });

      if (error) {
        console.error('ActivityLogger error:', error);
        // Don't throw - activity logging should never break the app
        // But log to console for debugging
        return;
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - activity logging should never break the app
    }
  }

  /**
   * Get activity timeline for a specific entity
   * 
   * @param entityType - Type of entity (customer, project, etc.)
   * @param entityId - ID of the entity
   * @param limit - Maximum number of activities to return (default: 50)
   * @returns Promise that resolves to array of activity log entries
   * 
   * @example
   * ```typescript
   * const timeline = await ActivityLogger.getTimeline('customer', customerId);
   * ```
   */
  static async getTimeline(
    entityType: ActivityEntityType | string,
    entityId: string,
    limit: number = 50
  ): Promise<ActivityLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('activity_events')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch timeline:', error);
        return [];
      }

      return (data || []).map((d: any) => ({
        id: d.id,
        entityType: d.entity_type,
        entityId: d.entity_id,
        eventType: d.event_type,
        userId: d.user_id,
        metadata: d.metadata || {},
        timestamp: new Date(d.timestamp),
        ipAddress: d.ip_address,
        userAgent: d.user_agent
      }));
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
      return [];
    }
  }

  /**
   * Get recent activities across all entities (for dashboard)
   * 
   * @param limit - Maximum number of activities to return (default: 20)
   * @returns Promise that resolves to array of activity log entries
   * 
   * @example
   * ```typescript
   * const recent = await ActivityLogger.getRecentActivities(20);
   * ```
   */
  static async getRecentActivities(limit: number = 20): Promise<ActivityLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('activity_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch recent activities:', error);
        return [];
      }

      return (data || []).map((d: any) => ({
        id: d.id,
        entityType: d.entity_type,
        entityId: d.entity_id,
        eventType: d.event_type,
        userId: d.user_id,
        metadata: d.metadata || {},
        timestamp: new Date(d.timestamp),
        ipAddress: d.ip_address,
        userAgent: d.user_agent
      }));
    } catch (error) {
      console.error('Failed to fetch recent activities:', error);
      return [];
    }
  }

  /**
   * Get activities by user
   * 
   * @param userId - ID of the user
   * @param limit - Maximum number of activities to return (default: 50)
   * @returns Promise that resolves to array of activity log entries
   * 
   * @example
   * ```typescript
   * const userActivities = await ActivityLogger.getByUser(userId);
   * ```
   */
  static async getByUser(userId: string, limit: number = 50): Promise<ActivityLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('activity_events')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch user activities:', error);
        return [];
      }

      return (data || []).map((d: any) => ({
        id: d.id,
        entityType: d.entity_type,
        entityId: d.entity_id,
        eventType: d.event_type,
        userId: d.user_id,
        metadata: d.metadata || {},
        timestamp: new Date(d.timestamp),
        ipAddress: d.ip_address,
        userAgent: d.user_agent
      }));
    } catch (error) {
      console.error('Failed to fetch user activities:', error);
      return [];
    }
  }

  /**
   * Get activities by event type
   * 
   * @param eventType - Type of event to filter by
   * @param limit - Maximum number of activities to return (default: 50)
   * @returns Promise that resolves to array of activity log entries
   * 
   * @example
   * ```typescript
   * const payments = await ActivityLogger.getByEventType(ActivityEventTypes.INVOICE_PAID);
   * ```
   */
  static async getByEventType(eventType: string, limit: number = 50): Promise<ActivityLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('activity_events')
        .select('*')
        .eq('event_type', eventType)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch activities by event type:', error);
        return [];
      }

      return (data || []).map((d: any) => ({
        id: d.id,
        entityType: d.entity_type,
        entityId: d.entity_id,
        eventType: d.event_type,
        userId: d.user_id,
        metadata: d.metadata || {},
        timestamp: new Date(d.timestamp),
        ipAddress: d.ip_address,
        userAgent: d.user_agent
      }));
    } catch (error) {
      console.error('Failed to fetch activities by event type:', error);
      return [];
    }
  }
}

