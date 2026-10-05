import { describe, expect, it } from 'vitest';
import { STUDIO_WORKFLOW_STAGES, deriveStageVisualStatus, stageBlockedReason, type StudioWorkflowEvidence } from './studioWorkflow';
import type { WindowUnit } from '@/types/fabricator';

const identity = { ownerUserId: 'owner', projectId: 'project', positionId: 'pose', source: 'v2' as const, revision: 4 };
const base: StudioWorkflowEvidence = {
  currentProject: { id: 'pose', components: [{ id: 'part', profile: { id: 'profile' }, quantity: 1, cuttingLengths: [500], angles: [45] }] } as WindowUnit,
  measurementData: { width: '1000', height: '1200' } as never,
  designData: null, bom: null, quote: null, optimizationResult: null, productionDocuments: null,
  completedSteps: new Set(), activeStep: 'measuring', workflowIdentity: identity, workflowDraftDirty: false,
};
const stage = (id: string) => STUDIO_WORKFLOW_STAGES.find(s => s.id === id)!;
const qualified = { qualification: { status: 'qualified', identity, catalogueVersion: 'fixture-catalogue', ruleVersion: 'fixture-rules', requiredPieceCount: 1, generatedPieceCount: 1, unplacedPieceCount: 0, reasons: [] } } as never;

describe('Studio readiness', () => {
  it('does not infer activity or stock verification from page selection', () => {
    expect(deriveStageVisualStatus(stage('measure'), '/measuring', { ...base, measurementData: null })).toBe('not_started');
    expect(deriveStageVisualStatus(stage('stock'), '/studio/data/stock', { ...base, completedSteps: new Set(['inventory']) })).toBe('not_recorded');
  });
  it('keeps a completed active stage complete', () => {
    expect(deriveStageVisualStatus(stage('measure'), '/measuring', base)).toBe('complete');
  });
  it('rejects an estimate BOM even when its step was marked complete', () => {
    const evidence = { ...base, bom: { qualification: { status: 'estimate' } } as never, completedSteps: new Set(['bom']) };
    expect(deriveStageVisualStatus(stage('bom'), '/positions/pose/bom', evidence)).toBe('warning');
    expect(deriveStageVisualStatus(stage('optimize'), '/positions/pose/optimization', evidence)).toBe('blocked');
    expect(stageBlockedReason(stage('optimize'), evidence)).toContain('qualify');
  });
  it('rejects stale, dirty and foreign BOM identities', () => {
    expect(stage('bom').completeWhen({ ...base, bom: qualified })).toBe(true);
    expect(stage('bom').completeWhen({ ...base, bom: qualified, workflowDraftDirty: true })).toBe(false);
    expect(stage('bom').completeWhen({ ...base, bom: qualified, workflowIdentity: { ...identity, revision: 5 } })).toBe(false);
    expect(stage('bom').completeWhen({ ...base, bom: qualified, currentProject: { ...base.currentProject, id: 'other' } as WindowUnit })).toBe(false);
  });
  it('does not accept artifacts or a quality status as completion', () => {
    const evidence = { ...base, currentProject: { ...base.currentProject, status: 'quality' } as WindowUnit, optimizationResult: {} as never, productionDocuments: { cutSheets: [], labels: [], generatedAt: 'now' } };
    expect(stage('optimize').completeWhen(evidence)).toBe(false);
    expect(stage('production').completeWhen(evidence)).toBe(false);
    expect(stage('qc').completeWhen(evidence)).toBe(false);
    expect(deriveStageVisualStatus(stage('delivery'), '/production/delivery', evidence)).toBe('blocked');
  });
  it('blocks missing positions and invalid measurements', () => {
    expect(deriveStageVisualStatus(stage('production'), '/positions/p/production', { ...base, currentProject: null })).toBe('blocked');
    expect(stage('measure').completeWhen({ ...base, measurementData: { width: 'Infinity', height: '-1' } as never })).toBe(false);
  });
  it('orders BOM, stock and optimization before quotation', () => {
    expect(STUDIO_WORKFLOW_STAGES.map(s => s.id)).toEqual(['project', 'measure', 'design', 'bom', 'stock', 'optimize', 'quote', 'production', 'qc', 'delivery']);
  });
  it('completes stock only with matching reservation evidence', () => {
    expect(stage('stock').completeWhen(base)).toBe(false);
    const reservation = {
      identity,
      profileIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
      metersByProfile: { 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 6 },
      reservedAt: new Date().toISOString(),
      availabilityOk: true,
    };
    expect(stage('stock').completeWhen({ ...base, stockReservation: reservation })).toBe(true);
    expect(stage('stock').completeWhen({
      ...base,
      stockReservation: { ...reservation, identity: { ...identity, revision: 9 } },
    })).toBe(false);
  });
  it('completes release / QC / delivery only with matching acknowledgements', () => {
    const reservation = {
      identity,
      profileIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
      metersByProfile: { 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 6 },
      reservedAt: new Date().toISOString(),
      availabilityOk: true,
    };
    const manufacturing = {
      ...base,
      bom: qualified,
      stockReservation: reservation,
      optimizationResult: {
        materialUsage: 80,
        wastePercentage: 5500 / 6000 * 100,
        estimatedProductionTime: 30,
        nestingEfficiency: 500 / 6000 * 100,
        costBreakdown: {
          materialCost: 1,
          laborCost: 1,
          hardwareCost: 1,
          glazingCost: 1,
          totalCost: 4,
        },
        cuttingPlan: [
          {
            profile: { id: 'profile' },
            stockLength: 6000,
            totalWaste: 5500,
            utilization: 500 / 6000 * 100,
            cuts: [
              {
                length: 500,
                angle: 45,
                componentId: 'part',
                waste: 0,
                occurrenceIndex: 0,
                cutId: 'part:0',
              },
            ],
          },
        ],
      } as never,
    };
    expect(stage('production').completeWhen(manufacturing)).toBe(false);
    const released = {
      ...manufacturing,
      positionRelease: {
        releaseId: 'rel-1',
        projectId: identity.projectId,
        positionId: identity.positionId,
        source: identity.source,
        revision: identity.revision,
        bomFingerprint: 'bom',
        stockFingerprint: 'stock',
        optimizationFingerprint: 'opt',
        releasedAt: new Date().toISOString(),
      },
    };
    expect(stage('production').completeWhen(released)).toBe(true);
    expect(stage('qc').completeWhen(released)).toBe(false);
    const qcReady = {
      ...released,
      qualityApproval: {
        approvalId: 'qc-1',
        projectId: identity.projectId,
        positionId: identity.positionId,
        revision: identity.revision,
        inspectorId: 'owner',
        approvedAt: new Date().toISOString(),
      },
    };
    expect(stage('qc').completeWhen(qcReady)).toBe(true);
    expect(stage('delivery').completeWhen(qcReady)).toBe(false);
    expect(
      stage('delivery').completeWhen({
        ...qcReady,
        deliveryAcknowledgement: {
          acknowledgementId: 'del-1',
          projectId: identity.projectId,
          positionId: identity.positionId,
          revision: identity.revision,
          ownerUserId: 'owner',
          acknowledgedAt: new Date().toISOString(),
        },
      }),
    ).toBe(true);
    expect(stageBlockedReason(stage('delivery'), released)).toContain('QC');
  });
});
