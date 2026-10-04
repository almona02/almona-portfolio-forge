// src/components/fabricator/drafting/prestige/presetApplication.ts
/**
 * Preset Application Logic
 *
 * Constitutional: Rule-based, deterministic
 * Purpose: Convert preset selection to WindowGrid and system/material recommendations
 *
 * FP-028 / T2: Invalid or ambiguous grid patterns fail closed.
 * Never invent a 1×1 grid when the template pattern cannot be resolved uniquely.
 */

import type { WindowGrid } from '@/types/fabricator';
import type { ArchitecturalPreset } from './ArchitecturalPresetSelector';
import { logDraftingAction } from '../utils/constitutionalAudit';

export type PresetGridPatternErrorCode =
  | 'UNPARSEABLE_GRID_PATTERN'
  | 'AMBIGUOUS_GRID_PATTERN'
  | 'NON_POSITIVE_GRID_DIMENSIONS'
  | 'TEMPLATE_SCHEMA_MISSING'
  | 'TEMPLATE_BLOCKED'
  | 'INVALID_EXPLICIT_GRID';

export interface PresetGridPatternError {
  code: PresetGridPatternErrorCode;
  message: string;
  pattern: string;
}

export interface ParsedGridPattern {
  rows: number;
  cols: number;
  isAsymmetrical?: boolean;
}

export type ParseGridPatternResult =
  | { ok: true; pattern: ParsedGridPattern }
  | { ok: false; error: PresetGridPatternError };

export type PresetApplicationResult =
  | {
      ok: true;
      windowGrid: WindowGrid;
      recommendedSystem: string;
      recommendedMaterial: string;
      appliedIntelligence: {
        gridPattern: string;
        optimization: string;
        complexity: string;
      };
    }
  | {
      ok: false;
      error: PresetGridPatternError;
      recommendedSystem: string;
      recommendedMaterial: string;
    };

const GRID_PATTERN_TOKEN = /(\d+)\s*[xX×]\s*(\d+)/g;

/**
 * Parse a free-text grid pattern into exact row/column counts.
 * Fail closed on missing, ambiguous, or non-positive dimensions (FP-028 / T2).
 */
export function parseGridPattern(pattern: string): ParseGridPatternResult {
  const raw = (pattern ?? '').trim();
  if (!raw) {
    return {
      ok: false,
      error: {
        code: 'UNPARSEABLE_GRID_PATTERN',
        message: 'Grid pattern is empty; manufacturing grid was not replaced.',
        pattern: raw,
      },
    };
  }

  const matches = [...raw.matchAll(GRID_PATTERN_TOKEN)];
  if (matches.length === 0) {
    return {
      ok: false,
      error: {
        code: 'UNPARSEABLE_GRID_PATTERN',
        message: `Grid pattern "${raw}" cannot be parsed; manufacturing grid was not replaced.`,
        pattern: raw,
      },
    };
  }

  if (matches.length > 1) {
    return {
      ok: false,
      error: {
        code: 'AMBIGUOUS_GRID_PATTERN',
        message: `Grid pattern "${raw}" is ambiguous (${matches.length} size tokens); manufacturing grid was not replaced.`,
        pattern: raw,
      },
    };
  }

  const rows = parseInt(matches[0][1], 10);
  const cols = parseInt(matches[0][2], 10);

  if (!Number.isFinite(rows) || !Number.isFinite(cols) || rows < 1 || cols < 1) {
    return {
      ok: false,
      error: {
        code: 'NON_POSITIVE_GRID_DIMENSIONS',
        message: `Grid pattern "${raw}" yields non-positive dimensions (${rows}×${cols}); manufacturing grid was not replaced.`,
        pattern: raw,
      },
    };
  }

  const isAsymmetrical =
    raw.toLowerCase().includes('asymmetrical') ||
    raw.toLowerCase().includes('asymmetric');

  return {
    ok: true,
    pattern: { rows, cols, isAsymmetrical },
  };
}

export class InvalidPresetGridPatternError extends Error {
  readonly code = 'INVALID_PRESET_GRID_PATTERN';

  constructor(readonly pattern: string) {
    super(`Template grid pattern is not executable: "${pattern}". Select a template with explicit rows and columns.`);
    this.name = 'InvalidPresetGridPatternError';
  }
}

/**
 * Apply preset intelligence to create WindowGrid.
 * Constitutional: Deterministic conversion, no ML.
 * FP-028 / T2: Returns a typed error instead of inventing 1×1 geometry.
 */
export function applyPresetIntelligence(
  preset: ArchitecturalPreset,
  overallWidth?: number,
  overallHeight?: number
): PresetApplicationResult {
  const checkpoint = `CHECKPOINT-PRESET-APPLY-${Date.now()}`;
  const schema = preset.templateSchema;
  if (!schema) {
    return rejectPreset(
      preset,
      'TEMPLATE_SCHEMA_MISSING',
      'Template has no versioned explicit schema; manufacturing grid was not replaced.',
      overallWidth,
      overallHeight,
      checkpoint
    );
  }
  if (schema.status === 'blocked') {
    return rejectPreset(
      preset,
      'TEMPLATE_BLOCKED',
      schema.blockedReason ?? 'Template is blocked pending authoritative geometry.',
      overallWidth,
      overallHeight,
      checkpoint
    );
  }
  if (!schema.grid) {
    return rejectPreset(
      preset,
      'INVALID_EXPLICIT_GRID',
      'Selectable template has no explicit grid.',
      overallWidth,
      overallHeight,
      checkpoint
    );
  }

  const explicitGrid = createWindowGridFromExplicitSchema(
    schema.grid,
    overallWidth,
    overallHeight
  );
  if (!explicitGrid.ok) {
    return rejectPreset(
      preset,
      explicitGrid.error.code,
      explicitGrid.error.message,
      overallWidth,
      overallHeight,
      checkpoint
    );
  }
  const windowGrid = explicitGrid.windowGrid;
  const recommendedSystem = schema.compatibleSystemPackIds[0] ?? '';

  logDraftingAction(
    'preset_intelligence_applied',
    {
      presetId: preset.id,
      presetTitle: preset.title,
      gridPattern: preset.intelligence.gridPattern,
      recommendedSystem,
      recommendedMaterial: preset.intelligence.materialRecommendation,
      overallWidth,
      overallHeight,
    },
    {
      windowGrid: {
        rows: windowGrid.rows,
        cols: windowGrid.cols,
        cellCount: windowGrid.cells.length,
      },
      recommendedSystem,
      recommendedMaterial: preset.intelligence.materialRecommendation,
    },
    checkpoint
  );

  return {
    ok: true,
    windowGrid,
    recommendedSystem,
    recommendedMaterial: preset.intelligence.materialRecommendation,
    appliedIntelligence: {
      gridPattern: preset.intelligence.gridPattern,
      optimization: preset.intelligence.optimization || '',
      complexity: preset.complexity,
    },
  };
}

function rejectPreset(
  preset: ArchitecturalPreset,
  code: PresetGridPatternErrorCode,
  message: string,
  overallWidth: number | undefined,
  overallHeight: number | undefined,
  checkpoint: string
): PresetApplicationResult {
  const error: PresetGridPatternError = {
    code,
    message,
    pattern: preset.intelligence.gridPattern,
  };
  logDraftingAction(
    'preset_intelligence_rejected',
    { presetId: preset.id, errorCode: code, overallWidth, overallHeight },
    { rejected: true, error },
    checkpoint
  );
  return {
    ok: false,
    error,
    recommendedSystem: preset.templateSchema?.compatibleSystemPackIds[0] ?? '',
    recommendedMaterial: preset.intelligence.materialRecommendation,
  };
}

type ExplicitGridResult =
  | { ok: true; windowGrid: WindowGrid }
  | { ok: false; error: PresetGridPatternError };

function createWindowGridFromExplicitSchema(
  grid: WindowGrid,
  overallWidth?: number,
  overallHeight?: number
): ExplicitGridResult {
  const invalid = (message: string): ExplicitGridResult => ({
    ok: false,
    error: { code: 'INVALID_EXPLICIT_GRID', message, pattern: `${grid.rows}x${grid.cols}` },
  });
  if (!Number.isSafeInteger(grid.rows) || grid.rows < 1 || !Number.isSafeInteger(grid.cols) || grid.cols < 1) {
    return invalid('Explicit grid rows and columns must be positive integers.');
  }
  if (grid.cells.length === 0 || !grid.colWidths || !grid.rowHeights) {
    return invalid('Explicit grid requires cells, column weights, and row weights.');
  }
  if (grid.colWidths.length !== grid.cols || grid.rowHeights.length !== grid.rows) {
    return invalid('Explicit grid weight counts must match its columns and rows.');
  }
  if ([...grid.colWidths, ...grid.rowHeights].some((value) => !Number.isFinite(value) || value <= 0)) {
    return invalid('Explicit grid weights must be finite values greater than zero.');
  }

  const occupied = new Set<string>();
  const ids = new Set<string>();
  for (const cell of grid.cells) {
    const rowSpan = cell.rowSpan ?? 1;
    const colSpan = cell.colSpan ?? 1;
    if (!cell.id.trim() || ids.has(cell.id) || !Number.isSafeInteger(rowSpan) || !Number.isSafeInteger(colSpan)) {
      return invalid('Explicit grid cell IDs must be unique and spans must be integers.');
    }
    if (cell.row < 0 || cell.col < 0 || rowSpan < 1 || colSpan < 1 || cell.row + rowSpan > grid.rows || cell.col + colSpan > grid.cols) {
      return invalid(`Explicit grid cell ${cell.id} exceeds the grid bounds.`);
    }
    ids.add(cell.id);
    for (let row = cell.row; row < cell.row + rowSpan; row += 1) {
      for (let col = cell.col; col < cell.col + colSpan; col += 1) {
        const slot = `${row}:${col}`;
        if (occupied.has(slot)) return invalid(`Explicit grid cells overlap at ${slot}.`);
        occupied.add(slot);
      }
    }
  }
  if (occupied.size !== grid.rows * grid.cols) {
    return invalid('Explicit grid cells must cover every logical grid slot.');
  }

  const scale = (weights: readonly number[], total: number | undefined): number[] => {
    if (total === undefined) return [...weights];
    if (!Number.isFinite(total) || total <= 0) return [];
    const weightTotal = weights.reduce((sum, value) => sum + value, 0);
    const values = weights.map((value) => (value / weightTotal) * total);
    values[values.length - 1] = total - values.slice(0, -1).reduce((sum, value) => sum + value, 0);
    return values;
  };
  const colWidths = scale(grid.colWidths, overallWidth);
  const rowHeights = scale(grid.rowHeights, overallHeight);
  if (colWidths.length === 0 || rowHeights.length === 0) {
    return invalid('Overall dimensions must be finite values greater than zero when supplied.');
  }
  return {
    ok: true,
    windowGrid: {
      rows: grid.rows,
      cols: grid.cols,
      cells: grid.cells.map((cell) => ({ ...cell })),
      colWidths,
      rowHeights,
      manualMullions: grid.manualMullions?.map((mullion) => ({ ...mullion })),
    },
  };
}

/**
 * Get preset by ID
 */
export function getPresetById(
  presetId: string,
  presets: ArchitecturalPreset[]
): ArchitecturalPreset | undefined {
  return presets.find((p) => p.id === presetId);
}
