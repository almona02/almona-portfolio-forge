/**
 * Retained narrow CAD workspace must not remain keyboard-focusable.
 */
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/i18n', () => ({
  isRTL: () => false,
}));

vi.mock('@/hooks/useStudioBreakpoint', () => ({
  useStudioBreakpoint: () => 'mobile',
  isCadDesktopLayout: () => false,
}));

vi.mock('@/hooks/useContainerSize', () => ({
  useContainerSize: () => ({
    ref: { current: null },
    size: { width: 500, height: 800 },
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_k: string, d?: string) => d ?? _k,
    i18n: { language: 'en' },
  }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}));

vi.mock('./DesktopWorkspaceNotice', () => ({
  DesktopWorkspaceNotice: () => <div data-testid="desktop-workspace-notice">notice</div>,
}));

vi.mock('./EngineeringInspector', () => ({
  EngineeringInspector: () => null,
}));

vi.mock('./ProjectPositionNavigator', () => ({
  ProjectPositionNavigator: () => null,
}));

import { DesignWorkspaceShell } from './DesignWorkspaceShell';

describe('DesignWorkspaceShell retained workspace inert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks retained CAD workspace inert so controls are not tabbable', () => {
    render(
      <MemoryRouter>
        <DesignWorkspaceShell
          positions={[]}
          project={null}
          onSelectPosition={() => undefined}
        >
          <button type="button" data-testid="hidden-cad-control">Hidden CAD control</button>
        </DesignWorkspaceShell>
      </MemoryRouter>,
    );

    const host = document.querySelector('[data-cad-workspace="retained"]');
    expect(host).toBeTruthy();
    expect(host).toHaveAttribute('data-inert', 'true');
    expect(host).toHaveAttribute('inert');
    expect(host).toHaveAttribute('aria-hidden', 'true');
    expect(host?.querySelector('[data-testid="hidden-cad-control"]')).toBeTruthy();
  });
});
