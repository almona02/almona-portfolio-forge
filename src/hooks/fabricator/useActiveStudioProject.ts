import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { useWorkflowStore } from '@/store/workflowStore';
import type { WindowUnit } from '@/types/fabricator';
import { useMemo } from 'react';

function asTime(value: Date | string | undefined): number {
  if (!value) return 0;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Active pose for studio chrome (header chips, workflow bar, status bar).
 * Prefers workspace selection; falls back to workflow store; picks newer revision when both match.
 */
export function useActiveStudioProject(): WindowUnit | null {
  const workspaceProject = useFabricatorWorkspace().state.currentProject;
  const workflowProject = useWorkflowStore((s) => s.currentProject);

  return useMemo(() => {
    if (!workspaceProject) return workflowProject;
    if (!workflowProject) return workspaceProject;
    if (workspaceProject.id !== workflowProject.id) return workspaceProject;

    const wsRev = workspaceProject.revision ?? 0;
    const wfRev = workflowProject.revision ?? 0;
    if (wsRev !== wfRev) return wsRev >= wfRev ? workspaceProject : workflowProject;

    return asTime(workspaceProject.updatedAt) >= asTime(workflowProject.updatedAt)
      ? workspaceProject
      : workflowProject;
  }, [workspaceProject, workflowProject]);
}
