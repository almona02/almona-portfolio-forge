import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import UsedMachines from './UsedMachines';

const { list } = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/lib/usedMachines/UsedMachineService', () => ({
  UsedMachineService: { listActiveListings: list },
}));
vi.mock('@/hooks/usePublicCopy', () => ({ usePublicCopy: () => (text: string) => text }));
vi.mock('@/components/used-machines/MachineSEO', () => ({ default: () => null }));
vi.mock('@/components/used-machines/SellUsedMachineForm', () => ({ default: () => <div>Sell form</div> }));
vi.mock('@/components/used-machines/MachineCard', () => ({ default: () => null }));
vi.mock('@/hocs/withErrorBoundary', () => ({ withErrorBoundary: (component: unknown) => component }));

beforeEach(() => list.mockReset());

it('shows a request failure separately from empty inventory and lets a visitor retry', async () => {
  list.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce([]);
  render(<MemoryRouter><UsedMachines /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('We could not load the machines');
  expect(screen.queryByText('No listings yet — be the first to post.')).not.toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /Sell/ })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading machines' }));
  await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  expect(await screen.findByText('No listings yet — be the first to post.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
