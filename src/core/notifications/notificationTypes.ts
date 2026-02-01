/**
 * Notification Types
 * 
 * Type definitions and constants for the notification system.
 * Provides type safety and helper functions for notification handling.
 */

/**
 * Notification channel types
 */
export type NotificationChannel = 'email' | 'in_app' | 'push' | 'sms';

/**
 * Notification type constants
 */
export const NotificationTypes = {
  // Payment notifications
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_REFUNDED: 'payment_refunded',
  
  // Invoice/Quote notifications
  INVOICE_CREATED: 'invoice_created',
  INVOICE_SENT: 'invoice_sent',
  INVOICE_OVERDUE: 'invoice_overdue',
  QUOTE_CREATED: 'quote_created',
  QUOTE_ACCEPTED: 'quote_accepted',
  QUOTE_REJECTED: 'quote_rejected',
  
  // Approval notifications
  APPROVAL_REQUIRED: 'approval_required',
  APPROVAL_GRANTED: 'approval_granted',
  APPROVAL_DENIED: 'approval_denied',
  
  // Workflow notifications
  WORKFLOW_STARTED: 'workflow_started',
  WORKFLOW_COMPLETED: 'workflow_completed',
  WORKFLOW_BLOCKED: 'workflow_blocked',
  WORKFLOW_STEP_COMPLETED: 'workflow_step_completed',
  
  // Production notifications
  PRODUCTION_STARTED: 'production_started',
  PRODUCTION_COMPLETED: 'production_completed',
  PRODUCTION_QC_FAILED: 'production_qc_failed',
  
  // Inventory notifications
  INVENTORY_LOW_STOCK: 'inventory_low_stock',
  INVENTORY_OUT_OF_STOCK: 'inventory_out_of_stock',
  
  // System notifications
  SYSTEM_ALERT: 'system_alert',
  SYSTEM_UPDATE: 'system_update',
} as const;

export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes];

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  type: NotificationType | string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  priority?: NotificationPriority;
}

/**
 * Notification template interface
 */
export interface NotificationTemplate {
  type: NotificationType | string;
  title: string;
  message: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  variables?: string[]; // Template variables like {{amount}}, {{customerName}}
}

/**
 * Notification rule interface
 */
export interface NotificationRule {
  id: string;
  userId: string;
  triggerEvent: string;
  conditions?: Record<string, any>;
  channels: NotificationChannel[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get notification icon based on type
 */
export const getNotificationIcon = (type: string): string => {
  if (type.startsWith('payment_')) return 'DollarSign';
  if (type.startsWith('invoice_') || type.startsWith('quote_')) return 'FileText';
  if (type.startsWith('approval_')) return 'CheckCircle2';
  if (type.startsWith('workflow_')) return 'GitBranch';
  if (type.startsWith('production_')) return 'Package';
  if (type.startsWith('inventory_')) return 'Box';
  if (type.startsWith('system_')) return 'AlertCircle';
  return 'Bell';
};

/**
 * Get notification color based on type and priority
 */
export const getNotificationColor = (type: string, priority?: NotificationPriority): string => {
  if (priority === 'urgent') return 'text-red-400';
  if (priority === 'high') return 'text-orange-400';
  
  if (type.startsWith('payment_')) {
    if (type.includes('received') || type.includes('completed')) return 'text-emerald-400';
    if (type.includes('failed') || type.includes('refunded')) return 'text-red-400';
    return 'text-yellow-400';
  }
  
  if (type.startsWith('approval_')) {
    if (type.includes('granted')) return 'text-emerald-400';
    if (type.includes('denied')) return 'text-red-400';
    return 'text-amber-400';
  }
  
  if (type.startsWith('system_alert')) return 'text-red-400';
  
  return 'text-amber-400';
};

/**
 * Get human-readable notification label
 */
export const getNotificationLabel = (type: string): string => {
  const labels: Record<string, string> = {
    payment_received: 'Payment Received',
    payment_failed: 'Payment Failed',
    payment_pending: 'Payment Pending',
    payment_refunded: 'Payment Refunded',
    invoice_created: 'Invoice Created',
    invoice_sent: 'Invoice Sent',
    invoice_overdue: 'Invoice Overdue',
    quote_created: 'Quote Created',
    quote_accepted: 'Quote Accepted',
    quote_rejected: 'Quote Rejected',
    approval_required: 'Approval Required',
    approval_granted: 'Approval Granted',
    approval_denied: 'Approval Denied',
    workflow_started: 'Workflow Started',
    workflow_completed: 'Workflow Completed',
    workflow_blocked: 'Workflow Blocked',
    production_started: 'Production Started',
    production_completed: 'Production Completed',
    inventory_low_stock: 'Low Stock Alert',
    inventory_out_of_stock: 'Out of Stock',
    system_alert: 'System Alert',
    system_update: 'System Update',
  };
  
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

