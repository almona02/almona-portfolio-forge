/**
 * Batch F — layout acceptance fixtures at Engineering Bay / studio widths.
 * Asserts non-overlap structure: status after panels, canvas hit present, exclusive Parts at 380.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Window3DChromeShell } from './Window3DChromeShell';

const WIDTHS = [380, 768, 1024, 1440] as const;

describe('Window3DChromeShell layout fixtures (Batch F)', () => {
  it.each(WIDTHS)('width %ipx: status is below panels; canvas hit reserved; no absolute status', (width) => {
    render(
      <div style={{ position: 'relative', width, height: 720 }}>
        <Window3DChromeShell
          containerWidthPx={width}
          containerHeightPx={720}
          partList={<section aria-label="Part list">parts</section>}
          details={<section aria-label="Selected window part">details</section>}
          status={<div aria-label="Preview source">status</div>}
        />
      </div>,
    );

    const chrome = screen.getByTestId('window-3d-chrome');
    const status = screen.getByTestId('window-3d-status-slot');
    const canvasHit = screen.getByTestId('window-3d-canvas-hit');
    const stack = screen.getByTestId('window-3d-panel-stack');

    expect(status.className).not.toMatch(/absolute/);
    expect(stack.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(canvasHit).toBeInTheDocument();

    if (width < 420) {
      expect(chrome).toHaveAttribute('data-chrome-mode', 'compact');
      expect(chrome).toHaveAttribute('data-inspection-mode', 'exclusive-parts');
      expect(screen.queryByTestId('window-3d-details-slot')).not.toBeInTheDocument();
    } else {
      expect(chrome).toHaveAttribute('data-chrome-mode', 'docked');
    }
  });
});
