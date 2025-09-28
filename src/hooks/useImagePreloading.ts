import { useEffect, useCallback, useState } from 'react';
import { preloadImages, preloadImage } from '@/lib/imageOptimization';

interface PreloadConfig {
  src: string;
  options?: {
    width?: number;
    height?: number;
    quality?: number;
  };
}

interface UseImagePreloadingOptions {
  images: PreloadConfig[];
  enabled?: boolean;
  delay?: number;
  priority?: 'high' | 'medium' | 'low';
}

export function useImagePreloading({
  images,
  enabled = true,
  delay = 0,
  priority = 'medium'
}: UseImagePreloadingOptions) {
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);

  const preloadImagesList = useCallback(async () => {
    if (!enabled || images.length === 0) return;

    setIsPreloading(true);
    setPreloadProgress(0);

    try {
      const imagePromises = images.map(async (config, index) => {
        try {
          await preloadImage(config.src, config.options);
          setPreloadedImages(prev => new Set([...prev, config.src]));
          setPreloadProgress(((index + 1) / images.length) * 100);
        } catch (error) {
          console.warn(`Failed to preload image: ${config.src}`, error);
        }
      });

      await Promise.allSettled(imagePromises);
    } catch (error) {
      console.error('Image preloading failed:', error);
    } finally {
      setIsPreloading(false);
    }
  }, [images, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const timeoutId = setTimeout(() => {
      preloadImagesList();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [preloadImagesList, delay, enabled]);

  return {
    preloadedImages,
    isPreloading,
    preloadProgress,
    preloadImages: preloadImagesList
  };
}

// Hook for preloading images on route change
export function useRouteImagePreloading(routeImages: Record<string, PreloadConfig[]>) {
  const [currentRoute, setCurrentRoute] = useState<string>('');

  const preloadRouteImages = useCallback(async (route: string) => {
    const images = routeImages[route];
    if (!images || images.length === 0) return;

    try {
      await preloadImages(images.map(config => ({
        src: config.src,
        options: config.options
      })));
      console.log(`Preloaded ${images.length} images for route: ${route}`);
    } catch (error) {
      console.warn(`Failed to preload images for route ${route}:`, error);
    }
  }, [routeImages]);

  return {
    currentRoute,
    setCurrentRoute,
    preloadRouteImages
  };
}

// Hook for preloading critical images
export function useCriticalImagePreloading() {
  const [criticalImagesLoaded, setCriticalImagesLoaded] = useState(false);

  useEffect(() => {
    // Preload critical images immediately
    const criticalImages = [
      { src: '/logo.png', options: { width: 200, height: 60, quality: 90 } },
      { src: '/images/hero-bg.jpg', options: { width: 1920, height: 1080, quality: 85 } },
      { src: '/images/placeholder-machine.jpg', options: { width: 400, height: 300, quality: 80 } }
    ];

    const preloadCritical = async () => {
      try {
        await preloadImages(criticalImages);
        setCriticalImagesLoaded(true);
        console.log('Critical images preloaded');
      } catch (error) {
        console.warn('Failed to preload critical images:', error);
      }
    };

    preloadCritical();
  }, []);

  return {
    criticalImagesLoaded
  };
}

// Hook for preloading images on hover
export function useHoverImagePreloading() {
  const [hoveredImages, setHoveredImages] = useState<Set<string>>(new Set());

  const preloadOnHover = useCallback((src: string, options?: { width?: number; height?: number; quality?: number }) => {
    if (hoveredImages.has(src)) return;

    setHoveredImages(prev => new Set([...prev, src]));
    
    // Debounce preloading
    const timeoutId = setTimeout(async () => {
      try {
        await preloadImage(src, options);
        console.log(`Preloaded image on hover: ${src}`);
      } catch (error) {
        console.warn(`Failed to preload image on hover: ${src}`, error);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [hoveredImages]);

  return {
    preloadOnHover,
    hoveredImages
  };
}
