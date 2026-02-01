/**
 * Bulk Email Service
 * 
 * Gold-tier service for batch email operations with progress tracking,
 * error handling, and rate limiting.
 * 
 * Features:
 * - Bulk quote/invoice sending
 * - Progress tracking
 * - Error handling and retry logic
 * - Rate limiting to prevent spam
 * - Activity logging
 * 
 * Usage:
 * ```typescript
 * const result = await BulkEmailService.sendBulkQuotes({
 *   quotes: quoteList,
 *   onProgress: (progress) => console.log(progress)
 * });
 * ```
 */

import { ActivityLogger } from '@/core/activity/ActivityLogger';
import { ActivityEventTypes } from '@/core/activity/activityTypes';
import { EmailService } from './EmailService';

/**
 * Bulk email options
 */
export interface BulkEmailOptions {
  /** Recipients to send to */
  recipients: Array<{
    email: string;
    name?: string;
    data: Record<string, any>;
  }>;
  /** Email template type */
  template: 'quote' | 'invoice' | 'payment_reminder' | 'payment_confirmation';
  /** Progress callback */
  onProgress?: (progress: BulkEmailProgress) => void;
  /** Rate limit (emails per second) */
  rateLimit?: number;
  /** Retry attempts for failed sends */
  retryAttempts?: number;
}

/**
 * Bulk email progress
 */
export interface BulkEmailProgress {
  total: number;
  sent: number;
  failed: number;
  current: number;
  currentEmail?: string;
  errors: Array<{ email: string; error: string }>;
}

/**
 * Bulk email result
 */
export interface BulkEmailResult {
  success: boolean;
  total: number;
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
  messageIds: string[];
}

/**
 * Bulk Email Service
 */
export class BulkEmailService {
  /**
   * Send bulk emails with progress tracking
   */
  static async sendBulkEmails(options: BulkEmailOptions): Promise<BulkEmailResult> {
    const {
      recipients,
      template,
      onProgress,
      rateLimit = 5, // 5 emails per second default
      retryAttempts = 2,
    } = options;

    const total = recipients.length;
    let sent = 0;
    let failed = 0;
    const errors: Array<{ email: string; error: string }> = [];
    const messageIds: string[] = [];

    // Process emails with rate limiting
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      let lastError: string | undefined;
      let success = false;

      // Retry logic
      for (let attempt = 0; attempt <= retryAttempts; attempt++) {
        try {
          const result = await EmailService.sendEmail({
            to: recipient.email,
            template,
            templateData: recipient.data,
          });

          if (result.success) {
            success = true;
            sent++;
            if (result.messageId) {
              messageIds.push(result.messageId);
            }
            break;
          } else {
            lastError = result.error || 'Unknown error';
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error';
        }

        // Wait before retry (exponential backoff)
        if (attempt < retryAttempts) {
          await this.delay(1000 * Math.pow(2, attempt));
        }
      }

      if (!success) {
        failed++;
        errors.push({
          email: recipient.email,
          error: lastError || 'Failed after retries',
        });
      }

      // Report progress
      if (onProgress) {
        onProgress({
          total,
          sent,
          failed,
          current: i + 1,
          currentEmail: recipient.email,
          errors,
        });
      }

      // Rate limiting: wait between emails
      if (i < recipients.length - 1) {
        await this.delay(1000 / rateLimit);
      }
    }

    // Log bulk operation
    try {
      await ActivityLogger.log({
        entityType: template === 'quote' ? 'quote' : 'invoice',
        entityId: 'bulk',
        eventType: template === 'quote' 
          ? ActivityEventTypes.QUOTE_SENT 
          : ActivityEventTypes.INVOICE_SENT,
        metadata: {
          description: `Bulk email sent: ${sent}/${total} successful`,
          template,
          total,
          sent,
          failed,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } catch (logError) {
      console.error('Failed to log bulk email activity:', logError);
    }

    return {
      success: failed === 0,
      total,
      sent,
      failed,
      errors,
      messageIds,
    };
  }

  /**
   * Send bulk quotes
   */
  static async sendBulkQuotes(
    quotes: Array<{ id: string; email: string; data: Record<string, any> }>,
    options?: Omit<BulkEmailOptions, 'recipients' | 'template'>
  ): Promise<BulkEmailResult> {
    return this.sendBulkEmails({
      ...options,
      recipients: quotes.map(q => ({
        email: q.email,
        data: q.data,
      })),
      template: 'quote',
    });
  }

  /**
   * Send bulk invoices
   */
  static async sendBulkInvoices(
    invoices: Array<{ id: string; email: string; data: Record<string, any> }>,
    options?: Omit<BulkEmailOptions, 'recipients' | 'template'>
  ): Promise<BulkEmailResult> {
    return this.sendBulkEmails({
      ...options,
      recipients: invoices.map(i => ({
        email: i.email,
        data: i.data,
      })),
      template: 'invoice',
    });
  }

  /**
   * Delay helper for rate limiting
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

