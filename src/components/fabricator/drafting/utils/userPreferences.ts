// src/components/fabricator/drafting/utils/userPreferences.ts

/**
 * User Preferences Management
 * 
 * Manages user preferences for drafting workspace settings like snap spacing, grid visibility, etc.
 * Preferences are persisted in localStorage for user convenience.
 */

import type { MaterialType } from '../types/materialAware';
import { DEFAULT_SNAP_SPACING, type SnapSpacingOption } from './snapUtils';

const STORAGE_KEY_PREFIX = 'drafting_prefs_';

export interface DraftingPreferences {
  /** Snap spacing in mm (configurable: 1, 2, 5, 10, or custom) */
  snapSpacing: number;
  /** Grid visibility */
  gridVisible: boolean;
  /** Snap enabled */
  snapEnabled: boolean;
  /** Last used material type */
  lastMaterialType?: MaterialType;
  /** Last used system pack ID */
  lastSystemPackId?: string;
}

const DEFAULT_PREFERENCES: DraftingPreferences = {
  snapSpacing: DEFAULT_SNAP_SPACING,
  gridVisible: true,
  snapEnabled: true,
};

/**
 * Load user preferences from localStorage
 */
export function loadPreferences(): DraftingPreferences {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}main`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate and merge with defaults
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        snapSpacing: typeof parsed.snapSpacing === 'number' && parsed.snapSpacing >= 0.01
          ? parsed.snapSpacing
          : DEFAULT_PREFERENCES.snapSpacing,
        gridVisible: typeof parsed.gridVisible === 'boolean' ? parsed.gridVisible : DEFAULT_PREFERENCES.gridVisible,
        snapEnabled: typeof parsed.snapEnabled === 'boolean' ? parsed.snapEnabled : DEFAULT_PREFERENCES.snapEnabled,
      };
    }
  } catch (error) {
    console.warn('[UserPreferences] Failed to load preferences:', error);
  }
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Save user preferences to localStorage
 */
export function savePreferences(prefs: Partial<DraftingPreferences>): void {
  try {
    const current = loadPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}main`, JSON.stringify(updated));
  } catch (error) {
    console.warn('[UserPreferences] Failed to save preferences:', error);
  }
}

/**
 * Get snap spacing preference
 */
export function getSnapSpacing(): number {
  return loadPreferences().snapSpacing;
}

/**
 * Set snap spacing preference
 */
export function setSnapSpacing(spacing: SnapSpacingOption): void {
  // Validate spacing (must be >= 0.01mm)
  const validSpacing = Math.max(0.01, typeof spacing === 'number' ? spacing : DEFAULT_SNAP_SPACING);
  savePreferences({ snapSpacing: validSpacing });
}
