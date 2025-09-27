import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';
import { Model3DLoading } from './loading/Model3DLoading';

interface LazyWrapperProps {
  fallback?: ReactNode;
  delay?: number;
  children: ReactNode;
}

/**
 * Performance-optimized lazy loading wrapper
 * Provides consistent loading states and error boundaries
 */
export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  fallback = <Model3DLoading />, 
  delay = 200,
  children 
}) => {
  const [showFallback, setShowFallback] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Suspense fallback={showFallback ? fallback : null}>
      {children}
    </Suspense>
  );
};

/**
 * Higher-order component for lazy loading with performance optimizations
 */
export function withLazyLoading<T extends object>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  fallback?: ReactNode
) {
  const LazyComponent = lazy(importFunc);
  
  return React.forwardRef<HTMLElement, T>((props, ref) => (
    <LazyWrapper fallback={fallback}>
      <LazyComponent {...props} ref={ref} />
    </LazyWrapper>
  ));
}

/**
 * Preload function for critical components
 */
export function preloadComponent(importFunc: () => Promise<{ default: ComponentType<any> }>) {
  // Preload on idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFunc().catch((error) => {
        console.warn('Failed to preload component:', error);
      });
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      importFunc().catch((error) => {
        console.warn('Failed to preload component:', error);
      });
    }, 100);
  }
}

/**
 * Intersection Observer based lazy loading
 */
export function useIntersectionLazyLoad(
  threshold: number = 0.1,
  rootMargin: string = '50px'
) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, hasLoaded]);

  return { ref, isVisible, hasLoaded };
}

/**
 * Performance-optimized image lazy loading
 */
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholder?: string;
  fallback?: string;
  threshold?: number;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  placeholder,
  fallback,
  threshold = 0.1,
  alt,
  ...props
}) => {
  const { ref, isVisible } = useIntersectionLazyLoad(threshold);
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [imageRef, setImageRef] = React.useState<HTMLImageElement | null>(null);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    if (isVisible && src) {
      setImageSrc(src);
    }
  }, [isVisible, src]);

  const handleError = React.useCallback(() => {
    if (fallback && !hasError) {
      setHasError(true);
      setImageSrc(fallback);
    }
  }, [fallback, hasError]);

  const handleRef = React.useCallback((el: HTMLImageElement | null) => {
    setImageRef(el);
    if (ref && typeof ref === 'object' && ref !== null) {
      (ref as React.MutableRefObject<HTMLImageElement | null>).current = el;
    }
  }, [ref]);

  return (
    <img
      ref={handleRef}
      src={imageSrc}
      alt={alt}
      onError={handleError}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
};

/**
 * Virtual scrolling hook for large lists
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length
  );

  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length, visibleEnd + overscan);

  const visibleItems = items.slice(startIndex, endIndex).map((item, index) => ({
    item,
    index: startIndex + index,
  }));

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  };
}

export default LazyWrapper;
