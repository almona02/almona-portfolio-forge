// Central permission helper for creating service tickets
import type { Database } from '@/types/database';

export type AppUserRole = Database['public']['Tables']['profiles']['Row']['role'];

// Whitelisted roles that may create service tickets
// NOTE: 'support' role not yet defined in Database UserRole union. Using existing roles.
// To add a dedicated 'support' role later, extend Database UserRole and update policies.
export const SERVICE_TICKET_CREATOR_ROLES: Readonly<AppUserRole[]> = [
  'customer',
  'support',
  'admin',
  'technician',
  'sales_rep'
] as const;

export const canCreateServiceTicket = (role: AppUserRole | null | undefined): boolean => {
  if (!role) return false; // require explicit role
  return SERVICE_TICKET_CREATOR_ROLES.includes(role);
};

// Analytics integration
import { track } from '@/lib/analytics';
export const trackServiceTicketBlocked = (context: { role?: string | null; reason: string; maintenanceType?: string }) => {
  track('service_ticket_blocked', context);
};
