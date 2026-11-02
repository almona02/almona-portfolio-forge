import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Machine } from '@/constants/productsData';
import CompareBar from './CompareBar';
vi.mock('@/hooks/usePublicCopy', () => ({ usePublicCopy: () => (text: string) => text }));
const machines = [{ id: 'first', name: 'Machine one' }, { id: 'second', name: 'Machine two' }] as Machine[];
describe('comparison palette and keyboard controls', () => {
  it('keeps selected machines readable without hover and retains comparison actions', () => {
    const onCompare = vi.fn(), onRemove = vi.fn(), onClear = vi.fn();
    render(<CompareBar machines={machines} onCompare={onCompare} onRemove={onRemove} onClear={onClear} />);
    const bar = screen.getByLabelText('Machine comparison');
    expect(bar).toHaveClass('bg-card/95', 'text-card-foreground', 'opacity-100');
    expect(bar.className).not.toMatch(/(?:^|\s)(?:sm:)?opacity-(20|40)(?:\s|$)/);
    const compare = screen.getByRole('button', { name: 'Open machine comparison' });
    compare.focus();
    expect(compare).toHaveFocus();
    fireEvent.click(compare);
    expect(onCompare).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Machine one from comparison' }));
    expect(onRemove).toHaveBeenCalledWith('first');
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
