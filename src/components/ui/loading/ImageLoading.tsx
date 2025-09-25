import React from 'react';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from './LoadingSkeleton';
import { Image, Camera, Loader2 } from 'lucide-react';

interface ImageLoadingProps {
  className?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape';
  showIcon?: boolean;
  message?: string;
}

const aspectRatioClasses = {
  square: 'aspect-square',
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]'
};

export const ImageLoading: React.FC<ImageLoadingProps> = ({
  className,
  aspectRatio = 'square',
  showIcon = true,
  message = 'Loading image...'
}) => {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center bg-gray-100 dark:bg-gray-800',
        aspectRatioClasses[aspectRatio],
        className
      )}
      role="status"
      aria-label={message}
    >
      <LoadingSkeleton 
        className="absolute inset-0" 
        animation="wave"
      />
      
      {showIcon && (
        <div className="relative z-10 flex flex-col items-center space-y-2 text-gray-500 dark:text-gray-400">
          <div className="relative">
            <Camera className="h-8 w-8 animate-pulse" />
            <Loader2 className="absolute -top-1 -right-1 h-4 w-4 animate-spin text-blue-500" />
          </div>
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}
      
      <span className="sr-only">{message}</span>
    </div>
  );
};

export default ImageLoading;
