/**
 * Email Services
 * 
 * Centralized exports for all email-related services.
 */

export { EmailService } from './EmailService';
export { BulkEmailService } from './BulkEmailService';
export { AutomatedReminderService } from './AutomatedReminderService';
export type { EmailSendOptions, EmailSendResult } from './EmailService';
export type { BulkEmailOptions, BulkEmailProgress, BulkEmailResult } from './BulkEmailService';
export type { ReminderConfig, ReminderRecord, ReminderSchedule } from './AutomatedReminderService';
export { getEmailTemplate } from './emailTemplates';
export type { EmailTemplate, EmailTemplateData } from './emailTemplates';

