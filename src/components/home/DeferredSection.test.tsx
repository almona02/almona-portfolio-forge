import { cleanup, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeferredSection } from './DeferredSection';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('optional homepage sections', () => {
  it('keeps the homepage and a destination link usable when a section throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let notify: IntersectionObserverCallback;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { notify = callback; }
      observe = vi.fn();
      disconnect = vi.fn();
    });
    function UnavailableSection(): never { throw new TypeError('Failed to fetch dynamically imported module: /assets/old.js'); }
    render(<><h1>Workshop homepage</h1><DeferredSection label="Services" href="/services"><UnavailableSection /></DeferredSection></>);
    act(() => notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(screen.getByRole('heading', { name: 'Workshop homepage' })).toBeTruthy();
    expect(screen.getByText('This section is temporarily unavailable.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Services' }).getAttribute('href')).toBe('/services');
  });
  it('keeps a discoverable link and does not mount heavy content until nearby', () => {
    let notify: IntersectionObserverCallback;
    const disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { notify = callback; }
      observe = vi.fn();
      disconnect = disconnect;
    });
    const content = vi.fn(() => <h2>Machine specifications</h2>);
    render(<DeferredSection label="Machine catalogue" href="/products/machines"><Content /></DeferredSection>);
    function Content() { return content(); }
    expect(content).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Machine catalogue' }).getAttribute('href')).toBe('/products/machines');
    act(() => notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(screen.getByRole('heading', { name: 'Machine specifications' })).toBeTruthy();
    expect(disconnect).toHaveBeenCalled();
  });

  it('renders content when IntersectionObserver is unavailable', () => {
    // Delete rather than assigning undefined: the component feature-detects the property.
    const previous = window.IntersectionObserver;
    Reflect.deleteProperty(window, 'IntersectionObserver');
    try {
      render(<DeferredSection label="Services" href="/services"><h2>Workshop services</h2></DeferredSection>);
      expect(screen.getByRole('heading', { name: 'Workshop services' })).toBeTruthy();
    } finally { window.IntersectionObserver = previous; }
  });
});
