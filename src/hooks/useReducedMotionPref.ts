import { useEffect, useState } from 'react';

/**
 * useReducedMotionPref
 * Reads the user's system-level prefers-reduced-motion setting and reacts to changes.
 * Optionally allows an override via localStorage key 'ux.reducedMotion'.
 */
export function useReducedMotionPref() {
  const [reduced, setReduced] = useState<boolean>(false);

  useEffect(() => {
    // User override check
    try {
      const stored = localStorage.getItem('ux.reducedMotion');
      if (stored === 'true') { setReduced(true); return; }
      if (stored === 'false') { setReduced(false); }
    } catch { /* ignore */ }

    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => setReduced(mq.matches);
      update();
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
  }, []);

  return reduced;
}
