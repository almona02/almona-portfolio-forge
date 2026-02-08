/**
 * EngineeringBayWrapper - Connects EngineeringBay to FabricatorWorkspaceContext
 * 
 * This wrapper component:
 * - Reads currentProject from FabricatorWorkspaceContext
 * - Handles project loading from route params (optional projectId)
 * - Passes project data and callbacks to EngineeringBay
 * - Manages profile data from context or props
 */

import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { usePose as usePoseV2, useProjectPositions } from '@/hooks/useFabricatorQueries';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { FeatureFlags } from '@/lib/featureFlags';
import { useJobsStore } from '@/store/jobsStore';
import { Profile, WindowComponent, WindowUnit } from '@/types/fabricator';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
      } else {
        const foundJob = jobs.find((job) => job.id === effectivePoseId);
        if (foundJob) {
          dispatch({ type: 'SET_CURRENT_PROJECT', payload: foundJob });
          setSelectedJob(effectivePoseId);
        }
      }
    }
  }, [useV2, effectivePoseId, poseV2, jobs, dispatch, setSelectedJob]);

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
    if (!currentProject) return [];
    // Filter out the currently-active pose
    return allSiblingPositions.filter((wu) => wu.id !== currentProject.id);
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

    // Navigate to next step (studio projects list)
    navigate(fabricatorRoutes.studioProjects());
  };

  const handleBackToMeasuring = () => {
    navigate(fabricatorRoutes.newProjectWizard());
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
      />
    </div>
  );
};

