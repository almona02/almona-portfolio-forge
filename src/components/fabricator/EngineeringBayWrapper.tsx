/**
 * EngineeringBayWrapper - Connects EngineeringBay to FabricatorWorkspaceContext
 * 
 * This wrapper component:
 * - Reads currentProject from FabricatorWorkspaceContext
 * - Handles project loading from route params (optional projectId)
 * - Passes project data and callbacks to EngineeringBay
 * - Manages profile data from context or props
 */

import { useAuth } from '@/context/AuthContext';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { usePose as usePoseV2, useProjectPositions, useUpsertPose } from '@/hooks/useFabricatorQueries';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { FeatureFlags } from '@/lib/featureFlags';
import { useJobsStore } from '@/store/jobsStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { Profile, WindowComponent, WindowUnit } from '@/types/fabricator';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EngineeringBay } from './EngineeringBay';

// Optional: If projectId is provided in route, we can load it
// Otherwise, use currentProject from context
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface EngineeringBayWrapperProps {
  // No props needed - uses context and route params
}

export const EngineeringBayWrapper: React.FC<EngineeringBayWrapperProps> = () => {
  const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
  const navigate = useNavigate();
  const useV2 = FeatureFlags.FABRICATOR_READ_V2;
  const { state, dispatch } = useFabricatorWorkspace();
  const { jobs, setSelectedJob } = useJobsStore();
  const upsertPose = useUpsertPose();
  const { user } = useAuth();
  const { setCurrentProject, setDesignData } = useWorkflowStore();
  const effectivePoseId = poseId ?? projectId;
  const { data: poseV2, isLoading: loadingPoseV2 } = usePoseV2(effectivePoseId ?? undefined);

  // Pose-centric: when v2 and route has poseId, load from usePose(poseId); else jobs + context
  const currentProject = useMemo<WindowUnit | null>(() => {
    if (useV2 && effectivePoseId && poseV2) return poseV2;
    if (effectivePoseId) {
      const foundJob = jobs.find((job) => job.id === effectivePoseId);
      if (foundJob) return foundJob;
    }
    return state.currentProject;
  }, [useV2, effectivePoseId, poseV2, jobs, state.currentProject]);

  useEffect(() => {
    if (effectivePoseId) {
      if (useV2 && poseV2) {
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: poseV2 });
        setSelectedJob(effectivePoseId);
        setCurrentProject(poseV2);
        setDesignData(poseV2);
      } else {
        const foundJob = jobs.find((job) => job.id === effectivePoseId);
        if (foundJob) {
          dispatch({ type: 'SET_CURRENT_PROJECT', payload: foundJob });
          setSelectedJob(effectivePoseId);
          setCurrentProject(foundJob);
          setDesignData(foundJob);
        }
      }
    }
  }, [useV2, effectivePoseId, poseV2, jobs, dispatch, setSelectedJob, setCurrentProject, setDesignData]);

  // Get profiles from project or use empty array
  // Note: WindowUnit doesn't have a profiles property - profiles come from context or props
  const profiles = useMemo<Profile[]>(() => {
    // Profiles should come from context or be loaded separately
    // For now, return empty array (profiles can be loaded separately)
    return [];
  }, []);

  // Get related positions (sibling poses within the same project)
  const resolvedProjectId = useMemo<string | undefined>(() => {
    if (projectId) return projectId;
    // Derive from the loaded pose when the route only has poseId
    const cp = currentProject as WindowUnit & { projectId?: string } | null;
    return cp?.projectId ?? cp?.projectCode ?? undefined;
  }, [projectId, currentProject]);

  const allSiblingPositions = useProjectPositions(resolvedProjectId);

  const relatedPositions = useMemo<WindowUnit[]>(() => {
    if (!currentProject) return allSiblingPositions;
    const others = allSiblingPositions.filter((wu) => wu.id !== currentProject.id);
    const currentInList = allSiblingPositions.some((wu) => wu.id === currentProject.id);
    if (currentInList) return allSiblingPositions;
    return [currentProject, ...others];
  }, [currentProject, allSiblingPositions]);

  // Handle design completion
  const handleDesignComplete = (components: WindowComponent[]) => {
    if (!currentProject) return;

    // Update project with new components
    const updatedProject: WindowUnit = {
      ...currentProject,
      components: components,
    };

    // Update context
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: updatedProject });
    dispatch({ type: 'UPDATE_PROJECT_COMPONENTS', payload: components });

    // P1: Sync to workflowStore so OptimizationPage has design data
    setCurrentProject(updatedProject);
    setDesignData(updatedProject);

    // Navigate to next step: BOM review when in pose context, else projects list
    if (projectId && poseId) {
      navigate(fabricatorRoutes.poseBom(projectId, poseId));
    } else {
      navigate(fabricatorRoutes.studioProjects());
    }
  };

  const handleBackToMeasuring = () => {
    if (projectId && poseId) {
      navigate(fabricatorRoutes.poseMeasuring(projectId, poseId));
    } else {
      navigate(fabricatorRoutes.newProjectWizard());
    }
  };

  const handleSelectPosition = useCallback((id: string) => {
    if (useV2) {
      // V2: navigate directly; usePoseV2 will load it from Supabase
      const projKey = resolvedProjectId ?? 'default';
      navigate(fabricatorRoutes.poseDesign(projKey, id));
    } else {
      const foundJob = jobs.find((job) => job.id === id);
      if (foundJob) {
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: foundJob });
        setSelectedJob(id);
        const projectKey = (foundJob as WindowUnit & { projectId?: string }).projectId ?? foundJob.projectCode ?? foundJob.orderNumber;
        navigate(fabricatorRoutes.poseDesign(projectKey, id));
      }
    }
  }, [useV2, resolvedProjectId, jobs, navigate, dispatch, setSelectedJob]);

  const handleAddNewPose = useCallback(async () => {
    if (!currentProject || !useV2 || !resolvedProjectId || !user?.id) return;
    const nextPosNum = allSiblingPositions.length + 1;
    const newUnit: WindowUnit = {
      ...currentProject,
      id: crypto.randomUUID(),
      orderNumber: currentProject.orderNumber ?? '1',
      posNumber: String(nextPosNum),
      status: 'draft',
      quantity: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      components: [],
      grid: { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }] },
      glazing: {},
      hardware: [],
    } as WindowUnit;
    try {
      const result = await upsertPose.mutateAsync({ windowUnit: newUnit });
      toast.success('New pose added');
      navigate(fabricatorRoutes.poseDesign(result.projectId, result.poseId));
    } catch (err) {
      toast.error(`Failed to add pose: ${err}`);
    }
  }, [currentProject, useV2, resolvedProjectId, user?.id, allSiblingPositions.length, upsertPose, navigate]);

  if (useV2 && effectivePoseId && loadingPoseV2) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500" />
          <span className="text-amber-500 font-mono text-sm">Loading pose...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <EngineeringBay
        project={currentProject}
        onDesignComplete={handleDesignComplete}
        profiles={profiles}
        relatedPositions={relatedPositions}
        onSelectPosition={handleSelectPosition}
        onBackToMeasuring={handleBackToMeasuring}
        onAddNewPose={useV2 && resolvedProjectId && user?.id ? handleAddNewPose : undefined}
      />
    </div>
  );
};

