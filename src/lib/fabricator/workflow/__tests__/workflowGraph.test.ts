import {
  POSE_WORKFLOW_STAGES,
  getPoseWorkflowPathForStage,
  getPoseWorkflowStageFromPath,
  getPoseWorkflowStageIndex,
} from '@/lib/fabricator/workflow/workflowGraph';
import { describe, expect, it } from 'vitest';

describe('workflowGraph', () => {
  it('defines the canonical pose stage sequence once', () => {
    expect(POSE_WORKFLOW_STAGES.map((stage) => stage.id)).toEqual([
      'design',
      'bom',
      'optimization',
      'commercial',
      'production',
      'quality-control',
    ]);
  });

  it('resolves stage id from pose workflow path suffix', () => {
    expect(getPoseWorkflowStageFromPath('/fabricator/studio/projects/P1/positions/S1/design')).toBe('design');
    expect(getPoseWorkflowStageFromPath('/fabricator/studio/projects/P1/positions/S1/quality')).toBe('quality-control');
    expect(getPoseWorkflowStageFromPath('/fabricator/studio/command')).toBeNull();
  });

  it('returns stable stage index ordering', () => {
    expect(getPoseWorkflowStageIndex('design')).toBe(0);
    expect(getPoseWorkflowStageIndex('quality-control')).toBe(5);
    expect(getPoseWorkflowStageIndex(null)).toBe(-1);
  });

  it('builds canonical pose route per stage', () => {
    expect(getPoseWorkflowPathForStage('production', 'P1', 'S1')).toBe('/fabricator/studio/projects/P1/positions/S1/production');
    expect(getPoseWorkflowPathForStage('quality-control', 'P1', 'S1')).toBe('/fabricator/studio/projects/P1/positions/S1/quality');
  });
});

