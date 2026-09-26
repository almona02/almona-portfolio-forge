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
import { useProjectPositions } from '@/hooks/useFabricatorQueries';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { FeatureFlags } from '@/lib/featureFlags';
import { isFabricatorUuid } from '@/lib/supabase/fabricatorClientV2';
import { useJobsStore } from '@/store/jobsStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { Profile, WindowComponent, WindowUnit } from '@/types/fabricator';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DesignWorkspaceShell } from './shell/DesignWorkspaceShell';
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
  const { currentProject: authoritativeProject, setCurrentProject, setDesignData, completeStep } = useWorkflowStore();
  const effectivePoseId = useV2 ? poseId : (poseId ?? projectId);

  // Pose-centric: when v2 and route has poseId, load from usePose(poseId); else jobs + context
  const currentProject = useMemo<WindowUnit | null>(() => {
    if (useV2) return authoritativeProject?.id === effectivePoseId ? authoritativeProject : null;
    if (effectivePoseId) {
      const foundJob = jobs.find((job) => job.id === effectivePoseId);
      if (foundJob) return foundJob;
    }
    return state.currentProject;
  }, [useV2, effectivePoseId, authoritativeProject, jobs, state.currentProject]);

  useEffect(() => {
    if (effectivePoseId) {
      if (useV2 && currentProject) {
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: currentProject });
        setSelectedJob(effectivePoseId);
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
  }, [useV2, effectivePoseId, currentProject, jobs, dispatch, setSelectedJob, setCurrentProject, setDesignData]);

  // Get profiles from project or use empty array
  // Note: WindowUnit doesn't have a profiles property - profiles come from context or props
  const profiles = useMemo<Profile[]>(() => {
    // Profiles should come from context or be loaded separately
    // For now, return empty array (profiles can be loaded separately)
    return [];
  }, []);

  // Get related positions (sibling poses within the same project)
  const resolvedProjectId = useMemo<string | undefined>(() => {
    if (projectId && isFabricatorUuid(projectId)) return projectId;
    const cp = currentProject as WindowUnit & { projectId?: string } | null;
    if (cp?.projectId && isFabricatorUuid(cp.projectId)) return cp.projectId;
    return cp?.projectCode ?? projectId ?? undefined;
  }, [projectId, currentProject]);

  const allSiblingPositions = useProjectPositions(resolvedProjectId);

  const relatedPositions = useMemo<WindowUnit[]>(() => {
    if (!currentProject) return allSiblingPositions;
    const others = allSiblingPositions.filter((wu) => wu.id !== currentProject.id);
    const currentInList = allSiblingPositions.some((wu) => wu.id === currentProject.id);
    if (currentInList) return allSiblingPositions;
    return [currentProject, ...others];
  }, [currentProject, allSiblingPositions]);

  const handleDesignComplete = (components: WindowComponent[]) => {
    if (!currentProject) return;

    const updatedProject: WindowUnit = {
      ...currentProject,
      components: components,
    };

    dispatch({ type: 'SET_CURRENT_PROJECT', payload: updatedProject });
    dispatch({ type: 'UPDATE_PROJECT_COMPONENTS', payload: components });

    setCurrentProject(updatedProject);
    setDesignData(updatedProject);
    completeStep('design');

    const projKey = resolvedProjectId ?? projectId ?? 'default';
    const poseKey = effectivePoseId ?? currentProject.id;
    navigate(fabricatorRoutes.poseBOM(projKey, poseKey));
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

  if (useV2 && (!projectId || !effectivePoseId || !currentProject)) {
    return <div role="alert" className="h-full w-full bg-[#0a0a0a] p-8 text-red-300">Authoritative project and position data is unavailable.</div>;
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <DesignWorkspaceShell
        positions={relatedPositions}
        project={currentProject}
        onSelectPosition={handleSelectPosition}
        onAddPosition={undefined}
      >
        <EngineeringBay
          project={currentProject}
          onDesignComplete={handleDesignComplete}
          profiles={profiles}
          relatedPositions={relatedPositions}
          onSelectPosition={handleSelectPosition}
          onBackToMeasuring={handleBackToMeasuring}
          onAddNewPose={undefined}
        />
      </DesignWorkspaceShell>
    </div>
  );
};

