import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Window3DChromeShell } from './Window3DChromeShell';

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
    expect(parts.className).toMatch(/absolute/);
    expect(parts.className).toMatch(/left-0/);
    expect(status.className).toMatch(/right-0/);
  });
});
