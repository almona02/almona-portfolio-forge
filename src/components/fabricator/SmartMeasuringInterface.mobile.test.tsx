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
    i18n: { language: 'en' },
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

beforeEach(() => {
  // Phone viewport — panels start collapsed (do not open via matchMedia)
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    media: '(min-width: 1024px)',
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
});
afterEach(cleanup);

describe('SmartMeasuringInterface mobile confirm actions', () => {
  it('defaults to CALUMINIUM PS + sliding-2s with narrow chrome and wizard scroll focus', () => {
    render(<SmartMeasuringInterface onMeasurementComplete={vi.fn()} />);

    expect(screen.getByTestId('measuring-mobile-shell')).toBeInTheDocument();
    expect(screen.getByTestId('measuring-wizard-focus')).toBeInTheDocument();
    expect(screen.getByTestId('measuring-wizard-scroll')).toBeInTheDocument();
    expect(screen.getByTestId('measuring-chrome-system')).toHaveTextContent(/CALUMINIUM PS/i);
    expect(screen.getByTestId('measuring-chrome-layout')).toHaveTextContent(/sliding-2s/i);
    expect(screen.queryByTestId('measuring-apply-system-pack')).not.toBeInTheDocument();
    expect(screen.getByTestId('measuring-wizard-next')).toBeVisible();
  });

  it('starts with system pack collapsed when pack is preselected and Apply confirms change', async () => {
    render(
      <SmartMeasuringInterface
        systemPackId="caluminium-ps"
        initialData={{
          width: '1200',
          height: '1400',
          windowType: 'sliding_window_2sash',
          glazingType: 'single',
          measurementMode: 'manufacturing',
        }}
        onMeasurementComplete={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('measuring-apply-system-pack')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show system picker' }));
    const apply = await screen.findByTestId('measuring-apply-system-pack');
    expect(apply).toBeVisible();
    fireEvent.click(apply);
    await waitFor(() => {
      expect(screen.queryByTestId('measuring-apply-system-pack')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('measuring-wizard-next')).toBeVisible();
  });

  it('shows pattern confirm CTA and Confirm/Save footer after verification', async () => {
    render(
      <SmartMeasuringInterface
        systemPackId="rock60"
        initialData={{
          width: '1200',
          height: '1400',
          windowType: 'sliding_window_2sash',
          glazingType: 'single',
          measurementMode: 'manufacturing',
        }}
        onMeasurementComplete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pick pattern' }));
    expect(await screen.findByTestId('measuring-pattern-applied')).toBeInTheDocument();
    expect(screen.getByTestId('measuring-confirm-pattern')).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /^Confirm$/ }));
    const checkbox = await screen.findByRole('checkbox', {
      name: 'I checked the cut size against the opening / drawing.',
    });
    fireEvent.click(checkbox);
    expect(screen.getByTestId('measuring-save-pose-design')).toBeEnabled();
    expect(screen.getByTestId('measuring-save-pose-design')).toBeInTheDocument();
  });

  it('keeps cut preview collapsed on phone until expanded', () => {
    render(
      <SmartMeasuringInterface
        systemPackId="caluminium-ps"
        initialData={{
          width: '1200',
          height: '1400',
          windowType: 'sliding_window_2sash',
          glazingType: 'single',
          measurementMode: 'manufacturing',
        }}
        onMeasurementComplete={vi.fn()}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Show cut preview' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide cut preview' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('advances Size → Glass with footer Next and collapses pack Apply', async () => {
    render(<SmartMeasuringInterface onMeasurementComplete={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Size', current: 'step' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('measuring-wizard-next'));
    expect(screen.getByRole('button', { name: 'Glass', current: 'step' })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('measuring-chrome-system'));
    const apply = await screen.findByTestId('measuring-apply-system-pack');
    fireEvent.click(apply);
    await waitFor(() => {
      expect(screen.queryByTestId('measuring-apply-system-pack')).not.toBeInTheDocument();
    });
  });
});
