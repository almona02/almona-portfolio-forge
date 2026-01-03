/**
 * Workflow State Management Hook
 * 
 * Consolidates UI and business state for FabricatorWorkflow component.
 * Reduces prop drilling and provides type-safe state updates.
 * 
 * Location: Hooks Layer
 */

import type { ProjectHeaderMeta } from '@/components/fabricator/NewProjectWizard';
import type { WindowComponent } from '@/types/fabricator';
import { useCallback, useMemo, useState } from 'react';

export interface WorkflowState {
  // UI State
  activeTab: string;
  showProjectWizard: boolean;
  showClientPortal: boolean;
  showMobilePanel: boolean;
  
  // Business State (UI-specific, not in workspace context)
  projectMeta: (ProjectHeaderMeta & Record<string, any>) | null;
  useEgyptWizard: boolean;
  systemTunedMessage: string | null;
  
  // Loading State
  isLoadingInventory: boolean;
  isGeneratingCuttingPlan: boolean;
  
  // Error State
  projectError: string | null;
  inventoryError: string | null;
  
  // Measuring Session State
  measurementSessionId: number;
  selectedExistingProjectKey: string;
  selectedExistingPoseId: string;
  
  // Design State
  pendingLayoutComponents: WindowComponent[] | null;
  showLayoutNextStep: boolean;
}

export interface WorkflowActions {
  // Tab Management
  setActiveTab: (tab: string) => void;
  
  // Project Wizard
  setShowProjectWizard: (show: boolean) => void;
  setProjectMeta: (meta: (ProjectHeaderMeta & Record<string, any>) | null) => void;
  setUseEgyptWizard: (use: boolean) => void;
  
  // UI Panels
  setShowClientPortal: (show: boolean) => void;
  setShowMobilePanel: (show: boolean) => void;
  
  // Messages
  setSystemTunedMessage: (message: string | null) => void;
  
  // Loading States
  setIsLoadingInventory: (loading: boolean) => void;
  setIsGeneratingCuttingPlan: (generating: boolean) => void;
  
  // Error States
  setProjectError: (error: string | null) => void;
  setInventoryError: (error: string | null) => void;
  
  // Measuring Session
  setMeasurementSessionId: (id: number) => void;
  setSelectedExistingProjectKey: (key: string) => void;
  setSelectedExistingPoseId: (id: string) => void;
  
  // Design State
  setPendingLayoutComponents: (components: WindowComponent[] | null) => void;
  setShowLayoutNextStep: (show: boolean) => void;
  
  // Batch Updates
  resetWorkflow: () => void;
}

const initialState: WorkflowState = {
  activeTab: 'measuring',
  showProjectWizard: false,
  showClientPortal: false,
  showMobilePanel: false,
  projectMeta: null,
  useEgyptWizard: true,
  systemTunedMessage: null,
  isLoadingInventory: true,
  isGeneratingCuttingPlan: false,
  projectError: null,
  inventoryError: null,
  measurementSessionId: 0,
  selectedExistingProjectKey: '',
  selectedExistingPoseId: '',
  pendingLayoutComponents: null,
  showLayoutNextStep: false,
};

/**
 * Custom hook for managing FabricatorWorkflow state
 * 
 * Provides centralized state management with type-safe actions.
 * Reduces the number of useState hooks and improves maintainability.
 */
export function useWorkflowState(initialTab?: string): {
  state: WorkflowState;
  actions: WorkflowActions;
} {
  const [state, setState] = useState<WorkflowState>({
    ...initialState,
    activeTab: initialTab || initialState.activeTab,
  });

  // ✅ FIXED: All hooks must be called at top level, not inside useMemo
  // Type-safe action creators - each useCallback at top level
  const setActiveTab = useCallback((tab: string) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const setShowProjectWizard = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showProjectWizard: show }));
  }, []);

  const setProjectMeta = useCallback((meta: (ProjectHeaderMeta & Record<string, any>) | null) => {
    setState((prev) => ({ ...prev, projectMeta: meta }));
  }, []);

  const setUseEgyptWizard = useCallback((use: boolean) => {
    setState((prev) => ({ ...prev, useEgyptWizard: use }));
  }, []);

  const setShowClientPortal = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showClientPortal: show }));
  }, []);

  const setShowMobilePanel = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showMobilePanel: show }));
  }, []);

  const setSystemTunedMessage = useCallback((message: string | null) => {
    setState((prev) => ({ ...prev, systemTunedMessage: message }));
  }, []);

  const setIsLoadingInventory = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoadingInventory: loading }));
  }, []);

  const setIsGeneratingCuttingPlan = useCallback((generating: boolean) => {
    setState((prev) => ({ ...prev, isGeneratingCuttingPlan: generating }));
  }, []);

  const setProjectError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, projectError: error }));
  }, []);

  const setInventoryError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, inventoryError: error }));
  }, []);

  const setMeasurementSessionId = useCallback((id: number) => {
    setState((prev) => ({ ...prev, measurementSessionId: id }));
  }, []);

  const setSelectedExistingProjectKey = useCallback((key: string) => {
    setState((prev) => ({ ...prev, selectedExistingProjectKey: key }));
  }, []);

  const setSelectedExistingPoseId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedExistingPoseId: id }));
  }, []);

  const setPendingLayoutComponents = useCallback((components: WindowComponent[] | null) => {
    setState((prev) => ({ ...prev, pendingLayoutComponents: components }));
  }, []);

  const setShowLayoutNextStep = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showLayoutNextStep: show }));
  }, []);

  const resetWorkflow = useCallback(() => {
    setState(initialState);
  }, []);

  // Create actions object from the callbacks
  const actions: WorkflowActions = useMemo(
    () => ({
      setActiveTab,
      setShowProjectWizard,
      setProjectMeta,
      setUseEgyptWizard,
      setShowClientPortal,
      setShowMobilePanel,
      setSystemTunedMessage,
      setIsLoadingInventory,
      setIsGeneratingCuttingPlan,
      setProjectError,
      setInventoryError,
      setMeasurementSessionId,
      setSelectedExistingProjectKey,
      setSelectedExistingPoseId,
      setPendingLayoutComponents,
      setShowLayoutNextStep,
      resetWorkflow,
    }),
    [
      setActiveTab,
      setShowProjectWizard,
      setProjectMeta,
      setUseEgyptWizard,
      setShowClientPortal,
      setShowMobilePanel,
      setSystemTunedMessage,
      setIsLoadingInventory,
      setIsGeneratingCuttingPlan,
      setProjectError,
      setInventoryError,
      setMeasurementSessionId,
      setSelectedExistingProjectKey,
      setSelectedExistingPoseId,
      setPendingLayoutComponents,
      setShowLayoutNextStep,
      resetWorkflow,
    ]
  );

  return { state, actions };
}

