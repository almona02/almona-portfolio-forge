import manifest from './publicImageVariants.json';

interface PublicImage {
  width: number;
  height: number;
  variants: { src: string; width: number }[];
}

export function publicImage(src: string): PublicImage | undefined {
  return (manifest as Record<string, PublicImage>)[src];
}

export function publicImageSrcSet(src: string): string | undefined {
  return publicImage(src)?.variants.map(variant => `${variant.src} ${variant.width}w`).join(', ');
}
