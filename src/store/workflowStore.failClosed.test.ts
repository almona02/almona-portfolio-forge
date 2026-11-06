import { beforeEach, describe, expect, it } from 'vitest';
import type { MeasurementData, OptimizationResult, Profile, WindowUnit } from '@/types/fabricator';
import { canCompleteWorkflowStep, revalidateCompletedSteps, useWorkflowStore } from './workflowStore';

const profile = { id: 'profile-1' } as Profile;
const project = { id: 'position-1', components: [{ id: 'component-1', profile, quantity: 1, cuttingLengths: [1000] }] } as WindowUnit;
const result = { materialUsage: 1, wastePercentage: 5000 / 6000 * 100, estimatedProductionTime: 1, nestingEfficiency: 1000 / 6000 * 100, cuttingPlan: [{ profile, stockLength: 6000, totalWaste: 5000, utilization: 1000 / 6000 * 100, cuts: [{ length: 1000, angle: 90, componentId: 'component-1', waste: 0 }] }], costBreakdown: { materialCost: 1, laborCost: 0, hardwareCost: 0, glazingCost: 0, totalCost: 1 } } satisfies OptimizationResult;

describe('workflow completion guards', () => {
  beforeEach(() => useWorkflowStore.getState().clearWorkflow());

  it('invalidates a previous optimization completion when rerun starts', () => {
    useWorkflowStore.setState({ currentProject: project, optimizationResult: result });
    expect(useWorkflowStore.getState().completeStep('optimization')).toBe(true);
    useWorkflowStore.getState().invalidateStep('optimization');
    expect(useWorkflowStore.getState().optimizationResult).toBeNull();
    expect(useWorkflowStore.getState().completedSteps.has('optimization')).toBe(false);
  });

  it('rejects direct QC completion without server acknowledgement', () => {
    useWorkflowStore.setState({ currentProject: project, optimizationResult: result, qualityApproval: null });
    expect(useWorkflowStore.getState().completeStep('quality-control')).toBe(false);
  });

  it('removes restored legacy completion that has no evidence', () => {
    const state = { measurementData: null, currentProject: null, optimizationResult: null, qualityApproval: null };
    expect([...revalidateCompletedSteps(state, ['measuring', 'design', 'optimization', 'quality-control'])]).toEqual([]);
    expect(canCompleteWorkflowStep({ ...state, measurementData: { width: '1200', height: '1400' } as MeasurementData }, 'measuring')).toBe(true);
  });
});

describe('alignShellProject pose switching (F03)', () => {
  beforeEach(() => useWorkflowStore.getState().clearWorkflow());

  const poseB = { ...project, id: 'position-2', orderNumber: 'ORDER-B' } as WindowUnit;

  function seedPoseAArtifacts(): void {
    useWorkflowStore.setState({
      currentProject: project,
      designData: project,
      bom: { confidence: 1 } as never,
      optimizationResult: result,
      quote: { total: 10, currency: 'EGP' },
      productionDocuments: { cutSheets: [], labels: [], generatedAt: 'now' },
      qualityApproval: { approvalId: 'approval-1' } as never,
      stockReservation: { reservedAt: 'now' } as never,
      positionRelease: { releaseId: 'release-1' } as never,
      deliveryAcknowledgement: { acknowledgementId: 'ack-1' } as never,
    });
  }

  it('invalidates downstream artifacts when aligning to a different pose', () => {
    seedPoseAArtifacts();
    useWorkflowStore.getState().alignShellProject(poseB);
    expect(useWorkflowStore.getState()).toMatchObject({
      currentProject: { id: 'position-2' },
      designData: null,
      bom: null,
      optimizationResult: null,
      quote: null,
      productionDocuments: null,
      qualityApproval: null,
      stockReservation: null,
      positionRelease: null,
      deliveryAcknowledgement: null,
    });
  });

  it('preserves downstream artifacts when aligning the same pose', () => {
    seedPoseAArtifacts();
    useWorkflowStore.getState().alignShellProject({ ...project, status: 'delivered' } as WindowUnit);
    expect(useWorkflowStore.getState()).toMatchObject({
      currentProject: { id: 'position-1', status: 'delivered' },
      optimizationResult: result,
      quote: { total: 10, currency: 'EGP' },
    });
    expect(useWorkflowStore.getState().bom).not.toBeNull();
  });
});
