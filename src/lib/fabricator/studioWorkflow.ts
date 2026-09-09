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
import type { ProductionDocuments, WorkflowQuote } from '@/store/workflowStore';

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
    completeWhen: (e) => e.currentProject !== null || e.completedSteps.has('project'),
    isActive: (pathname) =>
      pathname.includes('/fabricator/studio/projects') && !pathname.includes('/positions/'),
  },
  {
    id: 'measure',
    labelKey: 'industrial.stages.measure',
    defaultLabel: 'Measure',
    shortLabel: 'Measure',
    completeWhen: (e) =>
      e.completedSteps.has('measuring') || e.measurementData !== null,
    isActive: (pathname) => pathname.endsWith('/measuring'),
  },
  {
    id: 'design',
    labelKey: 'industrial.stages.design',
    defaultLabel: 'Design',
    shortLabel: 'Design',
    completeWhen: (e) =>
      e.completedSteps.has('design') ||
      (e.designData !== null && (e.designData.components?.length ?? 0) > 0),
    isActive: (pathname) =>
      pathname.includes('/positions/') && pathname.endsWith('/design'),
  },
  {
    id: 'quote',
    labelKey: 'industrial.stages.quote',
    defaultLabel: 'Quote',
    shortLabel: 'Quote',
    completeWhen: (e) => e.completedSteps.has('commercial') || e.quote !== null,
    isActive: (pathname) =>
      pathname.includes('/positions/') && pathname.endsWith('/commercial'),
  },
  {
    id: 'bom',
    labelKey: 'industrial.stages.bom',
    defaultLabel: 'BOM',
    shortLabel: 'BOM',
    completeWhen: (e) => e.completedSteps.has('bom') || e.bom !== null,
    isActive: (pathname) =>
      pathname.includes('/positions/') && pathname.endsWith('/bom'),
  },
  {
    id: 'stock',
    labelKey: 'industrial.stages.stock',
    defaultLabel: 'Stock',
    shortLabel: 'Stock',
    completeWhen: (e) => e.completedSteps.has('inventory'),
    isActive: (pathname) => pathname.includes('/studio/data/stock'),
  },
  {
    id: 'optimize',
    labelKey: 'industrial.stages.optimize',
    defaultLabel: 'Optimize',
    shortLabel: 'Optimize',
    completeWhen: (e) =>
      e.completedSteps.has('optimization') || e.optimizationResult !== null,
    isActive: (pathname) =>
      pathname.includes('/positions/') && pathname.endsWith('/optimization'),
  },
  {
    id: 'production',
    labelKey: 'industrial.stages.production',
    defaultLabel: 'Production',
    shortLabel: 'Production',
    completeWhen: (e) =>
      e.completedSteps.has('production') || e.productionDocuments !== null,
    isActive: (pathname) =>
      pathname.includes('/positions/') && pathname.endsWith('/production'),
  },
  {
    id: 'qc',
    labelKey: 'industrial.stages.qc',
    defaultLabel: 'QC',
    shortLabel: 'QC',
    completeWhen: (e) =>
      e.completedSteps.has('quality-control') || e.currentProject?.status === 'quality',
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
      return fabricatorRoutes.studioProductionQuality();
    case 'delivery':
      return fabricatorRoutes.studioProductionDelivery();
  }
}

export function deriveStageVisualStatus(
  stage: StudioWorkflowStageDef,
  pathname: string,
  evidence: StudioWorkflowEvidence,
): StudioStageVisualStatus {
  const active = stage.isActive(pathname, evidence);
  const complete = stage.completeWhen(evidence);

  if (stage.id === 'stock' && !complete && !active) {
    return 'not_recorded';
  }
  if (stage.id === 'delivery' && !complete && !active) {
    return evidence.currentProject ? 'not_recorded' : 'not_started';
  }

  if (complete && !active) return 'complete';
  if (active && complete) return 'in_progress';
  if (active) return 'in_progress';
  return 'not_started';
}

export const NOT_RECORDED = 'Not recorded';
