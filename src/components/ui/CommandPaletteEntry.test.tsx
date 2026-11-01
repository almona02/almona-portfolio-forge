import { cleanup, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandPaletteEntry } from './CommandPaletteEntry';

const shortcuts = vi.hoisted(() => ({ register: vi.fn(), unregister: vi.fn() }));
vi.mock('@/lib/keyboard/shortcuts', () => ({ shortcutManager: shortcuts }));
vi.mock('./command-palette', () => ({ CommandPalette: ({ defaultOpen }: { defaultOpen: boolean }) => defaultOpen ? <div role="dialog" aria-label="Command menu" /> : null }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('on-demand command menu', () => {
  it('keeps the menu unmounted until the existing custom event opens it', async () => {
    render(<CommandPaletteEntry />);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => { window.dispatchEvent(new Event('open-command-palette')); });
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Command menu' })).toBeTruthy());
    expect(shortcuts.unregister).toHaveBeenCalledWith('app.command-palette', expect.any(Function));
  });

  it('registers and releases the keyboard shortcut even without opening the menu', () => {
    const view = render(<CommandPaletteEntry />);
    expect(shortcuts.register).toHaveBeenCalledWith('app.command-palette', expect.any(Function));
    const handler = shortcuts.register.mock.calls[0][1];
    view.unmount();
    expect(shortcuts.unregister).toHaveBeenCalledWith('app.command-palette', handler);
  });
});
