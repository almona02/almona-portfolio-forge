import React from 'react';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

/**
 * ResponsiveImage component that handles responsive images with srcset and sizes
 * Uses vite-imagetools for image optimization and WebP conversion
 */
const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  className,
  sizes = '100vw',
  width,
  height,
  priority = false,
}) => {
  // Generate srcSet using vite-imagetools
  // The ?w= parameter is handled by vite-imagetools to generate different sizes
  // The ?format=webp parameter converts the image to WebP format
  const srcSet = `
    ${src}?w=320&format=webp 320w,
    ${src}?w=640&format=webp 640w,
    ${src}?w=768&format=webp 768w,
    ${src}?w=1024&format=webp 1024w,
    ${src}?w=1280&format=webp 1280w
  `.trim();

  // Fallback srcSet for browsers that don't support WebP
  const fallbackSrcSet = `
    ${src}?w=320 320w,
    ${src}?w=640 640w,
    ${src}?w=768 768w,
    ${src}?w=1024 1024w,
    ${src}?w=1280 1280w
  `.trim();

  return (
    <picture>
      {/* WebP source */}
      <source
        type="image/webp"
        srcSet={srcSet}
        sizes={sizes}
      />
      {/* Fallback source */}
      <source
        srcSet={fallbackSrcSet}
        sizes={sizes}
      />
      {/* Fallback img */}
      <img
        src={`${src}?w=640`} // Default size fallback
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
      />
    </picture>
  );
};

export default ResponsiveImage;
