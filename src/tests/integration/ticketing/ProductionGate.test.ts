/**
 * P0.10 Production Gate — executable evidence tests.
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { computeSlaFields, validateStatusTransition } from '@/lib/ticketing/TicketGovernanceService';
import { resolveSlaPolicy, SLA_POLICY_SOURCE } from '@/lib/ticketing/slaPolicy';
import {
  SERVICE_EVENT_CONSISTENCY_MODEL,
  recordServiceEvent,
} from '@/lib/ticketing/serviceEventLedger';
import { isValidTicketTransition } from '@/lib/ticketing/ticketTransitions';

const REPO_ROOT = path.resolve(__dirname, '../../../..');

describe('P0.10 Production Gate', () => {
  describe('P0.10.2 — V2 create bypass eliminated', () => {
    it('ticketApi does not call ticketsV2Api.create or VITE_ENABLE_V2_TICKETS for create', () => {
      const src = fs.readFileSync(path.join(REPO_ROOT, 'src/lib/ticketApi.ts'), 'utf-8');
      expect(src).toContain('governedCreateTicket');
      expect(src).not.toMatch(/VITE_ENABLE_V2_TICKETS/);
      expect(src).not.toMatch(/ticketsV2Api\.create/);
    });

    it('createTicket routes only through TicketGovernanceService', () => {
      const src = fs.readFileSync(path.join(REPO_ROOT, 'src/lib/ticketApi.ts'), 'utf-8');
      expect(src).toMatch(/export const createTicket[\s\S]*?governedCreateTicket/);
    });
  });

  describe('P0.10.3 — FSM enforcement at application boundary', () => {
    const productionStatusWriters = [
      'src/lib/ticketApi.ts',
      'src/lib/adminTicketApi.ts',
    ];

    it('production ticket APIs call validateStatusTransition or buildGovernedTransitionPatch before status update', () => {
      for (const file of productionStatusWriters) {
        const src = fs.readFileSync(path.join(REPO_ROOT, file), 'utf-8');
        expect(src).toMatch(/validateStatusTransition|buildGovernedTransitionPatch/);
      }
    });

    it('Python ticket_service uses validate_transition', () => {
      const src = fs.readFileSync(
        path.join(REPO_ROOT, 'python_backend/apis/v2/services/ticket_service.py'),
        'utf-8',
      );
      expect(src).toContain('validate_transition');
    });

    it('rejects illegal transitions at engine level', () => {
      expect(() => validateStatusTransition('open', 'resolved')).toThrow();
      expect(() => validateStatusTransition('resolved', 'open')).toThrow();
      expect(isValidTicketTransition('open', 'assigned')).toBe(true);
      expect(isValidTicketTransition('in_progress', 'resolved')).toBe(true);
    });
  });

  describe('P0.10.4 — Single SLA authority (sla_policy.json)', () => {
    it('TypeScript resolves from sla_policy.json', () => {
      expect(SLA_POLICY_SOURCE).toContain('sla_policy.json');
      const policy = resolveSlaPolicy('critical', 'technical');
      expect(policy.responseHours).toBe(1);
      expect(policy.resolutionHours).toBe(4);
    });

    it('computeSlaFields produces deterministic deadlines', () => {
      const at = new Date('2026-06-01T00:00:00.000Z');
      const fields = computeSlaFields('critical', 'technical', at);
      expect(fields.sla_response_due).toBe('2026-06-01T01:00:00.000Z');
      expect(fields.sla_resolution_due).toBe('2026-06-01T04:00:00.000Z');
    });

    it('Python sla_calculator references same JSON file', () => {
      const src = fs.readFileSync(
        path.join(REPO_ROOT, 'python_backend/services/sla_calculator.py'),
        'utf-8',
      );
      expect(src).toContain('sla_policy.json');
    });
  });

  describe('P0.10.5 — Assignment authority', () => {
    it('selectDeterministicAssignee uses no randomness', () => {
      const assignSrc = fs.readFileSync(
        path.join(REPO_ROOT, 'src/services/ticketing/AssignmentExecutor.ts'),
        'utf-8',
      );
      expect(assignSrc).toContain('selectDeterministicAssignee');
      expect(assignSrc).not.toMatch(/Math\.random\s*\(/);
      const fnMatch = assignSrc.match(
        /export function selectDeterministicAssignee[\s\S]*?^}/m,
      );
      expect(fnMatch?.[0] ?? '').not.toMatch(/RANDOM|Math\.random/);
    });

    it('migration 080 removes SQL auto-assign from handle_new_ticket', () => {
      const mig = fs.readFileSync(
        path.join(REPO_ROOT, 'migrations/080_service_ticketing_governance.sql'),
        'utf-8',
      );
      expect(mig).not.toContain('auto_assign_ticket');
      expect(mig).not.toContain('calculate_sla_dates');
      expect(mig).not.toContain('RANDOM');
    });
  });

  describe('P0.10.6 — Escalation authority', () => {
    it('canonical ticket EscalationEngine lives under services/ticketing', () => {
      expect(
        fs.existsSync(path.join(REPO_ROOT, 'src/services/ticketing/EscalationEngine.ts')),
      ).toBe(true);
      // PilotMonitoringDashboard may still use src/lib/support/EscalationEngine (different Issue API).
      // Ticket governance must not import that path.
      const gov = fs.readFileSync(
        path.join(REPO_ROOT, 'src/lib/ticketing/TicketGovernanceService.ts'),
        'utf8',
      );
      expect(gov).toMatch(/services\/ticketing\/EscalationEngine/);
      expect(gov).not.toMatch(/lib\/support\/EscalationEngine/);
    });
  });

  describe('P0.10.7 — Event persistence honesty (Option C)', () => {
    it('declares best_effort consistency model', () => {
      expect(SERVICE_EVENT_CONSISTENCY_MODEL).toBe('best_effort');
    });

    it('recordServiceEvent returns persisted flag (not silent success)', async () => {
      const result = await recordServiceEvent({
        eventType: 'ON',
        entityId: 'test-gate-ticket',
        payload: { kind: 'ticket_created', test: true },
        verifiedBy: 'test-actor',
      });
      expect(result).toHaveProperty('persisted');
      expect(result).toHaveProperty('consistencyModel', 'best_effort');
      // Without live Supabase RPC, persisted is expected false — not a pass-by-silence
      if (!result.persisted) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('P0.10.1 — Migration numbering', () => {
    it('080_service_ticketing_governance exists and 079 is not duplicated', () => {
      expect(
        fs.existsSync(path.join(REPO_ROOT, 'migrations/080_service_ticketing_governance.sql')),
      ).toBe(true);
      expect(
        fs.existsSync(path.join(REPO_ROOT, 'migrations/079_service_ticketing_governance.sql')),
      ).toBe(false);
      expect(
        fs.existsSync(path.join(REPO_ROOT, 'migrations/079_fabricator_dual_write_consistency_reports.sql')),
      ).toBe(true);
    });
  });
});
