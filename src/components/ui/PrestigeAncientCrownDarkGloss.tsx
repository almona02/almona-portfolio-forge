import React from "react";
import { cn } from "@/lib/utils";

interface PrestigeAncientCrownDarkGlossProps {
  className?: string;
  size?: number;
}

/*
  PrestigeAncientCrownDarkGloss
  - Variant with heavier clear gloss and darker gold tones.
  - Same API as the other icons: { className?, size? }
*/
export const PrestigeAncientCrownDarkGloss: React.FC<PrestigeAncientCrownDarkGlossProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-ancient-crown-dark-gloss", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      {/* Darker Gold Gradient */}
      <linearGradient id="darkGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="35%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="70%" stopColor="#92400E" stopOpacity="1" />
        <stop offset="100%" stopColor="#D97706" stopOpacity="1" />
      </linearGradient>

      {/* Stronger peripheral vignette for age/depth */}
      <radialGradient id="depthVignette" cx="50%" cy="60%" r="75%">
        <stop offset="0%" stopColor="#000" stopOpacity="0" />
        <stop offset="60%" stopColor="#000" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
      </radialGradient>

      {/* Heavier metallic sheen */}
      <linearGradient id="heavySheen" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
        <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.3" />
        <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.12" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>

      {/* Heavier clear water gloss with cool tint */}
      <linearGradient id="heavyWaterGloss" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.92" />
        <stop offset="45%" stopColor="#DAF1FF" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>

      {/* Stronger ripple for the gloss */}
      <filter id="rippleStrong" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="7" result="noise" />
        <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
        <feGaussianBlur in="mono" stdDeviation="0.8" result="blurred" />
        <feDisplacementMap in="SourceGraphic" in2="blurred" scale="3" xChannelSelector="R" yChannelSelector="G" />
      </filter>

      {/* Slightly stronger shadow */}
      <filter id="softShadowStrong" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.8" />
        <feOffset dx="1.4" dy="2.4" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.45" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Stronger specular highlights */}
      <filter id="specularStrong" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="0.7" result="blur" />
        <feSpecularLighting in="blur" surfaceScale="2.4" specularConstant="0.9" specularExponent="22" lightingColor="#ffffff" result="spec">
          <fePointLight x="30" y="8" z="50" />
        </feSpecularLighting>
        <feComposite in="spec" in2="SourceGraphic" operator="in" result="specOut" />
        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="specOut" />
        </feMerge>
      </filter>

      {/* Denser hatch for band engraving */}
      <pattern id="bandHatchDense" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(20)">
        <rect x="0" y="0" width="4" height="4" fill="transparent" />
        <rect x="0" y="0" width="1" height="4" fill="#78350F" opacity="0.45" />
        <rect x="2" y="0" width="0.6" height="4" fill="#92400E" opacity="0.35" />
      </pattern>
    </defs>

    <g filter="url(#softShadowStrong)">
      {/* Base lower band (ancient semicircle) */}
      <path
        d="M 12 65
           Q 50 80 88 65
           L 88 72
           Q 50 87 12 72 Z"
        fill="url(#darkGold)"
        stroke="#5F260B"
        strokeWidth="0.75"
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
        fill="url(#darkGold)"
        stroke="#7C2D12"
        strokeWidth="0.85"
      />

      {/* Stronger inner vignette */}
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
        fill="url(#depthVignette)"
      />

      {/* Band overlay with denser engraved hatch */}
      <path
        d="M 14 66
           Q 50 79 86 66
           L 86 70
           Q 50 83 14 70 Z"
        fill="url(#bandHatchDense)"
        opacity="0.6"
      />

      {/* Heavy metallic sheen across peaks */}
      <path
        d="M 15 60
           C 28 55, 40 48, 50 40
           C 60 48, 72 55, 85 60
           L 85 61.2
           C 72 56, 60 50, 50 42
           C 40 50, 28 56, 15 61.2 Z"
        fill="url(#heavySheen)"
        opacity="0.75"
      />

      {/* Thick water-gloss cap over the rim */}
      <path
        d="M 16 63
           C 32 58, 68 58, 84 63
           C 68 61, 32 61, 16 63 Z"
        fill="url(#heavyWaterGloss)"
        filter="url(#rippleStrong)"
        opacity="0.95"
      />

      {/* Narrow highlight streak at the top of the band */}
      <path
        d="M 18 64.8
           Q 50 59.8 82 64.8"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.55"
        strokeWidth="0.9"
        strokeLinecap="round"
      />

      {/* Central jewel with stronger specular */}
      <g filter="url(#specularStrong)">
        <circle cx="50" cy="30" r="3.8" fill="#EAB308" stroke="#7C2D12" strokeWidth="0.6" />
        <circle cx="50" cy="29" r="1.8" fill="#FFFFFF" opacity="0.9" />
      </g>

      {/* Side jewels */}
      <g filter="url(#specularStrong)">
        <circle cx="36" cy="40" r="2.6" fill="#F59E0B" stroke="#7C2D12" strokeWidth="0.5" />
        <circle cx="64" cy="40" r="2.6" fill="#F59E0B" stroke="#7C2D12" strokeWidth="0.5" />
      </g>

      {/* Engraved ancient dots along the band (more pronounced) */}
      <g opacity="0.95">
        {Array.from({ length: 9 }).map((_, i) => {
          const t = i / 8; // 0..1
          const x = 14 + (86 - 14) * t;
          const y = 68 - 3.2 * Math.sin(Math.PI * t);
          return <circle key={i} cx={x} cy={y} r={1.05} fill="#D97706" opacity={0.95} />;
        })}
      </g>

      {/* Emphasized outline */}
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
        stroke="#5B210A"
        strokeWidth="0.6"
        opacity="0.95"
      />
    </g>
  </svg>
);

export default PrestigeAncientCrownDarkGloss;
