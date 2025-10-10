import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'eager' | 'lazy';
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * OptimizedImage Component
 * 
 * Provides WebP format support, lazy loading, and responsive image optimization
 * Automatically falls back to original format if WebP is not supported
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  width,
  height,
  loading = 'lazy',
  priority = false,
  onLoad,
  onError
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Generate WebP version path
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  
  // Generate responsive sizes
  const generateSrcSet = (baseSrc: string) => {
    const ext = baseSrc.split('.').pop();
    const baseUrl = baseSrc.replace(`.${ext}`, '');
    
    return [
      `${baseUrl}-400w.${ext} 400w`,
      `${baseUrl}-800w.${ext} 800w`,
      `${baseUrl}-1200w.${ext} 1200w`,
      `${baseSrc} 1600w`
    ].join(', ');
  };

  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    onError?.();
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Loading placeholder */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gradient-to-r from-almona-darker via-almona-dark to-almona-darker animate-pulse">
          <div className="flex items-center justify-center h-full">
            <div className="text-almona-light/50">Loading...</div>
          </div>
        </div>
      )}

      {/* WebP Image with fallback */}
      <picture>
        {/* WebP source for modern browsers */}
        <source
          srcSet={generateSrcSet(webpSrc)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          type="image/webp"
        />
        
        {/* Fallback for browsers that don't support WebP */}
        <source
          srcSet={generateSrcSet(src)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          type="image/jpeg"
        />
        
        {/* Main image element */}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : loading}
          decoding="async"
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            {
              "opacity-0": !imageLoaded && !imageError,
              "opacity-100": imageLoaded,
              "scale-110 hover:scale-105": imageLoaded
            }
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      </picture>

      {/* Error fallback */}
      {imageError && (
        <div className="absolute inset-0 bg-almona-darker flex items-center justify-center">
          <div className="text-center text-almona-light/70">
            <div className="text-4xl mb-2">📷</div>
            <div className="text-sm">Image not available</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;