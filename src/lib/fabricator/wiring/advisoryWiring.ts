/**
 * Advisory Wiring Map
 * AICS-001 §5.10.3: Intelligence Gate Enforcement
 * 
 * All advisory components must be wired through explicit gates.
 * This is the single source of truth for advisory component imports.
 */

import React from 'react';
import { AdvisoryGate } from './gates/AdvisoryGate';

/**
 * AICS-001 §5.10.2 Tier Classifications:
 * - Tier 2: Collaborative Intelligence (YDT + advisory)
 * - Tier 2 Limited: Suggestions only, no workflow integration
 * - Presentation: Pure read-only, no AI, no state mutation
 */
export const ADVISORY_WIRING = {
  // ================= TIER 2: COLLABORATIVE INTELLIGENCE =================
  
  /** AI Suggestions Panel - Alternative design approaches */
  AISuggestionPanel: AdvisoryGate.tier2({
    component: () => import('@/future/advisory-panels/AISuggestionPanel').then(m => ({ default: m.AISuggestionPanel || m.default })),
    purpose: 'Suggest alternative design approaches based on historical patterns',
    minConfidence: 0.7,
    requiresHumanReview: true
  }),

  /** Design Mode Comparison - Compare drafting vs grid approaches */
  DesignModeComparison: AdvisoryGate.tier2({
    component: () => import('@/future/advisory-panels/DesignModeComparison').then(m => ({ default: m.DesignModeComparison || m.default })),
    purpose: 'Compare efficiency of different design methodologies',
    minConfidence: 0.6,
    requiresHumanReview: false
  }),

  /** Optimization Job Monitor - Track optimization progress */
  OptimizationJobMonitor: AdvisoryGate.tier2Limited({
    component: () => import('@/future/advisory-panels/OptimizationJobMonitor').then(m => ({ default: m.OptimizationJobMonitor || m.default })),
    purpose: 'Monitor and suggest improvements to optimization processes',
    minConfidence: 0.65,
  }),

  /** Job Risk Indicator - Risk assessment */
  JobRiskIndicator: AdvisoryGate.tier2({
    component: () => import('@/future/advisory-panels/JobRiskIndicator').then(m => ({ default: m.JobRiskIndicator || m.default })),
    purpose: 'Assess manufacturing risk based on design complexity',
    minConfidence: 0.68,
    requiresHumanReview: true
  }),

  /** Constitutional Health Dashboard - Governance health */
  ConstitutionalHealthDashboard: AdvisoryGate.tier2({
    component: () => import('@/future/advisory-panels/ConstitutionalHealthDashboard').then(m => ({ default: m.ConstitutionalHealthDashboard || m.default })),
    purpose: 'Monitor constitutional compliance and governance health',
    minConfidence: 0.9,
    requiresHumanReview: false
  }),

  // ================= TIER 2 LIMITED: SUGGESTIONS ONLY =================
  
  /** Design Mode Selector - Mode switching suggestions */
  DesignModeSelector: AdvisoryGate.tier2Limited({
    component: () => import('@/future/advisory-panels/DesignModeSelector').then(m => ({ default: m.DesignModeSelector || m.default })),
    purpose: 'Suggest optimal design mode based on project type',
    minConfidence: 0.6,
  }),

  // ================= PRESENTATION LAYER =================
  
  /** Zoom Control - Presentation only */
  ZoomControl: AdvisoryGate.presentation(
    () => import('@/future/ui-experiments/ZoomPresets').then(m => ({ default: m.ZoomPresets || m.default }))
  ),

  /** Context Menu - Presentation only */
  ContextMenu: AdvisoryGate.presentation(
    () => import('@/future/ui-experiments/ContextMenu').then(m => ({ default: m.ContextMenu || m.default }))
  ),

  /** Theme Toggle - Presentation only */
  ThemeToggle: AdvisoryGate.presentation(
    () => import('@/future/ui-experiments/ThemeToggle').then(m => ({ default: m.ThemeToggle || m.default }))
  ),

  /** Cost Calculator - Presentation only */
  CostCalculator: AdvisoryGate.presentation(
    () => import('@/future/ui-experiments/CostCalculator').then(m => ({ default: m.CostCalculator || m.default }))
  ),
} as const;

/**
 * Type-safe keys for advisory components
 */
export type AdvisoryComponentKey = keyof typeof ADVISORY_WIRING;

/**
 * Get a wired advisory component by key
 */
export function getAdvisoryComponent(key: AdvisoryComponentKey): React.FC<Record<string, unknown>> {
  const component = ADVISORY_WIRING[key];
  if (!component) {
    throw new Error(`Unknown advisory component: ${key}`);
  }
  return component;
}

/**
 * Get all Tier 2 advisory component keys
 */
export function getTier2Components(): AdvisoryComponentKey[] {
  return [
    'AISuggestionPanel',
    'DesignModeComparison', 
    'OptimizationJobMonitor',
    'JobRiskIndicator',
    'ConstitutionalHealthDashboard',
    'DesignModeSelector'
  ];
}

/**
 * Get all presentation component keys
 */
export function getPresentationComponents(): AdvisoryComponentKey[] {
  return ['ZoomControl', 'ContextMenu', 'ThemeToggle', 'CostCalculator'];
}

/**
 * Check if a component is wired through advisory gates
 */
export function isWiredAdvisory(key: string): key is AdvisoryComponentKey {
  return key in ADVISORY_WIRING;
}
