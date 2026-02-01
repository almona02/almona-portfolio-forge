import { cn } from "@/lib/utils";
import React from "react";

interface AlmonaNavbarLogoProps {
  className?: string;
  size?: number;
}

/**
 * AlmonaNavbarLogo - Orange square logo with radiating circular design
 * Matches the brand specification with orange background and golden text
 */
export const AlmonaNavbarLogo: React.FC<AlmonaNavbarLogoProps> = ({
  className,
  size = 36,
}) => {
  return (
    <div className={cn("relative flex-shrink-0", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id="radialGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FFC107" stopOpacity="1" />
            <stop offset="100%" stopColor="#FF8C00" stopOpacity="0.8" />
          </radialGradient>
        </defs>
        
        {/* Center black dot */}
        <circle cx="50" cy="50" r="3" fill="#000000" />
        
        {/* Radiating lines - circular pattern */}
        {[...Array(24)].map((_, i) => {
          const angle = (i * 15) * Math.PI / 180;
          const x1 = 50 + 8 * Math.cos(angle);
          const y1 = 50 + 8 * Math.sin(angle);
          const x2 = 50 + 25 * Math.cos(angle);
          const y2 = 50 + 25 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="url(#radialGlow)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </div>
  );
};

export default AlmonaNavbarLogo;

