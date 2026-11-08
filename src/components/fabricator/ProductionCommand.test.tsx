/**
 * ProductionCommand render tests — dispatch states through the real UI.
 *
 * Covers: generating/empty states, honest disabled machine-send control, and
 * the production export gate refusing a non-reconciling cut list. Heavy
 * children (preview dialog, drawings, studios) are stubbed; the gate,
 * handlers, and copy under test are real.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OptimizationResult, Profile, WindowComponent, WindowUnit } from '@/types/fabricator';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, def?: unknown) => (typeof def === 'string' ? def : _key),
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/lib/performance-monitoring', () => ({
  trackError: (..._args: any[]) => undefined,
}));

vi.mock('@/components/analytics/WasteComparisonReport', () => ({
  WasteComparisonReport: () => <div data-testid="waste-report-mock" />,
}));

vi.mock('./ProductionPreviewDialog', () => ({
  ProductionPreviewDialog: ({ open, onConfirm }: any) =>
    open ? (
      <button data-testid="preview-confirm" onClick={() => onConfirm()}>
        Confirm
      </button>
    ) : null,
}));

vi.mock('./BarDrawing', () => ({
  BarDrawing: () => <div data-testid="bar-drawing-mock" />,
}));

vi.mock('./InstallationVariablesPanel', () => ({
  InstallationVariablesPanel: () => <div data-testid="installation-mock" />,
}));

vi.mock('@/integrations/yilmaz/BarcodeLabelGenerator', () => ({
  BarcodeLabelGenerator: class {
    generateLabels() {
      return [];
    }
  },
}));

vi.mock('@/modules/reporting/useCompanyBranding', () => ({
  useCompanyBranding: () => ({ branding: undefined }),
}));

vi.mock('@/lib/exports/ALM6510MDBExport', () => ({
  alm6510MDBExport: { downloadMDB: vi.fn() },
}));

import { ProductionCommand } from './ProductionCommand';

// jsdom lacks these browser APIs; Radix Select calls them when the list opens.
const elementProto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
const jsdomStubs: Record<string, () => unknown> = {
  scrollIntoView: () => undefined,
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
};
for (const [name, stub] of Object.entries(jsdomStubs)) {
  if (elementProto[name] == null) elementProto[name] = stub;
}

const profile = {
  id: 'PS-6601-FRAME',
  name: 'Frame',
  material: 'aluminum',
  width: 97.15,
  color: '#fff',
  costPerMeter: 10,
  cuttingAllowance: 3,
  stockQuantity: 0,
  minStockLevel: 0,
  supplier: 'x',
  profileRole: 'frame',
  specifications: { sawKerf: 3, barEndTrim: 0 },
} as unknown as Profile;

const components = [
  { id: 'frame_top', type: 'frame', profile, quantity: 1, cuttingLengths: [1500], angles: [45] },
] as unknown as WindowComponent[];

const project = {
  id: 'pose-1',
  orderNumber: 'ORDER-1',
  systemPackId: 'caluminium-ps',
  components,
} as unknown as WindowUnit;

function optimizationFor(
  cuts: Array<{ length: number; angle: number; componentId: string }>
): OptimizationResult {
  const used = cuts.reduce((sum, cut) => sum + cut.length, 0);
  return {
    materialUsage: used / 6000,
    wastePercentage: ((6000 - used) / 6000) * 100,
    nestingEfficiency: (used / 6000) * 100,
    estimatedProductionTime: 1,
    cuttingPlan: [
      {
        profile,
        stockLength: 6000,
        cuts: cuts.map((cut) => ({ ...cut, waste: 0 })),
        totalWaste: 6000 - used,
        utilization: (used / 6000) * 100,
      },
    ],
    costBreakdown: { materialCost: 1, laborCost: 0, hardwareCost: 0, glazingCost: 0, totalCost: 1 },
  } as OptimizationResult;
}

describe('ProductionCommand', () => {
  it('shows the generating state while a plan is being produced', () => {
    render(<ProductionCommand project={null} optimization={null} isGenerating profiles={[]} />);
    expect(screen.getByText('Generating Cutting Plan')).toBeInTheDocument();
  });

  it('shows the empty state without optimization data', () => {
    render(<ProductionCommand project={project} optimization={null} isGenerating={false} profiles={[]} />);
    expect(screen.getByText('No Optimization Data')).toBeInTheDocument();
  });

  it('renders dispatch controls with machine send honestly disabled', () => {
    const optimization = optimizationFor([{ length: 1500, angle: 45, componentId: 'frame_top' }]);
    render(
      <ProductionCommand project={project} optimization={optimization} isGenerating={false} profiles={[profile]} />
    );
    expect(screen.getByText('Production Command Center')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate & Download G-Code/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Machine Send Unavailable/ })).toBeDisabled();
  });

  it('offers the binary download only for the ALM-6510 machine', async () => {
    const optimization = optimizationFor([{ length: 1500, angle: 45, componentId: 'frame_top' }]);
    render(
      <ProductionCommand project={project} optimization={optimization} isGenerating={false} profiles={[profile]} />
    );

    expect(screen.queryByRole('button', { name: /Download ALM 6510 Binary/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByText('ALM-6510'));
    expect(await screen.findByRole('button', { name: /Download ALM 6510 Binary/ })).toBeInTheDocument();
  });

  it('refuses to generate G-code when cuts do not reconcile to the design', async () => {
    const optimization = optimizationFor([{ length: 1500, angle: 45, componentId: 'ghost-piece' }]);
    render(
      <ProductionCommand project={project} optimization={optimization} isGenerating={false} profiles={[profile]} />
    );

    fireEvent.click(screen.getByRole('button', { name: /Generate & Download G-Code/ }));
    fireEvent.click(await screen.findByTestId('preview-confirm'));

    expect(await screen.findByText(/does not reconcile/)).toBeInTheDocument();
  });
});
