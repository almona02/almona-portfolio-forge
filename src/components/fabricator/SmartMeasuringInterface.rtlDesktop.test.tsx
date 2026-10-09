import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SmartMeasuringInterface } from './SmartMeasuringInterface';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: unknown) => {
      if (typeof fallback === 'string') return fallback;
      if (fallback && typeof fallback === 'object' && 'defaultValue' in (fallback as object)) {
        const opts = fallback as { defaultValue: string; name?: string };
        return opts.defaultValue.replace('{{name}}', opts.name ?? '');
      }
      return key;
    },
    i18n: { language: 'ar', dir: () => 'rtl' },
  }),
}));
vi.mock('./SmartDrawCanvas', () => ({ SmartDrawCanvas: () => null }));
vi.mock('./Enhanced3DPreview', () => ({ Enhanced3DPreview: () => null }));
vi.mock('./EnhancedMeasurementTools', () => ({ EnhancedMeasurementTools: () => null }));
vi.mock('./ProductionLabel', () => ({ ProductionLabel: () => null }));
vi.mock('./CustomSystemManager', () => ({ CustomSystemManager: () => null }));
vi.mock('./SystemTuningStudio', () => ({ SystemTuningStudio: () => null }));
vi.mock('./drafting/prestige/PrestigeSystemPackSelector', () => ({
  PrestigeSystemPackSelector: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button type="button" onClick={() => onSelect('rock60')}>Pick Rock60</button>
  ),
}));
vi.mock('./drafting/prestige/EgyptianPatternSelector', () => ({
  EgyptianPatternSelector: ({
    onSelect,
  }: {
    onSelect: (id: string, grid: { rows: number; cols: number; cells: unknown[] }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect('sliding-2s', {
          rows: 1,
          cols: 2,
          cells: [
            { id: 'a', row: 0, col: 0, type: 'sliding' },
            { id: 'b', row: 0, col: 1, type: 'sliding' },
          ],
        })
      }
    >
      Pick pattern
    </button>
  ),
}));
vi.mock('@/lib/analytics/CalibrationAnalytics', () => ({
  calibrationAnalytics: { recordVerificationEvent: vi.fn() },
}));
vi.mock('@/lib/performance-monitoring', () => ({ trackError: vi.fn() }));

afterEach(cleanup);

describe('SmartMeasuringInterface Arabic/RTL + desktop confirm path', () => {
  beforeEach(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  });

  afterEach(() => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  });

  it('RTL: donor layout template requires confirm; appearance mapping gates Save', async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    render(
      <div dir="rtl">
        <SmartMeasuringInterface
          systemPackId="caluminium-ps"
          initialData={{
            width: '1200',
            height: '1400',
            windowType: 'sliding_window_2sash',
            color: '#FFFFFF',
            glazingType: 'clear',
            measurementMode: 'manufacturing',
          }}
          onMeasurementComplete={vi.fn()}
        />
      </div>,
    );

    expect(document.documentElement.dir).toBe('rtl');
    // Preselected pack starts on Size step (index 1)
    fireEvent.click(screen.getByRole('button', { name: 'Pick pattern' }));

    expect(await screen.findByTestId('measuring-pattern-template-warning')).toBeInTheDocument();
    const continueBtn = screen.getByTestId('measuring-confirm-pattern');
    expect(continueBtn).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: /Apply this layout template/i }));
    await waitFor(() => expect(continueBtn).toBeEnabled());

    // Jump to Confirm via step tab
    fireEvent.click(screen.getByRole('button', { name: /^Confirm$/ }));

    expect(await screen.findByTestId('measuring-appearance-confirm')).toBeInTheDocument();
    const appearanceBoxes = screen.getByTestId('measuring-appearance-confirm').querySelectorAll('button[role="checkbox"], [role="checkbox"]');
    expect(appearanceBoxes.length).toBeGreaterThanOrEqual(2);
    appearanceBoxes.forEach((el) => fireEvent.click(el));

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'I checked the cut size against the opening / drawing.',
      }),
    );
    expect(screen.getByTestId('measuring-save-pose-design')).toBeEnabled();
  });

  it('desktop viewport: certified pack pattern enables Continue without template gate', async () => {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <div dir="ltr">
        <SmartMeasuringInterface
          systemPackId="rock60"
          initialData={{
            width: '1200',
            height: '1400',
            windowType: 'sliding_window_2sash',
            color: 'White',
            glazingType: 'double',
            measurementMode: 'manufacturing',
          }}
          onMeasurementComplete={vi.fn()}
        />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pick pattern' }));
    expect(await screen.findByTestId('measuring-pattern-applied')).toBeInTheDocument();
    expect(screen.queryByTestId('measuring-pattern-template-warning')).not.toBeInTheDocument();
    expect(screen.getByTestId('measuring-confirm-pattern')).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /^Confirm$/ }));
    const verify = await screen.findByRole('checkbox', {
      name: 'I checked the cut size against the opening / drawing.',
    });
    fireEvent.click(verify);
    expect(screen.getByTestId('measuring-save-pose-design')).toBeEnabled();
  });
});
