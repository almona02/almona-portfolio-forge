import { cn } from "@/lib/utils";
import React from "react";

interface PrestigePatternIconProps {
  className?: string;
  size?: number;
}

/*
  PrestigePatternIcons - Dark Gold Window/Door Pattern Icons
  Extracted from Egyptian window patterns database
  No background, clean grid layouts for use in pattern selector grids
*/

// Sliding 2-Sash Pattern
export const PrestigePatternSliding2Sash: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-sliding-2sash", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPattern" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Left sliding pane */}
    <rect x="10" y="15" width="35" height="70" fill="url(#darkGoldPattern)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Right sliding pane */}
    <rect x="55" y="15" width="35" height="70" fill="url(#darkGoldPattern)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Center interlock line */}
    <line x1="50" y1="15" x2="50" y2="85" stroke="#5F260B" strokeWidth="1" opacity="0.6" />
  </svg>
);

// Casement Double Pattern
export const PrestigePatternCasementDouble: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-casement-double", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPattern2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Left casement sash */}
    <rect x="10" y="15" width="35" height="70" fill="url(#darkGoldPattern2)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Right casement sash */}
    <rect x="55" y="15" width="35" height="70" fill="url(#darkGoldPattern2)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Center mullion */}
    <rect x="47" y="15" width="6" height="70" fill="#5F260B" opacity="0.8" />
    {/* Hinge indicators */}
    <circle cx="15" cy="25" r="1.5" fill="#F59E0B" opacity="0.7" />
    <circle cx="15" cy="75" r="1.5" fill="#F59E0B" opacity="0.7" />
    <circle cx="85" cy="25" r="1.5" fill="#F59E0B" opacity="0.7" />
    <circle cx="85" cy="75" r="1.5" fill="#F59E0B" opacity="0.7" />
  </svg>
);

// Fixed + Side Casements Pattern
export const PrestigePatternFixedSideCasements: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-fixed-side-casements", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPattern3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Left casement */}
    <rect x="10" y="15" width="22" height="70" fill="url(#darkGoldPattern3)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Center fixed */}
    <rect x="35" y="15" width="30" height="70" fill="url(#darkGoldPattern3)" stroke="#5F260B" strokeWidth="1.5" opacity="0.6" />
    {/* Right casement */}
    <rect x="68" y="15" width="22" height="70" fill="url(#darkGoldPattern3)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Mullions */}
    <rect x="32" y="15" width="3" height="70" fill="#5F260B" opacity="0.8" />
    <rect x="65" y="15" width="3" height="70" fill="#5F260B" opacity="0.8" />
    {/* Hinge indicators on casements */}
    <circle cx="15" cy="30" r="1" fill="#F59E0B" opacity="0.7" />
    <circle cx="15" cy="70" r="1" fill="#F59E0B" opacity="0.7" />
    <circle cx="85" cy="30" r="1" fill="#F59E0B" opacity="0.7" />
    <circle cx="85" cy="70" r="1" fill="#F59E0B" opacity="0.7" />
  </svg>
);

// Sliding 4-Sash Pattern
export const PrestigePatternSliding4Sash: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-sliding-4sash", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPattern4" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Pane 1 */}
    <rect x="10" y="15" width="18" height="70" fill="url(#darkGoldPattern4)" stroke="#5F260B" strokeWidth="1" />
    {/* Pane 2 */}
    <rect x="30" y="15" width="18" height="70" fill="url(#darkGoldPattern4)" stroke="#5F260B" strokeWidth="1" />
    {/* Pane 3 */}
    <rect x="52" y="15" width="18" height="70" fill="url(#darkGoldPattern4)" stroke="#5F260B" strokeWidth="1" />
    {/* Pane 4 */}
    <rect x="72" y="15" width="18" height="70" fill="url(#darkGoldPattern4)" stroke="#5F260B" strokeWidth="1" />
    {/* Mullions */}
    <line x1="28" y1="15" x2="28" y2="85" stroke="#5F260B" strokeWidth="0.8" opacity="0.7" />
    <line x1="50" y1="15" x2="50" y2="85" stroke="#5F260B" strokeWidth="0.8" opacity="0.7" />
    <line x1="70" y1="15" x2="70" y2="85" stroke="#5F260B" strokeWidth="0.8" opacity="0.7" />
  </svg>
);

// Sliding 3-Sash Center Fixed Pattern
export const PrestigePatternSliding3SashCenterFixed: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-sliding-3sash-center-fixed", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPattern5" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Left sliding */}
    <rect x="10" y="15" width="22" height="70" fill="url(#darkGoldPattern5)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Center fixed */}
    <rect x="35" y="15" width="30" height="70" fill="url(#darkGoldPattern5)" stroke="#5F260B" strokeWidth="1.2" opacity="0.5" />
    {/* Right sliding */}
    <rect x="68" y="15" width="22" height="70" fill="url(#darkGoldPattern5)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Mullions */}
    <line x1="33" y1="15" x2="33" y2="85" stroke="#5F260B" strokeWidth="0.8" opacity="0.7" />
    <line x1="67" y1="15" x2="67" y2="85" stroke="#5F260B" strokeWidth="0.8" opacity="0.7" />
  </svg>
);

// Panda Casement with Screen Pattern
export const PrestigePatternPandaCasementScreen: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-panda-casement-screen", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPattern6" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Outer glass sash */}
    <rect x="12" y="18" width="76" height="64" fill="url(#darkGoldPattern6)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Inner screen sash (slightly inset) */}
    <rect x="18" y="24" width="64" height="52" fill="url(#darkGoldPattern6)" stroke="#5F260B" strokeWidth="1" opacity="0.6" />
    {/* Screen mesh pattern */}
    <g opacity="0.4">
      <line x1="20" y1="26" x2="80" y2="26" stroke="#5F260B" strokeWidth="0.5" />
      <line x1="20" y1="32" x2="80" y2="32" stroke="#5F260B" strokeWidth="0.5" />
      <line x1="20" y1="38" x2="80" y2="38" stroke="#5F260B" strokeWidth="0.5" />
      <line x1="20" y1="44" x2="80" y2="44" stroke="#5F260B" strokeWidth="0.5" />
      <line x1="20" y1="50" x2="80" y2="50" stroke="#5F260B" strokeWidth="0.5" />
      <line x1="20" y1="56" x2="80" y2="56" stroke="#5F260B" strokeWidth="0.5" />
      <line x1="20" y1="62" x2="80" y2="62" stroke="#5F260B" strokeWidth="0.5" />
      <line x1="20" y1="68" x2="80" y2="68" stroke="#5F260B" strokeWidth="0.5" />
    </g>
    {/* Hinge indicators */}
    <circle cx="15" cy="30" r="1.5" fill="#F59E0B" opacity="0.8" />
    <circle cx="15" cy="70" r="1.5" fill="#F59E0B" opacity="0.8" />
  </svg>
);

// Window with Shish (Rolling Shutter) Pattern
export const PrestigePatternWindowWithShish: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-window-with-shish", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPattern7" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Shish box (rolling shutter) */}
    <rect x="12" y="12" width="76" height="12" fill="url(#darkGoldPattern7)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Shutter slats pattern */}
    <g opacity="0.5">
      <line x1="14" y1="14" x2="86" y2="14" stroke="#5F260B" strokeWidth="0.6" />
      <line x1="14" y1="16" x2="86" y2="16" stroke="#5F260B" strokeWidth="0.6" />
      <line x1="14" y1="18" x2="86" y2="18" stroke="#5F260B" strokeWidth="0.6" />
      <line x1="14" y1="20" x2="86" y2="20" stroke="#5F260B" strokeWidth="0.6" />
    </g>
    {/* Window below shish */}
    <rect x="12" y="28" width="76" height="54" fill="url(#darkGoldPattern7)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Hinge indicators */}
    <circle cx="15" cy="45" r="1" fill="#F59E0B" opacity="0.7" />
    <circle cx="15" cy="75" r="1" fill="#F59E0B" opacity="0.7" />
  </svg>
);

// Kitchen Door with ACP Bottom Pattern
export const PrestigePatternKitchenDoorACP: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-kitchen-door-acp", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPattern8" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Glass upper panel */}
    <rect x="15" y="12" width="70" height="45" fill="url(#darkGoldPattern8)" stroke="#5F260B" strokeWidth="1.5" />
    {/* ACP lower panel */}
    <rect x="15" y="60" width="70" height="28" fill="url(#darkGoldPattern8)" stroke="#5F260B" strokeWidth="1.5" opacity="0.7" />
    {/* Transom line */}
    <line x1="15" y1="58" x2="85" y2="58" stroke="#5F260B" strokeWidth="1" opacity="0.8" />
    {/* ACP texture pattern */}
    <g opacity="0.4">
      <line x1="20" y1="65" x2="80" y2="65" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="70" x2="80" y2="70" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="75" x2="80" y2="75" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="80" x2="80" y2="80" stroke="#5F260B" strokeWidth="0.4" />
    </g>
    {/* Hinge indicators */}
    <circle cx="18" cy="25" r="1.2" fill="#F59E0B" opacity="0.7" />
    <circle cx="18" cy="75" r="1.2" fill="#F59E0B" opacity="0.7" />
  </svg>
);

// Arched Window Pattern
export const PrestigePatternArchedWindow: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-arched-window", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPattern9" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Rectangular base */}
    <rect x="15" y="35" width="70" height="45" fill="url(#darkGoldPattern9)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Arched top */}
    <path
      d="M 15 35 Q 15 15, 50 12 Q 85 15, 85 35"
      fill="url(#darkGoldPattern9)"
      stroke="#5F260B"
      strokeWidth="1.5"
    />
    {/* Arch outline */}
    <path
      d="M 15 35 Q 15 15, 50 12 Q 85 15, 85 35"
      fill="none"
      stroke="#5F260B"
      strokeWidth="1"
      opacity="0.6"
    />
    {/* Hinge indicators */}
    <circle cx="18" cy="50" r="1" fill="#F59E0B" opacity="0.7" />
    <circle cx="18" cy="75" r="1" fill="#F59E0B" opacity="0.7" />
  </svg>
);

// Sliding Door 2-Panel Pattern
export const PrestigePatternSlidingDoor2Panel: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-sliding-door-2panel", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPattern10" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Left sliding door panel */}
    <rect x="10" y="10" width="35" height="80" fill="url(#darkGoldPattern10)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Right sliding door panel */}
    <rect x="55" y="10" width="35" height="80" fill="url(#darkGoldPattern10)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Center interlock line */}
    <line x1="50" y1="10" x2="50" y2="90" stroke="#5F260B" strokeWidth="1" opacity="0.6" />
    {/* Door handle indicators */}
    <circle cx="25" cy="50" r="1.5" fill="#F59E0B" opacity="0.8" />
    <circle cx="75" cy="50" r="1.5" fill="#F59E0B" opacity="0.8" />
  </svg>
);

// Fixed Window Pattern
export const PrestigePatternFixedWindow: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-fixed-window", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPattern11" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Single fixed lite */}
    <rect x="12" y="15" width="76" height="70" fill="url(#darkGoldPattern11)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Glass reflection lines */}
    <line x1="20" y1="20" x2="80" y2="20" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.3" />
    <line x1="20" y1="30" x2="80" y2="30" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.2" />
  </svg>
);

// French Door Pattern
export const PrestigePatternFrenchDoor: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-french-door", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPattern12" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Left door panel */}
    <rect x="10" y="10" width="35" height="80" fill="url(#darkGoldPattern12)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Right door panel */}
    <rect x="55" y="10" width="35" height="80" fill="url(#darkGoldPattern12)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Center mullion */}
    <rect x="47" y="10" width="6" height="80" fill="#5F260B" opacity="0.8" />
    {/* Hinge indicators */}
    <circle cx="15" cy="20" r="1.2" fill="#F59E0B" opacity="0.8" />
    <circle cx="15" cy="80" r="1.2" fill="#F59E0B" opacity="0.8" />
    <circle cx="85" cy="20" r="1.2" fill="#F59E0B" opacity="0.8" />
    <circle cx="85" cy="80" r="1.2" fill="#F59E0B" opacity="0.8" />
    {/* Door handles */}
    <circle cx="30" cy="50" r="1.5" fill="#F59E0B" opacity="0.7" />
    <circle cx="70" cy="50" r="1.5" fill="#F59E0B" opacity="0.7" />
  </svg>
);

// Bathroom/Kitchen Small Window - 70x70 Fixed Vent Top + Tilt Sash Bottom
export const PrestigePatternBathroomSmallVent: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-bathroom-small-vent", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternBath" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Fixed vent panel (top 70x70) */}
    <rect x="15" y="12" width="70" height="28" fill="url(#darkGoldPatternBath)" stroke="#5F260B" strokeWidth="1.2" opacity="0.5" />
    {/* Transom line */}
    <line x1="15" y1="42" x2="85" y2="42" stroke="#5F260B" strokeWidth="1" opacity="0.8" />
    {/* Tilt sash (bottom) - hinges at bottom */}
    <rect x="15" y="44" width="70" height="36" fill="url(#darkGoldPatternBath)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Hinge indicators at bottom */}
    <circle cx="20" cy="78" r="1.2" fill="#F59E0B" opacity="0.8" />
    <circle cx="80" cy="78" r="1.2" fill="#F59E0B" opacity="0.8" />
    {/* Vent slats pattern */}
    <g opacity="0.3">
      <line x1="20" y1="16" x2="80" y2="16" stroke="#5F260B" strokeWidth="0.5" />
      <line x1="20" y1="20" x2="80" y2="20" stroke="#5F260B" strokeWidth="0.5" />
      <line x1="20" y1="24" x2="80" y2="24" stroke="#5F260B" strokeWidth="0.5" />
      <line x1="20" y1="28" x2="80" y2="28" stroke="#5F260B" strokeWidth="0.5" />
    </g>
  </svg>
);

// Tilt Window - Hinges at Bottom (Bathroom/Kitchen Standard)
export const PrestigePatternTiltWindow: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-tilt-window", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternTilt" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Main tilt sash */}
    <rect x="12" y="15" width="76" height="65" fill="url(#darkGoldPatternTilt)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Hinge indicators at bottom (tilt axis) */}
    <circle cx="18" cy="78" r="1.5" fill="#F59E0B" opacity="0.9" />
    <circle cx="50" cy="78" r="1.5" fill="#F59E0B" opacity="0.9" />
    <circle cx="82" cy="78" r="1.5" fill="#F59E0B" opacity="0.9" />
    {/* Tilt angle indicator */}
    <path d="M 12 78 Q 50 65, 88 78" fill="none" stroke="#F59E0B" strokeWidth="0.8" opacity="0.6" strokeDasharray="2,2" />
  </svg>
);

// Transom + Double Casement (Middle Mullion) - Maalem Grade
export const PrestigePatternTransomDoubleCasement: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-transom-double-casement", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternTransom" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Top fixed panel (above transom) */}
    <rect x="12" y="12" width="76" height="22" fill="url(#darkGoldPatternTransom)" stroke="#5F260B" strokeWidth="1.2" opacity="0.5" />
    {/* Horizontal transom line */}
    <line x1="12" y1="36" x2="88" y2="36" stroke="#5F260B" strokeWidth="1.2" opacity="0.9" />
    {/* Left casement sash (below transom) */}
    <rect x="12" y="38" width="35" height="50" fill="url(#darkGoldPatternTransom)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Right casement sash (below transom) */}
    <rect x="53" y="38" width="35" height="50" fill="url(#darkGoldPatternTransom)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Vertical mullion (center) */}
    <rect x="49" y="38" width="4" height="50" fill="#5F260B" opacity="0.8" />
    {/* Hinge indicators */}
    <circle cx="16" cy="48" r="1" fill="#F59E0B" opacity="0.8" />
    <circle cx="16" cy="78" r="1" fill="#F59E0B" opacity="0.8" />
    <circle cx="84" cy="48" r="1" fill="#F59E0B" opacity="0.8" />
    <circle cx="84" cy="78" r="1" fill="#F59E0B" opacity="0.8" />
  </svg>
);

// Transom + Casement + Latish (Screen) - Maalem Grade
export const PrestigePatternTransomCasementLatish: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-transom-casement-latish", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternLatish" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Top fixed panel (above transom) */}
    <rect x="12" y="12" width="76" height="20" fill="url(#darkGoldPatternLatish)" stroke="#5F260B" strokeWidth="1.2" opacity="0.5" />
    {/* Horizontal transom line */}
    <line x1="12" y1="34" x2="88" y2="34" stroke="#5F260B" strokeWidth="1.2" opacity="0.9" />
    {/* Outer glass casement sash */}
    <rect x="12" y="36" width="76" height="44" fill="url(#darkGoldPatternLatish)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Inner latish (screen) sash - inset */}
    <rect x="18" y="42" width="64" height="32" fill="url(#darkGoldPatternLatish)" stroke="#5F260B" strokeWidth="0.8" opacity="0.6" />
    {/* Screen mesh pattern */}
    <g opacity="0.3">
      <line x1="20" y1="44" x2="80" y2="44" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="50" x2="80" y2="50" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="56" x2="80" y2="56" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="62" x2="80" y2="62" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="68" x2="80" y2="68" stroke="#5F260B" strokeWidth="0.4" />
    </g>
    {/* Hinge indicators on glass sash */}
    <circle cx="15" cy="48" r="1" fill="#F59E0B" opacity="0.8" />
    <circle cx="15" cy="75" r="1" fill="#F59E0B" opacity="0.8" />
  </svg>
);

// Transom + Fixed Top + Casement Bottom (Maalem Grade)
export const PrestigePatternTransomFixedCasement: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-transom-fixed-casement", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternTransomFixed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Top fixed panel (above transom) */}
    <rect x="12" y="12" width="76" height="28" fill="url(#darkGoldPatternTransomFixed)" stroke="#5F260B" strokeWidth="1.2" opacity="0.5" />
    {/* Horizontal transom line */}
    <line x1="12" y1="42" x2="88" y2="42" stroke="#5F260B" strokeWidth="1.2" opacity="0.9" />
    {/* Bottom casement sash */}
    <rect x="12" y="44" width="76" height="44" fill="url(#darkGoldPatternTransomFixed)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Hinge indicators */}
    <circle cx="16" cy="54" r="1.2" fill="#F59E0B" opacity="0.8" />
    <circle cx="16" cy="78" r="1.2" fill="#F59E0B" opacity="0.8" />
  </svg>
);

// Tilt-Turn Window (Modern Egyptian - 60% of new construction)
export const PrestigePatternTiltTurn: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-tilt-turn", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternTiltTurn" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Main sash */}
    <rect x="12" y="15" width="76" height="65" fill="url(#darkGoldPatternTiltTurn)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Hinge on side (for turn) */}
    <circle cx="12" cy="35" r="1.8" fill="#F59E0B" opacity="0.9" />
    <circle cx="12" cy="65" r="1.8" fill="#F59E0B" opacity="0.9" />
    {/* Tilt mechanism indicator (bottom) */}
    <circle cx="50" cy="78" r="1.5" fill="#F59E0B" opacity="0.8" />
    {/* Tilt-turn symbol (arrow) */}
    <path d="M 50 50 L 55 45 M 50 50 L 45 45" fill="none" stroke="#F59E0B" strokeWidth="0.8" opacity="0.6" />
  </svg>
);

// Single Casement - Bathroom/Kitchen Small (400-800mm)
export const PrestigePatternSingleCasementSmall: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-single-casement-small", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternSingleSmall" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Single casement sash */}
    <rect x="20" y="15" width="60" height="70" fill="url(#darkGoldPatternSingleSmall)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Hinge indicators (side hinges) */}
    <circle cx="22" cy="25" r="1.2" fill="#F59E0B" opacity="0.8" />
    <circle cx="22" cy="75" r="1.2" fill="#F59E0B" opacity="0.8" />
    {/* Handle indicator */}
    <circle cx="50" cy="50" r="1" fill="#F59E0B" opacity="0.7" />
  </svg>
);

// Casement with Latish (Screen) - 90% of Egyptian Residential
export const PrestigePatternCasementLatish: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-casement-latish", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternCasementLatish" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Outer glass casement sash */}
    <rect x="12" y="15" width="76" height="70" fill="url(#darkGoldPatternCasementLatish)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Inner latish (screen) sash - inset */}
    <rect x="18" y="21" width="64" height="58" fill="url(#darkGoldPatternCasementLatish)" stroke="#5F260B" strokeWidth="0.8" opacity="0.6" />
    {/* Screen mesh pattern */}
    <g opacity="0.3">
      <line x1="20" y1="25" x2="80" y2="25" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="32" x2="80" y2="32" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="39" x2="80" y2="39" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="46" x2="80" y2="46" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="53" x2="80" y2="53" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="60" x2="80" y2="60" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="67" x2="80" y2="67" stroke="#5F260B" strokeWidth="0.4" />
    </g>
    {/* Hinge indicators on glass sash */}
    <circle cx="15" cy="25" r="1.2" fill="#F59E0B" opacity="0.8" />
    <circle cx="15" cy="75" r="1.2" fill="#F59E0B" opacity="0.8" />
  </svg>
);

// Shish + Latish Combo (Premium - Security + Ventilation)
export const PrestigePatternShishLatishCombo: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-shish-latish-combo", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternShishLatish" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Shish box (rolling shutter) */}
    <rect x="12" y="10" width="76" height="14" fill="url(#darkGoldPatternShishLatish)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Shutter slats */}
    <g opacity="0.4">
      <line x1="14" y1="12" x2="86" y2="12" stroke="#5F260B" strokeWidth="0.5" />
      <line x1="14" y1="15" x2="86" y2="15" stroke="#5F260B" strokeWidth="0.5" />
      <line x1="14" y1="18" x2="86" y2="18" stroke="#5F260B" strokeWidth="0.5" />
      <line x1="14" y1="21" x2="86" y2="21" stroke="#5F260B" strokeWidth="0.5" />
    </g>
    {/* Outer glass casement sash */}
    <rect x="12" y="26" width="76" height="54" fill="url(#darkGoldPatternShishLatish)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Inner latish (screen) sash */}
    <rect x="18" y="32" width="64" height="42" fill="url(#darkGoldPatternShishLatish)" stroke="#5F260B" strokeWidth="0.8" opacity="0.6" />
    {/* Screen mesh */}
    <g opacity="0.3">
      <line x1="20" y1="36" x2="80" y2="36" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="42" x2="80" y2="42" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="48" x2="80" y2="48" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="54" x2="80" y2="54" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="60" x2="80" y2="60" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="66" x2="80" y2="66" stroke="#5F260B" strokeWidth="0.4" />
    </g>
    {/* Hinge indicators */}
    <circle cx="15" cy="36" r="1" fill="#F59E0B" opacity="0.8" />
    <circle cx="15" cy="75" r="1" fill="#F59E0B" opacity="0.8" />
  </svg>
);

// Awning Window (Top-Hung, Opens Outward from Bottom)
export const PrestigePatternAwningWindow: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-awning-window", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternAwning" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Awning sash (top-hung) */}
    <rect x="12" y="30" width="76" height="40" fill="url(#darkGoldPatternAwning)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Hinge indicators at top */}
    <circle cx="20" cy="32" r="1.2" fill="#F59E0B" opacity="0.9" />
    <circle cx="50" cy="32" r="1.2" fill="#F59E0B" opacity="0.9" />
    <circle cx="80" cy="32" r="1.2" fill="#F59E0B" opacity="0.9" />
    {/* Awning open angle indicator */}
    <path d="M 12 70 Q 50 55, 88 70" fill="none" stroke="#F59E0B" strokeWidth="0.8" opacity="0.6" strokeDasharray="2,2" />
  </svg>
);

// Hopper Window (Bottom-Hinged, Opens Inward) - Bathroom/Kitchen Specialty
export const PrestigePatternHopperWindow: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-hopper-window", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternHopper" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Main sash */}
    <rect x="12" y="50" width="76" height="30" fill="url(#darkGoldPatternHopper)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Hinge indicators at bottom */}
    <circle cx="20" cy="78" r="1.5" fill="#F59E0B" opacity="0.9" />
    <circle cx="50" cy="78" r="1.5" fill="#F59E0B" opacity="0.9" />
    <circle cx="80" cy="78" r="1.5" fill="#F59E0B" opacity="0.9" />
    {/* Hopper open angle indicator (opens inward) */}
    <path d="M 12 50 Q 50 40, 88 50" fill="none" stroke="#F59E0B" strokeWidth="0.8" opacity="0.6" strokeDasharray="2,2" />
  </svg>
);

// Top-Hung Vent (Fixed Bottom, Vent on Top) - Maalem Grade
export const PrestigePatternTopHungVent: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-top-hung-vent", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternTopVent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Top vent panel (small, opens outward) */}
    <rect x="15" y="12" width="70" height="25" fill="url(#darkGoldPatternTopVent)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Transom line */}
    <line x1="15" y1="40" x2="85" y2="40" stroke="#5F260B" strokeWidth="1" opacity="0.8" />
    {/* Fixed bottom panel */}
    <rect x="15" y="42" width="70" height="46" fill="url(#darkGoldPatternTopVent)" stroke="#5F260B" strokeWidth="1.2" opacity="0.5" />
    {/* Hinge indicators at top (for vent) */}
    <circle cx="20" cy="14" r="1" fill="#F59E0B" opacity="0.8" />
    <circle cx="50" cy="14" r="1" fill="#F59E0B" opacity="0.8" />
    <circle cx="80" cy="14" r="1" fill="#F59E0B" opacity="0.8" />
    {/* Vent slats pattern */}
    <g opacity="0.3">
      <line x1="20" y1="16" x2="80" y2="16" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="20" x2="80" y2="20" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="24" x2="80" y2="24" stroke="#5F260B" strokeWidth="0.4" />
      <line x1="20" y1="28" x2="80" y2="28" stroke="#5F260B" strokeWidth="0.4" />
    </g>
  </svg>
);

// Transom + Tilt Sash Below (Fixed Top, Tilt Bottom) - Maalem Grade
export const PrestigePatternTransomTiltSash: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-transom-tilt-sash", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternTransomTilt" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Top fixed panel (above transom) */}
    <rect x="12" y="12" width="76" height="28" fill="url(#darkGoldPatternTransomTilt)" stroke="#5F260B" strokeWidth="1.2" opacity="0.5" />
    {/* Horizontal transom line */}
    <line x1="12" y1="42" x2="88" y2="42" stroke="#5F260B" strokeWidth="1.2" opacity="0.9" />
    {/* Bottom tilt sash */}
    <rect x="12" y="44" width="76" height="44" fill="url(#darkGoldPatternTransomTilt)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Hinge indicators at bottom (tilt axis) */}
    <circle cx="20" cy="86" r="1.5" fill="#F59E0B" opacity="0.9" />
    <circle cx="50" cy="86" r="1.5" fill="#F59E0B" opacity="0.9" />
    <circle cx="80" cy="86" r="1.5" fill="#F59E0B" opacity="0.9" />
    {/* Tilt angle indicator */}
    <path d="M 12 86 Q 50 75, 88 86" fill="none" stroke="#F59E0B" strokeWidth="0.8" opacity="0.6" strokeDasharray="2,2" />
  </svg>
);

// Corner Window (90° Corner) - Villa Specialty
export const PrestigePatternCornerWindow: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-corner-window", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternCorner" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Left window panel */}
    <rect x="10" y="20" width="40" height="60" fill="url(#darkGoldPatternCorner)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Right window panel (meets at corner) */}
    <rect x="50" y="20" width="40" height="60" fill="url(#darkGoldPatternCorner)" stroke="#5F260B" strokeWidth="1.5" />
    {/* Corner mullion (diagonal) */}
    <line x1="50" y1="20" x2="50" y2="80" stroke="#5F260B" strokeWidth="2" opacity="0.8" />
    {/* Hinge indicators */}
    <circle cx="15" cy="30" r="1" fill="#F59E0B" opacity="0.8" />
    <circle cx="15" cy="70" r="1" fill="#F59E0B" opacity="0.8" />
    <circle cx="85" cy="30" r="1" fill="#F59E0B" opacity="0.8" />
    <circle cx="85" cy="70" r="1" fill="#F59E0B" opacity="0.8" />
  </svg>
);

// Picture Window (Large Fixed) - Commercial/Luxury
export const PrestigePatternPictureWindow: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-picture-window", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternPicture" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Large fixed lite */}
    <rect x="8" y="10" width="84" height="80" fill="url(#darkGoldPatternPicture)" stroke="#5F260B" strokeWidth="2" />
    {/* Glass reflection lines (luxury effect) */}
    <line x1="15" y1="15" x2="85" y2="15" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
    <line x1="15" y1="25" x2="85" y2="25" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.15" />
    <line x1="15" y1="35" x2="85" y2="35" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.1" />
  </svg>
);

// Bi-Fold Door (2-4 Panel) - Modern Villas
export const PrestigePatternBiFoldDoor: React.FC<PrestigePatternIconProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-pattern-bifold-door", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="darkGoldPatternBiFold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" />
        <stop offset="50%" stopColor="#B45309" stopOpacity="1" />
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" />
      </linearGradient>
    </defs>
    {/* Panel 1 */}
    <rect x="10" y="10" width="18" height="80" fill="url(#darkGoldPatternBiFold)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Panel 2 */}
    <rect x="30" y="10" width="18" height="80" fill="url(#darkGoldPatternBiFold)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Panel 3 */}
    <rect x="52" y="10" width="18" height="80" fill="url(#darkGoldPatternBiFold)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Panel 4 */}
    <rect x="72" y="10" width="18" height="80" fill="url(#darkGoldPatternBiFold)" stroke="#5F260B" strokeWidth="1.2" />
    {/* Mullions */}
    <line x1="28" y1="10" x2="28" y2="90" stroke="#5F260B" strokeWidth="0.8" opacity="0.7" />
    <line x1="50" y1="10" x2="50" y2="90" stroke="#5F260B" strokeWidth="0.8" opacity="0.7" />
    <line x1="70" y1="10" x2="70" y2="90" stroke="#5F260B" strokeWidth="0.8" opacity="0.7" />
    {/* Bi-fold pivot indicators */}
    <circle cx="19" cy="50" r="1" fill="#F59E0B" opacity="0.8" />
    <circle cx="39" cy="50" r="1" fill="#F59E0B" opacity="0.8" />
    <circle cx="61" cy="50" r="1" fill="#F59E0B" opacity="0.8" />
    <circle cx="81" cy="50" r="1" fill="#F59E0B" opacity="0.8" />
  </svg>
);

// Export all pattern icons as a collection
export const PrestigePatternIcons = {
  Sliding2Sash: PrestigePatternSliding2Sash,
  Sliding3SashCenterFixed: PrestigePatternSliding3SashCenterFixed,
  Sliding4Sash: PrestigePatternSliding4Sash,
  CasementDouble: PrestigePatternCasementDouble,
  FixedSideCasements: PrestigePatternFixedSideCasements,
  PandaCasementScreen: PrestigePatternPandaCasementScreen,
  WindowWithShish: PrestigePatternWindowWithShish,
  KitchenDoorACP: PrestigePatternKitchenDoorACP,
  ArchedWindow: PrestigePatternArchedWindow,
  SlidingDoor2Panel: PrestigePatternSlidingDoor2Panel,
  FixedWindow: PrestigePatternFixedWindow,
  FrenchDoor: PrestigePatternFrenchDoor,
  // Maalem-grade specialized patterns
  BathroomSmallVent: PrestigePatternBathroomSmallVent,
  TiltWindow: PrestigePatternTiltWindow,
  TransomDoubleCasement: PrestigePatternTransomDoubleCasement,
  TransomCasementLatish: PrestigePatternTransomCasementLatish,
  TransomFixedCasement: PrestigePatternTransomFixedCasement,
  TiltTurn: PrestigePatternTiltTurn,
  SingleCasementSmall: PrestigePatternSingleCasementSmall,
  CasementLatish: PrestigePatternCasementLatish,
  ShishLatishCombo: PrestigePatternShishLatishCombo,
  AwningWindow: PrestigePatternAwningWindow,
  // Additional maalem-grade patterns
  HopperWindow: PrestigePatternHopperWindow,
  TopHungVent: PrestigePatternTopHungVent,
  TransomTiltSash: PrestigePatternTransomTiltSash,
  CornerWindow: PrestigePatternCornerWindow,
  PictureWindow: PrestigePatternPictureWindow,
  BiFoldDoor: PrestigePatternBiFoldDoor,
};

export default PrestigePatternIcons;
