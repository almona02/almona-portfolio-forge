/**
 * Execution Service Tests
 *
 * Tests for the ExecutionService - Phase 2: Closed-Loop Production
 */

import { ExecutionService } from '@/services/executionService';
import type { ExecutionFeedback } from '@/types/execution';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ 
          data: [
            { id: 'stage-1', stage_id: 'material_prep' }, 
            { id: 'stage-2', stage_id: 'frame_assembly' },
            { id: 'stage-3', stage_id: 'sash_assembly' },
            { id: 'stage-4', stage_id: 'glazing' },
            { id: 'stage-5', stage_id: 'hardware_install' },
            { id: 'stage-6', stage_id: 'quality_check' }
          ] 
        }))
      })),
      update: vi.fn((updates) => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'test-stage-id',
                production_project_id: 'project-1',
                stage_id: 'material_prep',
                stage_name: 'Material Prep',
                description: 'Test',
                status: updates.status || 'in_progress', // Dynamic status
                estimated_duration_minutes: 60,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...updates // Include other updates
              }
            }))
          }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null }))
          }))
        }))
      }))
    }))
  }
}));

describe('ExecutionService', () => {
  let service: ExecutionService;

  beforeEach(() => {
    service = new ExecutionService();
  });

  describe('initializeExecutionStages', () => {
    it('should initialize execution stages for a project', async () => {
      const result = await service.initializeExecutionStages('test-project-id');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Should have all 6 standard stages
      const stageIds = result.map(stage => stage.stageId);
      expect(stageIds).toContain('material_prep');
      expect(stageIds).toContain('frame_assembly');
      expect(stageIds).toContain('sash_assembly');
      expect(stageIds).toContain('glazing');
      expect(stageIds).toContain('hardware_install');
      expect(stageIds).toContain('quality_check');
    });
  });

  describe('updateStageStatus', () => {
    it('should update stage status to in_progress', async () => {
      const result = await service.updateStageStatus('test-stage-id', 'in_progress');

      expect(result).toBeDefined();
      expect(result.status).toBe('in_progress');
    });

    it('should update stage status to completed with feedback', async () => {
      const feedback: ExecutionFeedback = {
        stageId: 'test-stage-id',
        status: 'completed',
        qualityScore: 95,
        timeSpentMinutes: 120,
        notes: 'Completed successfully',
        issues: []
      };

      const result = await service.updateStageStatus('test-stage-id', 'completed', feedback);

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });
  });

  describe('canTransitionStage', () => {
    it('should allow valid status transitions', () => {
      const mockStage = {
        id: 'test',
        productionProjectId: 'project-1',
        stageId: 'material_prep' as const,
        stageName: 'Material Prep',
        description: 'Test',
        status: 'pending' as const,
        estimatedDurationMinutes: 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      expect(service.canTransitionStage(mockStage, 'in_progress')).toBe(true);
      expect(service.canTransitionStage(mockStage, 'completed')).toBe(false); // Can't go from pending to completed
    });
  });

  describe('getNextStages', () => {
    it('should return correct successor stages', () => {
      const nextStages = service.getNextStages('material_prep');
      expect(nextStages).toContain('frame_assembly');

      const finalStage = service.getNextStages('quality_check');
      expect(finalStage).toHaveLength(0);
    });
  });

  describe('getExecutionSummary', () => {
    it('should calculate execution summary metrics', async () => {
      // Mock implementation would calculate metrics
      // For now, test that method exists and returns expected structure
      expect(typeof service.getExecutionSummary).toBe('function');
    });
  });
});