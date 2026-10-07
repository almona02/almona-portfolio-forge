import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WindowGrid } from '@/types/fabricator';
vi.mock('@/lib/ml/PresetMatcher', () => ({ presetMatcher: { suggestPresets: () => [] } }));
import { SmartDrawCanvas } from './SmartDrawCanvas';
import { mirrorGridHorizontally, mirrorGridVertically } from './SmartDrawCanvas/utils/gridCellUtils';
describe('Gold design geometry history', () => {
  it('restores unequal widths with redo and mirrors those widths', () => {
    function Harness() {
      const [grid, setGrid] = useState<WindowGrid>({ rows: 1, cols: 2, cells: [
        { id: '0-0', row: 0, col: 0, type: 'fixed' }, { id: '0-1', row: 0, col: 1, type: 'fixed' },
      ] });
      return <><output data-testid="widths">{JSON.stringify(grid.colWidths || [])}</output>
        <SmartDrawCanvas width={1200} height={1400} grid={grid} onGridChange={setGrid} /> </>;
    }
    render(<Harness />);
    const input = screen.getByPlaceholderText('600,800,600');
    fireEvent.change(input, { target: { value: '400,800' } });
    fireEvent.blur(input);
    expect(screen.getByTestId('widths').textContent).toBe('[400,800]');
    fireEvent.click(screen.getByRole('button', { name: 'Undo last action (Ctrl+Z)' }));
    expect(screen.getByTestId('widths').textContent).toBe('[]');
    expect((input as HTMLInputElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Redo last action (Ctrl+Y or Ctrl+Shift+Z)' }));
    expect(screen.getByTestId('widths').textContent).toBe('[400,800]');
    fireEvent.click(screen.getByRole('button', { name: 'Mirror grid horizontally' }));
    expect(screen.getByTestId('widths').textContent).toBe('[800,400]');
  });
  it('keeps merged cells inside the grid and preserves a double mirror', () => {
    const grid: WindowGrid = { rows: 3, cols: 4, colWidths: [1,2,3,4], rowHeights: [1,2,3],
      cells: [{ id: '0-0', row: 0, col: 0, rowSpan: 2, colSpan: 2, type: 'sash', openingDirection: 'left' }] };
    expect(mirrorGridHorizontally(grid).cells[0].col).toBe(2);
    expect(mirrorGridVertically(grid).cells[0].row).toBe(1);
    expect(mirrorGridHorizontally(mirrorGridHorizontally(grid))).toEqual(grid);
    expect(mirrorGridVertically(mirrorGridVertically(grid))).toEqual(grid);
  });
});
