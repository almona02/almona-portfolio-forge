import { authoritativeGridToDraftingState } from '@/components/fabricator/drafting/utils/authoritativeDraftingHydration';
import { convertDraftingToWindowGrid } from '@/components/fabricator/drafting/utils/draftingToWindowGrid';
import { FP028_ACCEPTANCE_FIXTURES } from '@/lib/fabricator/manufacturing/fp028AcceptanceFixtures';
import type { WindowUnit } from '@/types/fabricator';
import { describe, expect, it } from 'vitest';
import type { ArchitecturalPreset } from '../ArchitecturalPresetSelector';
import { applyPresetIntelligence } from '../presetApplication';
import type { EgyptianTemplate } from '../../types/drafting';

const draftingType = (type: string): string => type === 'sash' ? 'casement' : type === 'empty' ? 'fixed' : type;

describe('FP-028 / Phase 2 F1–F3 template round trip', () => {
  it.each(FP028_ACCEPTANCE_FIXTURES)('preserves $id through apply, JSON reload, Drafting and Design', (fixture) => {
    const preset: ArchitecturalPreset = {
      id: `template-${fixture.id}`,
      title: fixture.description,
      description: fixture.description,
      icon: 'fixture',
      complexity: 'Basic',
      intelligence: {
        gridPattern: `${fixture.grid.rows}x${fixture.grid.cols}`,
        systemRecommendation: fixture.systemPackId,
        materialRecommendation: 'fixture',
      },
      applications: ['FP-028 acceptance'],
      pricingTier: 'Standard',
      templateSchema: {
        version: 1,
        status: 'selectable',
        evidenceStatus: 'illustrative',
        compatibleSystemPackIds: [fixture.systemPackId],
        grid: fixture.grid,
      },
    };
    const applied = applyPresetIntelligence(preset, fixture.overallWidthMm, fixture.overallHeightMm);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;

    const reloadedGrid = JSON.parse(JSON.stringify(applied.windowGrid)) as typeof applied.windowGrid;
    const project = {
      id: fixture.identity.positionId,
      overallWidth: fixture.overallWidthMm,
      overallHeight: fixture.overallHeightMm,
      grid: reloadedGrid,
    } as WindowUnit;
    const draftingState = authoritativeGridToDraftingState(project);
    const template: EgyptianTemplate = {
      id: preset.id,
      name: preset.title,
      rows: fixture.grid.rows,
      cols: fixture.grid.cols,
      cellTypes: Array.from({ length: fixture.grid.rows }, (_, row) =>
        Array.from({ length: fixture.grid.cols }, (_, col) =>
          draftingType(fixture.grid.cells.find((cell) => cell.row === row && cell.col === col)?.type ?? 'fixed')
        )
      ),
      colWidthRatios: fixture.grid.colWidths,
      rowHeightRatios: fixture.grid.rowHeights,
      constraints: {
        minWidth: 1,
        maxWidth: 10000,
        minHeight: 1,
        maxHeight: 10000,
      },
    };
    const returnedGrid = convertDraftingToWindowGrid(draftingState.geometry, template);

    expect(returnedGrid).toEqual(reloadedGrid);
    expect(returnedGrid.cells.map((cell) => cell.id)).toEqual(fixture.grid.cells.map((cell) => cell.id));
    expect(returnedGrid.colWidths?.reduce((sum, width) => sum + width, 0)).toBe(fixture.overallWidthMm);
    expect(returnedGrid.rowHeights?.reduce((sum, height) => sum + height, 0)).toBe(fixture.overallHeightMm);
  });
});
