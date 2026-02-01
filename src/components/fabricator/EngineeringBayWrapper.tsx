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
import { useJobsStore } from '@/store/jobsStore';
import { Profile, WindowComponent, WindowUnit } from '@/types/fabricator';
import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EngineeringBay } from './EngineeringBay';

// Optional: If projectId is provided in route, we can load it
// Otherwise, use currentProject from context
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface EngineeringBayWrapperProps {
  // No props needed - uses context and route params
}

export const EngineeringBayWrapper: React.FC<EngineeringBayWrapperProps> = () => {
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useFabricatorWorkspace();
  const { jobs, setSelectedJob } = useJobsStore();

  // Get current project from context or find by ID
  const currentProject = useMemo<WindowUnit | null>(() => {
    // If projectId is in route, try to find it in jobs
    if (projectId) {
      const foundJob = jobs.find(job => job.id === projectId);
      if (foundJob) {
        return foundJob;
      }
    }
    
    // Otherwise, use currentProject from context
    return state.currentProject;
  }, [projectId, jobs, state.currentProject]);

  // Update context when projectId changes (in useEffect to avoid render-phase updates)
  useEffect(() => {
    if (projectId) {
      const foundJob = jobs.find(job => job.id === projectId);
      if (foundJob) {
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: foundJob });
        setSelectedJob(projectId);
      }
    }
  }, [projectId, jobs, dispatch, setSelectedJob]);

  // Get profiles from project or use empty array
  // Note: WindowUnit doesn't have a profiles property - profiles come from context or props
  const profiles = useMemo<Profile[]>(() => {
    // Profiles should come from context or be loaded separately
    // For now, return empty array (profiles can be loaded separately)
    return [];
  }, []);

  // Get related positions (other units in the same project)
  const relatedPositions = useMemo<WindowUnit[]>(() => {
    if (!currentProject) return [];
    
    // Find other jobs that might be related (same customer, same project group, etc.)
    // For now, return empty array - can be enhanced later
    return [];
  }, [currentProject]);

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

    // Navigate to next step in workflow: Design
    navigate('/fabricator/workflow/design');
  };

  // Handle back to measuring - navigate to new project wizard to start measurement
  const handleBackToMeasuring = () => {
    // Navigate to workflow wizard to start a new measurement
    // Note: There's no way to edit existing measurements, so we start a new one
    navigate('/fabricator-workflow?new=true');
  };

  // Handle position selection
  const handleSelectPosition = (id: string) => {
    const foundJob = jobs.find(job => job.id === id);
    if (foundJob) {
      dispatch({ type: 'SET_CURRENT_PROJECT', payload: foundJob });
      setSelectedJob(id);
      navigate(`/fabricator/workflow/engineering-bay/${id}`);
    }
  };

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

