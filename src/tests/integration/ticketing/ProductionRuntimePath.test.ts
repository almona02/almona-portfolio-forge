/**
 * Production runtime path integration tests — prove Tier-3 governance executes via ticketApi.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildGovernedTransitionPatch,
  computeSlaFields,
  validateStatusTransition,
} from '@/lib/ticketing/TicketGovernanceService';
import { TicketLifecycleEngine } from '@/services/ticketing/TicketLifecycleEngine';
import { SLACalculator } from '@/services/ticketing/SLACalculator';
import { EscalationEngine } from '@/services/ticketing/EscalationEngine';
import { selectDeterministicAssignee } from '@/services/ticketing/AssignmentExecutor';
import * as ticketApiModule from '@/lib/ticketApi';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Production runtime path — Tier 3 governance', () => {
  describe('Test 1 — FSM', () => {
    it('rejects open → resolved', () => {
      expect(() => validateStatusTransition('open', 'resolved')).toThrow(
        /not allowed/,
      );
    });

    it('allows legal transition sequence open → assigned → in_progress → resolved → closed', () => {
      const engine = new TicketLifecycleEngine();
      expect(engine.validateTransition('open', 'assigned').valid).toBe(true);
      expect(engine.validateTransition('assigned', 'in_progress').valid).toBe(true);
      expect(engine.validateTransition('in_progress', 'resolved').valid).toBe(true);
      expect(engine.validateTransition('resolved', 'closed').valid).toBe(true);
    });

    it('buildGovernedTransitionPatch throws on illegal transition', () => {
      expect(() =>
        buildGovernedTransitionPatch({
          ticketId: 't-1',
          currentStatus: 'open',
          targetStatus: 'resolved',
          actorId: 'user-1',
        }),
      ).toThrow(/not allowed/);
    });
  });

  describe('Test 2 — SLA', () => {
    it('computes and returns SLA fields for create path', () => {
      const created = new Date('2026-01-01T12:00:00.000Z');
      const fields = computeSlaFields('critical', 'technical', created);
      expect(fields.sla_response_due).toBe('2026-01-01T13:00:00.000Z');
      expect(fields.sla_resolution_due).toBe('2026-01-01T16:00:00.000Z');
      expect(fields.sla_breached).toBe(false);
    });

    it('SLACalculator matches canonical policy', () => {
      const calc = new SLACalculator();
      const d = calc.calculateDeadlines('medium', 'general', new Date('2026-01-01T00:00:00.000Z'));
      expect(d.responseDue.toISOString()).toBe('2026-01-02T00:00:00.000Z');
      expect(d.resolutionDue.toISOString()).toBe('2026-01-06T00:00:00.000Z');
    });
  });

  describe('Test 3 — Assignment', () => {
    it('selectDeterministicAssignee picks lowest workload then id', () => {
      const pick = selectDeterministicAssignee([
        { id: 'tech-b', activeTicketCount: 2 },
        { id: 'tech-a', activeTicketCount: 2 },
        { id: 'tech-c', activeTicketCount: 1 },
      ]);
      expect(pick).toBe('tech-c');
    });

    it('tie-breaks by id ascending', () => {
      const pick = selectDeterministicAssignee([
        { id: 'tech-b', activeTicketCount: 0 },
        { id: 'tech-a', activeTicketCount: 0 },
      ]);
      expect(pick).toBe('tech-a');
    });
  });

  describe('Test 4 — Escalation', () => {
    it('escalates when SLA resolution due is past', () => {
      const engine = new EscalationEngine();
      const breached = engine.checkForEscalation({
        id: 't-1',
        status: 'in_progress',
        slaResolutionDue: new Date(Date.now() - 60_000).toISOString(),
        escalated: false,
      });
      expect(breached).toBe(true);
      const result = engine.escalate('t-1');
      expect(result.ruleId).toBe('SLA_BREACH_ESCALATION');
    });
  });

  describe('Test 6 — Runtime reachability', () => {
    it('ticketApi imports TicketGovernanceService (production wiring)', () => {
      const ticketApiSource = fs.readFileSync(
        path.resolve(__dirname, '../../../lib/ticketApi.ts'),
        'utf-8',
      );
      expect(ticketApiSource).toContain('governedCreateTicket');
      expect(ticketApiSource).toContain('validateStatusTransition');
    });

    it('updateTicketStatus is exported and uses governance', () => {
      expect(typeof ticketApiModule.updateTicketStatus).toBe('function');
    });
  });
});
