import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DeliveryTrackingPage } from './DeliveryTrackingPage';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/store/workflowStore', () => ({
  useWorkflowStore: () => ({
    currentProject: null,
    workflowIdentity: null,
    qualityApproval: null,
    positionRelease: null,
    deliveryAcknowledgement: null,
    setQualityApproval: vi.fn(),
    setPositionRelease: vi.fn(),
    setDeliveryAcknowledgement: vi.fn(),
    alignShellProject: vi.fn(),
  }),
}));

describe('Delivery evidence isolation', () => {
  it('blocks operational capture even when a caller supplies a unit', async () => {
    const complete = vi.fn();
    render(
      <MemoryRouter>
        <DeliveryTrackingPage windowUnit={{ id: 'position' } as never} onDeliveryComplete={complete} />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Delivery recording is blocked|Authenticated operator required/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Complete Delivery/ })).not.toBeInTheDocument();
    expect(complete).not.toHaveBeenCalled();
  });
});
