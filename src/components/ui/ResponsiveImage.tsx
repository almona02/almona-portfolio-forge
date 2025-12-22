import React, { useState, useEffect } from 'react';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  fallback?: string;
}

/**
 * ResponsiveImage - Optimized image component with WebP support and responsive sizes
 * 
 * Features:
 * - Automatic WebP detection and fallback
 * - Responsive image sizes (srcset)
 * - Lazy loading for below-fold images
 * - Loading skeleton
 * - Error handling
 * 
 * @example
 * <ResponsiveImage
 *   src="/images/hero.jpg"
 *   alt="Hero image"
 *   priority={true}
 *   sizes="100vw"
 * />
 */
export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  quality = 80,
  fallback,
  onImageLoad
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasWebP, setHasWebP] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Check if browser supports WebP
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      setHasWebP(webpSupported);
    }
  }, []);

  // Generate responsive srcset
  const generateSrcSet = (basePath: string, extension: string) => {
    // If image path already includes size suffix, use it
    if (basePath.match(/-\d+w\.(webp|jpg|jpeg|png)$/)) {
      // Already has responsive sizes
      return undefined;
    }

    // Generate responsive sizes
    const sizes = [400, 800, 1200, 1600, 2000];
    const baseName = basePath.replace(`.${extension}`, '');
    
    return sizes
      .map(size => `${baseName}-${size}w.${extension} ${size}w`)
      .join(', ');
  };

  // Extract base path and extension
  const extension = src.split('.').pop()?.toLowerCase() || 'jpg';
  const basePath = src.replace(`.${extension}`, '');
  
  // Determine final src and srcset
  let finalSrc = src;
  let finalSrcSet: string | undefined;
  let webpSrcSet: string | undefined;

  // If WebP is supported, prefer WebP
  if (hasWebP && !src.endsWith('.webp')) {
    const webpPath = `${basePath}.webp`;
    finalSrc = webpPath;
    finalSrcSet = generateSrcSet(basePath, 'webp');
    
    // Also provide original format as fallback
    const originalSrcSet = generateSrcSet(basePath, extension);
    if (originalSrcSet) {
      // Fallback srcset for browsers that don't support WebP
      finalSrcSet = `${finalSrcSet}, ${originalSrcSet}`;
    }
  } else {
    finalSrcSet = generateSrcSet(basePath, extension);
  }

  // For WebP, also create WebP srcset
  if (hasWebP && !src.endsWith('.webp')) {
    webpSrcSet = generateSrcSet(basePath, 'webp');
  }

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
    // Try fallback if provided
    if (fallback && finalSrc !== fallback) {
      finalSrc = fallback;
      setError(false);
    }
  };

  // Expose load state via callback (for parent components that need to know when image loads)
  useEffect(() => {
    if (isLoaded && onImageLoad) {
      onImageLoad();
    }
  }, [isLoaded, onImageLoad]);

  return (
    <picture>
      {/* WebP source with responsive sizes */}
      {hasWebP && webpSrcSet && (
        <source
          type="image/webp"
          srcSet={webpSrcSet}
          sizes={sizes}
        />
      )}
      
      {/* Fallback image */}
      <img
        src={finalSrc}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        width={width}
        height={height}
        srcSet={finalSrcSet}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={() => {
          handleLoad();
          if (onImageLoad) {
            onImageLoad();
          }
        }}
        onError={handleError}
        style={{
          contentVisibility: 'auto',
          contain: 'layout style paint'
        }}
      />
      
      {/* Loading skeleton */}
      {!isLoaded && !error && (
        <div 
          className={`${className} bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 animate-pulse`}
          style={{ width, height }}
          aria-hidden="true"
        />
      )}
      
      {/* Error state */}
      {error && (
        <div 
          className={`${className} bg-slate-100 dark:bg-slate-800 flex items-center justify-center`}
          style={{ width, height }}
        >
          <span className="text-slate-400 text-sm">Image failed to load</span>
        </div>
      )}
    </picture>
  );
};

/**
 * LCPImage - Special component for LCP images (above the fold)
 * Automatically sets priority and optimal sizes
 */
export const LCPImage: React.FC<Omit<ResponsiveImageProps, 'priority' | 'sizes'>> = (props) => {
  return (
    <ResponsiveImage
      {...props}
      priority={true}
      sizes="100vw"
      quality={90}
    />
  );
};

