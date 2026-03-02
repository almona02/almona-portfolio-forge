import { fabricatorRoutes } from '@/lib/fabricator/routes';

/**
 * Pose workflow graph (canonical source of truth for pose-centric stages).
 * Deterministic stage metadata is consumed by route composition, step rail,
 * and transition helpers to prevent stage drift.
 */
export type PoseWorkflowStageId =
  | 'design'
  | 'bom'
  | 'optimization'
  | 'commercial'
  | 'production'
  | 'quality-control';

export interface PoseWorkflowStage {
  id: PoseWorkflowStageId;
  label: string;
  shortLabel: string;
  pathSuffix: string;
}

export const POSE_WORKFLOW_STAGES: readonly PoseWorkflowStage[] = [
  { id: 'design', label: 'Design', shortLabel: 'Design', pathSuffix: 'design' },
  { id: 'bom', label: 'Bill of Materials', shortLabel: 'BOM', pathSuffix: 'bom' },
  { id: 'optimization', label: 'Optimization', shortLabel: 'Optimize', pathSuffix: 'optimization' },
  { id: 'commercial', label: 'Commercial', shortLabel: 'Quote', pathSuffix: 'commercial' },
  { id: 'production', label: 'Production', shortLabel: 'Production', pathSuffix: 'production' },
  { id: 'quality-control', label: 'Quality Control', shortLabel: 'Quality', pathSuffix: 'quality' },
];

export const getPoseWorkflowStageFromPath = (pathname: string): PoseWorkflowStageId | null => {
  const match = POSE_WORKFLOW_STAGES.find((stage) => pathname.endsWith(`/${stage.pathSuffix}`));
  return match?.id ?? null;
};

export const getPoseWorkflowStageIndex = (stageId: PoseWorkflowStageId | null): number =>
  stageId ? POSE_WORKFLOW_STAGES.findIndex((stage) => stage.id === stageId) : -1;

export const getPoseWorkflowPathForStage = (
  stageId: PoseWorkflowStageId,
  projectId: string,
  poseId: string,
): string => {
  switch (stageId) {
    case 'design':
      return fabricatorRoutes.poseDesign(projectId, poseId);
    case 'bom':
      return fabricatorRoutes.poseBOM(projectId, poseId);
    case 'optimization':
      return fabricatorRoutes.poseOptimization(projectId, poseId);
    case 'commercial':
      return fabricatorRoutes.poseCommercial(projectId, poseId);
    case 'production':
      return fabricatorRoutes.poseProduction(projectId, poseId);
    case 'quality-control':
      return fabricatorRoutes.poseQuality(projectId, poseId);
    default:
      return fabricatorRoutes.poseDesign(projectId, poseId);
  }
};

