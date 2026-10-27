import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Keep optional section imports out of the initial render, with a crawlable destination. */
export function DeferredSection({ children, label, href }: { children: ReactNode; label: string; href: string }) {
  const element = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setReady(true);
        observer.disconnect();
      }
    }, { rootMargin: '400px' });
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={element}>
      {ready ? children : (
        <div className="min-h-[400px] flex items-center justify-center bg-almona-dark/50">
          <a href={href} className="text-amber-300 underline p-4">{label}</a>
        </div>
      )}
    </div>
  );
}
