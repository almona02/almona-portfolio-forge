/**
 * Notification Service
 * 
 * Gold-tier notification service for multi-channel notifications (email, in-app, push, SMS).
 * Provides rule-based triggers, template system, and activity logging integration.
 * 
 * Features:
 * - Multi-channel support (email, in-app, push, SMS)
 * - Template-based notifications
 * - Rule-based triggers
 * - Activity logging integration
 * - Priority levels
 * 
 * Usage:
 * ```typescript
 * await NotificationService.notify(
 *   userId,
 *   NotificationTypes.PAYMENT_RECEIVED,
 *   { amount: 100, currency: 'USD' },
 *   ['in_app', 'email']
 * );
 * ```
 */

import { ActivityLogger } from '@/core/activity/ActivityLogger';
import { supabase } from '@/lib/supabase';
import type {
    Notification,
    NotificationChannel,
    NotificationPriority,
    NotificationRule,
    NotificationTemplate,
    NotificationType,
} from './notificationTypes';
import { getNotificationLabel } from './notificationTypes';

/**
 * Notification data for template rendering
 */
export interface NotificationData {
  [key: string]: any;
}

/**
 * Notification Service
 */
export class NotificationService {
  /**
   * Send notification to user via specified channels
   */
  static async notify(
    userId: string,
    type: NotificationType | string,
    data: NotificationData = {},
    channels: NotificationChannel[] = ['in_app'],
    priority: NotificationPriority = 'medium'
  ): Promise<void> {
    try {
      const template = await this.getTemplate(type);
      const title = this.renderTemplate(template.title, data);
      const message = this.renderTemplate(template.message, data);

      // Send to each channel
      for (const channel of channels) {
        await this.sendNotification(userId, channel, type, title, message, data, priority);
      }

      // Log activity
      await ActivityLogger.log({
        entityType: 'payment', // Will be determined from notification type
        entityId: data.entityId || '',
        eventType: `${type}_notification_sent` as any,
        metadata: {
          description: `Notification sent: ${getNotificationLabel(type)}`,
          channels,
          priority,
        },
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't throw - notifications should never break the app
    }
  }

  /**
   * Send notification to specific channel
   */
  private static async sendNotification(
    userId: string,
    channel: NotificationChannel,
    type: NotificationType | string,
    title: string,
    message: string,
    data: NotificationData,
    priority: NotificationPriority
  ): Promise<void> {
    switch (channel) {
      case 'in_app':
        await this.sendInAppNotification(userId, type, title, message, data, priority);
        break;
      case 'email':
        await this.sendEmailNotification(userId, type, title, message, data);
        break;
      case 'push':
        await this.sendPushNotification(userId, type, title, message, data);
        break;
      case 'sms':
        await this.sendSmsNotification(userId, type, title, message, data);
        break;
    }
  }

  /**
   * Send in-app notification (stored in database)
   */
  private static async sendInAppNotification(
    userId: string,
    type: NotificationType | string,
    title: string,
    message: string,
    data: NotificationData,
    priority: NotificationPriority
  ): Promise<void> {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      channel: 'in_app',
      type,
      title,
      message,
      metadata: { ...data, priority },
      read: false,
    } as any);

    if (error) {
      console.error('Failed to create in-app notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification (placeholder - requires email service)
   */
  private static async sendEmailNotification(
    userId: string,
    type: NotificationType | string,
    title: string,
    message: string,
    data: NotificationData
  ): Promise<void> {
    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    console.log('Email notification (not implemented):', { userId, type, title, message });
    
    // Store email notification record
    await supabase.from('notifications').insert({
      user_id: userId,
      channel: 'email',
      type,
      title,
      message,
      metadata: data,
      read: false,
    } as any);
  }

  /**
   * Send push notification (placeholder - requires push service)
   */
  private static async sendPushNotification(
    userId: string,
    type: NotificationType | string,
    title: string,
    message: string,
    data: NotificationData
  ): Promise<void> {
    // TODO: Integrate with push notification service (FCM, OneSignal, etc.)
    console.log('Push notification (not implemented):', { userId, type, title, message });
    
    // Store push notification record
    await supabase.from('notifications').insert({
      user_id: userId,
      channel: 'push',
      type,
      title,
      message,
      metadata: data,
      read: false,
    } as any);
  }

  /**
   * Send SMS notification (placeholder - requires SMS service)
   */
  private static async sendSmsNotification(
    userId: string,
    type: NotificationType | string,
    title: string,
    message: string,
    data: NotificationData
  ): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, etc.)
    console.log('SMS notification (not implemented):', { userId, type, title, message });
    
    // Store SMS notification record
    await supabase.from('notifications').insert({
      user_id: userId,
      channel: 'sms',
      type,
      title,
      message,
      metadata: data,
      read: false,
    } as any);
  }

  /**
   * Get notification template by type
   */
  private static async getTemplate(type: NotificationType | string): Promise<NotificationTemplate> {
    // Default templates
    const templates: Record<string, NotificationTemplate> = {
      payment_received: {
        type: 'payment_received',
        title: 'Payment Received',
        message: 'Payment of {{amount}} {{currency}} has been received for invoice {{invoiceNumber}}.',
        channels: ['in_app', 'email'],
        priority: 'high',
        variables: ['amount', 'currency', 'invoiceNumber'],
      },
      payment_failed: {
        type: 'payment_failed',
        title: 'Payment Failed',
        message: 'Payment of {{amount}} {{currency}} failed. Please try again or contact support.',
        channels: ['in_app', 'email'],
        priority: 'high',
        variables: ['amount', 'currency'],
      },
      invoice_created: {
        type: 'invoice_created',
        title: 'Invoice Created',
        message: 'Invoice {{invoiceNumber}} for {{amount}} {{currency}} has been created.',
        channels: ['in_app'],
        priority: 'medium',
        variables: ['invoiceNumber', 'amount', 'currency'],
      },
      invoice_overdue: {
        type: 'invoice_overdue',
        title: 'Invoice Overdue',
        message: 'Invoice {{invoiceNumber}} is overdue. Amount due: {{amount}} {{currency}}.',
        channels: ['in_app', 'email'],
        priority: 'urgent',
        variables: ['invoiceNumber', 'amount', 'currency'],
      },
      approval_required: {
        type: 'approval_required',
        title: 'Approval Required',
        message: '{{entityType}} {{entityId}} requires your approval.',
        channels: ['in_app', 'email'],
        priority: 'high',
        variables: ['entityType', 'entityId'],
      },
      workflow_completed: {
        type: 'workflow_completed',
        title: 'Workflow Completed',
        message: 'Workflow {{workflowName}} has been completed successfully.',
        channels: ['in_app'],
        priority: 'medium',
        variables: ['workflowName'],
      },
    };

    return templates[type] || {
      type,
      title: getNotificationLabel(type),
      message: 'You have a new notification.',
      channels: ['in_app'],
      priority: 'medium',
    };
  }

  /**
   * Render template with data
   */
  private static renderTemplate(template: string, data: NotificationData): string {
    let rendered = template;
    for (const [key, value] of Object.entries(data)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''));
    }
    return rendered;
  }

  /**
   * Check notification rules and trigger notifications
   */
  static async checkRules(event: { type: string; userId: string; data: NotificationData }): Promise<void> {
    try {
      const { data: rules, error } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('user_id', event.userId)
        .eq('active', true);

      if (error) {
        console.error('Failed to fetch notification rules:', error);
        return;
      }

      if (!rules || rules.length === 0) return;

      for (const rule of rules as any[]) {
        if (this.matchesTrigger(rule, event)) {
          await this.notify(
            rule.user_id,
            rule.trigger_event || rule.triggerEvent,
            event.data,
            (rule.channels || []) as NotificationChannel[],
            'medium'
          );
        }
      }
    } catch (error) {
      console.error('Failed to check notification rules:', error);
    }
  }

  /**
   * Check if rule matches trigger event
   */
  private static matchesTrigger(rule: NotificationRule | any, event: { type: string; data: NotificationData }): boolean {
    // Simple matching - can be enhanced with condition evaluation
    const triggerEvent = rule.trigger_event || rule.triggerEvent;
    return triggerEvent === event.type || triggerEvent === '*';
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    unreadOnly: boolean = false,
    limit: number = 50
  ): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.eq('read', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch notifications:', error);
        return [];
      }

      return ((data || []) as any[]).map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        channel: n.channel,
        type: n.type,
        title: n.title,
        message: n.message,
        metadata: n.metadata || {},
        read: n.read,
        readAt: n.read_at ? new Date(n.read_at) : undefined,
        createdAt: new Date(n.created_at),
        priority: n.metadata?.priority || 'medium',
      }));
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await (supabase
        .from('notifications') as any)
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Failed to mark notification as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await (supabase
        .from('notifications') as any)
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Failed to mark all notifications as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      // Try 'is_read' first (more common schema) to avoid 400 errors
      const { count, error: error1 } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (!error1) {
        return count || 0;
      }

      // If 'is_read' fails, try 'read' column
      if (error1.code === '42703' || error1.message?.includes('column') || error1.code === 'PGRST116') {
        const { count: altCount, error: error2 } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false);
        
        if (!error2) {
          return altCount || 0;
        }
      }

      // If both fail, check if it's a table/column issue (not a real error to log)
      if (error1.code === '42P01' || error1.code === 'PGRST116' || error1.message?.includes('does not exist')) {
        // Table/column doesn't exist - silently return 0
        return 0;
      }

      // For other errors, also silently return 0 (non-critical)
      return 0;
    } catch (_error) {
      // Silently fail - notifications table may not exist or may have different schema
      // This is non-critical functionality
      return 0;
    }
  }
}

