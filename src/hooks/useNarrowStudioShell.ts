import { useEffect, useState } from 'react';

/** Studio shell switches to overlay nav below this width (Tailwind `lg`). */
export const STUDIO_NARROW_BREAKPOINT = 1024;

/**
 * True when the Fabricator studio shell should use compact top/side chrome.
 */
export function useNarrowStudioShell(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < STUDIO_NARROW_BREAKPOINT : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${STUDIO_NARROW_BREAKPOINT - 1}px)`);
    const onChange = () => setNarrow(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return narrow;
}
