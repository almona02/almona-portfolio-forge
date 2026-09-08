/**
 * Canonical ticket FSM transitions — shared by TicketLifecycleEngine and server validators.
 */

export const TICKET_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  open: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'awaiting_parts', 'cancelled'],
  in_progress: ['awaiting_parts', 'awaiting_customer', 'resolved'],
  awaiting_parts: ['in_progress', 'cancelled'],
  awaiting_customer: ['in_progress', 'resolved'],
  resolved: ['closed'],
  closed: [],
  cancelled: [],
} as const;

export function isValidTicketTransition(currentStatus: string, targetStatus: string): boolean {
  const allowed = TICKET_STATUS_TRANSITIONS[currentStatus] ?? [];
  return allowed.includes(targetStatus);
}
