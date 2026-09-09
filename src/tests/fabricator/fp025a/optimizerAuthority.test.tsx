import {
  formatAuthorityLabel,
  OptimizationSummary,
} from '@/components/fabricator/cockpit/OptimizationSummary';
import { OptimizationCockpit } from '@/components/fabricator/cockpit/OptimizationCockpit';
import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import type { OptimizationResult, Profile } from '@/types/fabricator';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (_key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : _key),
      i18n: { language: 'en' },
    }),
  };
});

vi.mock('@/hooks/useStudioBreakpoint', () => ({
  useStudioBreakpoint: () => 'desktop',
  isCadDesktopLayout: () => true,
}));

const profile: Profile = {
  id: 'frame-1',
  name: 'CALUMINIUM-PS-FRAME',
  material: 'aluminum',
  width: 60,
  color: '#fff',
  costPerMeter: 1,
  cuttingAllowance: 0,
  stockQuantity: 10,
};

const resultWithoutAuthority: OptimizationResult = {
  materialUsage: 82.4,
  wastePercentage: 11.2,
  estimatedProductionTime: 40,
  nestingEfficiency: 0.82,
  cuttingPlan: [
    {
      profile,
      stockLength: 6500,
      cuts: [{ length: 1500, angle: 45, componentId: 'c1', waste: 0 }],
      totalWaste: 200,
      utilization: 88,
    },
  ],
  costBreakdown: {
    materialCost: 100,
    laborCost: 20,
    hardwareCost: 10,
    glazingCost: 15,
    totalCost: 145,
  },
};

describe('FP-025A unknown optimizer authority', () => {
  it('renders Not recorded when no authority metadata is provided', () => {
    expect(formatAuthorityLabel(null)).toBe(NOT_RECORDED);
    expect(formatAuthorityLabel(undefined)).toBe(NOT_RECORDED);

    render(
      <OptimizationSummary
        result={resultWithoutAuthority}
        algorithmLabel={null}
        authority={null}
      />,
    );

    const value = screen.getByTestId('optimization-authority-value');
    expect(value).toHaveTextContent(NOT_RECORDED);
    expect(screen.getByTestId('optimization-summary')).toHaveAttribute(
      'data-authority',
      'not_recorded',
    );
    expect(screen.queryByText('AUTHORITATIVE')).not.toBeInTheDocument();
    expect(screen.queryByText('ADVISORY')).not.toBeInTheDocument();
  });

  it('must never infer AUTHORITATIVE or ADVISORY from optimization result fields', () => {
    render(
      <OptimizationCockpit
        result={resultWithoutAuthority}
        algorithmLabel={null}
        authority={null}
      />,
    );

    expect(screen.getByTestId('optimization-authority-value')).toHaveTextContent(NOT_RECORDED);
    expect(screen.getByTestId('optimization-summary')).toHaveAttribute(
      'data-authority',
      'not_recorded',
    );
    expect(screen.queryByText('AUTHORITATIVE')).not.toBeInTheDocument();
    expect(screen.queryByText('ADVISORY')).not.toBeInTheDocument();
    expect(screen.queryByText('deterministic')).not.toBeInTheDocument();
    expect(screen.queryByText('advisory')).not.toBeInTheDocument();
  });

  it('OptimizationPage does not infer authority from the solver', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/pages/fabricator/workflow/OptimizationPage.tsx'),
      'utf8',
    );
    expect(src).toMatch(/authority=\{null\}/);
    expect(src).not.toMatch(/authority=\{['"]advisory['"]\}/);
    expect(src).not.toMatch(/authority=\{['"]deterministic['"]\}/);
    expect(src).not.toMatch(/preferredAlgorithm/);
  });
});
