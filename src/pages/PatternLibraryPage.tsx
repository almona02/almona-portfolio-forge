/**
 * PatternLibraryPage - Tier 2: Pattern Library (UP-12)
 *
 * Applies selected pattern to the active Studio pose (or navigates to projects
 * when none is open). Cancel returns to the previous Studio surface.
 */

import { PatternLibraryWizard } from '@/components/fabricator/PatternLibraryWizard';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { useJobsStore } from '@/store/jobsStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function PatternLibraryPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useFabricatorWorkspace();
  const { addOrUpdateJob } = useJobsStore();
  const { currentProject, setCurrentProject, invalidateStep } = useWorkflowStore();

  const active = currentProject ?? state.currentProject ?? null;

  const handlePatternSelected = (
    pattern: EgyptianPattern,
    params: Record<string, unknown>,
  ) => {
    const width = Number(params.width);
    const height = Number(params.height);
    if (!active?.projectId || !active.id) {
      toast.error('Open a project position first, then apply a pattern.');
      navigate(fabricatorRoutes.studioProjects());
      return;
    }
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      toast.error('Pattern width and height must be positive.');
      return;
    }

    const next = {
      ...active,
      overallWidth: width,
      overallHeight: height,
      presetId: pattern.id,
      updatedAt: new Date(),
    };

    setCurrentProject(next);
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: next });
    addOrUpdateJob(next);
    // Changing pattern invalidates downstream BOM / optimize for this revision only.
    invalidateStep('bom');
    invalidateStep('optimization');
    toast.success(`Applied pattern ${pattern.name || pattern.id} to this position.`);
    navigate(fabricatorRoutes.poseDesign(active.projectId, active.id));
  };

  const handleCancel = () => {
    if (active?.projectId && active.id) {
      navigate(fabricatorRoutes.poseMeasuring(active.projectId, active.id));
      return;
    }
    navigate(fabricatorRoutes.studioProjects());
  };

  return (
    <PatternLibraryWizard
      onPatternSelected={handlePatternSelected}
      onCancel={handleCancel}
    />
  );
}
