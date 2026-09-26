import { ValidationGate } from '@/components/fabricator/workflow/ValidationGate';
import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useAuthoritativePosition } from '@/hooks/useFabricatorQueries';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { useEffect } from 'react';

/**
 * PoseWorkflowLayout — pose-centric content + validation gate.
 * Workflow bar lives on StudioLayout (FP-025A) so it is not duplicated.
 */
const PoseWorkflowLayout: React.FC = () => {
  const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
  const { dispatch } = useFabricatorWorkspace();
  const { data, isLoading, error, isHydrated } = useAuthoritativePosition(projectId, poseId);
  useEffect(() => {
    if (data?.position) dispatch({ type: 'SET_CURRENT_PROJECT', payload: data.position });
  }, [data?.position, dispatch]);
  if (!projectId || !poseId) return <div role="alert" className="p-8 text-red-300">Authoritative project and position identifiers are required.</div>;
  if (isLoading || (data && !isHydrated)) return <div className="flex h-full items-center justify-center bg-slate-950 text-amber-300">Loading authoritative position…</div>;
  if (error || !data) return <div role="alert" className="p-8 text-red-300">{error instanceof Error ? error.message : 'Position hydration failed.'}</div>;
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ValidationGate />
      <div className="flex-1 overflow-hidden min-h-0">
        <Outlet />
      </div>
    </div>
  );
};

export default PoseWorkflowLayout;
