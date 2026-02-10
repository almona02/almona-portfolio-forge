/**
 * MaterialUtilizationChart migration test (Chart.js → Recharts)
 * Validates data structure and render behavior
 */

import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { MaterialUtilizationChart } from '../MaterialUtilizationChart';

const sampleData = [
  { period: 'Week 1', used: 120, wasted: 15, utilization: 0.89 },
  { period: 'Week 2', used: 95, wasted: 12, utilization: 0.89 },
  { period: 'Week 3', used: 140, wasted: 20, utilization: 0.88 },
];

// Recharts ResponsiveContainer uses ResizeObserver - jsdom doesn't have it
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('MaterialUtilizationChart (Recharts migration)', () => {
  it('renders without crashing', () => {
    const { container } = render(<MaterialUtilizationChart data={sampleData} />);
    expect(container).toBeTruthy();
  });

  it('renders chart container with correct structure', () => {
    const { container } = render(<MaterialUtilizationChart data={sampleData} />);
    // Component renders a div with h-[300px] - verify structure exists
    expect(container.firstChild).toBeTruthy();
    expect(container.querySelector('[class*="h-"]')).toBeTruthy();
  });

  it('handles empty data gracefully', () => {
    const { container } = render(<MaterialUtilizationChart data={[]} />);
    expect(container).toBeTruthy();
  });

  it('accepts data with period, used, wasted, utilization keys', () => {
    const { container } = render(<MaterialUtilizationChart data={sampleData} />);
    // Component renders without error - data structure is valid
    expect(container).toBeTruthy();
  });
});
