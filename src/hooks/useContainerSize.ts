import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export interface ContainerSize {
  width: number | null;
  height: number | null;
}

/**
 * Observe an element's content-box size. Starts unmeasured (null,null).
 * Does not write styles that change the observed size (no feedback loop).
 */
export function useContainerSize<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  size: ContainerSize;
} {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ContainerSize>({ width: null, height: null });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    let lastW = -1;
    let lastH = -1;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentBoxSize?.[0];
      const width = box ? box.inlineSize : entry.contentRect.width;
      const height = box ? box.blockSize : entry.contentRect.height;
      const w = Math.round(width);
      const h = Math.round(height);
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      setSize({ width: w, height: h });
    });

    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);

  return { ref, size };
}
