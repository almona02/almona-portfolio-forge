import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Window3DChromeShell } from './Window3DChromeShell';
import { ENGINEERING_BAY_PREVIEW_RAIL_PX } from '@/lib/fabricator/layout/viewportChromePolicy';

describe('Window3DChromeShell', () => {
  it('stacks toolbar and disclaimer above a left-docked parts slot', () => {
    render(
      <div className="relative h-96 w-96">
        <Window3DChromeShell
          toolbar={<div role="toolbar">tools</div>}
          disclaimer={<p>disclaimer</p>}
          partList={<section aria-label="Part list">parts</section>}
          status={<div>status</div>}
        />
      </div>,
    );

    const chrome = screen.getByTestId('window-3d-chrome');
    const toolbar = screen.getByTestId('window-3d-toolbar-slot');
    const disclaimer = screen.getByTestId('window-3d-disclaimer-slot');
    const parts = screen.getByTestId('window-3d-part-list-slot');
    const status = screen.getByTestId('window-3d-status-slot');

    expect(chrome.className).toContain('flex-col');
    expect(toolbar.compareDocumentPosition(disclaimer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(disclaimer.compareDocumentPosition(parts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(parts.className).toMatch(/absolute|overflow-y-auto/);
    expect(status.className).toMatch(/right-0/);
  });

  it('stacks Parts + details in one column at 380px — never two overlapping absolute cards', () => {
    render(
      <div className="relative h-[720px] w-[380px]">
        <Window3DChromeShell
          containerWidthPx={ENGINEERING_BAY_PREVIEW_RAIL_PX}
          containerHeightPx={720}
          partList={<section aria-label="Part list">parts</section>}
          details={<section aria-label="Selected window part">details</section>}
          status={<div>status</div>}
        />
      </div>,
    );

    const chrome = screen.getByTestId('window-3d-chrome');
    expect(chrome).toHaveAttribute('data-chrome-mode', 'compact');
    expect(chrome).toHaveAttribute('data-panel-placement', 'parts-left-details-stack');

    const stack = screen.getByTestId('window-3d-panel-stack');
    expect(stack).toHaveAttribute('data-chrome-stack', 'parts-details');
    expect(screen.getByTestId('window-3d-part-list-slot').className).not.toMatch(/absolute/);
    expect(screen.getByTestId('window-3d-details-slot').className).not.toMatch(/absolute/);
  });
});
