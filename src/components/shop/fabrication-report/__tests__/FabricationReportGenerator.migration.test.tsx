/**
 * FabricationReportGenerator migration test (Chart.js → Recharts)
 */

import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import FabricationReportGenerator from '../FabricationReportGenerator';

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('FabricationReportGenerator (Recharts migration)', () => {
  it('renders without crashing', () => {
    const { container } = render(<FabricationReportGenerator />);
    expect(container).toBeTruthy();
  });

  it('renders cost breakdown chart section', () => {
    const { container } = render(<FabricationReportGenerator />);
    expect(container.textContent).toContain('Material Cost Breakdown');
  });
});
