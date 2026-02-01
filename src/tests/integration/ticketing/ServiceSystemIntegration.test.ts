import { beforeEach, describe, expect, it } from 'vitest';
import { AssignmentExecutor } from '../../../services/ticketing/AssignmentExecutor';
import { TicketLifecycleEngine } from '../../../services/ticketing/TicketLifecycleEngine';
import { RoutingAdvisor } from '../../../services/ticketing/advisory/RoutingAdvisor';

// Mock data
const mockTechnicians = [{ id: 'TECH-1', name: 'John Doe', skills: ['repair'] }];
const mockTicket = { id: 'T-101', description: 'Test ticket', type: 'technical', priority: 'high' };

describe('Service System Integration', () => {
  let _lifecycleEngine: TicketLifecycleEngine;
  let assignmentExecutor: AssignmentExecutor;
  let routingAdvisor: RoutingAdvisor;
  
  beforeEach(() => {
    _lifecycleEngine = new TicketLifecycleEngine();
    // Initialize with rules including default
    assignmentExecutor = new AssignmentExecutor([
        {
            id: 'RULE-ASSIGN-001',
            execute: () => 'TECH-1'
        },
        {
            id: 'RULE-ASSIGN-DEFAULT',
            execute: () => 'TECH-DEFAULT'
        }
    ]);
    routingAdvisor = new RoutingAdvisor();
  });
  
  describe('Full Ticket Flow', () => {
    it('creates ticket → gets advisory → human validates → executes assignment', async () => {
      // 1. Create ticket (Tier 3)
      // Simulate ticket with critical priority to match RULE-ASSIGN-001 logic in AssignmentExecutor
      const ticket = {
        ...mockTicket,
        priority: 'critical',
        tier: 'Tier 3',
        deterministic: true,
        status: 'open'
      }
      
      expect(ticket.tier).toBe('Tier 3');
      expect(ticket.deterministic).toBe(true);
      
      // 2. Get advisory suggestion (Tier 2)
      const advisory = routingAdvisor.suggestTechnician(ticket, mockTechnicians);
      
      expect(advisory.tier).toBe('Tier 2');
      expect(advisory.requiresHumanValidation).toBe(true);
      
      // 3. Simulate human validation
      const validationEvent = {
        validationId: 'validation-001',
        timestamp: new Date().toISOString(),
        humanActorId: 'tech-001',
        advisoryOutput: advisory,
        validationDecision: 'approved' as const,
        decisionRationale: 'Technician matches machine expertise',
        ruleId: 'RULE-ASSIGN-001'
      };
      
      // 4. Execute assignment with validated advisory (Tier 3)
      const assignment = assignmentExecutor.executeAssignment(
        ticket as any,
        { ...advisory, humanValidationId: validationEvent.validationId },
        validationEvent.humanActorId
      );
      
      expect(assignment.tier).toBe('Tier 3');
      expect(assignment.advisoryValidationId).toBe(validationEvent.validationId);
      expect(assignment.ruleId).toBe('RULE-ASSIGN-001');
    });
  });
  
  describe('Constitutional Boundary Enforcement', () => {
    it('prevents Tier 2 advisory from direct execution', () => {
      const advisory: any = routingAdvisor.suggestTechnician(mockTicket, mockTechnicians);
      
      // This should throw if someone tries to use advisory as execution
      expect(() => {
        (advisory as any).execute(); 
      }).toThrow();
    });
    
    it('requires human validation before Tier 3 execution', () => {
      const advisory = routingAdvisor.suggestTechnician(mockTicket, mockTechnicians);
      
      expect(() => {
        assignmentExecutor.executeAssignment(
          mockTicket as any,
          advisory as any, // Missing humanValidationId
          'tech-001'
        );
      }).toThrow(/Assignment requires human-validated/);
    });
  });
});
