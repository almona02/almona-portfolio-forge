/**
 * Activity Event Type Definitions
 * 
 * Centralized type definitions for activity logging across the application.
 * Provides type safety and consistent event naming.
 */

// Event type definitions for type safety
export const ActivityEventTypes = {
  // Customer events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
  CUSTOMER_CONTACTED: 'customer.contacted',
  CUSTOMER_NOTE_ADDED: 'customer.note_added',
  CUSTOMER_STATUS_CHANGED: 'customer.status_changed',
  
  // Project events
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',
  PROJECT_STATUS_CHANGED: 'project.status_changed',
  PROJECT_ASSIGNED: 'project.assigned',
  PROJECT_COMPLETED: 'project.completed',
  
  // Invoice/Quote events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_UPDATED: 'invoice.updated',
  INVOICE_SENT: 'invoice.sent',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_CANCELLED: 'invoice.cancelled',
  INVOICE_REFUNDED: 'invoice.refunded',
  QUOTE_CREATED: 'quote.created',
  QUOTE_UPDATED: 'quote.updated',
  QUOTE_SENT: 'quote.sent',
  QUOTE_ACCEPTED: 'quote.accepted',
  QUOTE_REJECTED: 'quote.rejected',
  QUOTE_EXPIRED: 'quote.expired',
  
  // Workflow events
  WORKFLOW_STARTED: 'workflow.started',
  WORKFLOW_STEP_COMPLETED: 'workflow.step_completed',
  WORKFLOW_STEP_BLOCKED: 'workflow.step_blocked',
  WORKFLOW_COMPLETED: 'workflow.completed',
  WORKFLOW_CANCELLED: 'workflow.cancelled',
  WORKFLOW_APPROVED: 'workflow.approved',
  WORKFLOW_REJECTED: 'workflow.rejected',
  
  // Production events
  PRODUCTION_STARTED: 'production.started',
  PRODUCTION_PAUSED: 'production.paused',
  PRODUCTION_RESUMED: 'production.resumed',
  PRODUCTION_COMPLETED: 'production.completed',
  PRODUCTION_QC_PASSED: 'production.qc_passed',
  PRODUCTION_QC_FAILED: 'production.qc_failed',
  PRODUCTION_QC_RETEST: 'production.qc_retest',
  
  // Inventory events
  INVENTORY_ADDED: 'inventory.added',
  INVENTORY_UPDATED: 'inventory.updated',
  INVENTORY_REMOVED: 'inventory.removed',
  INVENTORY_LOW_STOCK: 'inventory.low_stock',
  INVENTORY_OUT_OF_STOCK: 'inventory.out_of_stock',
  INVENTORY_MOVEMENT: 'inventory.movement',
  INVENTORY_BATCH_CREATED: 'inventory.batch_created',
  
  // Profile events
  PROFILE_CREATED: 'profile.created',
  PROFILE_UPDATED: 'profile.updated',
  PROFILE_DELETED: 'profile.deleted',
  PROFILE_TUNED: 'profile.tuned',
  PROFILE_CALIBRATED: 'profile.calibrated',
  
  // Payment events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_PROCESSING: 'payment.processing',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_CANCELLED: 'payment.cancelled',
  INVOICE_PAYMENT_LINK_CREATED: 'invoice.payment_link_created',
  PAYMENT_LINK_REVOKED: 'payment_link.revoked',
  PAYMENT_REMINDER_SENT: 'payment.reminder_sent',
  
  // Recurring invoice events
  RECURRING_INVOICE_CREATED: 'recurring_invoice.created',
  RECURRING_INVOICE_GENERATED: 'recurring_invoice.generated',
  RECURRING_INVOICE_PAUSED: 'recurring_invoice.paused',
  RECURRING_INVOICE_RESUMED: 'recurring_invoice.resumed',
  RECURRING_INVOICE_DEACTIVATED: 'recurring_invoice.deactivated',
  RECURRING_INVOICE_DELETED: 'recurring_invoice.deleted',
} as const;

export type ActivityEventType = typeof ActivityEventTypes[keyof typeof ActivityEventTypes];

// Entity type definitions
export type ActivityEntityType = 
  | 'customer' 
  | 'project' 
  | 'invoice' 
  | 'quote' 
  | 'workflow' 
  | 'production' 
  | 'inventory' 
  | 'profile' 
  | 'payment'
  | 'payment_link'
  | 'recurring_invoice';

/**
 * Get human-readable label for an event type
 */
export const getActivityLabel = (eventType: string): string => {
  const labels: Record<string, string> = {
    // Customer
    'customer.created': 'Customer Created',
    'customer.updated': 'Customer Updated',
    'customer.deleted': 'Customer Deleted',
    'customer.contacted': 'Customer Contacted',
    'customer.note_added': 'Note Added',
    'customer.status_changed': 'Status Changed',
    
    // Project
    'project.created': 'Project Created',
    'project.updated': 'Project Updated',
    'project.deleted': 'Project Deleted',
    'project.status_changed': 'Status Changed',
    'project.assigned': 'Project Assigned',
    'project.completed': 'Project Completed',
    
    // Invoice/Quote
    'invoice.created': 'Invoice Created',
    'invoice.updated': 'Invoice Updated',
    'invoice.sent': 'Invoice Sent',
    'invoice.paid': 'Payment Received',
    'invoice.cancelled': 'Invoice Cancelled',
    'invoice.refunded': 'Invoice Refunded',
    'quote.created': 'Quote Created',
    'quote.updated': 'Quote Updated',
    'quote.sent': 'Quote Sent',
    'quote.accepted': 'Quote Accepted',
    'quote.rejected': 'Quote Rejected',
    'quote.expired': 'Quote Expired',
    
    // Workflow
    'workflow.started': 'Workflow Started',
    'workflow.step_completed': 'Step Completed',
    'workflow.step_blocked': 'Step Blocked',
    'workflow.completed': 'Workflow Completed',
    'workflow.cancelled': 'Workflow Cancelled',
    'workflow.approved': 'Workflow Approved',
    'workflow.rejected': 'Workflow Rejected',
    
    // Production
    'production.started': 'Production Started',
    'production.paused': 'Production Paused',
    'production.resumed': 'Production Resumed',
    'production.completed': 'Production Completed',
    'production.qc_passed': 'Quality Check Passed',
    'production.qc_failed': 'Quality Check Failed',
    'production.qc_retest': 'Quality Check Retest',
    
    // Inventory
    'inventory.added': 'Inventory Added',
    'inventory.updated': 'Inventory Updated',
    'inventory.removed': 'Inventory Removed',
    'inventory.low_stock': 'Low Stock Alert',
    'inventory.out_of_stock': 'Out of Stock',
    'inventory.movement': 'Stock Movement',
    'inventory.batch_created': 'Batch Created',
    
    // Profile
    'profile.created': 'Profile Created',
    'profile.updated': 'Profile Updated',
    'profile.deleted': 'Profile Deleted',
    'profile.tuned': 'Profile Tuned',
    'profile.calibrated': 'Profile Calibrated',
    
    // Payment
    'payment.initiated': 'Payment Initiated',
    'payment.processing': 'Payment Processing',
    'payment.completed': 'Payment Completed',
    'payment.failed': 'Payment Failed',
    'payment.refunded': 'Payment Refunded',
    'payment.cancelled': 'Payment Cancelled',
  };
  
  return labels[eventType] || eventType;
};

/**
 * Get icon name for an event type (for UI display)
 */
export const getActivityIcon = (eventType: string): string => {
  if (eventType.startsWith('customer.')) return 'Users';
  if (eventType.startsWith('project.')) return 'Folder';
  if (eventType.startsWith('invoice.') || eventType.startsWith('quote.')) return 'FileText';
  if (eventType.startsWith('workflow.')) return 'GitBranch';
  if (eventType.startsWith('production.')) return 'Package';
  if (eventType.startsWith('inventory.')) return 'Box';
  if (eventType.startsWith('profile.')) return 'Settings';
  if (eventType.startsWith('payment.')) return 'CreditCard';
  return 'Activity';
};

/**
 * Get color for an event type (for UI display)
 */
export const getActivityColor = (eventType: string): string => {
  if (eventType.includes('.created') || eventType.includes('.started')) return 'text-green-600';
  if (eventType.includes('.updated') || eventType.includes('.processing')) return 'text-blue-600';
  if (eventType.includes('.completed') || eventType.includes('.paid') || eventType.includes('.passed')) return 'text-emerald-600';
  if (eventType.includes('.deleted') || eventType.includes('.cancelled') || eventType.includes('.failed') || eventType.includes('.rejected')) return 'text-red-600';
  if (eventType.includes('.blocked') || eventType.includes('.paused')) return 'text-yellow-600';
  return 'text-gray-600';
};

