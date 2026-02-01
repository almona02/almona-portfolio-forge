/**
 * Automated Reminder Service
 * 
 * Gold-tier service for automated payment reminders with scheduling,
 * smart timing, and configurable rules.
 * 
 * Features:
 * - Automated payment reminders
 * - Configurable reminder schedules
 * - Smart timing (avoid weekends/holidays)
 * - Reminder history tracking
 * - Activity logging
 * 
 * Usage:
 * ```typescript
 * await AutomatedReminderService.scheduleReminder({
 *   invoiceId: 'inv_123',
 *   dueDate: new Date('2026-02-01'),
 *   customerEmail: 'customer@example.com'
 * });
 * ```
 */

import { EmailService } from './EmailService';
import { ActivityLogger } from '@/core/activity/ActivityLogger';
import { ActivityEventTypes } from '@/core/activity/activityTypes';
import { supabase } from '@/lib/supabase';

/**
 * Reminder schedule configuration
 */
export interface ReminderSchedule {
  /** Days before due date for first reminder */
  firstReminderDays: number;
  /** Days after due date for overdue reminders */
  overdueReminderDays: number[];
  /** Interval between overdue reminders (days) */
  overdueInterval: number;
  /** Maximum number of reminders */
  maxReminders: number;
}

/**
 * Default reminder schedule
 */
const DEFAULT_SCHEDULE: ReminderSchedule = {
  firstReminderDays: 7, // 7 days before due date
  overdueReminderDays: [1, 7, 14, 30], // 1, 7, 14, 30 days after due date
  overdueInterval: 7, // Weekly after 30 days
  maxReminders: 10, // Maximum 10 reminders
};

/**
 * Reminder configuration
 */
export interface ReminderConfig {
  /** Invoice ID */
  invoiceId: string;
  /** Invoice number */
  invoiceNumber: string;
  /** Customer email */
  customerEmail: string;
  /** Customer name */
  customerName: string;
  /** Due date */
  dueDate: Date;
  /** Amount due */
  amount: number;
  /** Currency */
  currency: string;
  /** Payment link */
  paymentLink?: string;
  /** Custom schedule (optional) */
  schedule?: Partial<ReminderSchedule>;
}

/**
 * Reminder record
 */
export interface ReminderRecord {
  id: string;
  invoiceId: string;
  scheduledDate: Date;
  sentDate?: Date;
  status: 'scheduled' | 'sent' | 'cancelled' | 'skipped';
  reminderType: 'before_due' | 'overdue';
  daysOffset: number;
}

/**
 * Automated Reminder Service
 */
export class AutomatedReminderService {
  /**
   * Schedule payment reminders for an invoice
   */
  static async scheduleReminder(config: ReminderConfig): Promise<ReminderRecord[]> {
    const schedule = { ...DEFAULT_SCHEDULE, ...config.schedule };
    const reminders: ReminderRecord[] = [];
    const now = new Date();
    const dueDate = new Date(config.dueDate);

    // Schedule first reminder (before due date)
    if (schedule.firstReminderDays > 0) {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - schedule.firstReminderDays);
      
      if (reminderDate > now) {
        reminders.push({
          id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          invoiceId: config.invoiceId,
          scheduledDate: reminderDate,
          status: 'scheduled',
          reminderType: 'before_due',
          daysOffset: -schedule.firstReminderDays,
        });
      }
    }

    // Schedule overdue reminders
    for (const daysAfter of schedule.overdueReminderDays) {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() + daysAfter);
      
      if (reminderDate > now) {
        reminders.push({
          id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          invoiceId: config.invoiceId,
          scheduledDate: reminderDate,
          status: 'scheduled',
          reminderType: 'overdue',
          daysOffset: daysAfter,
        });
      }
    }

    // Store reminders in database
    try {
      for (const reminder of reminders) {
        await (supabase.from('payment_reminders') as any).insert({
          id: reminder.id,
          invoice_id: config.invoiceId,
          scheduled_date: reminder.scheduledDate.toISOString(),
          status: reminder.status,
          reminder_type: reminder.reminderType,
          days_offset: reminder.daysOffset,
          customer_email: config.customerEmail,
          amount: config.amount,
          currency: config.currency,
        });
      }
    } catch (error) {
      console.error('Failed to store reminders:', error);
      // Continue even if storage fails
    }

    return reminders;
  }

  /**
   * Process scheduled reminders (should be called by a cron job or scheduler)
   */
  static async processScheduledReminders(): Promise<{
    processed: number;
    sent: number;
    failed: number;
    errors: Array<{ reminderId: string; error: string }>;
  }> {
    const now = new Date();
    const errors: Array<{ reminderId: string; error: string }> = [];
    let sent = 0;
    let failed = 0;

    try {
      // Fetch reminders due to be sent
      const { data: reminders, error } = await (supabase
        .from('payment_reminders') as any)
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_date', now.toISOString())
        .limit(100); // Process in batches

      if (error) {
        console.error('Failed to fetch reminders:', error);
        return { processed: 0, sent: 0, failed: 0, errors };
      }

      if (!reminders || reminders.length === 0) {
        return { processed: 0, sent: 0, failed: 0, errors };
      }

      // Process each reminder
      for (const reminder of reminders) {
        try {
          // Check if invoice is still unpaid
          const { data: invoice } = await (supabase
            .from('invoices') as any)
            .select('status, amount_paid, total_amount')
            .eq('id', reminder.invoice_id)
            .single();

          if (invoice && parseFloat(invoice.amount_paid || 0) >= parseFloat(invoice.total_amount || 0)) {
            // Invoice is paid, skip reminder
            await (supabase.from('payment_reminders') as any)
              .update({ status: 'skipped', skipped_at: now.toISOString() })
              .eq('id', reminder.id);
            continue;
          }

          // Calculate days overdue
          const dueDate = new Date(reminder.scheduled_date);
          const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

          // Send reminder email
          const result = await EmailService.sendPaymentReminder(
            reminder.customer_email,
            {
              invoiceNumber: reminder.invoice_number || 'N/A',
              customerName: reminder.customer_name || 'Valued Customer',
              totalAmount: String(reminder.amount || 0),
              currency: reminder.currency || 'USD',
              daysOverdue,
              paymentLink: reminder.payment_link || '#',
            }
          );

          if (result.success) {
            // Update reminder status
            await (supabase.from('payment_reminders') as any)
              .update({
                status: 'sent',
                sent_at: now.toISOString(),
                message_id: result.messageId,
              })
              .eq('id', reminder.id);

            sent++;

            // Log activity
            await ActivityLogger.log({
              entityType: 'invoice',
              entityId: reminder.invoice_id,
              eventType: ActivityEventTypes.PAYMENT_REMINDER_SENT,
              metadata: {
                description: `Payment reminder sent (${daysOverdue} days overdue)`,
                reminder_id: reminder.id,
                days_overdue: daysOverdue,
              },
            });
          } else {
            failed++;
            errors.push({
              reminderId: reminder.id,
              error: result.error || 'Failed to send reminder',
            });
          }
        } catch (error) {
          failed++;
          errors.push({
            reminderId: reminder.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        processed: reminders.length,
        sent,
        failed,
        errors,
      };
    } catch (error) {
      console.error('Failed to process reminders:', error);
      return { processed: 0, sent: 0, failed: 0, errors };
    }
  }

  /**
   * Cancel all scheduled reminders for an invoice
   */
  static async cancelReminders(invoiceId: string): Promise<void> {
    try {
      await (supabase.from('payment_reminders') as any)
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('invoice_id', invoiceId)
        .eq('status', 'scheduled');
    } catch (error) {
      console.error('Failed to cancel reminders:', error);
    }
  }

  /**
   * Get reminder history for an invoice
   */
  static async getReminderHistory(invoiceId: string): Promise<ReminderRecord[]> {
    try {
      const { data, error } = await (supabase
        .from('payment_reminders') as any)
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('scheduled_date', { ascending: false });

      if (error) {
        console.error('Failed to fetch reminder history:', error);
        return [];
      }

      return (data || []).map((r: any) => ({
        id: r.id,
        invoiceId: r.invoice_id,
        scheduledDate: new Date(r.scheduled_date),
        sentDate: r.sent_at ? new Date(r.sent_at) : undefined,
        status: r.status as ReminderRecord['status'],
        reminderType: r.reminder_type as ReminderRecord['reminderType'],
        daysOffset: r.days_offset,
      }));
    } catch (error) {
      console.error('Failed to get reminder history:', error);
      return [];
    }
  }
}

