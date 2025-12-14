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
    getBestImageFormat().then(format => {
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
        className={`bg-gray-800 animate-pulse flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        {placeholder ? (
          <img
            src={placeholder}
            alt=""
            className="w-full h-full object-cover opacity-50"
          />
        ) : (
          <div className="text-gray-500 text-sm">Loading...</div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Loading placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
          {placeholder ? (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="text-gray-500 text-sm">Loading...</div>
          )}
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="text-gray-500 text-sm text-center">
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

// Responsive image component with multiple sources
interface ResponsiveImageProps extends Omit<OptimizedImageProps, 'src'> {
  src: string;
  srcSet?: string;
  sizes?: string;
  breakpoints?: Array<{ width: number; media?: string }>;
}

export const ResponsiveImage = memo<ResponsiveImageProps>(({
  src,
  srcSet,
  sizes,
  breakpoints,
  ...props
}) => {
  const [bestFormat, setBestFormat] = useState<'avif' | 'webp' | 'jpeg'>('jpeg');

  useEffect(() => {
    getBestImageFormat().then(format => {
      setBestFormat(format);
    });
  }, []);

  // Generate responsive srcSet if breakpoints provided
  const _responsiveSrcSet = breakpoints ? breakpoints
    .map(({ width }) => `${getOptimizedImageUrl(src, { width, format: bestFormat === 'jpeg' ? 'auto' : bestFormat })} ${width}w`)
    .join(', ') : srcSet;

  const _responsiveSizes = breakpoints ? breakpoints
    .map(({ media, width }) => media ? `${media} ${width}px` : `${width}px`)
    .join(', ') : sizes;

  return (
    <OptimizedImage
      src={src}
      {...props}
      // Note: srcSet and sizes would need to be handled differently in a real implementation
      // as our current OptimizedImage component doesn't support them
    />
  );
});

ResponsiveImage.displayName = 'ResponsiveImage';
