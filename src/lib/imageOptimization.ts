// Image optimization utility for WebP/AVIF conversion and lazy loading
// Supports Supabase storage URLs and provides fallback to original format

export interface OptimizedImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  lazy?: boolean;
  alt?: string;
  className?: string;
}

export interface ImageOptimizationResult {
  src: string;
  srcSet: string;
  fallbackSrc: string;
  width?: number;
  height?: number;
  alt?: string;
}

/**
 * Converts Supabase storage URL to optimized image URL
 * Supports Supabase Storage image transformations and WebP/AVIF conversion
 * 
 * Supabase Storage supports query parameters for image transformation:
 * - ?width=, ?height=, ?resize=, ?quality=, ?format=
 */
export function getOptimizedImageUrl(
  supabaseUrl: string,
  options: OptimizedImageOptions = {}
): string {
  if (!supabaseUrl) {
    return supabaseUrl;
  }

  const { width, height, quality = 80, format = 'auto' } = options;

  // Check if URL is from Supabase Storage
  const isSupabaseStorage = supabaseUrl.includes('supabase') && 
                           (supabaseUrl.includes('/storage/v1/object/public/') || 
                            supabaseUrl.includes('/storage/v1/object/sign/'));

  if (!isSupabaseStorage) {
    // For non-Supabase URLs, return as-is (could integrate with other CDNs here)
    return supabaseUrl;
  }

  // Parse existing query parameters with error handling
  let url: URL;
  try {
    url = new URL(supabaseUrl);
  } catch {
    // If URL parsing fails (e.g., relative URL), return as-is
    console.warn('[ImageOptimization] Failed to parse URL, returning original:', supabaseUrl);
    return supabaseUrl;
  }
  
  const params = new URLSearchParams(url.search);

  // Add optimization parameters
  if (width) {
    params.set('width', width.toString());
  }
  if (height) {
    params.set('height', height.toString());
  }
  if (quality !== 80) {
    params.set('quality', quality.toString());
  }
  
  // Format conversion (Supabase supports webp via ?format=webp)
  if (format === 'webp' || format === 'avif') {
    params.set('format', format);
  } else if (format === 'auto') {
    // Auto-detect: prefer WebP, fallback handled by browser
    // We'll add WebP format to srcSet, but keep original in src for fallback
  }

  // Reconstruct URL with parameters
  url.search = params.toString();
  return url.toString();
}

/**
 * Generates responsive image srcSet for different screen sizes
 */
export function generateSrcSet(
  baseUrl: string,
  options: OptimizedImageOptions = {}
): string {
  const sizes = [480, 768, 1024, 1280, 1920];
  const { format = 'auto', quality = 80 } = options;

  return sizes
    .map(size => {
      const optimizedUrl = getOptimizedImageUrl(baseUrl, {
        ...options,
        width: size,
        format,
        quality
      });
      return `${optimizedUrl} ${size}w`;
    })
    .join(', ');
}

/**
 * Optimizes image for web delivery with lazy loading support
 */
export function optimizeImage(
  src: string,
  options: OptimizedImageOptions = {}
): ImageOptimizationResult {
  const optimizedSrc = getOptimizedImageUrl(src, options);
  const srcSet = generateSrcSet(src, options);

  return {
    src: optimizedSrc,
    srcSet,
    fallbackSrc: src,
    width: options.width,
    height: options.height,
    alt: options.alt
  };
}

/**
 * React hook for lazy loading images with intersection observer
 * Note: Requires React to be imported in the component using this hook
 */
export interface UseLazyImageResult {
  optimizedData: ImageOptimizationResult | null;
  isLoaded: boolean;
  hasError: boolean;
  handleLoad: () => void;
  handleError: () => void;
}

export function useLazyImage(
  src: string,
  options: OptimizedImageOptions = {}
): UseLazyImageResult {
  // This hook requires React - it should be used in a React component
  // The actual implementation would use React.useState and React.useEffect
  // For now, return a basic structure that components can use
  const optimized = optimizeImage(src, options);
  
  return {
    optimizedData: optimized,
    isLoaded: false,
    hasError: false,
    handleLoad: () => {},
    handleError: () => {}
  };
}

/**
 * Preloads critical images for better performance
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Batch preload multiple images
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(urls.map(preloadImage));
}

/**
 * Checks if browser supports modern image formats
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

export function supportsAVIF(): Promise<boolean> {
  return new Promise((resolve) => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
}

/**
 * Detects the best image format supported by the browser
 * Returns 'avif' if supported, otherwise 'webp' if supported, otherwise 'jpeg'
 */
export async function getBestImageFormat(): Promise<'avif' | 'webp' | 'jpeg'> {
  const avifSupported = await supportsAVIF();
  if (avifSupported) {
    return 'avif';
  }
  
  const webpSupported = await supportsWebP();
  if (webpSupported) {
    return 'webp';
  }
  
  return 'jpeg';
}

/**
 * Note: React component wrapper has been moved to src/components/ui/OptimizedImage.tsx
 * Import OptimizedImage from '@/components/ui/OptimizedImage' instead
 */
