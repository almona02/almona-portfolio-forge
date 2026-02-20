/**
 * DesignWorkflowWrapper - Unified Design Route Wrapper
 * 
 * Wraps the design workflow with mode selection and state management
 * Handles URL parameters and localStorage persistence
 */

import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { useJobsStore } from '@/store/jobsStore';
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { EngineeringBayWrapper } from '../EngineeringBayWrapper';
import { DraftingWorkbench } from '../drafting/DraftingWorkbench';
import { DesignModeSelector, type DesignMode } from '../panels/DesignModeSelector';
import { DesignStateBridge } from './DesignStateBridge';

export const DesignWorkflowWrapper: React.FC = () => {
  const { projectId } = useParams<{ projectId?: string }>();
  const { search } = useLocation();
  const navigate = useNavigate();
  const { state, dispatch } = useFabricatorWorkspace();
  const { jobs, setSelectedJob } = useJobsStore();

  // Get mode from URL or localStorage
  const urlMode = new URLSearchParams(search).get('mode') as DesignMode | null;
  const savedMode = localStorage.getItem('almona-design-mode') as DesignMode | null;
  const initialMode = (urlMode || savedMode || 'smartdraw');

  const [mode, setMode] = useState<DesignMode>(initialMode);

  // Get current project
  const currentProject = useMemo(() => {
    if (projectId) {
      const foundJob = jobs.find(job => job.id === projectId);
      if (foundJob) {
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: foundJob });
        setSelectedJob(projectId);
        return foundJob;
      }
    }
    return state.currentProject;
  }, [projectId, jobs, state.currentProject, dispatch, setSelectedJob]);

  // Handle mode change
  const handleModeChange = (newMode: DesignMode) => {
    setMode(newMode);

    // Update URL without page reload
    const newSearch = new URLSearchParams(search);
    newSearch.set('mode', newMode);
    navigate({ search: newSearch.toString() }, { replace: true });

    // Persist to localStorage
    localStorage.setItem('almona-design-mode', newMode);
  };

  // Get project dimensions for recommendations
  const projectDimensions = currentProject
    ? {
      width: currentProject.overallWidth || 2000,
      height: currentProject.overallHeight || 1500
    }
    : undefined;

  // Handle design completion
  const handleDesignComplete = (components: any[]) => {
    if (!currentProject) return;

    const updatedProject = {
      ...currentProject,
      components: components
    };

    dispatch({ type: 'SET_CURRENT_PROJECT', payload: updatedProject });
    dispatch({ type: 'UPDATE_PROJECT_COMPONENTS', payload: components });

    // Navigate to next step
    navigate('/fabricator/workflow/quality-control');
  };

  // Get SmartDraw grid from project
  const smartDrawGrid = currentProject?.grid || null;

  // Use EngineeringBayWrapper for SmartDraw mode
  // This reuses the existing SmartDraw implementation
  const smartDrawCanvas = mode === 'smartdraw' && currentProject ? (
    <div className="w-full h-full">
      <EngineeringBayWrapper />
    </div>
  ) : null;

  // Drafting workbench
  const draftingWorkbench = mode === 'drafting' ? (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a]">
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-amber-600/30 bg-[#0a0a0a] flex items-center justify-between card-glass-dark flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleModeChange('smartdraw')}
              className="btn-secondary flex items-center gap-2 px-3 py-1.5 rounded border border-amber-600/30 text-amber-400 hover:bg-amber-500/10"
            >
              ← Back to SmartDraw
            </button>
            <span className="text-sm text-amber-400 font-semibold">
              ALMONA Drafting Mode - Tier 0 Visual Drafting
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <DraftingWorkbench
            onDesignValidated={(output) => {
              // Convert drafting output to components
              handleDesignComplete(output.components || []);
            }}
            initialTemplate={currentProject?.systemPackId || undefined}
          />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="w-full h-full">
      {/* State Bridge for synchronization */}
      <DesignStateBridge
        mode={mode}
        smartDrawGrid={smartDrawGrid}
        onSmartDrawGridChange={(grid) => {
          if (currentProject) {
            dispatch({
              type: 'UPDATE_PROJECT_GRID',
              payload: grid
            });
          }
        }}
      />

      {/* Mode Selector with Canvas */}
      <DesignModeSelector
        initialMode={mode}
        onModeChange={handleModeChange}
        smartDrawCanvas={smartDrawCanvas}
        draftingWorkbench={draftingWorkbench}
        showSelector={true}
        projectDimensions={projectDimensions}
      />
    </div>
  );
};

