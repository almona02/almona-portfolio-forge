import React, { useEffect } from 'react';

/**
 * UniversalARViewer
 * A lightweight wrapper around <model-viewer> providing:
 *  - Automatic loading of '@google/model-viewer' (dynamic import)
 *  - Cross-platform AR: Scene Viewer (Android), Quick Look (iOS), WebXR fallback
 *  - Simple React interface
 *
 * Notes:
 *  - Provide a .usdz via iosSrc for iOS AR
 *  - Optimize GLB with scripts/optimize-glb.mjs for mobile performance
 */
export interface UniversalARViewerProps {
  src: string;            // GLB / GLTF path
  iosSrc?: string;        // USDZ path (iOS)
  poster?: string;        // Poster image while loading
  alt?: string;           // Accessibility alt text
  ar?: boolean;           // Enable AR buttons
  autoRotate?: boolean;   // Auto rotate model
  cameraControls?: boolean; // Allow orbit controls
  exposure?: number;      // Lighting exposure
  shadowIntensity?: number; // Shadow intensity
  style?: React.CSSProperties;
  className?: string;
}

export function UniversalARViewer({
  src,
  iosSrc,
  poster,
  alt = '3D model',
  ar = true,
  autoRotate = true,
  cameraControls = true,
  exposure = 1,
  shadowIntensity = 1,
  style,
  className
}: UniversalARViewerProps) {
  useEffect(() => {
    // Inject CDN script if not already present
    const tagId = 'model-viewer-cdn-script';
    if (!document.getElementById(tagId)) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      script.id = tagId;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <model-viewer
      style={{ width: '100%', height: '100%', ...style }}
      class={className}
      // Core sources
      src={src}
      {...(iosSrc ? { 'ios-src': iosSrc } : {})}
      {...(poster ? { poster } : {})}
      // Accessibility
      alt={alt}
      // AR
      {...(ar ? { ar: '' } : {})}
      ar-modes="scene-viewer quick-look webxr"
      // Interaction
      {...(cameraControls ? { 'camera-controls': '' } : {})}
      touch-action="pan-y"
      // Animation & rotation
      autoplay
      {...(autoRotate ? { 'auto-rotate': '' } : {})}
      // Rendering tweaks
      exposure={String(exposure)}
      shadow-intensity={String(shadowIntensity)}
      // Performance hints
      loading="lazy"
      reveal="auto"
      // Fallback poster background color if poster missing
      data-js-focus-visible
    />
  );
}

export default UniversalARViewer;
