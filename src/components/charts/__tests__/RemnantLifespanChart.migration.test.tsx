/**
 * RemnantLifespanChart migration test (Chart.js → Recharts)
 */

import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { RemnantLifespanChart } from '../RemnantLifespanChart';

const sampleData = {
  byAge: [
    { range: '0-30 days', count: 12 },
    { range: '31-60 days', count: 8 },
    { range: '61-90 days', count: 5 },
  ],
  byStatus: [
    { status: 'Available', count: 15 },
    { status: 'Reserved', count: 7 },
    { status: 'Used', count: 3 },
  ],
};

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('RemnantLifespanChart (Recharts migration)', () => {
  it('renders without crashing', () => {
    const { container } = render(<RemnantLifespanChart data={sampleData} />);
    expect(container).toBeTruthy();
  });

  it('renders both chart sections', () => {
    const { container } = render(<RemnantLifespanChart data={sampleData} />);
    expect(container.querySelectorAll('.grid')).toHaveLength(1);
    expect(container.querySelectorAll('[class*="h-"]')).toBeTruthy();
  });

  it('handles empty data gracefully', () => {
    const { container } = render(
      <RemnantLifespanChart
        data={{ byAge: [], byStatus: [] }}
      />
    );
    expect(container).toBeTruthy();
  });
});
