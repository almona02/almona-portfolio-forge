import { cleanup, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeferredSection } from './DeferredSection';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('optional homepage sections', () => {
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
