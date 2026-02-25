/**
 * Canonical Fabricator Studio route builders.
 * Single source of truth to prevent string drift across navigation callers.
 *
 * Target unified hierarchy (Fabricator Pro consolidation):
 * - /fabricator → landing/command
 * - /fabricator/studio/projects → project list
 * - /fabricator/studio/projects/:projectId/positions/:poseId/{design|optimization|commercial|production}
 * - /fabricator/studio/data/*, /fabricator/studio/reports/*
 */

const STUDIO_BASE = '/fabricator/studio';

export const fabricatorRoutes = {
  /** Landing / command center */
  studioCommand: () => `${STUDIO_BASE}/command`,
  /** Project list */
  studioProjects: () => `${STUDIO_BASE}/projects`,
  /** Single project workspace (full screen) */
  studioProject: (projectId: string) => `${STUDIO_BASE}/projects/${projectId}`,
  /** Pose-centric: design studio */
  poseDesign: (projectId: string, poseId: string) =>
    `${STUDIO_BASE}/projects/${projectId}/positions/${poseId}/design`,
  /** Pose-centric: BOM review */
  poseBOM: (projectId: string, poseId: string) =>
    `${STUDIO_BASE}/projects/${projectId}/positions/${poseId}/bom`,
  /** Pose-centric: optimization */
  poseOptimization: (projectId: string, poseId: string) =>
    `${STUDIO_BASE}/projects/${projectId}/positions/${poseId}/optimization`,
  /** Pose-centric: commercial */
  poseCommercial: (projectId: string, poseId: string) =>
    `${STUDIO_BASE}/projects/${projectId}/positions/${poseId}/commercial`,
  /** Pose-centric: production */
  poseProduction: (projectId: string, poseId: string) =>
    `${STUDIO_BASE}/projects/${projectId}/positions/${poseId}/production`,
  /** Data studio base */
  studioData: (subPath = '') =>
    subPath ? `${STUDIO_BASE}/data/${subPath}` : `${STUDIO_BASE}/data`,
  /** Reports */
  studioReports: (subPath = '') =>
    subPath ? `${STUDIO_BASE}/reports/${subPath}` : `${STUDIO_BASE}/reports`,
  /** New project wizard (legacy entry: redirect target) */
  newProjectWizard: () => '/fabricator/studio/projects?new=true',
} as const;

export type FabricatorRouteKey = keyof typeof fabricatorRoutes;
