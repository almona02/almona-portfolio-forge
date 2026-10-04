import { ValidationGate } from '@/components/fabricator/workflow/ValidationGate';
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useAuthoritativePosition } from '@/hooks/useFabricatorQueries';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { useEffect } from 'react';

/**
 * PoseWorkflowLayout — pose-centric content + validation gate.
 * Workflow bar lives on StudioLayout (FP-025A) so it is not duplicated.
 */
class PoseRouteBoundary extends Component<{ children: ReactNode }, { failed: boolean; message?: string }> {
  state: { failed: boolean; message?: string } = { failed: false };

  static getDerivedStateFromError(error: Error): { failed: boolean; message?: string } {
    return { failed: true, message: error?.message || 'Unknown render failure' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Pose workflow route failed:', error, info);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 bg-slate-950 p-8 text-center">
          <h2 className="text-lg font-semibold text-red-300">Position unavailable</h2>
          <p className="max-w-lg text-sm text-slate-400">This position could not be loaded for the current owner and project. No manufacturing data was changed.</p>
          {import.meta.env.DEV && this.state.message && (
            <p className="max-w-lg text-xs font-mono text-red-400/80" data-testid="pose-route-error">
              {this.state.message}
            </p>
          )}
          <a href="/fabricator/studio/projects" className="rounded-md border border-amber-500/40 px-4 py-2 text-sm text-amber-300 hover:bg-amber-500/10">Return to projects</a>
        </div>
      );
    }
    return this.props.children;
  }
}

const PoseWorkflowCoordinator: React.FC = () => {
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

const PoseWorkflowLayout: React.FC = () => {
  const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
  return (
    <PoseRouteBoundary key={`${projectId ?? 'missing'}:${poseId ?? 'missing'}`}>
      <PoseWorkflowCoordinator />
    </PoseRouteBoundary>
  );
};

export default PoseWorkflowLayout;
