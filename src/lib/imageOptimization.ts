// Image optimization utilities for better performance

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  lazy?: boolean;
}

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
}

/**
 * Generate optimized image URL with WebP/AVIF support
 */
export function getOptimizedImageUrl(
  originalSrc: string,
  options: ImageOptimizationOptions = {}
): string {
  const {
    width,
    height,
    quality = 80,
    format = 'webp'
  } = options;

  // If it's already an external URL or data URL, return as-is
  if (originalSrc.startsWith('http') || originalSrc.startsWith('data:')) {
    return originalSrc;
  }

  // For local images, we can add optimization parameters
  // In a real implementation, you'd use a service like Cloudinary, Vercel Image Optimization, etc.
  const params = new URLSearchParams();
  
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  if (quality !== 80) params.set('q', quality.toString());
  if (format !== 'webp') params.set('f', format);

  const queryString = params.toString();
  return queryString ? `${originalSrc}?${queryString}` : originalSrc;
}

/**
 * Check if browser supports WebP format
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

/**
 * Check if browser supports AVIF format
 */
export function supportsAVIF(): Promise<boolean> {
  return new Promise((resolve) => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEAwgMgkfAAAADHEAAAAA';
  });
}

/**
 * Get the best supported image format
 */
export async function getBestImageFormat(): Promise<'avif' | 'webp' | 'jpeg'> {
  if (await supportsAVIF()) return 'avif';
  if (await supportsWebP()) return 'webp';
  return 'jpeg';
}

/**
 * Preload critical images
 */
export function preloadImage(src: string, options: ImageOptimizationOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = getOptimizedImageUrl(src, options);
  });
}

/**
 * Preload multiple images
 */
export async function preloadImages(
  images: Array<{ src: string; options?: ImageOptimizationOptions }>
): Promise<void> {
  const promises = images.map(({ src, options }) => preloadImage(src, options));
  await Promise.allSettled(promises);
}

/**
 * Generate responsive image sources for different screen sizes
 */
export function generateResponsiveImageSources(
  baseSrc: string,
  sizes: Array<{ width: number; media?: string }>
): Array<{ src: string; media?: string; width: number }> {
  return sizes.map(({ width, media }) => ({
    src: getOptimizedImageUrl(baseSrc, { width, format: 'webp' }),
    media,
    width
  }));
}

/**
 * Lazy loading image component props
 */
export function getLazyImageProps(
  src: string,
  alt: string,
  options: ImageOptimizationOptions = {}
): OptimizedImageProps {
  return {
    src: getOptimizedImageUrl(src, options),
    alt,
    loading: options.lazy !== false ? 'lazy' : 'eager',
    width: options.width,
    height: options.height
  };
}
