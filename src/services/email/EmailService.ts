/**
 * Email Service
 * 
 * Gold-tier email service for sending commercial emails (quotes, invoices, reminders).
 * Integrates with backend API or direct email provider.
 * 
 * Features:
 * - Send quotes/invoices via email
 * - Template-based emails
 * - Email tracking
 * - Activity logging integration
 * 
 * Usage:
 * ```typescript
 * await EmailService.sendQuote({
 *   to: 'customer@example.com',
 *   quoteNumber: 'QT-001',
 *   customerName: 'John Doe',
 *   totalAmount: '1000.00',
 *   currency: 'USD'
 * });
 * ```
 */

import { ActivityLogger } from '@/core/activity/ActivityLogger';
import { ActivityEventTypes } from '@/core/activity/activityTypes';
import { supabase } from '@/lib/supabase';
import { getEmailTemplate, type EmailTemplateData } from './emailTemplates';

/**
 * Email send options
 */
export interface EmailSendOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  template?: 'quote' | 'invoice' | 'payment_reminder' | 'payment_confirmation';
  templateData?: EmailTemplateData;
  htmlBody?: string;
  textBody?: string;
  attachments?: Array<{
    filename: string;
    content: string | Blob;
    contentType?: string;
  }>;
}

/**
 * Email send result
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Service
 */
export class EmailService {
  /**
   * Send email
   */
  static async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    try {
      // Get template if provided
      let subject = options.subject;
      let htmlBody = options.htmlBody;
      let textBody = options.textBody;

      // Generate message ID for tracking (do this early so it's available throughout)
      let messageId: string | undefined;
      let recipientEmail: string = '';
      
      if (options.template && options.templateData) {
        const template = getEmailTemplate(options.template, options.templateData);
        subject = subject || template.subject;
        
        // Add tracking pixel and click tracking to HTML body
        let processedHtmlBody = htmlBody || template.htmlBody || '';
        const processedTextBody = textBody || template.textBody || '';
        
        // Generate message ID for tracking
        messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        recipientEmail = Array.isArray(options.to) ? options.to[0] : options.to;
        
        // Validate recipient email
        if (!recipientEmail || typeof recipientEmail !== 'string') {
          throw new Error('Invalid recipient email address');
        }
        
        // Add tracking pixel to HTML (only if body tag exists)
        if (processedHtmlBody.includes('</body>')) {
          const trackingPixelUrl = this.getTrackingPixelUrl(messageId, recipientEmail);
          processedHtmlBody = processedHtmlBody.replace(
            '</body>',
            `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" /></body>`
          );
        }
        
        // Replace links with tracking URLs in HTML
        processedHtmlBody = processedHtmlBody.replace(
          /href="([^"]+)"/g,
          (match, url) => {
            // Don't track mailto:, anchor, or javascript: links
            if (url.startsWith('mailto:') || url.startsWith('#') || url.startsWith('javascript:')) {
              return match;
            }
            const trackedUrl = this.getClickTrackingUrl(messageId!, url, recipientEmail);
            return `href="${trackedUrl}"`;
          }
        );
        
        htmlBody = processedHtmlBody;
        textBody = processedTextBody;
        
        // Store email in history for tracking
        if (messageId) {
          try {
            const { error: historyError } = await supabase.from('email_history').insert({
              message_id: messageId,
              template_type: options.template,
              recipient_email: recipientEmail,
              recipient_name: (options.templateData?.customerName || options.templateData?.senderName || '') as string,
              subject: (subject || template.subject) as string,
              html_body: processedHtmlBody,
              text_body: processedTextBody,
              status: 'pending',
            } as any); // Type assertion needed if types aren't fully defined
            
            if (historyError) {
              console.error('Failed to store email history:', historyError);
            }
          } catch (error) {
            console.error('Failed to store email history:', error);
          }
        }
      }

      if (!subject || !htmlBody) {
        throw new Error('Email subject and body are required');
      }

      // Normalize recipients
      const toEmails = Array.isArray(options.to) ? options.to : [options.to];
      const ccEmails = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : [];
      const bccEmails = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : [];

      // Call backend API to send email
      // For now, we'll use a Supabase Edge Function or direct API call
      const result = await this.sendViaAPI({
        to: toEmails,
        cc: ccEmails,
        bcc: bccEmails,
        subject,
        htmlBody,
        textBody,
        attachments: options.attachments,
      });

      // Update email history status to 'sent' if messageId exists
      const finalMessageId = result.messageId || messageId;
      if (finalMessageId && messageId) {
        try {
          // Type assertion needed - Supabase types may not be fully defined for email_history
          const updateData = {
            message_id: finalMessageId,
            status: 'sent',
            sent_at: new Date().toISOString(),
          };
          const query = supabase.from('email_history' as any) as any;
          const { error: updateError } = await query
            .update(updateData)
            .eq('message_id', messageId);
            
          if (updateError) {
            console.error('Failed to update email history status:', updateError);
          }
        } catch (error) {
          console.error('Failed to update email history status:', error);
        }
      }

      // Log activity
      if (result.success && options.template) {
        try {
          await ActivityLogger.log({
            entityType: options.template === 'quote' ? 'quote' : 'invoice',
            entityId: (options.templateData?.quoteNumber || options.templateData?.invoiceNumber || '') as string,
            eventType: options.template === 'quote' 
              ? ActivityEventTypes.QUOTE_SENT 
              : ActivityEventTypes.INVOICE_SENT,
            metadata: {
              description: `Email sent to ${toEmails.join(', ')}`,
              subject,
              template: options.template,
              messageId: result.messageId,
            },
          });
        } catch (logError) {
          console.error('Failed to log email activity:', logError);
          // Don't fail the email send if logging fails
        }

        // Send notification
        // Note: This would require user ID lookup from email
        // For now, we'll skip notification
      }

      return result;
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email via backend API
   */
  private static async sendViaAPI(data: {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    htmlBody: string;
    textBody?: string;
    attachments?: Array<{
      filename: string;
      content: string | Blob;
      contentType?: string;
    }>;
  }): Promise<EmailSendResult> {
    try {
      // Check if we have a backend API endpoint
      // For now, we'll use a Supabase Edge Function or direct API
      // This is a placeholder - actual implementation depends on backend setup

      // Option 1: Use Supabase Edge Function
      const { data: result, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: data.to,
          cc: data.cc,
          bcc: data.bcc,
          subject: data.subject,
          htmlBody: data.htmlBody,
          textBody: data.textBody,
          attachments: data.attachments,
        },
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        messageId: result?.messageId || 'unknown',
      };
    } catch (error) {
      // Fallback: Log email for development
      console.log('📧 EMAIL (Development Mode):', {
        to: data.to,
        subject: data.subject,
        htmlBody: data.htmlBody.substring(0, 200) + '...',
      });

      // In development, return success to not break the flow
      if (import.meta.env.DEV) {
        return {
          success: true,
          messageId: `dev-${Date.now()}`,
        };
      }

      throw error;
    }
  }

  /**
   * Send quote email
   */
  static async sendQuote(
    to: string | string[],
    templateData: EmailTemplateData,
    options?: Omit<EmailSendOptions, 'to' | 'template' | 'templateData'>
  ): Promise<EmailSendResult> {
    return this.sendEmail({
      to,
      template: 'quote',
      templateData,
      ...options,
    });
  }

  /**
   * Send invoice email
   */
  static async sendInvoice(
    to: string | string[],
    templateData: EmailTemplateData,
    options?: Omit<EmailSendOptions, 'to' | 'template' | 'templateData'>
  ): Promise<EmailSendResult> {
    return this.sendEmail({
      to,
      template: 'invoice',
      templateData,
      ...options,
    });
  }

  /**
   * Send payment reminder
   */
  static async sendPaymentReminder(
    to: string | string[],
    templateData: EmailTemplateData,
    options?: Omit<EmailSendOptions, 'to' | 'template' | 'templateData'>
  ): Promise<EmailSendResult> {
    return this.sendEmail({
      to,
      template: 'payment_reminder',
      templateData,
      ...options,
    });
  }

  /**
   * Send payment confirmation
   */
  static async sendPaymentConfirmation(
    to: string | string[],
    templateData: EmailTemplateData,
    options?: Omit<EmailSendOptions, 'to' | 'template' | 'templateData'>
  ): Promise<EmailSendResult> {
    return this.sendEmail({
      to,
      template: 'payment_confirmation',
      templateData,
      ...options,
    });
  }

  /**
   * Generate tracking pixel URL for email opens
   */
  static getTrackingPixelUrl(messageId: string, recipientEmail: string): string {
    // In production, this would be a backend endpoint that:
    // 1. Records the open event
    // 2. Returns a 1x1 transparent pixel
    const baseUrl = import.meta.env.VITE_APP_URL || 
      (typeof window !== 'undefined' ? window.location.origin : 'https://app.almona.com');
    const encodedMessageId = encodeURIComponent(messageId);
    const encodedEmail = encodeURIComponent(recipientEmail);
    return `${baseUrl}/api/email/track/open?messageId=${encodedMessageId}&email=${encodedEmail}`;
  }

  /**
   * Generate click tracking URL
   */
  static getClickTrackingUrl(messageId: string, originalUrl: string, recipientEmail: string): string {
    // In production, this would be a backend endpoint that:
    // 1. Records the click event
    // 2. Redirects to the original URL
    const baseUrl = import.meta.env.VITE_APP_URL || 
      (typeof window !== 'undefined' ? window.location.origin : 'https://app.almona.com');
    const encodedMessageId = encodeURIComponent(messageId);
    const encodedUrl = encodeURIComponent(originalUrl);
    const encodedEmail = encodeURIComponent(recipientEmail);
    return `${baseUrl}/api/email/track/click?messageId=${encodedMessageId}&url=${encodedUrl}&email=${encodedEmail}`;
  }

  /**
   * Track email open (called by tracking pixel endpoint)
   */
  static async trackEmailOpen(messageId: string, recipientEmail: string): Promise<void> {
    try {
      if (!messageId || !recipientEmail) {
        console.warn('Invalid parameters for trackEmailOpen:', { messageId, recipientEmail });
        return;
      }

      // Insert tracking event
      const { error: trackingError } = await supabase.from('email_tracking').insert({
        message_id: messageId,
        event_type: 'opened',
        recipient_email: recipientEmail,
        timestamp: new Date().toISOString(),
      } as any); // Type assertion needed if types aren't fully defined

      if (trackingError) {
        console.error('Failed to insert email tracking:', trackingError);
        return;
      }

      // Update email history
      const updateData = {
        status: 'delivered',
        opened_at: new Date().toISOString(),
      };
      const query = supabase.from('email_history' as any) as any;
      const { error: historyError } = await query
        .update(updateData)
        .eq('message_id', messageId)
        .is('opened_at', null); // Only update if not already opened

      if (historyError) {
        console.error('Failed to update email history:', historyError);
      }
    } catch (error) {
      console.error('Failed to track email open:', error);
    }
  }

  /**
   * Track email click (called by click tracking endpoint)
   */
  static async trackEmailClick(messageId: string, link: string, recipientEmail: string): Promise<void> {
    try {
      if (!messageId || !link || !recipientEmail) {
        console.warn('Invalid parameters for trackEmailClick:', { messageId, link, recipientEmail });
        return;
      }

      // Insert tracking event
      const { error: trackingError } = await supabase.from('email_tracking').insert({
        message_id: messageId,
        event_type: 'clicked',
        recipient_email: recipientEmail,
        metadata: { link },
        timestamp: new Date().toISOString(),
      } as any); // Type assertion needed if types aren't fully defined

      if (trackingError) {
        console.error('Failed to insert email click tracking:', trackingError);
        return;
      }

      // Update email history
      const updateData = {
        clicked_at: new Date().toISOString(),
      };
      const query = supabase.from('email_history' as any) as any;
      const { error: historyError } = await query
        .update(updateData)
        .eq('message_id', messageId)
        .is('clicked_at', null); // Only update if not already clicked

      if (historyError) {
        console.error('Failed to update email history:', historyError);
      }
    } catch (error) {
      console.error('Failed to track email click:', error);
    }
  }
}

