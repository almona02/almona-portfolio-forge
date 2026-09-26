import { beforeEach, describe, expect, it } from 'vitest';
import type { WindowUnit } from '@/types/fabricator';
import { useWorkflowStore, type WorkflowIdentity } from './workflowStore';

const position = { id: 'position-1', projectId: 'project-1', overallWidth: 1210, overallHeight: 1550, type: 'sliding', components: [] } as WindowUnit;
const identity: WorkflowIdentity = { ownerUserId: 'user-1', projectId: 'project-1', positionId: 'position-1', source: 'v2', revision: 4 };

describe('identity-scoped workflow hydration', () => {
  beforeEach(() => useWorkflowStore.getState().clearWorkflow());

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
});
