/**
 * Report Templates System
 * 
 * Gold-tier report template definitions and management.
 * Provides pre-configured report templates for common business needs.
 * 
 * Features:
 * - Pre-defined report templates
 * - Template customization
 * - Template validation
 * - Template export/import
 * 
 * Usage:
 * ```typescript
 * const template = ReportTemplates.getTemplate('revenue_summary');
 * const report = await ReportingService.generateReport(template, dateRange);
 * ```
 */

/**
 * Report template configuration
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'sales' | 'customer' | 'operational' | 'custom';
  reportType: 'revenue' | 'conversion' | 'ltv' | 'aging' | 'profitability' | 'pipeline' | 'custom';
  dateRange: {
    default: 'last_30_days' | 'last_90_days' | 'last_6_months' | 'last_year' | 'last_month' | 'custom';
    minDays?: number;
    maxDays?: number;
  };
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  filters?: {
    currency?: string[];
    status?: string[];
    customer?: string[];
  };
  columns: string[];
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'table';
  exportFormats: ('csv' | 'pdf' | 'excel')[];
  scheduled?: boolean;
  scheduleConfig?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time?: string; // HH:mm format
    recipients?: string[];
  };
}

/**
 * Pre-defined report templates
 */
export const REPORT_TEMPLATES: Record<string, ReportTemplate> = {
  revenue_summary: {
    id: 'revenue_summary',
    name: 'Revenue Summary',
    description: 'Monthly revenue overview with growth trends',
    category: 'financial',
    reportType: 'revenue',
    dateRange: {
      default: 'last_6_months',
      minDays: 30,
      maxDays: 365,
    },
    period: 'monthly',
    columns: ['period', 'revenue', 'count', 'currency'],
    chartType: 'line',
    exportFormats: ['csv', 'pdf', 'excel'],
    scheduled: true,
    scheduleConfig: {
      frequency: 'monthly',
      dayOfMonth: 1,
      time: '09:00',
    },
  },
  conversion_analysis: {
    id: 'conversion_analysis',
    name: 'Quote Conversion Analysis',
    description: 'Quote-to-invoice conversion rates and trends',
    category: 'sales',
    reportType: 'conversion',
    dateRange: {
      default: 'last_90_days',
      minDays: 7,
      maxDays: 365,
    },
    period: 'weekly',
    columns: ['quotesCreated', 'quotesAccepted', 'conversionRate', 'averageQuoteValue'],
    chartType: 'bar',
    exportFormats: ['csv', 'pdf'],
  },
  customer_ltv: {
    id: 'customer_ltv',
    name: 'Customer Lifetime Value',
    description: 'Top customers by lifetime value and order frequency',
    category: 'customer',
    reportType: 'ltv',
    dateRange: {
      default: 'last_year',
    },
    period: 'monthly',
    columns: ['customerName', 'totalRevenue', 'orderCount', 'averageOrderValue'],
    chartType: 'table',
    exportFormats: ['csv', 'pdf', 'excel'],
  },
  aging_receivables: {
    id: 'aging_receivables',
    name: 'Aging Receivables',
    description: 'Outstanding invoices by aging bucket',
    category: 'financial',
    reportType: 'aging',
    dateRange: {
      default: 'custom',
    },
    period: 'monthly',
    columns: ['invoiceNumber', 'customerName', 'outstandingAmount', 'daysOld', 'agingBucket'],
    chartType: 'bar',
    exportFormats: ['csv', 'pdf'],
    scheduled: true,
    scheduleConfig: {
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      time: '08:00',
    },
  },
  project_profitability: {
    id: 'project_profitability',
    name: 'Project Profitability',
    description: 'Revenue, costs, and profit margins by project',
    category: 'operational',
    reportType: 'profitability',
    dateRange: {
      default: 'last_6_months',
    },
    period: 'monthly',
    columns: ['projectCode', 'customerName', 'revenue', 'costs', 'profit', 'profitMargin'],
    chartType: 'table',
    exportFormats: ['csv', 'pdf', 'excel'],
  },
  sales_pipeline: {
    id: 'sales_pipeline',
    name: 'Sales Pipeline',
    description: 'Sales pipeline by stage with win probabilities',
    category: 'sales',
    reportType: 'pipeline',
    dateRange: {
      default: 'custom',
    },
    period: 'monthly',
    columns: ['stage', 'count', 'totalValue', 'averageValue', 'winProbability', 'weightedValue'],
    chartType: 'bar',
    exportFormats: ['csv', 'pdf'],
  },
  executive_summary: {
    id: 'executive_summary',
    name: 'Executive Summary',
    description: 'Comprehensive financial and sales overview',
    category: 'financial',
    reportType: 'custom',
    dateRange: {
      default: 'last_month',
    },
    period: 'monthly',
    columns: ['revenue', 'conversionRate', 'topCustomers', 'agingReceivables', 'pipelineValue'],
    chartType: 'table',
    exportFormats: ['pdf', 'excel'],
    scheduled: true,
    scheduleConfig: {
      frequency: 'monthly',
      dayOfMonth: 1,
      time: '08:00',
    },
  },
};

/**
 * Report Templates Service
 */
export class ReportTemplates {
  /**
   * Get all available templates
   */
  static getAllTemplates(): ReportTemplate[] {
    return Object.values(REPORT_TEMPLATES);
  }

  /**
   * Get template by ID
   */
  static getTemplate(templateId: string): ReportTemplate | undefined {
    return REPORT_TEMPLATES[templateId];
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: ReportTemplate['category']): ReportTemplate[] {
    return Object.values(REPORT_TEMPLATES).filter(t => t.category === category);
  }

  /**
   * Get scheduled templates
   */
  static getScheduledTemplates(): ReportTemplate[] {
    return Object.values(REPORT_TEMPLATES).filter(t => t.scheduled);
  }

  /**
   * Validate template configuration
   */
  static validateTemplate(template: Partial<ReportTemplate>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!template.id || !template.name) {
      errors.push('Template must have id and name');
    }

    if (template.dateRange) {
      if (template.dateRange.minDays && template.dateRange.maxDays) {
        if (template.dateRange.minDays > template.dateRange.maxDays) {
          errors.push('minDays cannot be greater than maxDays');
        }
      }
    }

    if (template.scheduled && !template.scheduleConfig) {
      errors.push('Scheduled templates must have scheduleConfig');
    }

    if (template.scheduleConfig) {
      if (template.scheduleConfig.frequency === 'weekly' && template.scheduleConfig.dayOfWeek === undefined) {
        errors.push('Weekly schedules must specify dayOfWeek');
      }
      if (template.scheduleConfig.frequency === 'monthly' && template.scheduleConfig.dayOfMonth === undefined) {
        errors.push('Monthly schedules must specify dayOfMonth');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create custom template
   */
  static createCustomTemplate(template: Omit<ReportTemplate, 'id'> & { id?: string }): ReportTemplate {
    const id = template.id || `custom_${Date.now()}`;
    const customTemplate: ReportTemplate = {
      ...template,
      id,
      category: template.category || 'custom',
    };

    const validation = this.validateTemplate(customTemplate);
    if (!validation.valid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }

    return customTemplate;
  }
}

