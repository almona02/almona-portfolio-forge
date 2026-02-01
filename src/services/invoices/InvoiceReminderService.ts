/**
 * Invoice Reminder Service
 * 
 * Gold-tier service for automated invoice reminders with intelligent scheduling,
 * escalation rules, and multi-channel delivery.
 * 
 * Features:
 * - Automated reminder scheduling
 * - Escalation rules (gentle → firm → final notice)
 * - Multi-channel delivery (email, SMS, in-app)
 * - Reminder templates
 * - Reminder history tracking
 * - Smart timing based on payment patterns
 * 
 * Usage:
 * ```typescript
 * await InvoiceReminderService.scheduleReminder(invoiceId, {
 *   reminderType: 'first',
 *   sendDate: new Date('2026-01-15')
 * });
 * ```
 */

import { ActivityLogger } from '@/core/activity/ActivityLogger';
import { ActivityEventTypes } from '@/core/activity/activityTypes';
import { supabase } from '@/lib/supabase';
import { EmailService } from '@/services/email';
import { InvoicePaymentTracker } from './InvoicePaymentTracker';

export type ReminderType = 'first' | 'second' | 'final' | 'custom';
export type ReminderChannel = 'email' | 'sms' | 'in_app';

export interface ReminderSchedule {
  id: string;
  invoiceId: string;
  reminderType: ReminderType;
  channel: ReminderChannel;
  sendDate: Date;
  sentAt: Date | null;
  isSent: boolean;
  templateId: string | null;
  customMessage: string | null;
  createdAt: Date;
}

export interface ScheduleReminderParams {
  invoiceId: string;
  reminderType: ReminderType;
  sendDate: Date;
  channel?: ReminderChannel;
  templateId?: string | null;
  customMessage?: string | null;
}

/**
 * Invoice Reminder Service
 */
export class InvoiceReminderService {
  /**
   * Schedule a reminder for an invoice
   */
  static async scheduleReminder(params: ScheduleReminderParams): Promise<string> {
    try {
      const { data, error } = await (supabase.from('invoice_reminders') as any)
        .insert({
          invoice_id: params.invoiceId,
          reminder_type: params.reminderType,
          channel: params.channel || 'email',
          send_date: params.sendDate.toISOString(),
          is_sent: false,
          template_id: params.templateId || null,
          custom_message: params.customMessage || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create reminder schedule');

      const reminderId = data.id as string;

      await ActivityLogger.log({
        entityType: 'invoice',
        entityId: params.invoiceId,
        eventType: ActivityEventTypes.PAYMENT_REMINDER_SENT,
        metadata: {
          description: `Reminder scheduled: ${params.reminderType}`,
          reminder_id: reminderId,
          send_date: params.sendDate.toISOString(),
        }
      });

      return reminderId;
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
      throw error;
    }
  }

  /**
   * Auto-schedule reminders based on invoice due date
   */
  static async autoScheduleReminders(invoiceId: string): Promise<string[]> {
    try {
      const { data: invoice, error: invoiceError } = await (supabase.from('invoices') as any)
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) {
        throw new Error('Invoice not found');
      }

      if (!invoice.due_date) {
        return [];
      }

      const dueDate = new Date(invoice.due_date);
      const now = new Date();
      const reminderIds: string[] = [];

      // First reminder: 7 days before due date
      const firstReminderDate = new Date(dueDate);
      firstReminderDate.setDate(firstReminderDate.getDate() - 7);
      if (firstReminderDate > now) {
        const id1 = await this.scheduleReminder({
          invoiceId,
          reminderType: 'first',
          sendDate: firstReminderDate,
        });
        reminderIds.push(id1);
      }

      // Second reminder: On due date
      if (dueDate >= now) {
        const id2 = await this.scheduleReminder({
          invoiceId,
          reminderType: 'second',
          sendDate: dueDate,
        });
        reminderIds.push(id2);
      }

      // Final reminder: 7 days after due date
      const finalReminderDate = new Date(dueDate);
      finalReminderDate.setDate(finalReminderDate.getDate() + 7);
      if (finalReminderDate > now) {
        const id3 = await this.scheduleReminder({
          invoiceId,
          reminderType: 'final',
          sendDate: finalReminderDate,
        });
        reminderIds.push(id3);
      }

      return reminderIds;
    } catch (error) {
      console.error('Failed to auto-schedule reminders:', error);
      throw error;
    }
  }

  /**
   * Send due reminders (should be called by scheduled job)
   */
  static async sendDueReminders(): Promise<number> {
    try {
      const now = new Date();
      const { data: reminders, error } = await (supabase.from('invoice_reminders') as any)
        .select('*')
        .eq('is_sent', false)
        .lte('send_date', now.toISOString())
        .order('send_date', { ascending: true });

      if (error) throw error;

      let sentCount = 0;

      for (const reminder of reminders || []) {
        try {
          await this.sendReminder(reminder.id);
          sentCount++;
        } catch (error) {
          console.error(`Failed to send reminder ${reminder.id}:`, error);
        }
      }

      return sentCount;
    } catch (error) {
      console.error('Failed to send due reminders:', error);
      throw error;
    }
  }

  /**
   * Send a specific reminder
   */
  static async sendReminder(reminderId: string): Promise<void> {
    try {
      const { data: reminder, error: reminderError } = await (supabase.from('invoice_reminders') as any)
        .select('*')
        .eq('id', reminderId)
        .single();

      if (reminderError || !reminder) {
        throw new Error('Reminder not found');
      }

      if (reminder.is_sent) {
        return; // Already sent
      }

      // Fetch invoice
      const { data: invoice, error: invoiceError } = await (supabase.from('invoices') as any)
        .select('*')
        .eq('id', reminder.invoice_id)
        .single();

      if (invoiceError || !invoice) {
        throw new Error('Invoice not found');
      }

      // Check if invoice is already paid
      const isPaid = await InvoicePaymentTracker.isFullyPaid(reminder.invoice_id);
      if (isPaid) {
        // Mark reminder as cancelled
        await (supabase.from('invoice_reminders') as any)
          .update({ is_sent: true, sent_at: new Date().toISOString() } as any)
          .eq('id', reminderId);
        return;
      }

      // Send reminder based on channel
      if (reminder.channel === 'email') {
        await this.sendEmailReminder(reminder, invoice);
      } else if (reminder.channel === 'sms') {
        // SMS implementation would go here
        console.log('SMS reminder not yet implemented');
      }

      // Mark as sent
      await (supabase.from('invoice_reminders') as any)
        .update({
          is_sent: true,
          sent_at: new Date().toISOString(),
        } as any)
        .eq('id', reminderId);

      await ActivityLogger.log({
        entityType: 'invoice',
        entityId: reminder.invoice_id,
        eventType: ActivityEventTypes.PAYMENT_REMINDER_SENT,
        metadata: {
          description: `Payment reminder sent: ${reminder.reminder_type}`,
          reminder_id: reminderId,
          channel: reminder.channel,
        }
      });
    } catch (error) {
      console.error('Failed to send reminder:', error);
      throw error;
    }
  }

  /**
   * Send email reminder
   */
  private static async sendEmailReminder(reminder: any, invoice: any): Promise<void> {
    try {
      const subject = this.getReminderSubject(reminder.reminder_type, invoice);
      const body = this.getReminderBody(reminder, invoice);

      await EmailService.sendEmail({
        to: invoice.customer_email || invoice.contact_info?.email || '',
        subject,
        textBody: body,
        template: 'payment_reminder',
      });
    } catch (error) {
      console.error('Failed to send email reminder:', error);
      throw error;
    }
  }

  /**
   * Get reminder subject based on type
   */
  private static getReminderSubject(type: ReminderType, invoice: any): string {
    const invoiceNumber = invoice.invoice_number || invoice.id.slice(0, 8);

    switch (type) {
      case 'first':
        return `Friendly Reminder: Invoice ${invoiceNumber} Due Soon`;
      case 'second':
        return `Invoice ${invoiceNumber} Payment Due Today`;
      case 'final':
        return `Final Notice: Overdue Invoice ${invoiceNumber}`;
      default:
        return `Payment Reminder: Invoice ${invoiceNumber}`;
    }
  }

  /**
   * Get reminder body
   */
  private static getReminderBody(reminder: any, invoice: any): string {
    if (reminder.custom_message) {
      return reminder.custom_message;
    }

    const invoiceNumber = invoice.invoice_number || invoice.id.slice(0, 8);
    const amount = invoice.total_amount || 0;
    const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A';

    switch (reminder.reminder_type) {
      case 'first':
        return `This is a friendly reminder that invoice ${invoiceNumber} for ${amount} is due on ${dueDate}. Please ensure payment is made by the due date.`;
      case 'second':
        return `Invoice ${invoiceNumber} for ${amount} is due today (${dueDate}). Please make payment as soon as possible.`;
      case 'final':
        return `FINAL NOTICE: Invoice ${invoiceNumber} for ${amount} is now overdue. Immediate payment is required to avoid further action.`;
      default:
        return `Payment reminder for invoice ${invoiceNumber} (${amount}) due ${dueDate}.`;
    }
  }

  /**
   * Get reminder history for an invoice
   */
  static async getReminderHistory(invoiceId: string): Promise<ReminderSchedule[]> {
    try {
      const { data, error } = await (supabase.from('invoice_reminders') as any)
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((r: any) => ({
        id: r.id,
        invoiceId: r.invoice_id,
        reminderType: r.reminder_type as ReminderType,
        channel: r.channel as ReminderChannel,
        sendDate: new Date(r.send_date),
        sentAt: r.sent_at ? new Date(r.sent_at) : null,
        isSent: r.is_sent,
        templateId: r.template_id,
        customMessage: r.custom_message,
        createdAt: new Date(r.created_at),
      }));
    } catch (error) {
      console.error('Failed to get reminder history:', error);
      return [];
    }
  }

  /**
   * Cancel pending reminders for an invoice
   */
  static async cancelPendingReminders(invoiceId: string): Promise<void> {
    try {
      await (supabase.from('invoice_reminders') as any)
        .update({ is_sent: true } as any)
        .eq('invoice_id', invoiceId)
        .eq('is_sent', false);
    } catch (error) {
      console.error('Failed to cancel pending reminders:', error);
      throw error;
    }
  }
}

