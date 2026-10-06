import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SmartMeasuringInterface } from './SmartMeasuringInterface';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, fallback: unknown) => typeof fallback === 'string' ? fallback : key, i18n: { language: 'en' } }) }));
vi.mock('./SmartDrawCanvas', () => ({ SmartDrawCanvas: () => null }));
vi.mock('./Enhanced3DPreview', () => ({ Enhanced3DPreview: () => null }));
vi.mock('./EnhancedMeasurementTools', () => ({ EnhancedMeasurementTools: () => null }));
vi.mock('./ProductionLabel', () => ({ ProductionLabel: () => null }));
vi.mock('./CustomSystemManager', () => ({ CustomSystemManager: () => null }));
vi.mock('./SystemTuningStudio', () => ({ SystemTuningStudio: () => null }));
vi.mock('./drafting/prestige/PrestigeSystemPackSelector', () => ({ PrestigeSystemPackSelector: () => null }));
vi.mock('./drafting/prestige/EgyptianPatternSelector', () => ({ EgyptianPatternSelector: () => null }));
vi.mock('@/lib/analytics/CalibrationAnalytics', () => ({ calibrationAnalytics: { recordVerificationEvent: vi.fn() } }));
vi.mock('@/lib/performance-monitoring', () => ({ trackError: vi.fn() }));
beforeEach(() => { window.matchMedia = vi.fn().mockReturnValue({ matches: true, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }); });
afterEach(cleanup);
describe('measuring step finalization', () => {
  it('preserves glazing through Glass and Confirm and normalizes a legacy window type', async () => {
    const complete = vi.fn();
    render(<SmartMeasuringInterface systemPackId="caluminium-ps" initialData={{ width: '1200', height: '1400', windowType: 'window', glazingType: 'single', measurementMode: 'manufacturing' }} onMeasurementComplete={complete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Glass', exact: true }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Glazing Type' }).textContent).toContain('Single'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm', exact: true }));
    const checkbox = await screen.findByRole('checkbox', { name: 'I checked the cut size against the opening / drawing.' });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Save Pose & Design', exact: true }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    expect(complete.mock.calls[0][0]).toMatchObject({ glazingType: 'single', windowType: 'sliding_window_2sash', manufacturingWidth: 1200, manufacturingHeight: 1400 });
  });
});

