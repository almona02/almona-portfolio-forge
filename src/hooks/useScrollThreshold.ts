import { useEffect, useState } from 'react';

export function useScrollThreshold(threshold = 32) {
  const [passed, setPassed] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > threshold) {
        if (!passed) setPassed(true);
      } else if (passed) {
        setPassed(false);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, passed]);
  return passed;
}
