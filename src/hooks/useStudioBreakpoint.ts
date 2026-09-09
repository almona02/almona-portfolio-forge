import { useEffect, useState } from 'react';

export type StudioBreakpoint = 'mobile' | 'tablet' | 'laptop' | 'desktop';

function resolveBreakpoint(width: number): StudioBreakpoint {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'laptop';
  return 'desktop';
}

/**
 * Industrial Studio breakpoints (FP-025A).
 * Desktop ≥1440, laptop 1024–1439, tablet 768–1023, mobile <768.
 */
export function useStudioBreakpoint(): StudioBreakpoint {
  const [bp, setBp] = useState<StudioBreakpoint>(() =>
    typeof window === 'undefined' ? 'desktop' : resolveBreakpoint(window.innerWidth),
  );

  useEffect(() => {
    const onResize = () => setBp(resolveBreakpoint(window.innerWidth));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return bp;
}

export function isCadDesktopLayout(bp: StudioBreakpoint): boolean {
  return bp === 'desktop' || bp === 'laptop';
}
