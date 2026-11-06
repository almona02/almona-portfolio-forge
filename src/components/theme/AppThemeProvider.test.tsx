import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createPortal } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from 'next-themes';
import { AppThemeProvider } from './AppThemeProvider';
import { ThemeToggle } from './ThemeToggle';

let darkSystem = false;
let mediaListeners: Array<(event: MediaQueryListEvent) => void>;
function Controls() {
  const { setTheme } = useTheme();
  return <><ThemeToggle /><button onClick={() => setTheme('system')}>Follow system</button>
    {createPortal(<div role="dialog">Portal surface</div>, document.body)}</>;
}
beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  mediaListeners = [];
  darkSystem = false;
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: darkSystem, media: '(prefers-color-scheme: dark)', onchange: null,
    addListener: (listener: (event: MediaQueryListEvent) => void) => mediaListeners.push(listener),
    removeListener: (listener: (event: MediaQueryListEvent) => void) => { mediaListeners = mediaListeners.filter(item => item !== listener); },
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('application theme', () => {
  it('shares a persisted choice across controls and body portals', async () => {
    localStorage.setItem('theme', 'light');
    render(<AppThemeProvider><Controls /></AppThemeProvider>);
    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
    fireEvent.click(screen.getByRole('button', { name: /Switch to (dark|light) mode/ }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(screen.getByRole('dialog').closest('html')).toHaveClass('dark');
  });

  it('follows OS changes only when system is selected', async () => {
    render(<AppThemeProvider><Controls /></AppThemeProvider>);
    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
    act(() => { darkSystem = true; mediaListeners.forEach(listener => listener({ matches: true } as MediaQueryListEvent)); });
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    fireEvent.click(screen.getByRole('button', { name: /Switch to (dark|light) mode/ }));
    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
    act(() => { mediaListeners.forEach(listener => listener({ matches: true } as MediaQueryListEvent)); });
    expect(document.documentElement).toHaveClass('light');
    fireEvent.click(screen.getByText('Follow system'));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  });

  it('responds to another tab changing the saved preference', async () => {
    localStorage.setItem('theme', 'light');
    render(<AppThemeProvider><Controls /></AppThemeProvider>);
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'dark' })); });
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  });
});
