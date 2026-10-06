import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { ProfilesTable } from './BOMReviewPanel';
describe('BOM cut ledger display', () => {
  it('shows all four frame cuts and counts pieces instead of frame assemblies', () => {
    const profiles = [{ id: 'frame', role: 'frame', profileCode: 'TEST-FRAME', length: 4800, quantity: 1, cuttingLengths: [1000,1400,1000,1400], angles: [45,45,45,45], cost: 48 }] as CompleteBOM['profiles'];
    render(<ProfilesTable profiles={profiles} />);
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getAllByText('1000.0')).toHaveLength(2);
    expect(within(rows[1]).getAllByText('1400.0')).toHaveLength(2);
    expect(within(rows[1]).getAllByText('45°')).toHaveLength(4);
    expect(within(rows[1]).getByText('4')).toBeTruthy();
    expect(within(rows[2]).getByText('4')).toBeTruthy();
    expect(within(rows[2]).getByText('48.00')).toBeTruthy();
  });
});
