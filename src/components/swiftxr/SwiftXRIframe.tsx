import React from 'react';
import { motion } from 'framer-motion';

interface SwiftXRIframeProps {
  title?: string;
  projectUrl?: string;
  height?: string;
  className?: string;
}

/**
 * SwiftXR Iframe Component
 * Embeds SwiftXR projects using iframe
 */
export const SwiftXRIframe: React.FC<SwiftXRIframeProps> = ({
  title = "Almona",
  projectUrl = "https://almona.swiftxr.site/almona",
  height = "480px",
  className = ""
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`w-full ${className}`}
      style={{ height }}
    >
      <div 
        className="w-full h-full rounded-lg overflow-hidden border border-almona-orange/20 shadow-lg"
        style={{ height }}
      >
        <iframe
          title={title}
          allowFullScreen
          allow="fullscreen; autoplay; xr-spatial-tracking; camera; midi; encrypted-media;"
          width="100%"
          height="100%"
          src={projectUrl}
          className="w-full h-full border-0"
          loading="lazy"
        />
      </div>
    </motion.div>
  );
};

export default SwiftXRIframe;

