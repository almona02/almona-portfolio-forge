import React, { useState, useEffect, ImgHTMLAttributes } from "react";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className, ...rest }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
  }, [src]);

  return (
    <img
      src={loaded ? src : undefined}
      data-src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      {...rest}
      aria-busy={!loaded}
      aria-label={alt}
    />
  );
};

export default LazyImage;
