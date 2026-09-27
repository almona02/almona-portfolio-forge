import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PackageCalculator } from './PackageCalculator';
import { PackageComparisonTable } from './PackageComparisonTable';
import { ServicePackageCard } from './ServicePackageCard';

vi.mock('@/context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (key: string) => key }) }));
vi.mock('@/components/analytics/ABTestProvider', () => ({ useExperiment: () => ({ variant: 'control', track: vi.fn() }) }));

describe('Public service packages', () => {
  beforeEach(() => vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }));
  afterEach(() => vi.unstubAllGlobals());
  it('shows matching plan names, prices and benefits in cards and comparison', () => {
    render(<><ServicePackageCard packageId="professional" /><PackageComparisonTable /></>);
    expect(screen.getAllByText('Growth Factory Care')).toHaveLength(2);
    expect(screen.getAllByText('Contact for a quote')).toHaveLength(4);
    expect(screen.getAllByText('Request spare-part and operator training options')).toHaveLength(2);
    expect(screen.queryByText('8,500 EGP per month')).not.toBeInTheDocument();
  });
  it('shows a recommendation before invoking the enquiry callback', async () => {
    const select = vi.fn();
    render(<PackageCalculator onPackageRecommend={select} />);
    fireEvent.click(screen.getByRole('button', { name: 'Suggest a plan' }));
    const button = await screen.findByRole('button', { name: 'Discuss Starter Workshop Care' });
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(select).toHaveBeenCalledWith('basic');
  });
  it('rejects invalid machine counts and clears an outdated recommendation', () => {
    render(<PackageCalculator />);
    fireEvent.click(screen.getByRole('button', { name: 'Suggest a plan' }));
    expect(screen.getByRole('button', { name: 'Discuss Starter Workshop Care' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Number of machines'), { target: { value: '-1' } });
    expect(screen.getByRole('button', { name: 'Suggest a plan' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Discuss Starter/ })).not.toBeInTheDocument();
  });
});
