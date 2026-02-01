import React from "react";
import { cn } from "@/lib/utils";

interface PrestigeAncientCrownProps {
  className?: string;
  size?: number;
}

/*
  PrestigeAncientCrown
  - Dark gold, ancient motif with a clear glossy "water" sheen.
  - Keeps the same API as PrestigeCrown (className, size)
  - Contains subtle shadow, metallic gradients, and a ripple gloss overlay.
*/
export const PrestigeAncientCrown: React.FC<PrestigeAncientCrownProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-ancient-crown", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      {/* Dark Gold Core Gradient */}
      <linearGradient id="ancientGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity="1" />
        <stop offset="40%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="70%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#F59E0B" stopOpacity="1" />
      </linearGradient>

      {/* Edge burn for ancient depth */}
      <radialGradient id="ancientDepth" cx="50%" cy="60%" r="70%">
        <stop offset="0%" stopColor="#000" stopOpacity="0" />
        <stop offset="70%" stopColor="#000" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
      </radialGradient>

      {/* Metallic sheen streak */}
      <linearGradient id="metalSheen" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.50" />
        <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.15" />
        <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>

      {/* Clear glossy water highlight with subtle blue tint */}
      <linearGradient id="waterGloss" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
        <stop offset="55%" stopColor="#E6F4FF" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
      </linearGradient>

      {/* Ripple effect (very subtle) */}
      <filter id="waterRipple" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" result="noise" />
        <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
        <feGaussianBlur in="mono" stdDeviation="0.6" result="blurred" />
        <feDisplacementMap in="SourceGraphic" in2="blurred" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
      </filter>

      {/* Soft shadow */}
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
        <feOffset dx="1.2" dy="2" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.35" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Specular lighting for gemstone glints */}
      <filter id="specular" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" result="blur" />
        <feSpecularLighting in="blur" surfaceScale="2" specularConstant="0.6" specularExponent="18" lightingColor="#ffffff" result="spec">
          <fePointLight x="30" y="10" z="40" />
        </feSpecularLighting>
        <feComposite in="spec" in2="SourceGraphic" operator="in" result="specOut" />
        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="specOut" />
        </feMerge>
      </filter>

      {/* Band hatch for ancient engraved look */}
      <pattern id="bandHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(20)">
        <rect x="0" y="0" width="6" height="6" fill="transparent" />
        <rect x="0" y="0" width="1" height="6" fill="#92400E" opacity="0.25" />
      </pattern>
    </defs>

    <g filter="url(#softShadow)">
      {/* Base lower band (ancient semicircle) */}
      <path
        d="M 12 65
           Q 50 80 88 65
           L 88 72
           Q 50 87 12 72 Z"
        fill="url(#ancientGold)"
        stroke="#78350F"
        strokeWidth="0.6"
        opacity="0.98"
      />

      {/* Upper ornamental points - ancient stepped peaks */}
      <path
        d="M 12 65
           L 20 45
           L 29 52
           L 36 38
           L 44 46
           L 50 28
           L 56 46
           L 64 38
           L 71 52
           L 80 45
           L 88 65 Z"
        fill="url(#ancientGold)"
        stroke="#92400E"
        strokeWidth="0.7"
      />

      {/* Inner shadow depth overlay */}
      <path
        d="M 12 65
           L 20 45
           L 29 52
           L 36 38
           L 44 46
           L 50 28
           L 56 46
           L 64 38
           L 71 52
           L 80 45
           L 88 65
           L 88 72
           Q 50 87 12 72 Z"
        fill="url(#ancientDepth)"
      />

      {/* Band overlay with engraved hatch */}
      <path
        d="M 14 66
           Q 50 79 86 66
           L 86 70
           Q 50 83 14 70 Z"
        fill="url(#bandHatch)"
        opacity="0.45"
      />

      {/* Metallic sheen streak across peaks */}
      <path
        d="M 15 60
           C 28 55, 40 48, 50 40
           C 60 48, 72 55, 85 60
           L 85 61
           C 72 56, 60 50, 50 42
           C 40 50, 28 56, 15 61 Z"
        fill="url(#metalSheen)"
        opacity="0.55"
      />

      {/* Clear water-like gloss over top rim */}
      <path
        d="M 16 63
           C 32 58, 68 58, 84 63
           C 68 61, 32 61, 16 63 Z"
        fill="url(#waterGloss)"
        filter="url(#waterRipple)"
        opacity="0.7"
      />

      {/* Central jewel with specular effect */}
      <g filter="url(#specular)">
        <circle cx="50" cy="30" r="3.6" fill="#FCD34D" stroke="#92400E" strokeWidth="0.5" />
        <circle cx="50" cy="29.2" r="1.6" fill="#FFFFFF" opacity="0.8" />
      </g>

      {/* Side jewels */}
      <g filter="url(#specular)">
        <circle cx="36" cy="40" r="2.4" fill="#FBBF24" stroke="#92400E" strokeWidth="0.4" />
        <circle cx="64" cy="40" r="2.4" fill="#FBBF24" stroke="#92400E" strokeWidth="0.4" />
      </g>

      {/* Engraved ancient dots along the band */}
      <g opacity="0.9">
        {Array.from({ length: 9 }).map((_, i) => {
          const t = i / 8; // 0..1
          const x = 14 + (86 - 14) * t;
          const y = 68 - 3 * Math.sin(Math.PI * t);
          return <circle key={i} cx={x} cy={y} r={0.9} fill="#F59E0B" opacity={0.85} />;
        })}
      </g>

      {/* Outline emphasis */}
      <path
        d="M 12 65
           L 20 45
           L 29 52
           L 36 38
           L 44 46
           L 50 28
           L 56 46
           L 64 38
           L 71 52
           L 80 45
           L 88 65"
        fill="transparent"
        stroke="#7C2D12"
        strokeWidth="0.5"
        opacity="0.9"
      />
    </g>
  </svg>
);

export default PrestigeAncientCrown;
