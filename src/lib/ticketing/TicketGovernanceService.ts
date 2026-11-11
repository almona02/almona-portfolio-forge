/**
 * Canonical Tier-3 ticket governance — single production authority for FSM, SLA, assignment, escalation.
 * All ticketApi / adminTicketApi status and SLA mutations MUST go through this service.
 */

import { supabase } from '@/lib/supabase';
import {
  AssignmentExecutor,
  roleForTicketType,
  selectDeterministicAssignee,
  type AssigneeCandidate,
} from '@/services/ticketing/AssignmentExecutor';
import { EscalationEngine } from '@/services/ticketing/EscalationEngine';
import { SLACalculator } from '@/services/ticketing/SLACalculator';
import { TicketLifecycleEngine } from '@/services/ticketing/TicketLifecycleEngine';
import type { CreateTicketData, TicketStatus } from '@/types/tickets';
import {
  recordServiceEvent,
  type EventPersistenceResult,
} from '@/lib/ticketing/serviceEventLedger';

const lifecycleEngine = new TicketLifecycleEngine();
const slaCalculator = new SLACalculator();
const escalationEngine = new EscalationEngine();
const assignmentExecutor = new AssignmentExecutor([
  { id: 'RULE-ASSIGN-DEFAULT', execute: () => '' },
]);

export class TicketTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TicketTransitionError';
  }
}

export interface SlaFields {
  sla_response_due: string;
  sla_resolution_due: string;
  sla_breached: boolean;
}

export function computeSlaFields(
  priority: string,
  ticketType: string,
  createdAt: Date = new Date(),
): SlaFields {
  const deadlines = slaCalculator.calculateDeadlines(priority, ticketType, createdAt);
  return {
    sla_response_due: deadlines.responseDue.toISOString(),
    sla_resolution_due: deadlines.resolutionDue.toISOString(),
    sla_breached: false,
  };
}

export function validateStatusTransition(currentStatus: string, targetStatus: string): void {
  const validation = lifecycleEngine.validateTransition(currentStatus, targetStatus);
  if (!validation.valid) {
    throw new TicketTransitionError(validation.rationale);
  }
}

export async function fetchAssigneeCandidates(ticketType: string): Promise<AssigneeCandidate[]> {
  const role = roleForTicketType(ticketType);
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', role);
  if (error || !profiles?.length) return [];

  const ids = profiles.map((p) => p.id);
  const { data: activeCounts } = await supabase
    .from('service_tickets')
    .select('assigned_to')
    .in('assigned_to', ids)
    .in('status', ['assigned', 'in_progress']);

  const countMap: Record<string, number> = {};
  (activeCounts ?? []).forEach((row) => {
    if (row.assigned_to) {
      countMap[row.assigned_to] = (countMap[row.assigned_to] ?? 0) + 1;
    }
  });

  return ids.map((id) => ({
    id,
    activeTicketCount: countMap[id] ?? 0,
  }));
}

export async function resolveAutoAssignment(
  ticketId: string,
  ticketType: string,
  priority: string,
  actorId: string,
): Promise<{ assignedTo: string; assignmentResult: ReturnType<AssignmentExecutor['executePolicyAssignment']> } | null> {
  const candidates = await fetchAssigneeCandidates(ticketType);
  const assigneeId = selectDeterministicAssignee(candidates);
  if (!assigneeId) return null;

  const assignmentResult = assignmentExecutor.executePolicyAssignment(
    { id: ticketId, type: ticketType, priority },
    assigneeId,
    actorId,
  );

  return { assignedTo: assigneeId, assignmentResult };
}

export interface GovernedTransitionInput {
  ticketId: string;
  currentStatus: string;
  targetStatus: TicketStatus;
  actorId: string;
  rationale?: string;
  resolution_summary?: string;
}

export interface GovernedTransitionPatch {
  status: TicketStatus;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  resolution_summary?: string;
  first_response_at?: string;
}

export function buildGovernedTransitionPatch(input: GovernedTransitionInput): GovernedTransitionPatch {
  validateStatusTransition(input.currentStatus, input.targetStatus);

  const timestamp = new Date().toISOString();
  const transition = lifecycleEngine.executeTransition(
    input.ticketId,
    input.targetStatus,
    input.actorId,
    input.rationale ?? `Status changed to ${input.targetStatus}`,
    input.currentStatus,
    timestamp,
  );

  const patch: GovernedTransitionPatch = {
    status: input.targetStatus,
    updated_at: timestamp,
  };

  if (input.targetStatus === 'resolved') {
    patch.resolved_at = timestamp;
    if (input.resolution_summary) patch.resolution_summary = input.resolution_summary;
  }
  if (input.targetStatus === 'closed') {
    patch.closed_at = timestamp;
    if (input.resolution_summary) patch.resolution_summary = input.resolution_summary;
  }
  if (
    input.currentStatus === 'open' &&
    ['assigned', 'in_progress'].includes(input.targetStatus)
  ) {
    patch.first_response_at = timestamp;
  }

  void transition; // audit payload consumed by recordServiceEvent caller
  return patch;
}

const SELECT_COLUMNS =
  'id, title, description, type, priority, status, preferred_contact_method, user_id, ticket_number, digital_twin_code, contact_phone, contact_email, site_location, machine_id, machine_serial_number, machine_model, sla_response_due, sla_resolution_due, sla_breached, escalated, escalated_at, assigned_to, assigned_at, assigned_by, first_response_at, created_at, updated_at';

export type AssignmentCreateOutcome =
  | { status: 'assigned'; assignedTo: string }
  | { status: 'unassigned'; reason: 'no_candidate' | 'not_authorized' | 'assign_denied'; detail?: string };

export type MachineLinkCreateOutcome =
  | { status: 'linked'; machineId: string }
  | { status: 'unlinked'; reason: 'not_requested' }
  | {
      status: 'unlinked';
      reason: 'link_denied' | 'link_failed';
      machineId: string;
      warning: string;
      retryable: true;
    };

export interface GovernedCreateResult {
  row: Record<string, unknown>;
  ticketType: string;
  ticketPriority: string;
  actorId: string;
  assignment: AssignmentCreateOutcome;
  machineLink: MachineLinkCreateOutcome;
  eventResults: {
    created: EventPersistenceResult;
    assigned?: EventPersistenceResult;
    machineLinked?: EventPersistenceResult;
  };
}

const SAFE_LINK_DENY_WARNING =
  'Ticket was created, but the machine could not be linked. You can retry linking without creating another ticket.';
const SAFE_LINK_FAIL_WARNING =
  'Ticket was created, but machine linking failed unexpectedly. You can retry linking without creating another ticket.';

/** True when the actor may call govern_ticket_assign (admin/support). */
export async function actorMayGovernAssign(actorId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', actorId)
    .maybeSingle();
  if (error || !data?.role) return false;
  return data.role === 'admin' || data.role === 'support';
}

function isAssignAuthorizationError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /42501|not permitted|only admin\/support|permission denied|authorization/i.test(message);
}

function isLinkAuthorizationError(message: string): boolean {
  return /42501|not authorized|permission denied|authorization|foreign|another (customer|account|owner)/i.test(
    message,
  );
}

type LinkAttemptResult =
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; denied: boolean; message: string };

/**
 * Link-only path against an existing ticket. Never inserts a second ticket.
 * Safe for create-time soft failure and explicit UI retry.
 */
async function attemptLinkTicketMachine(
  ticketId: string,
  machineId: string,
): Promise<LinkAttemptResult> {
  const { data: linked, error: linkErr } = await supabase.rpc('link_ticket_machine', {
    p_ticket_id: ticketId,
    p_machine_id: machineId,
  });

  if (linkErr) {
    const message = linkErr.message || 'Machine link failed';
    return { ok: false, denied: isLinkAuthorizationError(message), message };
  }

  if (linked && typeof linked === 'object') {
    return { ok: true, row: linked as Record<string, unknown> };
  }

  const { data: refreshed, error: refreshErr } = await supabase
    .from('service_tickets')
    .select(SELECT_COLUMNS)
    .eq('id', ticketId)
    .single();
  if (refreshErr) {
    return { ok: false, denied: false, message: refreshErr.message };
  }
  return { ok: true, row: refreshed as Record<string, unknown> };
}

export type RetryLinkTicketMachineResult =
  | { status: 'linked'; ticketId: string; machineId: string; row: Record<string, unknown> }
  | {
      status: 'unlinked';
      ticketId: string;
      machineId: string;
      reason: 'link_denied' | 'link_failed';
      warning: string;
      retryable: true;
    };

/** Link-only retry for a ticket that already exists (no reinsert). */
export async function retryLinkTicketMachine(
  ticketId: string,
  machineId: string,
): Promise<RetryLinkTicketMachineResult> {
  const outcome = await attemptLinkTicketMachine(ticketId, machineId);
  if (outcome.ok) {
    return {
      status: 'linked',
      ticketId,
      machineId,
      row: outcome.row,
    };
  }
  return {
    status: 'unlinked',
    ticketId,
    machineId,
    reason: outcome.denied ? 'link_denied' : 'link_failed',
    warning: outcome.denied ? SAFE_LINK_DENY_WARNING : SAFE_LINK_FAIL_WARNING,
    retryable: true,
  };
}

/**
 * Canonical ticket creation — ALL production create paths MUST use this.
 * V2 API create is NOT an alternative authority; route through here or disable V2 create.
 */
export async function governedCreateTicket(
  ticketData: CreateTicketData,
  userId: string,
  currentUserId?: string,
): Promise<GovernedCreateResult> {
  const ticketType = ticketData.type || 'general';
  const ticketPriority = ticketData.priority || 'medium';
  const createdAt = new Date();
  const slaFields = computeSlaFields(ticketPriority, ticketType, createdAt);
  const actorId = currentUserId ?? userId;

  const insertPayload = {
    title: ticketData.title?.toString().slice(0, 200) || 'Support Ticket',
    description: ticketData.description || 'Support ticket created via services page',
    type: ticketType,
    priority: ticketPriority,
    status: 'open' as const,
    preferred_contact_method: ticketData.preferred_contact_method || 'email',
    user_id: currentUserId,
    sla_response_due: slaFields.sla_response_due,
    sla_resolution_due: slaFields.sla_resolution_due,
    sla_breached: slaFields.sla_breached,
    contact_phone: ticketData.contact_phone || null,
    contact_email: ticketData.contact_email || null,
    site_location: ticketData.site_location || null,
    // machine_id linked via RPC after insert (server-side authz). Free-text serial remains optional.
    machine_serial_number: ticketData.machine_serial_number || null,
    machine_model: (ticketData as { machine_model?: string }).machine_model || null,
  };

  const { data, error } = await supabase
    .from('service_tickets')
    .insert([insertPayload])
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);

  let created = data as Record<string, unknown>;
  let machineLink: MachineLinkCreateOutcome = { status: 'unlinked', reason: 'not_requested' };
  const requestedMachineId = ticketData.machine_id?.trim();
  if (requestedMachineId) {
    const linkOutcome = await attemptLinkTicketMachine(String(created.id), requestedMachineId);
    if (linkOutcome.ok) {
      created = linkOutcome.row;
      machineLink = { status: 'linked', machineId: requestedMachineId };
    } else {
      // Ticket identity is preserved; do not throw as a create failure.
      machineLink = {
        status: 'unlinked',
        reason: linkOutcome.denied ? 'link_denied' : 'link_failed',
        machineId: requestedMachineId,
        warning: linkOutcome.denied ? SAFE_LINK_DENY_WARNING : SAFE_LINK_FAIL_WARNING,
        retryable: true,
      };
    }
  }

  const ticketId = String(created.id);
  const createdEvent = await recordServiceEvent({
    eventType: 'ON',
    entityId: ticketId,
    payload: {
      kind: 'ticket_created',
      ticket_number: created.ticket_number,
      type: ticketType,
      priority: ticketPriority,
      machine_id: created.machine_id ?? null,
      machine_link_status: machineLink.status,
      machine_link_reason: 'reason' in machineLink ? machineLink.reason : undefined,
      sla_response_due: slaFields.sla_response_due,
      sla_resolution_due: slaFields.sla_resolution_due,
    },
    verifiedBy: actorId,
    correlationId: `create-${ticketId}`,
  });

  const eventResults: GovernedCreateResult['eventResults'] = { created: createdEvent };
  const createdRow = created;

  const mayAssign = await actorMayGovernAssign(actorId);
  if (!mayAssign) {
    // Optional auto-assign is staff-only. Creation already succeeded — never fail the create.
    return {
      row: createdRow,
      ticketType,
      ticketPriority,
      actorId,
      assignment: { status: 'unassigned', reason: 'not_authorized' },
      machineLink,
      eventResults,
    };
  }

  const autoAssign = await resolveAutoAssignment(ticketId, ticketType, ticketPriority, actorId);
  if (!autoAssign) {
    return {
      row: createdRow,
      ticketType,
      ticketPriority,
      actorId,
      assignment: { status: 'unassigned', reason: 'no_candidate' },
      machineLink,
      eventResults,
    };
  }

  try {
    const { governTicketAssign } = await import('@/lib/ticketGovernanceApi');
    const assignedTicket = await governTicketAssign({
      ticketId,
      assigneeId: autoAssign.assignedTo,
      rationale: `Deterministic policy assignment (${autoAssign.assignmentResult.ruleId})`,
    });
    eventResults.assigned = await recordServiceEvent({
      eventType: 'VERIFICATION',
      entityId: ticketId,
      payload: {
        kind: 'ticket_assigned',
        assignedTo: autoAssign.assignedTo,
        ruleId: autoAssign.assignmentResult.ruleId,
      },
      verifiedBy: actorId,
      correlationId: `assign-${ticketId}`,
    });
    return {
      row: assignedTicket as unknown as Record<string, unknown>,
      ticketType,
      ticketPriority,
      actorId,
      assignment: { status: 'assigned', assignedTo: autoAssign.assignedTo },
      machineLink,
      eventResults,
    };
  } catch (err) {
    if (isAssignAuthorizationError(err)) {
      return {
        row: createdRow,
        ticketType,
        ticketPriority,
        actorId,
        assignment: {
          status: 'unassigned',
          reason: 'assign_denied',
          detail: err instanceof Error ? err.message : String(err),
        },
        machineLink,
        eventResults,
      };
    }
    throw err;
  }
}

export async function recordTransitionEvent(
  ticketId: string,
  previousStatus: string,
  newStatus: string,
  actorId: string,
  transitionId: string,
): Promise<EventPersistenceResult> {
  return recordServiceEvent({
    eventType: 'VERIFICATION',
    entityId: ticketId,
    payload: {
      kind: 'ticket_status_transition',
      previousStatus,
      newStatus,
      transitionId,
    },
    verifiedBy: actorId,
    correlationId: transitionId,
  });
}

export function checkAndApplyEscalation(ticket: {
  id: string;
  status: string;
  sla_resolution_due: string | null;
  escalated: boolean;
}): Promise<{ escalated: boolean; patch?: Record<string, unknown> }> {
  const shouldEscalate = escalationEngine.checkForEscalation({
    id: ticket.id,
    status: ticket.status,
    slaResolutionDue: ticket.sla_resolution_due,
    escalated: ticket.escalated,
  });

  if (!shouldEscalate) return Promise.resolve({ escalated: false });

  const result = escalationEngine.escalate(ticket.id);
  return Promise.resolve({
    escalated: true,
    patch: {
      escalated: true,
      escalated_at: result.timestamp,
      sla_breached: true,
      updated_at: result.timestamp,
    },
  });
}

export {
  lifecycleEngine,
  slaCalculator,
  escalationEngine,
  assignmentExecutor,
};
