import React from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { useAuthoritativePosition } from '@/hooks/useFabricatorQueries';

const PositionProductionOutlet: React.FC<{ projectId: string; poseId: string }> = ({ projectId, poseId }) => {
  const position = useAuthoritativePosition(projectId, poseId);
  if (position.isError || (!position.isLoading && !position.data)) {
    return <div role="alert">The requested position could not be loaded for this account.</div>;
  }
  if (!position.isHydrated) return <div role="status">Loading saved position revision…</div>;
  return <Outlet />;
};

const ProductionStudioLayout: React.FC = () => {
  const [search] = useSearchParams();
  const projectId = search.get('projectId');
  const poseId = search.get('poseId');
  return (
    <div className="p-4 h-full w-full bg-[#080808]"> 
      {/* Darker background for high contrast on shop floor */}
      <div className="flex items-center justify-between mb-4 bg-amber-900/10 p-3 border border-amber-600/20 rounded-lg">
        <div>
           <h2 className="text-xl font-bold text-amber-400 uppercase tracking-wider">Production Floor</h2>
           <p className="text-amber-600/60 text-[10px] font-mono">BATCHING // CUTTING // ASSEMBLY</p>
        </div>
        <div className="flex gap-2">
           <span className="text-xs text-slate-400" title="Machine telemetry is not connected">CNC: Not recorded</span>
           <span className="text-xs text-slate-400" title="Machine telemetry is not connected">Saw: Not recorded</span>
        </div>
      </div>
      {projectId && poseId ? <PositionProductionOutlet key={`${projectId}:${poseId}`} projectId={projectId} poseId={poseId} /> : projectId || poseId ? <div role="alert">Both project and position are required to open this production workflow.</div> : <Outlet />}
    </div>
  );
};
export default ProductionStudioLayout;
