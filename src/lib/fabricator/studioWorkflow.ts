/**
 * Canonical visual workflow stages for Fabricator Studio.
 * Maps UI stages onto existing fabricatorRoutes. Does not invent status.
 *
 * AICS-001: presentation-only. Status is derived from persisted workflow
 * store fields and WindowUnit.status — never synthesized manufacturing truth.
 */

import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import type { MeasurementData, OptimizationResult, WindowUnit } from '@/types/fabricator';
import { workflowIdentityMatches, type ProductionDocuments, type WorkflowQuote, type WorkflowIdentity, type QualityApprovalAcknowledgement } from '@/store/workflowStore';
import { isQualifiedBOM } from '@/lib/fabricator/bom/bomQualification';
import { validateOptimizationInputs, validateOptimizationReconciliation } from '@/lib/fabricator/validation/WorkflowValidator';

export type StudioWorkflowStageId =
  | 'project'
  | 'measure'
  | 'design'
  | 'quote'
  | 'bom'
  | 'stock'
  | 'optimize'
  | 'production'
  | 'qc'
  | 'delivery';

export type StudioStageVisualStatus =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'blocked'
  | 'warning'
  | 'not_recorded';

export interface StudioWorkflowContext {
  projectId?: string;
  poseId?: string;
}

export interface StudioWorkflowEvidence {
  currentProject: WindowUnit | null;
  measurementData: MeasurementData | null;
  designData: WindowUnit | null;
  bom: CompleteBOM | null;
  quote: WorkflowQuote | null;
  optimizationResult: OptimizationResult | null;
  productionDocuments: ProductionDocuments | null;
  completedSteps: ReadonlySet<string>;
  activeStep: string;
  workflowIdentity?: WorkflowIdentity | null;
  qualityApproval?: QualityApprovalAcknowledgement | null;
  workflowDraftDirty?: boolean;
  /** UP-10 soft reservation acknowledgement bound to workflow identity. */
  stockReservation?: import('@/store/workflowStore').StockReservationEvidence | null;
}

export interface StudioWorkflowStageDef {
  id: StudioWorkflowStageId;
  labelKey: string;
  defaultLabel: string;
  shortLabel: string;
  /** Store / WindowUnit keys that count as completion evidence */
  completeWhen: (evidence: StudioWorkflowEvidence) => boolean;
  /** True when this stage is the active pose route suffix or activeStep */
  isActive: (pathname: string, evidence: StudioWorkflowEvidence) => boolean;
}

export const STUDIO_WORKFLOW_STAGES: StudioWorkflowStageDef[] = [
  {
    id: 'project',
    labelKey: 'industrial.stages.project',
    defaultLabel: 'Project',
    shortLabel: 'Project',
    completeWhen: (e) => e.currentProject !== null,
    isActive: (pathname) =>
      pathname.includes('/fabricator/studio/projects') && !pathname.includes('/positions/'),
  },
  {
    id: 'measure',
    labelKey: 'industrial.stages.measure',
    defaultLabel: 'Measure',
    shortLabel: 'Measure',
    completeWhen: (e) => Number.isFinite(Number(e.measurementData?.width)) && Number(e.measurementData?.width) > 0 && Number.isFinite(Number(e.measurementData?.height)) && Number(e.measurementData?.height) > 0,
    isActive: (pathname) => pathname.endsWith('/measuring'),
  },
  {
    id: 'design',
    labelKey: 'industrial.stages.design',
    defaultLabel: 'Design',
    shortLabel: 'Design',
    completeWhen: (e) => validateOptimizationInputs(e.currentProject).valid,
    isActive: (pathname) =>
      pathname.includes('/positions/') && pathname.endsWith('/design'),
  },
  {
    id: 'bom',
    labelKey: 'industrial.stages.bom',
    defaultLabel: 'BOM',
    shortLabel: 'BOM',
    completeWhen: hasCurrentQualifiedBOM,
    isActive: (pathname) =>
      pathname.includes('/positions/') && pathname.endsWith('/bom'),
  },
  {
    id: 'stock',
    labelKey: 'industrial.stages.stock',
    defaultLabel: 'Stock',
    shortLabel: 'Stock',
    // UP-10: complete only when revision-bound reservation evidence matches identity.
    completeWhen: hasCurrentStockReservation,
    isActive: (pathname) => pathname.includes('/studio/data/stock'),
  },
  {
    id: 'optimize',
    labelKey: 'industrial.stages.optimize',
    defaultLabel: 'Optimize',
    shortLabel: 'Optimize',
    completeWhen: hasCurrentManufacturingEvidence,
    isActive: (pathname) =>
      pathname.includes('/positions/') && pathname.endsWith('/optimization'),
  },
  {
    id: 'quote',
    labelKey: 'industrial.stages.quote',
    defaultLabel: 'Quote',
    shortLabel: 'Quote',
    completeWhen: (e) => hasCurrentManufacturingEvidence(e) && e.completedSteps.has('commercial') && e.quote !== null,
    isActive: (pathname) =>
      pathname.includes('/positions/') && pathname.endsWith('/commercial'),
  },
  {
    id: 'production',
    labelKey: 'industrial.stages.production',
    defaultLabel: 'Production',
    shortLabel: 'Production',
    // Generated documents are capability, not evidence of physical completion.
    completeWhen: hasCurrentQcApproval,
    isActive: (pathname) =>
      pathname.includes('/positions/') && pathname.endsWith('/production'),
  },
  {
    id: 'qc',
    labelKey: 'industrial.stages.qc',
    defaultLabel: 'QC',
    shortLabel: 'QC',
    completeWhen: hasCurrentQcApproval,
    isActive: (pathname) => pathname.includes('/production/quality'),
  },
  {
    id: 'delivery',
    labelKey: 'industrial.stages.delivery',
    defaultLabel: 'Delivery',
    shortLabel: 'Delivery',
    completeWhen: (e) => e.currentProject?.status === 'delivered',
    isActive: (pathname) => pathname.includes('/production/delivery'),
  },
];

function hasCurrentQualifiedBOM(e: StudioWorkflowEvidence): boolean {
  return Boolean(!e.workflowDraftDirty && e.workflowIdentity && e.currentProject?.id === e.workflowIdentity.positionId && (e.currentProject.revision === undefined || e.currentProject.revision === e.workflowIdentity.revision) && isQualifiedBOM(e.bom) && workflowIdentityMatches(e.bom?.qualification?.identity ?? null, e.workflowIdentity));
}

function hasCurrentStockReservation(e: StudioWorkflowEvidence): boolean {
  if (e.workflowDraftDirty || !e.workflowIdentity || !e.stockReservation) return false;
  if (!workflowIdentityMatches(e.stockReservation.identity, e.workflowIdentity)) return false;
  if (e.currentProject?.id !== e.workflowIdentity.positionId) return false;
  return e.stockReservation.profileIds.length > 0 && e.stockReservation.availabilityOk;
}

function hasCurrentManufacturingEvidence(e: StudioWorkflowEvidence): boolean {
  return hasCurrentQualifiedBOM(e) && validateOptimizationReconciliation(e.optimizationResult, e.currentProject).valid;
}

function hasCurrentQcApproval(e: StudioWorkflowEvidence): boolean {
  return hasCurrentManufacturingEvidence(e) && Boolean(e.qualityApproval?.approvalId && e.qualityApproval.inspectorId && e.qualityApproval.approvedAt && e.qualityApproval.projectId === e.workflowIdentity?.projectId && e.qualityApproval.positionId === e.workflowIdentity?.positionId && e.qualityApproval.revision === e.workflowIdentity?.revision);
}

export function stageBlockedReason(stage: StudioWorkflowStageDef, e: StudioWorkflowEvidence): string | null {
  if (stage.id === 'project') return null;
  if (stage.id === 'stock') {
    if (e.stockReservation && e.workflowIdentity && !workflowIdentityMatches(e.stockReservation.identity, e.workflowIdentity)) {
      return 'Stock acknowledgement is for a different revision — re-confirm availability.';
    }
    return null;
  }
  if (!e.currentProject) return 'Select a project position to continue.';
  if (e.workflowIdentity && e.currentProject.id !== e.workflowIdentity.positionId) return 'Open the selected position to load its workflow evidence.';
  if (stage.id === 'measure') return null;
  if (stage.id === 'design' && !STUDIO_WORKFLOW_STAGES[1].completeWhen(e)) return 'Record valid measurements before design.';
  if (['bom', 'optimize', 'quote', 'production', 'qc'].includes(stage.id) && !validateOptimizationInputs(e.currentProject).valid) return 'Resolve the design components and profiles in Design.';
  if (['optimize', 'production', 'qc'].includes(stage.id) && !hasCurrentQualifiedBOM(e)) return 'Review and qualify the BOM for the saved position revision.';
  if (['optimize', 'production', 'qc'].includes(stage.id) && !hasCurrentStockReservation(e)) return 'Acknowledge stock availability for this revision before optimization.';
  if (['production', 'qc'].includes(stage.id) && !hasCurrentManufacturingEvidence(e)) return 'Reconcile optimization with the current design before production.';
  if (stage.id === 'delivery' && !STUDIO_WORKFLOW_STAGES.find(s => s.id === 'qc')!.completeWhen(e)) return 'Record acknowledged QC approval for this revision before delivery.';
  return null;
}

export function stageRecoveryStage(stage: StudioWorkflowStageDef, e: StudioWorkflowEvidence): StudioWorkflowStageId {
  if (!e.currentProject || (e.workflowIdentity && e.currentProject.id !== e.workflowIdentity.positionId)) return 'project';
  if (stage.id === 'delivery') return 'qc';
  if (stage.id === 'design') return 'measure';
  if (!validateOptimizationInputs(e.currentProject).valid) return 'design';
  if (!hasCurrentQualifiedBOM(e)) return 'bom';
  return 'optimize';
}

export function resolveStudioWorkflowHref(
  stageId: StudioWorkflowStageId,
  ctx: StudioWorkflowContext,
): string {
  const { projectId, poseId } = ctx;
  const hasPose = Boolean(projectId && poseId);

  switch (stageId) {
    case 'project':
      return projectId
        ? fabricatorRoutes.studioProject(projectId)
        : fabricatorRoutes.studioProjects();
    case 'measure':
      return hasPose
        ? fabricatorRoutes.poseMeasuring(projectId!, poseId!)
        : fabricatorRoutes.studioProjects();
    case 'design':
      return hasPose
        ? fabricatorRoutes.poseDesign(projectId!, poseId!)
        : fabricatorRoutes.studioProjects();
    case 'quote':
      return hasPose
        ? fabricatorRoutes.poseCommercial(projectId!, poseId!)
        : fabricatorRoutes.studioProjects();
    case 'bom':
      return hasPose
        ? fabricatorRoutes.poseBOM(projectId!, poseId!)
        : fabricatorRoutes.studioProjects();
    case 'stock':
      return fabricatorRoutes.studioDataStock();
    case 'optimize':
      return hasPose
        ? fabricatorRoutes.poseOptimization(projectId!, poseId!)
        : fabricatorRoutes.studioProjects();
    case 'production':
      return hasPose
        ? fabricatorRoutes.poseProduction(projectId!, poseId!)
        : fabricatorRoutes.studioProjects();
    case 'qc':
      return fabricatorRoutes.studioProductionQuality() + (hasPose ? `?${new URLSearchParams({ projectId: projectId!, poseId: poseId! })}` : '');
    case 'delivery':
      return fabricatorRoutes.studioProductionDelivery() + (hasPose ? `?${new URLSearchParams({ projectId: projectId!, poseId: poseId! })}` : '');
  }
}

export function deriveStageVisualStatus(
  stage: StudioWorkflowStageDef,
  _pathname: string,
  evidence: StudioWorkflowEvidence,
): StudioStageVisualStatus {
  const complete = stage.completeWhen(evidence);

  if (stage.id !== 'project' && evidence.workflowIdentity && evidence.currentProject?.id !== evidence.workflowIdentity.positionId) return 'blocked';

  if (complete) return 'complete';
  if (stageBlockedReason(stage, evidence)) return 'blocked';
  if (stage.id === 'bom' && evidence.bom) return 'warning';
  if (stage.id === 'quote' && evidence.quote) return 'warning';

  if (stage.id === 'stock') {
    if (evidence.stockReservation && evidence.workflowIdentity && !workflowIdentityMatches(evidence.stockReservation.identity, evidence.workflowIdentity)) {
      return 'warning';
    }
    return 'not_recorded';
  }
  if (stage.id === 'delivery' || stage.id === 'qc' || stage.id === 'production') {
    return evidence.currentProject ? 'not_recorded' : 'not_started';
  }

  if (stage.id === 'measure' && evidence.measurementData) return 'in_progress';
  if (stage.id === 'design' && evidence.designData) return 'in_progress';
  if (stage.id === 'optimize' && evidence.optimizationResult) return 'warning';
  return 'not_started';
}

export const NOT_RECORDED = 'Not recorded';
