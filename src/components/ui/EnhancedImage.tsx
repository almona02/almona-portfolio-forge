import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ImageLoading } from './loading/ImageLoading';
import { Image, AlertCircle } from 'lucide-react';

interface EnhancedImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape' | 'auto';
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
  showLoadingIcon?: boolean;
  loadingMessage?: string;
}

export const EnhancedImage: React.FC<EnhancedImageProps> = ({
  src,
  alt,
  className,
  aspectRatio = 'auto',
  loading = 'lazy',
  onLoad,
  onError,
  fallback,
  showLoadingIcon = true,
  loadingMessage = 'Loading image...'
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (loading === 'lazy' && imgRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        },
        { threshold: 0.1 }
      );

      observerRef.current.observe(imgRef.current);
    } else {
      setIsInView(true);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loading]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.(new Error(`Failed to load image: ${src}`));
  };

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]',
    auto: ''
  };

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 dark:bg-gray-800',
          aspectRatioClasses[aspectRatio],
          className
        )}
        role="img"
        aria-label={`Failed to load: ${alt}`}
      >
        {fallback || (
          <div className="flex flex-col items-center space-y-2 text-gray-500 dark:text-gray-400">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">Failed to load image</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden',
        aspectRatioClasses[aspectRatio],
        className
      )}
    >
      {isLoading && (
        <ImageLoading
          className="absolute inset-0 z-10"
          aspectRatio={aspectRatio === 'auto' ? 'square' : aspectRatio}
          showIcon={showLoadingIcon}
          message={loadingMessage}
        />
      )}

      {isInView && (
        <img
          src={hasError ? '/placeholder.svg' : src}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={loading}
        />
      )}
    </div>
  );
};

export default EnhancedImage;
