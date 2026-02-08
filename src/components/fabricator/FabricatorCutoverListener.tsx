/**
 * Emits RealityOS FabricatorCutoverExecuted on first navigation into /fabricator (once per session).
 * Constitutional audit anchor for Fabricator Pro consolidation.
 */

import { realityOSEventEmitter } from '@/lib/realityos/RealityOSEventEmitter';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const CUTOVER_EMITTED_KEY = 'fabricator_cutover_emitted';

export function FabricatorCutoverListener(): null {
  const location = useLocation();
  const emitted = useRef(false);

  useEffect(() => {
    if (emitted.current) return;
    if (!location.pathname.startsWith('/fabricator')) return;
    try {
      const already = sessionStorage.getItem(CUTOVER_EMITTED_KEY);
      if (already === '1') return;
      emitted.current = true;
      sessionStorage.setItem(CUTOVER_EMITTED_KEY, '1');
      void realityOSEventEmitter.emitFabricatorCutoverExecuted({
        path: location.pathname,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // non-blocking
    }
  }, [location.pathname]);

  return null;
}
