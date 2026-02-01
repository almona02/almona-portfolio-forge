import React from "react";
import { cn } from "@/lib/utils";

interface PrestigeCrownLogoProps {
  className?: string;
  size?: number;
}

/**
 * PrestigeCrownLogo - Exact match to ALMONA logo crown design
 * 5-peak crown with prestige gold colors
 * Matches the original logo design exactly
 */
export const PrestigeCrownLogo: React.FC<PrestigeCrownLogoProps> = ({
  className,
  size = 32,
}) => {
  // Calculate height to maintain aspect ratio (crown is wider than tall)
  // Original viewBox is 200x120, so aspect ratio is 200/120 = 1.67
  const height = size / 1.67;
  
  return (
    <svg
      className={cn("prestige-crown-logo flex-shrink-0", className)}
      width={size}
      height={height}
      viewBox="0 0 200 120"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ 
        display: 'block',
        maxWidth: '100%',
        height: 'auto'
      }}
    >
      <defs>
        {/* Prestige Gold Gradient - Architectural alignment with design system */}
        {/* Colors match prestige-design-system.css: Amber 400 → 500 → 600 */}
        <linearGradient id="prestigeGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" /> {/* --color-accent-gold-primary: Amber 400 */}
          <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" /> {/* --color-accent-gold-secondary: Amber 500 */}
          <stop offset="100%" stopColor="#d97706" stopOpacity="1" /> {/* --color-accent-gold-dark: Amber 600 */}
        </linearGradient>
      </defs>
      
      {/* Crown - 5 peaks: central tallest, two medium, two shorter at edges */}
      {/* Complete closed path forming the full crown outline */}
      <path
        d="M 10 100
           C 15 85, 20 80, 25 100
           C 30 90, 35 85, 45 100
           C 55 60, 65 55, 75 100
           C 80 90, 85 85, 95 100
           C 100 15, 105 15, 110 100
           C 115 85, 120 90, 125 100
           C 135 55, 145 60, 155 100
           C 165 85, 170 90, 175 100
           C 180 80, 185 85, 190 100
           L 190 110
           L 10 110
           Z"
        fill="none"
        stroke="url(#prestigeGold)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="1"
      />
    </svg>
  );
};

export default PrestigeCrownLogo;

