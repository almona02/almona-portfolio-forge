// src/components/fabricator/drafting/prestige/presetApplication.ts
/**
 * Preset Application Logic
 * 
 * Constitutional: Rule-based, deterministic
 * Purpose: Convert preset selection to WindowGrid and system/material recommendations
 */

import type { WindowGrid, GridCell } from '@/types/fabricator';
import type { ArchitecturalPreset } from './ArchitecturalPresetSelector';
import { logDraftingAction } from '../utils/constitutionalAudit';

export interface PresetApplicationResult {
  windowGrid: WindowGrid;
  recommendedSystem: string;
  recommendedMaterial: string;
  appliedIntelligence: {
    gridPattern: string;
    optimization: string;
    complexity: string;
  };
}

/**
 * Apply preset intelligence to create WindowGrid
 * Constitutional: Deterministic conversion, no ML
 */
export function applyPresetIntelligence(
  preset: ArchitecturalPreset,
  overallWidth?: number,
  overallHeight?: number
): PresetApplicationResult {
  const checkpoint = `CHECKPOINT-PRESET-APPLY-${Date.now()}`;
  
  // Parse grid pattern (deterministic)
  const gridPattern = parseGridPattern(preset.intelligence.gridPattern);
  
  // Create WindowGrid
  const windowGrid = createWindowGridFromPattern(
    gridPattern,
    overallWidth,
    overallHeight
  );
  
  // Constitutional audit logging
  logDraftingAction(
    'preset_intelligence_applied',
    {
      presetId: preset.id,
      presetTitle: preset.title,
      gridPattern: preset.intelligence.gridPattern,
      recommendedSystem: preset.intelligence.systemRecommendation,
      recommendedMaterial: preset.intelligence.materialRecommendation,
      overallWidth,
      overallHeight
    },
    {
      windowGrid: {
        rows: windowGrid.rows,
        cols: windowGrid.cols,
        cellCount: windowGrid.cells.length
      },
      recommendedSystem: preset.intelligence.systemRecommendation,
      recommendedMaterial: preset.intelligence.materialRecommendation
    },
    checkpoint
  );
  
  return {
    windowGrid,
    recommendedSystem: preset.intelligence.systemRecommendation,
    recommendedMaterial: preset.intelligence.materialRecommendation,
    appliedIntelligence: {
      gridPattern: preset.intelligence.gridPattern,
      optimization: preset.intelligence.optimization || '',
      complexity: preset.complexity
    }
  };
}

/**
 * Parse grid pattern string to dimensions
 * Examples: "2x2", "3x1", "2x2 asymmetrical"
 */
function parseGridPattern(pattern: string): { rows: number; cols: number; isAsymmetrical?: boolean } {
  // Extract numbers (deterministic parsing)
  const match = pattern.match(/(\d+)x(\d+)/i);
  if (!match) {
    // Default to 1x1 if pattern can't be parsed
    return { rows: 1, cols: 1 };
  }
  
  const rows = parseInt(match[1], 10);
  const cols = parseInt(match[2], 10);
  const isAsymmetrical = pattern.toLowerCase().includes('asymmetrical') || 
                         pattern.toLowerCase().includes('asymmetric');
  
  return { rows, cols, isAsymmetrical };
}

/**
 * Create WindowGrid from pattern
 */
function createWindowGridFromPattern(
  pattern: { rows: number; cols: number; isAsymmetrical?: boolean },
  overallWidth?: number,
  overallHeight?: number
): WindowGrid {
  const cells: GridCell[] = [];
  
  // Create cells based on pattern
  for (let row = 0; row < pattern.rows; row++) {
    for (let col = 0; col < pattern.cols; col++) {
      // Determine cell type based on pattern
      let cellType: 'fixed' | 'sash' | 'panel' | 'empty' | 'sliding' = 'fixed';
      
      // For asymmetrical patterns, alternate types
      if (pattern.isAsymmetrical) {
        if (row === 0 && col === 0) {
          cellType = 'sash'; // Top-left is operable
        } else if (row === pattern.rows - 1 && col === pattern.cols - 1) {
          cellType = 'sash'; // Bottom-right is operable
        }
      } else {
        // For symmetrical, make some cells operable
        if (row < pattern.rows / 2) {
          cellType = 'sash';
        }
      }
      
      cells.push({
        id: `${row}-${col}`,
        row,
        col,
        type: cellType
      });
    }
  }
  
  // Calculate column widths and row heights if dimensions provided
  let colWidths: number[] | undefined;
  let rowHeights: number[] | undefined;
  
  if (overallWidth && overallHeight) {
    colWidths = Array(pattern.cols).fill(overallWidth / pattern.cols);
    rowHeights = Array(pattern.rows).fill(overallHeight / pattern.rows);
  }
  
  return {
    rows: pattern.rows,
    cols: pattern.cols,
    cells,
    colWidths,
    rowHeights
  };
}

/**
 * Get preset by ID
 */
export function getPresetById(
  presetId: string,
  presets: ArchitecturalPreset[]
): ArchitecturalPreset | undefined {
  return presets.find(p => p.id === presetId);
}


