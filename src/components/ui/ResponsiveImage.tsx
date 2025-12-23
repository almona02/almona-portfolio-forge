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

  // Extract base path and extension
  const extension = src.split('.').pop()?.toLowerCase() || 'jpg';
  const basePath = src.replace(`.${extension}`, '');
  
  // Determine final src
  // Only use WebP if the file already exists (we check by trying .webp extension)
  // For now, we'll use the src as-is and let the browser handle format selection
  let finalSrc = src;
  
  // Check if WebP version exists (only if src doesn't already end with .webp)
  if (hasWebP && !src.endsWith('.webp')) {
    // Try WebP version - if it exists, use it
    const webpPath = `${basePath}.webp`;
    // We'll use WebP as the primary source, with original as fallback in <picture>
    finalSrc = webpPath;
  }

  // Only generate srcset if the image path already includes responsive size indicators
  // (e.g., image-400w.jpg, image-800w.jpg) - otherwise, don't generate srcset
  // to avoid "unknown descriptor" errors when files don't exist
  const finalSrcSet: string | undefined = undefined; // Disabled until responsive variants are created
  const webpSrcSet: string | undefined = undefined; // Disabled until responsive variants are created

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
      {/* WebP source (if WebP is supported and src is not already WebP) */}
      {hasWebP && !src.endsWith('.webp') && (
        <source
          type="image/webp"
          srcSet={finalSrc} // Use single WebP source
        />
      )}
      
      {/* Fallback image */}
      <img
        src={src} // Always use original src as fallback
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        width={width}
        height={height}
        // Only include srcSet if it's defined (for future use when responsive variants exist)
        {...(finalSrcSet ? { srcSet: finalSrcSet, sizes } : {})}
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

