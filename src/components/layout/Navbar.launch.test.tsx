import { fireEvent, render, screen } from '@testing-library/react';
import { createPortal } from 'react-dom';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Navbar from './Navbar';

const { selectLanguage } = vi.hoisted(() => ({ selectLanguage: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, signOut: vi.fn() }) }));
vi.mock('@/components/ui/Logo', () => ({ Logo: () => <span>ALMONA</span> }));
vi.mock('@/components/shared/LanguageSwitcher', () => ({
  LanguageSwitcher: ({ variant }: { variant: string }) => variant === 'minimal'
    ? createPortal(<div data-language-switcher-menu="true"><button onClick={selectLanguage}>Choose Arabic</button></div>, document.body)
    : null,
}));

describe('Mobile navigation language selection', () => {
  it('keeps the portalled language option mounted between mouse-down and click', () => {
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    const option = screen.getByRole('button', { name: 'Choose Arabic' });
    fireEvent.mouseDown(option);
    expect(option).toBeInTheDocument();
    fireEvent.click(option);
    expect(selectLanguage).toHaveBeenCalledOnce();
  });

  it('still closes mobile navigation for a click outside both menus', () => {
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('button', { name: 'Choose Arabic' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toHaveAttribute('aria-expanded', 'false');
  });
});
