import React from 'react';
import { publicImage, publicImageSrcSet } from '@/lib/publicImages';
import { generateSrcSet, optimizeImage, supportsWebP, supportsAVIF } from '@/lib/imageOptimization';
import type { OptimizedImageOptions } from '@/lib/imageOptimization';

export interface OptimizedImageProps extends OptimizedImageOptions {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
}

/**
 * OptimizedImage Component
 * 
 * React component wrapper for optimized images with lazy loading.
 * Provides WebP/AVIF support with fallback to original format.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 80,
  format = 'auto',
  lazy = true,
  className = '',
  priority = false,
  onLoad,
  onError,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
}) => {
  const localImage = publicImage(src);
  const isLocal = src.startsWith('/');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [supportsWebPFormat, setSupportsWebPFormat] = React.useState<boolean | null>(null);
  const [supportsAVIFFormat, setSupportsAVIFFormat] = React.useState<boolean | null>(null);

  // Detect browser support for modern formats
  React.useEffect(() => {
    if (isLocal) return;
    void supportsWebP().then(setSupportsWebPFormat);
    void supportsAVIF().then(setSupportsAVIFFormat);
  }, [isLocal]);

  const handleLoad = React.useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Generate optimized URLs
  const optimizedData = React.useMemo(() => {
    if (isLocal) return { src, fallbackSrc: src, srcSet: undefined };
    return optimizeImage(src, { width, height, quality, format, lazy });
  }, [src, width, height, quality, format, lazy, isLocal]);

  // Generate srcSet with format variants
  const webpSrcSet = React.useMemo(() => {
    if (isLocal) return publicImageSrcSet(src) || '';
    if (format === 'auto' || format === 'webp') {
      return generateSrcSet(src, { width, height, quality, format: 'webp', lazy });
    }
    return '';
  }, [src, width, height, quality, format, lazy, isLocal]);

  const avifSrcSet = React.useMemo(() => {
    if (isLocal) return '';
    if (format === 'auto' || format === 'avif') {
      return generateSrcSet(src, { width, height, quality, format: 'avif', lazy });
    }
    return '';
  }, [src, width, height, quality, format, lazy, isLocal]);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <span className="text-gray-500 text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <picture>
      {/* AVIF source (best compression) */}
      {supportsAVIFFormat && avifSrcSet && (
        <source srcSet={avifSrcSet} sizes={sizes} type="image/avif" />
      )}
      
      {/* WebP source (good compression, wider support) */}
      {(supportsWebPFormat || supportsWebPFormat === null) && webpSrcSet && (
        <source srcSet={webpSrcSet} sizes={sizes} type="image/webp" />
      )}
      
      {/* Fallback image */}
      <img
        src={optimizedData.fallbackSrc}
        srcSet={optimizedData.srcSet}
        alt={alt}
        width={width || localImage?.width}
        height={height || localImage?.height}
        loading={priority ? 'eager' : (lazy ? 'lazy' : 'eager')}
        decoding="async"
        className={`${priority || isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ${className}`}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={handleLoad}
        onError={handleError}
        sizes={sizes}
      />
    </picture>
  );
};

export default OptimizedImage;

