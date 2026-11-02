/**
 * Preview host stays mounted across collapse / rail-mode CSS hides.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EngineeringBayWorkbenchLayout } from './EngineeringBayWorkbenchLayout';

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
      setPanelWidthExpanded: vi.fn(),
    }),
}));

describe('EngineeringBayWorkbenchLayout preview persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps a single preview host with the preview marker mounted', () => {
    render(
      <EngineeringBayWorkbenchLayout
        mobileTab="design"
        controls={<div>Controls</div>}
        canvas={<div>CanvasBody</div>}
        preview={<div data-testid="preview-marker">PreviewBody</div>}
      />,
    );

    expect(screen.getByTestId('engineering-bay-preview-host')).toBeInTheDocument();
    expect(screen.getByTestId('preview-marker')).toBeInTheDocument();
    expect(screen.getByTestId('engineering-bay-layout')).toHaveAttribute('data-primary-region', 'canvas');
  });
});
