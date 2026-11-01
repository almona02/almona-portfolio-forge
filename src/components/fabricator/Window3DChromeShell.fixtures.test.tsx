/**
 * Batch F — layout acceptance fixtures at Engineering Bay / studio widths.
 * Asserts chrome policy attributes (bbox ownership) without mounting R3F.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Window3DChromeShell } from './Window3DChromeShell';

const WIDTHS = [380, 768, 1024, 1440] as const;

describe('Window3DChromeShell layout fixtures (Batch F)', () => {
  it.each(WIDTHS)('width %ipx: Parts+details never use two absolute overlapping cards', (width) => {
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
    expect(chrome).toHaveAttribute('data-panel-placement', 'parts-left-details-stack');
    expect(screen.getByTestId('window-3d-panel-stack')).toBeInTheDocument();
    expect(screen.getByTestId('window-3d-status-slot')).toBeInTheDocument();

    if (width < 420) {
      expect(chrome).toHaveAttribute('data-chrome-mode', 'compact');
    } else {
      expect(chrome).toHaveAttribute('data-chrome-mode', 'docked');
    }
  });
});
