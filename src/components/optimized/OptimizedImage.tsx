import { getBestImageFormat, getOptimizedImageUrl } from '@/lib/imageOptimization';
import { memo, useEffect, useRef, useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  quality?: number;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  priority = false,
  quality = 80,
  placeholder,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [optimizedSrc, setOptimizedSrc] = useState<string>('');
  const [bestFormat, setBestFormat] = useState<'avif' | 'webp' | 'jpeg'>('jpeg');
  
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Get best image format on mount
  useEffect(() => {
    void getBestImageFormat().then(format => {
      setBestFormat(format);
    });
  }, []);

  // Generate optimized image URL
  useEffect(() => {
    if (isInView && src) {
      const optimized = getOptimizedImageUrl(src, {
        width,
        height,
        quality,
        format: bestFormat === 'jpeg' ? 'auto' : bestFormat
      });
      setOptimizedSrc(optimized);
    }
  }, [src, width, height, quality, bestFormat, isInView]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Show placeholder while loading
  if (!isInView || !optimizedSrc) {
    return (
      <div
        ref={imgRef}
        className={`bg-card animate-pulse flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        {placeholder ? (
          <img
            src={placeholder}
            alt=""
            className="w-full h-full object-cover opacity-50"
          />
        ) : (
          <div className="text-muted-foreground text-sm">Loading...</div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-card animate-pulse flex items-center justify-center">
          {placeholder ? (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="text-muted-foreground text-sm">Loading...</div>
          )}
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-card flex items-center justify-center">
          <div className="text-muted-foreground text-sm text-center">
            <div className="mb-2">⚠️</div>
            <div>Image unavailable</div>
          </div>
        </div>
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        className={`w-full h-full object-contain object-center transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : 'auto'
        }}
      />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';
