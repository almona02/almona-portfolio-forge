/**
 * Report Scheduler Service
 * 
 * Gold-tier service for scheduling automated report generation and delivery.
 * 
 * Features:
 * - Scheduled report generation
 * - Email delivery of reports
 * - Schedule management (create, update, delete)
 * - Schedule execution tracking
 * - Error handling and retry logic
 * 
 * Usage:
 * ```typescript
 * await ReportScheduler.scheduleReport({
 *   templateId: 'revenue_summary',
 *   frequency: 'monthly',
 *   recipients: ['admin@example.com']
 * });
 * ```
 */

import { ActivityLogger } from '@/core/activity/ActivityLogger';
import { ActivityEventTypes } from '@/core/activity/activityTypes';
import { supabase } from '@/lib/supabase';
import { EmailService } from '@/services/email/EmailService';
import { addDays, endOfDay, endOfMonth, format, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { ReportTemplates } from './ReportTemplates';
import { ReportingService, type DateRange } from './ReportingService';

/** Supabase schedule row */
type ScheduleRow = Record<string, unknown> & {
  id?: string;
  template_id?: string;
  name?: string;
  frequency?: string;
  day_of_week?: number | null;
  day_of_month?: number | null;
  time?: string;
  recipients?: string[];
  enabled?: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

/**
 * Schedule configuration
 */
export interface ReportSchedule {
  id: string;
  templateId: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 (Sunday = 0)
  dayOfMonth?: number; // 1-31
  time: string; // HH:mm format
  recipients: string[];
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schedule execution result
 */
export interface ScheduleExecutionResult {
  scheduleId: string;
  success: boolean;
  reportGenerated: boolean;
  emailsSent: number;
  emailsFailed: number;
  error?: string;
  executedAt: Date;
}

/**
 * Report Scheduler Service
 */
export class ReportScheduler {
  /**
   * Create a new report schedule
   */
  static async createSchedule(config: {
    templateId: string;
    name: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    recipients: string[];
  }): Promise<ReportSchedule> {
    try {
      const template = ReportTemplates.getTemplate(config.templateId);
      if (!template) {
        throw new Error(`Template not found: ${config.templateId}`);
      }

      // Validate schedule config
      if (config.frequency === 'weekly' && config.dayOfWeek === undefined) {
        throw new Error('Weekly schedules must specify dayOfWeek');
      }
      if (config.frequency === 'monthly' && config.dayOfMonth === undefined) {
        throw new Error('Monthly schedules must specify dayOfMonth');
      }

      // Calculate next run time
      const nextRunAt = this.calculateNextRunTime({
        frequency: config.frequency,
        dayOfWeek: config.dayOfWeek,
        dayOfMonth: config.dayOfMonth,
        time: config.time,
      });

      const schedule: ReportSchedule = {
        id: `schedule_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        templateId: config.templateId,
        name: config.name,
        frequency: config.frequency,
        dayOfWeek: config.dayOfWeek,
        dayOfMonth: config.dayOfMonth,
        time: config.time,
        recipients: config.recipients,
        enabled: true,
        nextRunAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database
      try {
        await supabase.from('report_schedules').insert({
          id: schedule.id,
          template_id: config.templateId,
          name: config.name,
          frequency: config.frequency,
          day_of_week: config.dayOfWeek,
          day_of_month: config.dayOfMonth,
          time: config.time,
          recipients: config.recipients,
          enabled: true,
          next_run_at: nextRunAt.toISOString(),
          created_at: schedule.createdAt.toISOString(),
          updated_at: schedule.updatedAt.toISOString(),
        });
      } catch (dbError) {
        console.error('Failed to store schedule in database:', dbError);
        // Continue even if storage fails (in-memory only)
      }

      // Log activity
      await ActivityLogger.log({
        entityType: 'project', // Using project as closest match for report schedules
        entityId: schedule.id,
        eventType: ActivityEventTypes.PROJECT_CREATED,
        metadata: {
          description: `Report schedule created: ${config.name}`,
          template_id: config.templateId,
          frequency: config.frequency,
        },
      });

      return schedule;
    } catch (error) {
      console.error('Failed to create schedule:', error);
      throw error;
    }
  }

  /**
   * Get all schedules
   */
  static async getAllSchedules(): Promise<ReportSchedule[]> {
    try {
      const { data, error } = await supabase
        .from('report_schedules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch schedules:', error);
        return [];
      }

      return (data || []).map((s: ScheduleRow) => {
        const lastRun = s.last_run_at;
        const nextRun = s.next_run_at;
        const createdAt = s.created_at;
        const updatedAt = s.updated_at;
        return {
          id: String(s.id ?? ''),
          templateId: String(s.template_id ?? ''),
          name: String(s.name ?? ''),
          frequency: (s.frequency ?? 'daily') as 'daily' | 'weekly' | 'monthly',
          dayOfWeek: s.day_of_week ?? undefined,
          dayOfMonth: s.day_of_month ?? undefined,
          time: String(s.time ?? '09:00'),
          recipients: Array.isArray(s.recipients) ? s.recipients : [],
          enabled: s.enabled !== false,
          lastRunAt: typeof lastRun === 'string' ? new Date(lastRun) : undefined,
          nextRunAt: typeof nextRun === 'string' ? new Date(nextRun) : undefined,
          createdAt: new Date(typeof createdAt === 'string' ? createdAt : Date.now()),
          updatedAt: new Date(typeof updatedAt === 'string' ? updatedAt : Date.now()),
        };
      });
    } catch (error) {
      console.error('Failed to get schedules:', error);
      return [];
    }
  }

  /**
   * Update schedule
   */
  static async updateSchedule(
    scheduleId: string,
    updates: Partial<Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
      if (updates.dayOfWeek !== undefined) updateData.day_of_week = updates.dayOfWeek;
      if (updates.dayOfMonth !== undefined) updateData.day_of_month = updates.dayOfMonth;
      if (updates.time !== undefined) updateData.time = updates.time;
      if (updates.recipients !== undefined) updateData.recipients = updates.recipients;
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled;

      if (updates.frequency || updates.dayOfWeek !== undefined || updates.dayOfMonth !== undefined || updates.time) {
        // Recalculate next run time
        const schedule = await this.getSchedule(scheduleId);
        if (schedule) {
          const nextRunAt = this.calculateNextRunTime({
            frequency: updates.frequency || schedule.frequency,
            dayOfWeek: updates.dayOfWeek !== undefined ? updates.dayOfWeek : schedule.dayOfWeek,
            dayOfMonth: updates.dayOfMonth !== undefined ? updates.dayOfMonth : schedule.dayOfMonth,
            time: updates.time || schedule.time,
          });
          updateData.next_run_at = nextRunAt.toISOString();
        }
      }

      await supabase.from('report_schedules').update(updateData).eq('id', scheduleId);
    } catch (error) {
      console.error('Failed to update schedule:', error);
      throw error;
    }
  }

  /**
   * Delete schedule
   */
  static async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      await supabase.from('report_schedules').delete().eq('id', scheduleId);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      throw error;
    }
  }

  /**
   * Get schedule by ID
   */
  static async getSchedule(scheduleId: string): Promise<ReportSchedule | null> {
    try {
      const { data, error } = await supabase
        .from('report_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();

      if (error || !data) {
        return null;
      }

      const row = data as ScheduleRow;
      const lastRun = row.last_run_at;
      const nextRun = row.next_run_at;
      const createdAt = row.created_at;
      const updatedAt = row.updated_at;
      return {
        id: String(row.id ?? ''),
        templateId: String(row.template_id ?? ''),
        name: String(row.name ?? ''),
        frequency: (row.frequency ?? 'daily') as 'daily' | 'weekly' | 'monthly',
        dayOfWeek: row.day_of_week ?? undefined,
        dayOfMonth: row.day_of_month ?? undefined,
        time: String(row.time ?? '09:00'),
        recipients: Array.isArray(row.recipients) ? row.recipients : [],
        enabled: row.enabled !== false,
        lastRunAt: typeof lastRun === 'string' ? new Date(lastRun) : undefined,
        nextRunAt: typeof nextRun === 'string' ? new Date(nextRun) : undefined,
        createdAt: new Date(typeof createdAt === 'string' ? createdAt : Date.now()),
        updatedAt: new Date(typeof updatedAt === 'string' ? updatedAt : Date.now()),
      };
    } catch (error) {
      console.error('Failed to get schedule:', error);
      return null;
    }
  }

  /**
   * Execute scheduled reports (should be called by cron job)
   */
  static async executeScheduledReports(): Promise<ScheduleExecutionResult[]> {
    const now = new Date();
    const results: ScheduleExecutionResult[] = [];

    try {
      // Get all enabled schedules that are due
      const schedules = await this.getAllSchedules();
      const dueSchedules = schedules.filter(s => {
        if (!s.enabled) return false;
        if (!s.nextRunAt) return false;
        return s.nextRunAt <= now;
      });

      for (const schedule of dueSchedules) {
        try {
          const result = await this.executeSchedule(schedule);
          results.push(result);

          // Update schedule with last run and next run times
          const nextRunAt = this.calculateNextRunTime({
            frequency: schedule.frequency,
            dayOfWeek: schedule.dayOfWeek,
            dayOfMonth: schedule.dayOfMonth,
            time: schedule.time,
            fromDate: now,
          });

          await this.updateSchedule(schedule.id, {
            lastRunAt: now,
            nextRunAt,
          });
        } catch (error) {
          results.push({
            scheduleId: schedule.id,
            success: false,
            reportGenerated: false,
            emailsSent: 0,
            emailsFailed: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
            executedAt: now,
          });
        }
      }
    } catch (error) {
      console.error('Failed to execute scheduled reports:', error);
    }

    return results;
  }

  /**
   * Execute a single schedule
   */
  private static async executeSchedule(schedule: ReportSchedule): Promise<ScheduleExecutionResult> {
    const executedAt = new Date();
    let reportGenerated = false;
    let emailsSent = 0;
    let emailsFailed = 0;
    let error: string | undefined;

    try {
      const template = ReportTemplates.getTemplate(schedule.templateId);
      if (!template) {
        throw new Error(`Template not found: ${schedule.templateId}`);
      }

      // Calculate date range based on template default
      const dateRange = this.calculateDateRange(template.dateRange.default);

      // Generate report data based on template type
      let reportData: Record<string, unknown>[] = [];
      let reportTitle = template.name;

      switch (template.reportType) {
        case 'revenue':
          // Convert quarterly/yearly to monthly for getRevenueByPeriod
          const revenuePeriod = template.period === 'quarterly' || template.period === 'yearly' 
            ? 'monthly' 
            : template.period;
          reportData = await ReportingService.getRevenueByPeriod(
            revenuePeriod,
            dateRange
          );
          reportTitle = `${template.name} - ${format(dateRange.start, 'MMM d')} to ${format(dateRange.end, 'MMM d, yyyy')}`;
          break;
        case 'conversion':
          const conversionMetrics = await ReportingService.getConversionMetrics(dateRange);
          reportData = [conversionMetrics];
          reportTitle = `${template.name} - ${format(dateRange.start, 'MMM d')} to ${format(dateRange.end, 'MMM d, yyyy')}`;
          break;
        case 'ltv':
          reportData = await ReportingService.getCustomerLTV(dateRange);
          reportTitle = `${template.name} - ${format(dateRange.start, 'MMM d')} to ${format(dateRange.end, 'MMM d, yyyy')}`;
          break;
        case 'aging':
          reportData = await ReportingService.getAgingReceivables();
          reportTitle = `${template.name} - ${format(executedAt, 'MMM d, yyyy')}`;
          break;
        case 'profitability':
          reportData = await ReportingService.getProjectProfitability(dateRange);
          reportTitle = `${template.name} - ${format(dateRange.start, 'MMM d')} to ${format(dateRange.end, 'MMM d, yyyy')}`;
          break;
        case 'pipeline':
          reportData = await ReportingService.getSalesPipeline();
          reportTitle = `${template.name} - ${format(executedAt, 'MMM d, yyyy')}`;
          break;
        default:
          throw new Error(`Unsupported report type: ${template.reportType}`);
      }

      reportGenerated = true;

      // Send report via email to recipients
      if (schedule.recipients.length > 0 && reportData.length > 0) {
        for (const recipient of schedule.recipients) {
          try {
            // Generate CSV for email attachment
            const csv = this.generateCSV(reportData);
            
            // Send email with report
            await EmailService.sendEmail({
              to: recipient,
              subject: reportTitle,
              htmlBody: `
                <h2>${reportTitle}</h2>
                <p>Please find the attached report.</p>
                <p>Generated: ${format(executedAt, 'MMM d, yyyy HH:mm')}</p>
              `,
              textBody: `${reportTitle}\n\nPlease find the attached report.\n\nGenerated: ${format(executedAt, 'MMM d, yyyy HH:mm')}`,
              attachments: [{
                filename: `${template.id}_${format(executedAt, 'yyyy-MM-dd')}.csv`,
                content: csv,
                contentType: 'text/csv',
              }],
            });

            emailsSent++;
          } catch (emailError) {
            emailsFailed++;
            console.error(`Failed to send report to ${recipient}:`, emailError);
          }
        }
      }

      return {
        scheduleId: schedule.id,
        success: emailsFailed === 0,
        reportGenerated,
        emailsSent,
        emailsFailed,
        executedAt,
      };
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      return {
        scheduleId: schedule.id,
        success: false,
        reportGenerated,
        emailsSent,
        emailsFailed,
        error,
        executedAt,
      };
    }
  }

  /**
   * Calculate next run time for a schedule
   */
  private static calculateNextRunTime(config: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    fromDate?: Date;
  }): Date {
    const from = config.fromDate || new Date();
    const [hours, minutes] = config.time.split(':').map(Number);
    const nextRun = new Date(from);

    nextRun.setHours(hours, minutes, 0, 0);

    switch (config.frequency) {
      case 'daily':
        if (nextRun <= from) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
      case 'weekly':
        if (config.dayOfWeek === undefined) {
          throw new Error('dayOfWeek required for weekly schedules');
        }
        const currentDay = nextRun.getDay();
        let daysUntilNext = (config.dayOfWeek - currentDay + 7) % 7;
        if (daysUntilNext === 0 && nextRun <= from) {
          daysUntilNext = 7;
        }
        nextRun.setDate(nextRun.getDate() + daysUntilNext);
        break;
      case 'monthly':
        if (config.dayOfMonth === undefined) {
          throw new Error('dayOfMonth required for monthly schedules');
        }
        nextRun.setDate(config.dayOfMonth);
        if (nextRun <= from) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
    }

    return nextRun;
  }

  /**
   * Calculate date range from preset
   */
  private static calculateDateRange(preset: string): DateRange {
    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    switch (preset) {
      case 'last_30_days':
        start = startOfDay(addDays(now, -30));
        break;
      case 'last_90_days':
        start = startOfDay(addDays(now, -90));
        break;
      case 'last_6_months':
        start = startOfDay(subMonths(now, 6));
        break;
      case 'last_year':
        start = startOfDay(subMonths(now, 12));
        break;
      case 'last_month':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      default:
        start = startOfDay(subMonths(now, 1));
    }

    return { start, end };
  }

  /**
   * Generate CSV from data
   */
  private static generateCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const rows = [
      headers.join(','),
      ...data.map((row: Record<string, unknown>) =>
        headers.map((header: string) => {
          const value = row[header];
          if (value instanceof Date) {
            return format(value, 'yyyy-MM-dd');
          }
          if (value == null) return '""';
          if (typeof value === 'object') return JSON.stringify(value);
          if (typeof value === 'string') return JSON.stringify(value);
          if (typeof value === 'number' || typeof value === 'boolean') return String(value);
          return JSON.stringify(value);
        }).join(',')
      ),
    ];

    return rows.join('\n');
  }
}

