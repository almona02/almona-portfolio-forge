import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { TicketLifecycleEngine } from '../../../services/ticketing/TicketLifecycleEngine';
import { RoutingAdvisor } from '../../../services/ticketing/advisory/RoutingAdvisor';

// Mock data for tests
const mockTicket = { id: 'T-123', description: 'Broken machine' };
const mockTechnicians = [{ id: 'TECH-1', name: 'John Doe', skills: ['repair'] }];

describe('Service System Constitutional Compliance', () => {
  describe('Tier 3 Components', () => {
    it('TicketLifecycleEngine must be deterministic', () => {
      const engine = new TicketLifecycleEngine();
      
      // Test 1: Same inputs produce same outputs
      const result1 = engine.validateTransition('open', 'assigned');
      const result2 = engine.validateTransition('open', 'assigned');
      
      expect(result1).toEqual(result2);
      expect(result1.ruleId).toBeDefined();
      expect(result1.rationale).toContain('deterministic rule');
    });
    
    it('TicketLifecycleEngine must not import ML libraries', () => {
      const filePath = path.resolve(__dirname, '../../../services/ticketing/TicketLifecycleEngine.ts');
      const engineCode = fs.readFileSync(filePath, 'utf-8');
      
      // Strip comments to satisfy the constitutional check without false positives from the headers themselves
      const codeWithoutComments = engineCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

      // Constitutional check: No ML/AI imports
      const prohibitedImports = [
        'tensorflow',
        'pytorch',
        'sklearn',
        'ai/',
        'ml/'
      ];
      
      prohibitedImports.forEach(importStr => {
        expect(codeWithoutComments.toLowerCase()).not.toContain(importStr);
      });
    });
  });
  
  describe('Tier 2 Components', () => {
    it('RoutingAdvisor must include constitutional disclaimer', () => {
      const advisor = new RoutingAdvisor();
      const suggestion = advisor.suggestTechnician(mockTicket, mockTechnicians);
      
      expect(suggestion.tier).toBe('Tier 2');
      expect(suggestion.requiresHumanValidation).toBe(true);
      expect(suggestion.constitutionalDisclaimer).toContain('ADVISORY ONLY');
      expect(suggestion.constitutionalDisclaimer).toContain('human validation');
    });
    
    it('Advisory outputs must not execute actions', () => {
      const advisor = new RoutingAdvisor();
      const suggestion = advisor.suggestTechnician(mockTicket, mockTechnicians);
      
      // Constitutional check: Advisory cannot contain execution methods
      expect(suggestion).not.toHaveProperty('execute');
      expect(suggestion).not.toHaveProperty('assign');
      expect(suggestion).not.toHaveProperty('resolve');
    });
  });
});
