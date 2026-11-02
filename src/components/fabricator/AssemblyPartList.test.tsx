import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildAssemblyManifest } from '@/lib/fabricator/assembly/assemblyManifest';
import type { WindowComponent, WindowUnit } from '@/types/fabricator';
import { AssemblyPartList } from './AssemblyPartList';

function unit(): WindowUnit {
  const component = (id: string, type: string, profileId: string, raw: number[]): WindowComponent => ({
    id, type, profile: { id: profileId, material: 'aluminum' } as WindowComponent['profile'], quantity: 1,
    cuttingLengths: raw, angles: [45, 45], machiningOperations: [], glazingType: 'none', hardware: [], width: 0, height: 0,
  });
  return {
    id: 'pose-1', revision: 2, color: 'white', type: 'sliding', overallWidth: 1500, overallHeight: 1800,
    grid: { rows: 1, cols: 2, cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }, { id: '0-1', row: 0, col: 1, type: 'sash' }] },
    components: [
      component('frame_top_1', 'frame', 'PS-6601-FRAME', [1500]),
      component('sash_0-0_top', 'sash', 'PS-6601-SASH', [650]),
      component('sash_0-1_top', 'sash', 'PS-6601-SASH', [650]),
      component('interlock_vertical_1', 'interlock', 'PS-6601-INTERLOCK', [1600]),
    ],
    glazing: {}, hardware: [], orderNumber: 'O', posNumber: '1', status: 'design', optimization: null, createdAt: new Date(0), updatedAt: new Date(0),
  };
}

describe('assembly part list', () => {
  const visual = ['frame||top|', 'sash|0-0|top|', 'sash|0-1|top|', 'glass|0-0||', 'glass|0-1||', 'spacer|0-0||', 'spacer|0-1||', 'corner||top_left|'];

  it('lists repeated pieces distinctly, selects by part ref when drawn and by record id when not', () => {
    const manifest = buildAssemblyManifest(unit(), { visualPartKeys: visual });
    const onSelect = vi.fn();
    render(<AssemblyPartList manifest={manifest} selectedKey={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('option', { name: /Sash — Sash 2 \(top\)/ }));
    expect(onSelect).toHaveBeenLastCalledWith('sash|0-1|top|');
    // Interlock has a saved record but is not among the drawn parts → selected by its cut id.
    fireEvent.click(screen.getByRole('option', { name: /Interlock/ }));
    expect(onSelect).toHaveBeenLastCalledWith('interlock_vertical_1:0');
    expect(screen.getByRole('option', { name: /Interlock/ }).textContent).toMatch(/not drawn/);
    // Visual-only pieces are listed too, flagged as having no record.
    expect(screen.getByRole('option', { name: /Corner reinforcement plate/ }).textContent).toMatch(/no record/);
  });

  it('reflects the mesh selection coming from the 3D view', () => {
    const manifest = buildAssemblyManifest(unit(), { visualPartKeys: visual });
    render(<AssemblyPartList manifest={manifest} selectedKey="sash|0-0|top|" onSelect={() => undefined} />);
    expect(screen.getByRole('option', { name: /Sash — Sash 1 \(top\)/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('option', { name: /Sash — Sash 2 \(top\)/ }).getAttribute('aria-selected')).toBe('false');
  });

  it('is searchable and keyboard operable', () => {
    const manifest = buildAssemblyManifest(unit(), { visualPartKeys: visual });
    const onSelect = vi.fn();
    render(<AssemblyPartList manifest={manifest} selectedKey={null} onSelect={onSelect} />);
    const search = screen.getByRole('combobox', { name: /search parts/i });
    fireEvent.change(search, { target: { value: 'PS-6601-SASH' } });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onSelect).toHaveBeenLastCalledWith('sash|0-1|top|');
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(onSelect).toHaveBeenLastCalledWith(null);
    fireEvent.change(search, { target: { value: 'nothing-here' } });
    expect(screen.getByText(/No parts match/)).toBeTruthy();
  });

  it('hides cut data in customer mode', () => {
    const manifest = buildAssemblyManifest(unit(), { visualPartKeys: visual });
    const { rerender } = render(<AssemblyPartList manifest={manifest} selectedKey={null} onSelect={() => undefined} mode="manufacturing" />);
    expect(screen.getByRole('option', { name: /Outer frame \(top\)/ }).textContent).toMatch(/1500\.0 mm/);
    rerender(<AssemblyPartList manifest={manifest} selectedKey={null} onSelect={() => undefined} mode="customer" />);
    expect(screen.getByRole('option', { name: /Outer frame \(top\)/ }).textContent).not.toMatch(/mm/);
  });
});
