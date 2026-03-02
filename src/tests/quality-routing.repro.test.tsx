import App from '@/App';
import '@/lib/i18n';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

describe('fabricator quality routing repro', () => {
  beforeAll(() => {
    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    }
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('keeps canonical design route stable', async () => {
    window.history.pushState({}, '', '/fabricator/studio/projects/TEST123/positions/TEST123/design');
    render(
      <HelmetProvider>
        <App />
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe('/fabricator/studio/projects/TEST123/positions/TEST123/design');
    });
  });

  it('tracks canonical quality route behavior', async () => {
    window.history.pushState({}, '', '/fabricator/studio/projects/TEST123/positions/TEST123/quality');
    render(
      <HelmetProvider>
        <App />
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe('/fabricator/studio/projects/TEST123/positions/TEST123/quality');
    });
  });

  it('tracks legacy quality-control redirect behavior', async () => {
    window.history.pushState({}, '', '/fabricator/workflow/quality-control/TEST123');
    render(
      <HelmetProvider>
        <App />
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe('/fabricator/studio/projects/TEST123/positions/TEST123/quality');
    });
  });
});
