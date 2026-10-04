/**
 * FP-028 / P5.5 — canvas-primary workbench shell.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EngineeringBayWorkbenchLayout } from '../EngineeringBayWorkbenchLayout';

vi.mock('@/stores/fabricatorUIStore', () => ({
  useFabricatorUIStore: (selector: (s: unknown) => unknown) =>
    selector({
      panelStates: {
        fabrication: {
          leftCollapsed: false,
          rightCollapsed: false,
          leftWidthExpanded: 300,
          rightWidthExpanded: 380,
        },
      },
      togglePanel: vi.fn(),
    }),
}));

describe('FP-028 / P5.5 — EngineeringBayWorkbenchLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks canvas as the primary region and exposes main landmark', () => {
    render(
      <EngineeringBayWorkbenchLayout
        mobileTab="design"
        controls={<div>Controls</div>}
        canvas={<div>CanvasBody</div>}
        preview={<div>PreviewBody</div>}
      />
    );

    const layout = screen.getByTestId('engineering-bay-layout');
    expect(layout).toHaveAttribute('data-primary-region', 'canvas');
    const canvasPrimary = screen.getByTestId('engineering-bay-canvas-primary');
    expect(canvasPrimary).toHaveAttribute('aria-label', 'Editable design canvas');
    expect(canvasPrimary).toHaveTextContent('CanvasBody');
  });

  it('renders collapsible panel titles for secondary rails', () => {
    render(
      <EngineeringBayWorkbenchLayout
        mobileTab="design"
        controls={<div>Controls</div>}
        canvas={<div>CanvasBody</div>}
        preview={<div>PreviewBody</div>}
      />
    );

    const layout = screen.getByTestId('engineering-bay-layout');
    expect(layout).toHaveTextContent('Design controls');
    expect(layout).toHaveTextContent('3D preview & physics');
  });
});
