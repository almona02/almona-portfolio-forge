/**
 * Bridge so delete/save mutations can update FabricatorWorkspace active project
 * without importing React context (and keep the studio header chips live).
 */

import type { WindowUnit } from '@/types/fabricator';
import { useWorkflowStore } from '@/store/workflowStore';

type WorkspaceBridge = {
  get: () => WindowUnit | null;
  set: (project: WindowUnit | null) => void;
};

let workspaceBridge: WorkspaceBridge | null = null;

export function registerActiveWorkspaceProjectBridge(bridge: WorkspaceBridge): () => void {
  workspaceBridge = bridge;
  return () => {
    if (workspaceBridge === bridge) workspaceBridge = null;
  };
}

function projectBelongsToDeletedProject(
  active: WindowUnit | null,
  deletedProjectId: string,
): boolean {
  if (!active) return false;
  const activeProjectId = (active as WindowUnit & { projectId?: string }).projectId;
  return (
    activeProjectId === deletedProjectId
    || active.id === deletedProjectId
    || active.orderNumber === deletedProjectId
    || active.projectCode === deletedProjectId
  );
}

/** Push active project into workspace + workflow shell state. */
export function publishActiveProject(project: WindowUnit | null): void {
  workspaceBridge?.set(project);
  useWorkflowStore.getState().alignShellProject(project);
}

/** Clear shell project when the deleted pose is the active one. */
export function clearActiveProjectIfPoseDeleted(poseId: string): void {
  const workflowActive = useWorkflowStore.getState().currentProject;
  const workspaceActive = workspaceBridge?.get() ?? null;
  if (workflowActive?.id === poseId || workspaceActive?.id === poseId) {
    publishActiveProject(null);
  }
}

/** Clear shell project when the deleted project owns the active pose. */
export function clearActiveProjectIfProjectDeleted(projectId: string): void {
  const workflowActive = useWorkflowStore.getState().currentProject;
  const workspaceActive = workspaceBridge?.get() ?? null;
  if (
    projectBelongsToDeletedProject(workflowActive, projectId)
    || projectBelongsToDeletedProject(workspaceActive, projectId)
  ) {
    publishActiveProject(null);
  }
}
