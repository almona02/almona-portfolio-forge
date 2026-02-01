/**
 * Recurring Invoice Service
 * 
 * Gold-tier service for managing recurring invoices with automated generation,
 * scheduling, and lifecycle management.
 * 
 * Features:
 * - Recurring invoice templates
 * - Automated invoice generation
 * - Flexible scheduling (daily, weekly, monthly, quarterly, yearly)
 * - Pause/resume functionality
 * - End date management
 * - Prestige-grade error handling
 * 
 * Usage:
 * ```typescript
 * const schedule = await RecurringInvoiceService.createSchedule({
 *   customerId: 'cust_123',
 *   templateId: 'template_456',
 *   frequency: 'monthly',
 *   startDate: new Date(),
 *   endDate: new Date('2026-12-31')
 * });
 * ```
 */

import { ActivityLogger } from '@/core/activity/ActivityLogger';
import { ActivityEventTypes } from '@/core/activity/activityTypes';
import { supabase } from '@/lib/supabase';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringInvoiceSchedule {
  id: string;
  customerId: string;
  templateId: string | null;
  invoiceTemplate: any; // Invoice data template
  frequency: RecurringFrequency;
  startDate: Date;
  endDate: Date | null;
  nextRunDate: Date;
  lastRunDate: Date | null;
  isActive: boolean;
  isPaused: boolean;
  totalRuns: number;
  maxRuns: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecurringScheduleParams {
  customerId: string;
  templateId?: string | null;
  invoiceTemplate: any;
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date | null;
  maxRuns?: number | null;
}

/**
 * Recurring Invoice Service
 */
export class RecurringInvoiceService {
  /**
   * Calculate next run date based on frequency
   */
  private static calculateNextRunDate(
    lastRunDate: Date | null,
    startDate: Date,
    frequency: RecurringFrequency
  ): Date {
    const baseDate = lastRunDate || startDate;
    const nextDate = new Date(baseDate);

    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  }

  /**
   * Create a recurring invoice schedule
   */
  static async createSchedule(params: CreateRecurringScheduleParams): Promise<string> {
    try {
      const nextRunDate = this.calculateNextRunDate(null, params.startDate, params.frequency);

      const { data, error } = await (supabase.from('recurring_invoice_schedules') as any)
        .insert({
          customer_id: params.customerId,
          template_id: params.templateId,
          invoice_template: params.invoiceTemplate,
          frequency: params.frequency,
          start_date: params.startDate.toISOString(),
          end_date: params.endDate?.toISOString() || null,
          next_run_date: nextRunDate.toISOString(),
          is_active: true,
          is_paused: false,
          total_runs: 0,
          max_runs: params.maxRuns || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create recurring schedule');

      const scheduleId = data.id as string;

      // Log activity
      await ActivityLogger.log({
        entityType: 'recurring_invoice',
        entityId: scheduleId,
        eventType: ActivityEventTypes.RECURRING_INVOICE_CREATED,
        metadata: {
          description: `Recurring invoice schedule created: ${params.frequency}`,
          customer_id: params.customerId,
          frequency: params.frequency,
        }
      });

      return scheduleId;
    } catch (error) {
      console.error('Failed to create recurring schedule:', error);
      throw error;
    }
  }

  /**
   * Get all recurring schedules
   */
  static async getSchedules(filters?: {
    customerId?: string;
    isActive?: boolean;
    isPaused?: boolean;
  }): Promise<RecurringInvoiceSchedule[]> {
    try {
      let query = (supabase.from('recurring_invoice_schedules') as any).select('*');

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.isPaused !== undefined) {
        query = query.eq('is_paused', filters.isPaused);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((s: any) => ({
        id: s.id,
        customerId: s.customer_id,
        templateId: s.template_id,
        invoiceTemplate: s.invoice_template,
        frequency: s.frequency as RecurringFrequency,
        startDate: new Date(s.start_date),
        endDate: s.end_date ? new Date(s.end_date) : null,
        nextRunDate: new Date(s.next_run_date),
        lastRunDate: s.last_run_date ? new Date(s.last_run_date) : null,
        isActive: s.is_active,
        isPaused: s.is_paused,
        totalRuns: s.total_runs || 0,
        maxRuns: s.max_runs,
        createdAt: new Date(s.created_at),
        updatedAt: new Date(s.updated_at),
      }));
    } catch (error) {
      console.error('Failed to fetch recurring schedules:', error);
      return [];
    }
  }

  /**
   * Generate invoices for due schedules
   * This should be called by a scheduled job (cron, edge function, etc.)
   */
  static async generateDueInvoices(): Promise<number> {
    try {
      const now = new Date();
      const schedules = await this.getSchedules({ isActive: true, isPaused: false });

      let generatedCount = 0;

      for (const schedule of schedules) {
        // Check if schedule should run
        if (schedule.nextRunDate > now) continue;
        if (schedule.endDate && schedule.endDate < now) {
          // Schedule has ended, deactivate it
          await this.deactivateSchedule(schedule.id);
          continue;
        }
        if (schedule.maxRuns && schedule.totalRuns >= schedule.maxRuns) {
          // Max runs reached, deactivate
          await this.deactivateSchedule(schedule.id);
          continue;
        }

        // Generate invoice
        await this.generateInvoice(schedule);
        generatedCount++;
      }

      return generatedCount;
    } catch (error) {
      console.error('Failed to generate due invoices:', error);
      throw error;
    }
  }

  /**
   * Generate a single invoice from a schedule
   */
  private static async generateInvoice(schedule: RecurringInvoiceSchedule): Promise<string> {
    try {
      // Create invoice from template
      const invoiceData = {
        ...schedule.invoiceTemplate,
        customer_id: schedule.customerId,
        created_at: new Date().toISOString(),
        // Add recurrence metadata
        metadata: {
          ...(schedule.invoiceTemplate.metadata || {}),
          recurring_schedule_id: schedule.id,
          recurring_run_number: schedule.totalRuns + 1,
        }
      };

      const { data: invoice, error: invoiceError } = await (supabase.from('invoices') as any)
        .insert(invoiceData)
        .select()
        .single();

      if (invoiceError) throw invoiceError;
      if (!invoice) throw new Error('Failed to create invoice');

      // Update schedule
      const nextRunDate = this.calculateNextRunDate(
        schedule.lastRunDate || schedule.startDate,
        schedule.startDate,
        schedule.frequency
      );

      await (supabase.from('recurring_invoice_schedules') as any)
        .update({
          last_run_date: new Date().toISOString(),
          next_run_date: nextRunDate.toISOString(),
          total_runs: schedule.totalRuns + 1,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', schedule.id);

      // Log activity
      await ActivityLogger.log({
        entityType: 'recurring_invoice',
        entityId: schedule.id,
        eventType: ActivityEventTypes.RECURRING_INVOICE_GENERATED,
        metadata: {
          description: `Invoice generated from recurring schedule`,
          invoice_id: invoice.id,
          run_number: schedule.totalRuns + 1,
        }
      });

      return invoice.id;
    } catch (error) {
      console.error('Failed to generate invoice from schedule:', error);
      throw error;
    }
  }

  /**
   * Pause a recurring schedule
   */
  static async pauseSchedule(scheduleId: string): Promise<void> {
    try {
      await (supabase.from('recurring_invoice_schedules') as any)
        .update({ is_paused: true, updated_at: new Date().toISOString() } as any)
        .eq('id', scheduleId);

      await ActivityLogger.log({
        entityType: 'recurring_invoice',
        entityId: scheduleId,
        eventType: ActivityEventTypes.RECURRING_INVOICE_PAUSED,
        metadata: { description: 'Recurring invoice schedule paused' }
      });
    } catch (error) {
      console.error('Failed to pause schedule:', error);
      throw error;
    }
  }

  /**
   * Resume a paused schedule
   */
  static async resumeSchedule(scheduleId: string): Promise<void> {
    try {
      await (supabase.from('recurring_invoice_schedules') as any)
        .update({ is_paused: false, updated_at: new Date().toISOString() } as any)
        .eq('id', scheduleId);

      await ActivityLogger.log({
        entityType: 'recurring_invoice',
        entityId: scheduleId,
        eventType: ActivityEventTypes.RECURRING_INVOICE_RESUMED,
        metadata: { description: 'Recurring invoice schedule resumed' }
      });
    } catch (error) {
      console.error('Failed to resume schedule:', error);
      throw error;
    }
  }

  /**
   * Deactivate a schedule
   */
  static async deactivateSchedule(scheduleId: string): Promise<void> {
    try {
      await (supabase.from('recurring_invoice_schedules') as any)
        .update({ is_active: false, updated_at: new Date().toISOString() } as any)
        .eq('id', scheduleId);

      await ActivityLogger.log({
        entityType: 'recurring_invoice',
        entityId: scheduleId,
        eventType: ActivityEventTypes.RECURRING_INVOICE_DEACTIVATED,
        metadata: { description: 'Recurring invoice schedule deactivated' }
      });
    } catch (error) {
      console.error('Failed to deactivate schedule:', error);
      throw error;
    }
  }

  /**
   * Delete a schedule
   */
  static async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      await (supabase.from('recurring_invoice_schedules') as any)
        .delete()
        .eq('id', scheduleId);

      await ActivityLogger.log({
        entityType: 'recurring_invoice',
        entityId: scheduleId,
        eventType: ActivityEventTypes.RECURRING_INVOICE_DELETED,
        metadata: { description: 'Recurring invoice schedule deleted' }
      });
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      throw error;
    }
  }
}

