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
  'id, title, description, type, priority, status, preferred_contact_method, user_id, ticket_number, digital_twin_code, contact_phone, contact_email, site_location, machine_serial_number, machine_model, sla_response_due, sla_resolution_due, sla_breached, escalated, escalated_at, assigned_to, assigned_at, assigned_by, first_response_at, created_at, updated_at';

export interface GovernedCreateResult {
  row: Record<string, unknown>;
  ticketType: string;
  ticketPriority: string;
  actorId: string;
  eventResults: {
    created: EventPersistenceResult;
    assigned?: EventPersistenceResult;
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
    machine_serial_number: ticketData.machine_serial_number || null,
    machine_model: (ticketData as { machine_model?: string }).machine_model || null,
  };

  const { data, error } = await supabase
    .from('service_tickets')
    .insert([insertPayload])
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);

  const ticketId = String(data.id);
  const createdEvent = await recordServiceEvent({
    eventType: 'ON',
    entityId: ticketId,
    payload: {
      kind: 'ticket_created',
      ticket_number: data.ticket_number,
      type: ticketType,
      priority: ticketPriority,
      sla_response_due: slaFields.sla_response_due,
      sla_resolution_due: slaFields.sla_resolution_due,
    },
    verifiedBy: actorId,
    correlationId: `create-${ticketId}`,
  });

  const eventResults: GovernedCreateResult['eventResults'] = { created: createdEvent };

  const autoAssign = await resolveAutoAssignment(ticketId, ticketType, ticketPriority, actorId);
  if (autoAssign) {
    const assignPatch = buildGovernedTransitionPatch({
      ticketId,
      currentStatus: 'open',
      targetStatus: 'assigned',
      actorId,
      rationale: 'Deterministic policy assignment',
    });
    const { data: assignedRow, error: assignErr } = await supabase
      .from('service_tickets')
      .update({
        ...assignPatch,
        assigned_to: autoAssign.assignedTo,
        assigned_at: new Date().toISOString(),
        assigned_by: actorId,
      })
      .eq('id', ticketId)
      .select(SELECT_COLUMNS)
      .single();

    if (!assignErr && assignedRow) {
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
        row: assignedRow as Record<string, unknown>,
        ticketType,
        ticketPriority,
        actorId,
        eventResults,
      };
    }
  }

  return {
    row: data as Record<string, unknown>,
    ticketType,
    ticketPriority,
    actorId,
    eventResults,
  };
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

export async function checkAndApplyEscalation(ticket: {
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

  if (!shouldEscalate) return { escalated: false };

  const result = escalationEngine.escalate(ticket.id);
  return {
    escalated: true,
    patch: {
      escalated: true,
      escalated_at: result.timestamp,
      sla_breached: true,
      updated_at: result.timestamp,
    },
  };
}

export {
  lifecycleEngine,
  slaCalculator,
  escalationEngine,
  assignmentExecutor,
};
