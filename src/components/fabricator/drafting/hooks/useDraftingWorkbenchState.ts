/**
 * DraftingWorkbench State Management Hook
 *
 * Consolidates all state management for the DraftingWorkbench component.
 * Groups related state variables by concern for better organization and maintainability.
 *
 * @module useDraftingWorkbenchState
 */

import type { OptimizationResult, WindowUnit } from '@/types/fabricator';
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { OperationInfo, StatusMessage } from '../components/EnhancedStatusBar';
import type { DraftingTool, ValidationResult, Viewport } from '../types/drafting';
import type { MaterialType } from '../types/materialAware';
import { StatePersistenceManager } from '../utils/statePersistence';
import { loadPreferences, savePreferences, type DraftingPreferences } from '../utils/userPreferences';
import { DEFAULT_VIEWPORT } from '../utils/viewportUtils';

export interface DraftingWorkbenchState {
  // UI State
  ui: {
    activeTab: '2d' | '3d' | 'validation' | 'templates';
    selectedTool: DraftingTool;
    viewport: Viewport;
    importDialogOpen: boolean;
    helpPanelOpen: boolean;
    historyPanelOpen: boolean;
    recoveryDialogOpen: boolean;
    rightPanelCollapsed: boolean;
    draftListDialogOpen: boolean;
  };

  // Preferences
  preferences: {
    userPreferences: DraftingPreferences;
    snapSpacing: number;
    gridVisible: boolean;
    snapEnabled: boolean;
    selectedMaterial: MaterialType;
    selectedSystemPackId: string;
  };

  // Operations
  operations: {
    validationResult: ValidationResult | null;
    optimizationResult: OptimizationResult | null;
    isOptimizing: boolean;
    optimizationWindowUnit: WindowUnit | null;
    operationStatus: OperationInfo | undefined;
    statusMessages: StatusMessage[];
    operationProgress: number | undefined;
  };

  // Recovery & Collaboration
  recovery: {
    recoveryTimestamp: number | undefined;
    mouseCoordinates: { x: number; y: number } | undefined;
  };

  collaboration: {
    roomId: string;
    userId: string;
    collaborativeEnabled: boolean;
  };
}

export interface DraftingWorkbenchStateActions {
  // UI Actions
  setActiveTab: Dispatch<SetStateAction<'2d' | '3d' | 'validation' | 'templates'>>;
  setSelectedTool: Dispatch<SetStateAction<DraftingTool>>;
  setViewport: Dispatch<SetStateAction<Viewport>>;
  setImportDialogOpen: Dispatch<SetStateAction<boolean>>;
  setHelpPanelOpen: Dispatch<SetStateAction<boolean>>;
  setHistoryPanelOpen: Dispatch<SetStateAction<boolean>>;
  setRecoveryDialogOpen: Dispatch<SetStateAction<boolean>>;
  setRightPanelCollapsed: Dispatch<SetStateAction<boolean>>;
  setDraftListDialogOpen: Dispatch<SetStateAction<boolean>>;

  // Preferences Actions
  setUserPreferences: Dispatch<SetStateAction<DraftingPreferences>>;
  setSnapSpacing: Dispatch<SetStateAction<number>>;
  setGridVisible: Dispatch<SetStateAction<boolean>>;
  setSnapEnabled: Dispatch<SetStateAction<boolean>>;
  setSelectedMaterial: Dispatch<SetStateAction<MaterialType>>;
  setSelectedSystemPackId: Dispatch<SetStateAction<string>>;

  // Operations Actions
  setValidationResult: Dispatch<SetStateAction<ValidationResult | null>>;
  setOptimizationResult: Dispatch<SetStateAction<OptimizationResult | null>>;
  setIsOptimizing: Dispatch<SetStateAction<boolean>>;
  setOptimizationWindowUnit: Dispatch<SetStateAction<WindowUnit | null>>;
  setOperationStatus: Dispatch<SetStateAction<OperationInfo | undefined>>;
  setStatusMessages: Dispatch<SetStateAction<StatusMessage[]>>;
  setOperationProgress: Dispatch<SetStateAction<number | undefined>>;

  // Recovery Actions
  setRecoveryTimestamp: Dispatch<SetStateAction<number | undefined>>;
  setMouseCoordinates: Dispatch<SetStateAction<{ x: number; y: number } | undefined>>;

  // Utility Actions
  handleGridToggle: () => void;
  handleSnapToggle: () => void;
  
  // Persistence Manager
  persistenceManager: StatePersistenceManager;
}

export interface UseDraftingWorkbenchStateReturn {
  state: DraftingWorkbenchState;
  actions: DraftingWorkbenchStateActions;
}

/**
 * Custom hook for managing DraftingWorkbench state
 *
 * Consolidates all state management logic into a single, organized hook.
 * Groups related state variables and provides clean action interfaces.
 */
export function useDraftingWorkbenchState(): UseDraftingWorkbenchStateReturn {
  // Safety check for React hooks availability
  if (typeof useState !== 'function') {
    throw new Error('React hooks are not available. This may indicate the component is being rendered outside of a React context.');
  }

  // UI State
  const [activeTab, setActiveTab] = useState<'2d' | '3d' | 'validation' | 'templates'>('templates');
  const [selectedTool, setSelectedTool] = useState<DraftingTool>('select');
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [draftListDialogOpen, setDraftListDialogOpen] = useState(false);

  // Preferences State
  const [userPreferences, setUserPreferences] = useState<DraftingPreferences>(() => loadPreferences());
  const [snapSpacing, setSnapSpacing] = useState<number>(userPreferences.snapSpacing);
  const [gridVisible, setGridVisible] = useState<boolean>(userPreferences.gridVisible);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(userPreferences.snapEnabled);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType>('aluminum');
  const [selectedSystemPackId, setSelectedSystemPackId] = useState<string>('caluminium_ps_v3');

  // Operations State
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationWindowUnit, setOptimizationWindowUnit] = useState<WindowUnit | null>(null);
  const [operationStatus, setOperationStatus] = useState<OperationInfo | undefined>(undefined);
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [operationProgress, setOperationProgress] = useState<number | undefined>(undefined);

  // Recovery State
  const [recoveryTimestamp, setRecoveryTimestamp] = useState<number | undefined>(undefined);
  const [mouseCoordinates, setMouseCoordinates] = useState<{ x: number; y: number } | undefined>(undefined);

  // Collaboration State
  const [roomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || `room-${Date.now()}`;
  });
  const [userId] = useState<string>(() => `user-${Date.now()}`);
  const [collaborativeEnabled] = useState(false);

  // Enhanced state persistence
  const persistenceManager = useMemo(() => {
    return new StatePersistenceManager({
      autoSaveInterval: 30000, // 30 seconds
      maxVersions: 50,
      enableVersioning: true,
      enableRecovery: true,
    });
  }, []);

  // Check for recovery point on mount
  useEffect(() => {
    if (persistenceManager.hasRecoveryPoint()) {
      const recovery = persistenceManager.getRecoveryPoint();
      if (recovery && typeof recovery === 'object' && 'timestamp' in recovery) {
        setRecoveryTimestamp(recovery.timestamp as number);
        setRecoveryDialogOpen(true);
      }
    }
  }, [persistenceManager]);

  // Cleanup persistence manager on unmount
  useEffect(() => {
    return () => {
      persistenceManager.destroy();
    };
  }, [persistenceManager]);

  // Save preferences when they change
  useEffect(() => {
    const newPrefs: DraftingPreferences = {
      snapSpacing,
      gridVisible,
      snapEnabled,
      lastMaterialType: selectedMaterial,
      lastSystemPackId: selectedSystemPackId,
    };
    savePreferences(newPrefs);
    setUserPreferences(newPrefs);
  }, [snapSpacing, gridVisible, snapEnabled, selectedMaterial, selectedSystemPackId]);

  // Utility handlers
  const handleGridToggle = useCallback(() => {
    setGridVisible(prev => !prev);
  }, []);

  const handleSnapToggle = useCallback(() => {
    setSnapEnabled(prev => !prev);
  }, []);

  // Organized state object
  const state: DraftingWorkbenchState = useMemo(() => ({
    ui: {
      activeTab,
      selectedTool,
      viewport,
      importDialogOpen,
      helpPanelOpen,
      historyPanelOpen,
      recoveryDialogOpen,
      rightPanelCollapsed,
      draftListDialogOpen,
    },
    preferences: {
      userPreferences,
      snapSpacing,
      gridVisible,
      snapEnabled,
      selectedMaterial,
      selectedSystemPackId,
    },
    operations: {
      validationResult,
      optimizationResult,
      isOptimizing,
      optimizationWindowUnit,
      operationStatus,
      statusMessages,
      operationProgress,
    },
    recovery: {
      recoveryTimestamp,
      mouseCoordinates,
    },
    collaboration: {
      roomId,
      userId,
      collaborativeEnabled,
    },
  }), [
    activeTab,
    selectedTool,
    viewport,
    importDialogOpen,
    helpPanelOpen,
    historyPanelOpen,
    recoveryDialogOpen,
    rightPanelCollapsed,
    draftListDialogOpen,
    userPreferences,
    snapSpacing,
    gridVisible,
    snapEnabled,
    selectedMaterial,
    selectedSystemPackId,
    validationResult,
    optimizationResult,
    isOptimizing,
    optimizationWindowUnit,
    operationStatus,
    statusMessages,
    operationProgress,
    recoveryTimestamp,
    mouseCoordinates,
    roomId,
    userId,
    collaborativeEnabled,
  ]);

  // Actions object
  const actions: DraftingWorkbenchStateActions = useMemo(() => ({
    // UI Actions
    setActiveTab,
    setSelectedTool,
    setViewport,
    setImportDialogOpen,
    setHelpPanelOpen,
    setHistoryPanelOpen,
    setRecoveryDialogOpen,
    setRightPanelCollapsed,
    setDraftListDialogOpen,

    // Preferences Actions
    setUserPreferences,
    setSnapSpacing,
    setGridVisible,
    setSnapEnabled,
    setSelectedMaterial,
    setSelectedSystemPackId,

    // Operations Actions
    setValidationResult,
    setOptimizationResult,
    setIsOptimizing,
    setOptimizationWindowUnit,
    setOperationStatus,
    setStatusMessages,
    setOperationProgress,

    // Recovery Actions
    setRecoveryTimestamp,
    setMouseCoordinates,

    // Utility Actions
    handleGridToggle,
    handleSnapToggle,
    
    // Persistence Manager
    persistenceManager,
  }), [
    setActiveTab,
    setSelectedTool,
    setViewport,
    setImportDialogOpen,
    setHelpPanelOpen,
    setHistoryPanelOpen,
    setRecoveryDialogOpen,
    setRightPanelCollapsed,
    setDraftListDialogOpen,
    setUserPreferences,
    setSnapSpacing,
    setGridVisible,
    setSnapEnabled,
    setSelectedMaterial,
    setSelectedSystemPackId,
    setValidationResult,
    setOptimizationResult,
    setIsOptimizing,
    setOptimizationWindowUnit,
    setOperationStatus,
    setStatusMessages,
    setOperationProgress,
    setRecoveryTimestamp,
    setMouseCoordinates,
    handleGridToggle,
    handleSnapToggle,
    persistenceManager,
  ]);

  return { state, actions };
}