import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeliveryTrackingPage } from './DeliveryTrackingPage';

describe('Delivery evidence isolation', () => {
  it('blocks operational capture even when a caller supplies a unit', () => {
    const complete = vi.fn();
    render(<DeliveryTrackingPage windowUnit={{ id: 'position' } as never} onDeliveryComplete={complete} />);
    expect(screen.getByText(/Delivery recording is blocked/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Complete Delivery/ })).not.toBeInTheDocument();
    expect(complete).not.toHaveBeenCalled();
  });
});
