import { ProductionOutputDialog } from '@/components/fabricator/output/ProductionOutputDialog';
import { EngineeringInspector } from '@/components/fabricator/shell/EngineeringInspector';
import { ActiveProjectHeader } from '@/components/fabricator/shell/ActiveProjectHeader';
import { FabricatorWorkflowBar } from '@/components/fabricator/shell/FabricatorWorkflowBar';
import { DesignWorkspaceShell } from '@/components/fabricator/shell/DesignWorkspaceShell';
import { ProductionCockpit } from '@/components/fabricator/cockpit/ProductionCockpit';
import { OptimizationCockpit } from '@/components/fabricator/cockpit/OptimizationCockpit';
import { CutPatternViewer } from '@/components/fabricator/cockpit/CutPatternViewer';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import {
  resolveStudioWorkflowHref,
  STUDIO_WORKFLOW_STAGES,
} from '@/lib/fabricator/studioWorkflow';
import { isMachineOutputAvailable } from '@/lib/fabricator/machineOutputCapabilities';
import type { OptimizationResult, WindowUnit } from '@/types/fabricator';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const authState = {
  user: null as { id: string } | null,
  supabaseUser: null as { id: string } | null,
  loading: false,
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
}));

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

const workflowState = {
  currentProject: null as WindowUnit | null,
  measurementData: null,
  designData: null,
  bom: null,
  quote: null,
  optimizationResult: null as OptimizationResult | null,
  productionDocuments: null,
  completedSteps: new Set<string>(),
  activeStep: 'measuring',
};

vi.mock('@/store/workflowStore', () => ({
  useWorkflowStore: (selector?: (s: typeof workflowState) => unknown) =>
    typeof selector === 'function' ? selector(workflowState) : workflowState,
}));

vi.mock('@/hooks/useStudioBreakpoint', () => ({
  useStudioBreakpoint: () => mockBreakpoint,
  isCadDesktopLayout: (bp: string) => bp === 'desktop' || bp === 'laptop',
}));

let mockBreakpoint: 'mobile' | 'tablet' | 'laptop' | 'desktop' = 'desktop';

const sampleProject: WindowUnit = {
  id: 'pose-1',
  orderNumber: 'ORD-100',
  posNumber: 'P01',
  type: 'window',
  components: [],
  overallWidth: 1200,
  overallHeight: 1400,
  color: '#FFFFFF',
  glazing: { type: 'clear' },
  hardware: [],
  status: 'design',
  optimization: null,
  createdAt: new Date('2026-09-01T10:00:00Z'),
  updatedAt: new Date('2026-09-09T10:00:00Z'),
  customer: 'Al-Noor',
  projectCode: 'PRJ-25',
  systemPackId: 'rock60',
};

function renderAt(ui: React.ReactElement, path = '/fabricator/studio/projects/p1/positions/pose-1/design') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>login-page</div>} />
        <Route path="/fabricator/studio/*" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FP-025A industrial Studio UI', () => {
  beforeEach(() => {
    authState.user = { id: 'u1' };
    authState.supabaseUser = { id: 'u1' };
    authState.loading = false;
    workflowState.currentProject = sampleProject;
    workflowState.optimizationResult = null;
    mockBreakpoint = 'desktop';
  });

  it('keeps unauthenticated Studio protected', () => {
    authState.user = null;
    authState.supabaseUser = null;
    render(
      <MemoryRouter initialEntries={['/fabricator/studio/projects']}>
        <Routes>
          <Route path="/login" element={<div>login-page</div>} />
          <Route
            path="/fabricator/studio/*"
            element={(
              <ProtectedRoute>
                <div>studio-ok</div>
              </ProtectedRoute>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('login-page')).toBeInTheDocument();
    expect(screen.queryByText('studio-ok')).not.toBeInTheDocument();
  });

  it('shows the active project in shared context', () => {
    render(<ActiveProjectHeader project={sampleProject} />);
    const header = screen.getByTestId('active-project-header');
    expect(header).toHaveAttribute('data-project-id', 'pose-1');
    expect(header).toHaveTextContent('PRJ-25');
    expect(header).toHaveTextContent('P01');
    expect(header).toHaveTextContent('Al-Noor');
    expect(header).toHaveTextContent('Not recorded');
  });

  it('maps workflow stages to canonical studio routes', () => {
    const hrefs = STUDIO_WORKFLOW_STAGES.map((s) =>
      resolveStudioWorkflowHref(s.id, { projectId: 'p1', poseId: 'pose-1' }),
    );
    expect(hrefs).toContain(fabricatorRoutes.poseMeasuring('p1', 'pose-1'));
    expect(hrefs).toContain(fabricatorRoutes.poseDesign('p1', 'pose-1'));
    expect(hrefs).toContain(fabricatorRoutes.poseCommercial('p1', 'pose-1'));
    expect(hrefs).toContain(fabricatorRoutes.poseBOM('p1', 'pose-1'));
    expect(hrefs).toContain(fabricatorRoutes.poseOptimization('p1', 'pose-1'));
    expect(hrefs).toContain(fabricatorRoutes.poseProduction('p1', 'pose-1'));
    expect(hrefs).toContain(fabricatorRoutes.studioDataStock());
    expect(hrefs).toContain(fabricatorRoutes.studioProductionQuality());
    expect(hrefs).toContain(fabricatorRoutes.studioProductionDelivery());
    expect(hrefs.every((h) => !h.includes('/fabricator/workflow'))).toBe(true);
    expect(hrefs.every((h) => !h.includes('#'))).toBe(true);
  });

  it('does not reintroduce legacy fabricator-workflow as a live production target', () => {
    renderAt(<FabricatorWorkflowBar />);
    const links = screen.getAllByTestId(/workflow-stage-/);
    for (const link of links) {
      expect(link.getAttribute('data-canonical-href') ?? '').not.toMatch(/\/fabricator\/workflow/);
    }
  });

  it('changes inspector copy by selection kind', () => {
    const { rerender } = render(
      <EngineeringInspector project={sampleProject} selectionKind="pose" />,
    );
    expect(screen.getByTestId('engineering-inspector')).toHaveAttribute('data-selection', 'pose');
    const colorValue = screen.getByText('#FFFFFF');
    expect(colorValue).toHaveAttribute('dir', 'ltr');
    rerender(<EngineeringInspector project={sampleProject} selectionKind="sash" />);
    expect(screen.getByTestId('engineering-inspector')).toHaveAttribute('data-selection', 'sash');
    expect(screen.getByText('Sash')).toBeInTheDocument();
  });

  it('opens and closes responsive drawers on laptop', async () => {
    mockBreakpoint = 'laptop';
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DesignWorkspaceShell
          positions={[sampleProject]}
          project={sampleProject}
          onSelectPosition={() => undefined}
        >
          <div>canvas</div>
        </DesignWorkspaceShell>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('design-workspace-shell')).toHaveAttribute('data-breakpoint', 'laptop');
    await user.click(screen.getByLabelText('Open positions'));
    expect(screen.getByText('Positions')).toBeInTheDocument();
    await user.keyboard('{Escape}');
  });

  it('applies RTL direction on the workflow bar', () => {
    renderAt(<FabricatorWorkflowBar />);
    expect(screen.getByTestId('fabricator-workflow-bar')).toHaveAttribute('dir', 'ltr');
  });

  it('cannot export unsupported NCW', async () => {
    expect(isMachineOutputAvailable('ncw')).toBe(false);
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(
      <ProductionOutputDialog
        open
        onOpenChange={() => undefined}
        hasBom
        hasOptimization
        onExport={onExport}
      />,
    );
    const ncw = screen.getByTestId('output-export-ncw');
    expect(ncw).toBeDisabled();
    await user.click(ncw);
    expect(onExport).not.toHaveBeenCalled();
    expect(screen.getByTestId('output-reason-ncw')).toHaveTextContent(/not implemented/i);
  });

  it('does not invent production batches or cuts', () => {
    render(
      <ProductionCockpit project={sampleProject} optimization={null} bom={null} />,
    );
    expect(screen.getByTestId('production-no-batches')).toHaveTextContent('Not recorded');
    expect(screen.getByTestId('production-no-cuts')).toHaveTextContent('Not recorded');
    expect(screen.queryByText(/WO-/)).not.toBeInTheDocument();
  });

  it('optimizer UI does not independently recalculate manufacturing values', () => {
    const files = [
      'src/components/fabricator/cockpit/CutPatternViewer.tsx',
      'src/components/fabricator/cockpit/OptimizationSummary.tsx',
      'src/components/fabricator/cockpit/RequiredCutsPanel.tsx',
      'src/components/fabricator/cockpit/AvailableStockPanel.tsx',
      'src/components/fabricator/cockpit/OptimizationCockpit.tsx',
    ];
    for (const file of files) {
      const src = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(src).not.toMatch(/calculateKFactor|kerfLossOnBarMm|barConsumedLengthMm|AlmonaCuttingEngine/);
    }
    render(
      <OptimizationCockpit result={null} algorithmLabel={null} authority={null} />,
    );
    expect(screen.getByTestId('optimization-summary')).toHaveAttribute('data-authority', 'not_recorded');
    render(<CutPatternViewer plans={null} />);
    expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0);
  });
});
