/**
 * Unified Workflow Stage Definitions
 * 
 * Defines the 4 unified stages that replace the 7-tab workflow:
 * 1. Measure & Design (combines Measuring + Design)
 * 2. Review & Optimize (combines 3D Preview + Optimization)
 * 3. Production (combines Inventory + Production)
 * 4. Quality & Delivery (combines Quality + Delivery)
 * 
 * Constitutional: Deterministic stage definitions, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { Ruler, Settings, Factory, Zap } from 'lucide-react';
import React from 'react';

export type UnifiedStageId = 'measure-design' | 'review-optimize' | 'production' | 'quality-delivery';

export interface UnifiedStage {
  id: UnifiedStageId;
  name: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  order: number;
  // Legacy tab mappings for backward compatibility
  legacyTabs: string[];
  // Empire heritage for visual design
  empire?: 'ottoman' | 'egyptian' | 'modern';
}

/**
 * Unified 4-Stage Workflow Definition
 */
export const UNIFIED_STAGES: UnifiedStage[] = [
  {
    id: 'measure-design',
    name: 'Measure & Design',
    description: 'Capture measurements and create technical design',
    icon: Ruler,
    order: 1,
    legacyTabs: ['measuring', 'design'],
    empire: 'egyptian'
  },
  {
    id: 'review-optimize',
    name: 'Review & Optimize',
    description: 'Review design and optimize cutting',
    icon: Settings,
    order: 2,
    legacyTabs: ['preview3d', 'optimization'],
    empire: 'modern'
  },
  {
    id: 'production',
    name: 'Production',
    description: 'Check inventory and schedule production',
    icon: Factory,
    order: 3,
    legacyTabs: ['inventory', 'production'],
    empire: 'ottoman'
  },
  {
    id: 'quality-delivery',
    name: 'Quality & Delivery',
    description: 'Quality control and delivery',
    icon: Zap,
    order: 4,
    legacyTabs: ['quality'],
    empire: 'modern'
  }
];

/**
 * Map legacy tab ID to unified stage ID
 */
export function mapLegacyTabToUnifiedStage(legacyTab: string): UnifiedStageId | null {
  for (const stage of UNIFIED_STAGES) {
    if (stage.legacyTabs.includes(legacyTab)) {
      return stage.id;
    }
  }
  return null;
}

/**
 * Get unified stage by ID
 */
export function getUnifiedStage(stageId: UnifiedStageId): UnifiedStage | undefined {
  return UNIFIED_STAGES.find(s => s.id === stageId);
}

/**
 * Get unified stage by legacy tab
 */
export function getUnifiedStageByLegacyTab(legacyTab: string): UnifiedStage | undefined {
  const stageId = mapLegacyTabToUnifiedStage(legacyTab);
  return stageId ? getUnifiedStage(stageId) : undefined;
}

/**
 * Check if unified workflow mode is enabled
 * Can be controlled via feature flag or user preference
 */
export function isUnifiedWorkflowEnabled(): boolean {
  // Check localStorage for user preference
  if (typeof window !== 'undefined') {
    const preference = localStorage.getItem('almona:unified-workflow');
    if (preference !== null) {
      return preference === 'true';
    }
  }
  // Default: enabled (can be changed to false for gradual rollout)
  return true;
}

