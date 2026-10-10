import { beforeEach, describe, expect, it } from 'vitest';
import type { WindowUnit } from '@/types/fabricator';
import { useWorkflowStore, type WorkflowIdentity } from './workflowStore';

const position = { id: 'position-1', projectId: 'project-1', overallWidth: 1210, overallHeight: 1550, type: 'sliding', components: [] } as WindowUnit;
const identity: WorkflowIdentity = { ownerUserId: 'user-1', projectId: 'project-1', positionId: 'position-1', source: 'v2', revision: 4 };

describe('identity-scoped workflow hydration', () => {
  beforeEach(() => useWorkflowStore.getState().clearWorkflow());

  it('recovers glazing without letting metadata replace authoritative dimensions', () => {
    useWorkflowStore.getState().hydrateAuthoritativePosition(identity, {
      ...position, glazing: { type: 'double', color: 'clear' },
      positionMeta: { remarks: 'fixture', width: '9999', manufacturingWidth: 9999 } as never,
    });
    expect(useWorkflowStore.getState().measurementData).toMatchObject({ width: '1210', manufacturingWidth: 1210, glazingType: 'double', glassColor: 'clear', remarks: 'fixture' });
  });

  it('hydrates exact authoritative dimensions and preserves them for the same revision', () => {
    useWorkflowStore.getState().hydrateAuthoritativePosition(identity, position);
    expect(useWorkflowStore.getState().measurementData).toMatchObject({ width: '1210', height: '1550', manufacturingWidth: 1210, manufacturingHeight: 1550 });
    useWorkflowStore.getState().hydrateAuthoritativePosition(identity, { ...position });
    expect(useWorkflowStore.getState().currentProject).toMatchObject({ overallWidth: 1210, overallHeight: 1550, type: 'sliding' });
  });

  it('does not overwrite dirty edits during a same-revision refetch', () => {
    useWorkflowStore.getState().hydrateAuthoritativePosition(identity, position);
    useWorkflowStore.getState().setDesignData({ ...position, overallWidth: 1225 });
    useWorkflowStore.getState().hydrateAuthoritativePosition(identity, { ...position, overallWidth: 1210 });
    expect(useWorkflowStore.getState()).toMatchObject({
      workflowDraftDirty: true,
      currentProject: { overallWidth: 1225 },
    });
  });

  it('rejects an identity that disagrees with the position record', () => {
    expect(() => useWorkflowStore.getState().hydrateAuthoritativePosition(
      { ...identity, positionId: 'position-2' },
      position,
    )).toThrow('Authoritative position identity does not match');
  });

  it('clears all downstream artifacts when owner, position, or revision changes', () => {
    useWorkflowStore.getState().hydrateAuthoritativePosition(identity, position);
    useWorkflowStore.setState({
      bom: { confidence: 1 } as never,
      optimizationResult: { cuttingPlan: [{}] } as never,
      quote: { total: 10, currency: 'EGP' },
      productionDocuments: { cutSheets: [], labels: [], generatedAt: 'now' },
      qualityApproval: { approvalId: 'approval-1' } as never,
    });
    useWorkflowStore.getState().hydrateAuthoritativePosition(
      { ...identity, ownerUserId: 'user-2', positionId: 'position-2', revision: 5 },
      { ...position, id: 'position-2' },
    );
    expect(useWorkflowStore.getState()).toMatchObject({ bom: null, quote: null, productionDocuments: null, optimizationResult: null, qualityApproval: null });
  });

  it('keeps matching BOM across qc_revision bump on the same pose', () => {
    const profile = { id: 'PS-6601-FRAME', cuttingAllowance: 3 } as never;
    const designed = {
      ...position,
      systemPackId: 'caluminium-ps',
      components: [
        {
          id: 'c1',
          type: 'frame',
          profile,
          quantity: 1,
          cuttingLengths: [1000],
          angles: [45],
        },
      ],
    } as WindowUnit;
    useWorkflowStore.getState().hydrateAuthoritativePosition(identity, designed);
    useWorkflowStore.setState({
      bom: {
        confidence: 1,
        profiles: [{ profileCode: 'PS-6601-FRAME', cuttingLengths: [1003], angles: [45] }],
        qualification: {
          status: 'qualified',
          identity,
          catalogueVersion: 'cat',
          ruleVersion: 'rule',
          requiredPieceCount: 1,
          generatedPieceCount: 1,
          unplacedPieceCount: 0,
          reasons: [],
        },
      } as never,
      optimizationResult: { cuttingPlan: [{}] } as never,
      completedSteps: new Set(['design', 'bom', 'optimization']),
    });

    const bumped: WorkflowIdentity = { ...identity, revision: 5 };
    useWorkflowStore.getState().hydrateAuthoritativePosition(bumped, designed);

    const state = useWorkflowStore.getState();
    expect(state.workflowIdentity).toEqual(bumped);
    expect(state.bom?.qualification?.identity).toEqual(bumped);
    expect(state.bom?.qualification?.status).toBe('qualified');
    expect(state.optimizationResult).toBeNull();
    expect(state.completedSteps.has('bom')).toBe(true);
    expect(state.completedSteps.has('optimization')).toBe(false);
  });
});
