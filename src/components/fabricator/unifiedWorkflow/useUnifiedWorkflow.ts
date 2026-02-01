/**
 * Unified Workflow Hook
 * 
 * Provides unified workflow state management and stage navigation.
 * Handles mapping between legacy tabs and unified stages.
 * 
 * Constitutional: Deterministic state management, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    UNIFIED_STAGES,
    getUnifiedStage,
    isUnifiedWorkflowEnabled,
    mapLegacyTabToUnifiedStage,
    type UnifiedStageId
} from './unifiedStages';

export interface UnifiedWorkflowState {
  /** Current unified stage ID */
  currentStageId: UnifiedStageId;
  /** Current stage index (0-based) */
  currentStageIndex: number;
  /** Whether unified mode is enabled */
  unifiedMode: boolean;
  /** Legacy tab ID (for backward compatibility) */
  legacyTab?: string;
}

export interface UnifiedWorkflowActions {
  /** Navigate to a unified stage */
  setStage: (stageId: UnifiedStageId) => void;
  /** Navigate to next stage */
  nextStage: () => void;
  /** Navigate to previous stage */
  previousStage: () => void;
  /** Navigate to legacy tab (maps to unified stage) */
  setLegacyTab: (tabId: string) => void;
  /** Get stage by ID */
  getStage: (stageId: UnifiedStageId) => typeof UNIFIED_STAGES[0] | undefined;
}

/**
 * Hook for unified workflow state management
 */
export function useUnifiedWorkflow(
  initialTab?: string,
  forceUnified?: boolean
): UnifiedWorkflowState & UnifiedWorkflowActions {
  const location = useLocation();
  const navigate = useNavigate();
  const unifiedMode = forceUnified ?? isUnifiedWorkflowEnabled();
  
  // Determine initial stage from URL hash or initialTab
  const getInitialStage = useCallback((): UnifiedStageId => {
    // Check URL hash first
    const hash = location.hash.replace('#', '');
    if (hash) {
      const stageId = mapLegacyTabToUnifiedStage(hash);
      if (stageId) return stageId;
    }
    
    // Check initialTab prop
    if (initialTab) {
      const stageId = mapLegacyTabToUnifiedStage(initialTab);
      if (stageId) return stageId;
    }
    
    // Default to first stage
    return 'measure-design';
  }, [location.hash, initialTab]);

  const [currentStageId, setCurrentStageId] = useState<UnifiedStageId>(getInitialStage);
  const [legacyTab, setLegacyTab] = useState<string | undefined>(initialTab);

  // Update stage when URL hash changes
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && unifiedMode) {
      const stageId = mapLegacyTabToUnifiedStage(hash);
      if (stageId && stageId !== currentStageId) {
        setCurrentStageId(stageId);
        setLegacyTab(hash);
      }
    }
  }, [location.hash, unifiedMode, currentStageId, setLegacyTab]);

  const currentStageIndex = useMemo(() => {
    return UNIFIED_STAGES.findIndex(s => s.id === currentStageId);
  }, [currentStageId]);

  const setStage = useCallback((stageId: UnifiedStageId) => {
    setCurrentStageId(stageId);
    // Update URL hash to first legacy tab of the stage for backward compatibility
    const stage = getUnifiedStage(stageId);
    if (stage && stage.legacyTabs.length > 0) {
      navigate(`#${stage.legacyTabs[0]}`, { replace: true });
    }
  }, [navigate]);

  const nextStage = useCallback(() => {
    if (currentStageIndex < UNIFIED_STAGES.length - 1) {
      const nextStage = UNIFIED_STAGES[currentStageIndex + 1];
      setStage(nextStage.id);
    }
  }, [currentStageIndex, setStage]);

  const previousStage = useCallback(() => {
    if (currentStageIndex > 0) {
      const prevStage = UNIFIED_STAGES[currentStageIndex - 1];
      setStage(prevStage.id);
    }
  }, [currentStageIndex, setStage]);

  const setLegacyTab = useCallback((tabId: string) => {
    setLegacyTab(tabId);
    if (unifiedMode) {
      const stageId = mapLegacyTabToUnifiedStage(tabId);
      if (stageId) {
        setCurrentStageId(stageId);
      }
    }
  }, [unifiedMode, setLegacyTab, setCurrentStageId]);

  const getStage = useCallback((stageId: UnifiedStageId) => {
    return getUnifiedStage(stageId);
  }, []);

  return {
    currentStageId,
    currentStageIndex,
    unifiedMode,
    legacyTab,
    setStage,
    nextStage,
    previousStage,
    setLegacyTab,
    getStage,
  };
}

