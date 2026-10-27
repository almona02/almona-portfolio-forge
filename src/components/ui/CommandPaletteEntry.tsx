import { lazy, Suspense, useEffect, useState } from 'react';
import { shortcutManager } from '@/lib/keyboard/shortcuts';

const CommandPalette = lazy(() => import('./command-palette').then(module => ({ default: module.CommandPalette })));

/** Register the existing entry points without downloading the search UI on every visit. */
export function CommandPaletteEntry() {
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    if (requested) return;
    const open = () => setRequested(true);
    const shortcut = (event: KeyboardEvent) => { event.preventDefault(); open(); };
    shortcutManager.register('app.command-palette', shortcut);
    window.addEventListener('open-command-palette', open);
    return () => {
      shortcutManager.unregister('app.command-palette', shortcut);
      window.removeEventListener('open-command-palette', open);
    };
  }, [requested]);
  return requested ? <Suspense fallback={null}><CommandPalette defaultOpen /></Suspense> : null;
}
