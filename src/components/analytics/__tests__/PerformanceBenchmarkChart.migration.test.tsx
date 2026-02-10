/**
 * PerformanceBenchmarkChart migration test (Chart.js → Recharts)
 */

import { render, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PerformanceBenchmarkChart } from '../PerformanceBenchmarkChart';

vi.mock('@/lib/analytics/PerformanceBenchmarker', () => ({
  performanceBenchmarker: {
    getPerformanceTrends: vi.fn().mockResolvedValue([
      { date: '2025-01-01', averageDuration: 1200, averageWaste: 8.5 },
      { date: '2025-01-02', averageDuration: 950, averageWaste: 6.2 },
    ]),
  },
}));

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('PerformanceBenchmarkChart (Recharts migration)', () => {
  it('renders without crashing', async () => {
    const { container } = render(<PerformanceBenchmarkChart />);
    await waitFor(() => expect(container).toBeTruthy());
  });

  it('renders chart after data loads', async () => {
    const { container } = render(<PerformanceBenchmarkChart />);
    await waitFor(() => {
      expect(container.textContent).not.toContain('Loading benchmark data');
    });
  });
});
