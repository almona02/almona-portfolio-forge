import { z } from 'zod';
import { TicketPriority, TicketType } from '@/types/tickets';

// Canonical Zod schema for ticket creation used by both dialog & page.
// Keeps parity with backend TicketType / TicketPriority unions plus extended optional fields.

export const ticketTypeValues: TicketType[] = [
  'general',
  'technical',
  'installation',
  'maintenance',
  'spare_parts',
  'warranty',
  'billing',
  'sales',
  'complaint',
  'other'
] as unknown as TicketType[]; // 'other' will be merged into union via type extension below

export const ticketPriorityValues: TicketPriority[] = [
  'low', 'medium', 'high', 'urgent', 'critical'
] as TicketPriority[];

// Extend runtime schema to allow 'other' while keeping TS side updated (we'll update types separately)
export const createTicketZodSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  type: z.enum([
    'general','technical','billing','sales','spare_parts','warranty','complaint','installation','maintenance','other'
  ] as [string, ...string[]]),
  priority: z.enum(['low','medium','high','urgent','critical']),
  machine_id: z.string().optional().or(z.literal('')),
  maintenance_type: z.enum(['preventive','corrective','predictive','emergency']).optional(),
  scheduled_date: z.string().optional(),
  // Contact & context fields
  contact_phone: z.string().optional().or(z.literal('')),
  contact_email: z.string().email().optional().or(z.literal('')),
  preferred_contact_method: z.enum(['email','phone','sms']).optional(),
  site_location: z.string().optional().or(z.literal('')),
  machine_serial_number: z.string().optional().or(z.literal('')),
  machine_model: z.string().optional().or(z.literal('')),
  // Attachments (array of URLs or identifiers) - optional
  attachments: z.array(z.string().url()).optional().default([]),
});

export type UnifiedTicketFormData = z.infer<typeof createTicketZodSchema>;
