import React from "react";
import { cn } from "@/lib/utils";

interface PrestigeCrown2DProps {
  className?: string;
  size?: number;
}

/**
 * PrestigeCrown2D - Flat 2D style crown icon
 * Clean, modern 2D design with prestige amber/gold colors
 * Perfect for headers and UI elements
 */
export const PrestigeCrown2D: React.FC<PrestigeCrown2DProps> = ({
  className,
  size = 24,
}) => (
  <svg
    className={cn("prestige-crown-2d", className)}
    width={size}
    height={size}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      {/* Prestige Gold Gradient - 2D Style */}
      <linearGradient id="crown2DGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FBBF24" stopOpacity="1" /> {/* Amber 400 */}
        <stop offset="50%" stopColor="#F59E0B" stopOpacity="1" /> {/* Amber 500 */}
        <stop offset="100%" stopColor="#D97706" stopOpacity="1" /> {/* Amber 600 */}
      </linearGradient>
      
      {/* Darker gold for band */}
      <linearGradient id="crown2DBandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D97706" stopOpacity="1" /> {/* Amber 600 */}
        <stop offset="100%" stopColor="#92400E" stopOpacity="1" /> {/* Amber 800 */}
      </linearGradient>
    </defs>
    
    {/* Main Crown Shape - 2D Flat Design */}
    <g>
      {/* Base Crown Band */}
      <path
        d="M 10 70
           Q 50 80 90 70
           L 90 75
           Q 50 85 10 75 Z"
        fill="url(#crown2DBandGradient)"
        stroke="#78350F"
        strokeWidth="1"
      />
      
      {/* Crown Peaks - 2D Flat */}
      <path
        d="M 10 70
           L 18 50
           L 26 58
           L 34 42
           L 42 50
           L 50 30
           L 58 50
           L 66 42
           L 74 58
           L 82 50
           L 90 70 Z"
        fill="url(#crown2DGradient)"
        stroke="#92400E"
        strokeWidth="1.5"
      />
      
      {/* Central Peak - Tallest */}
      <path
        d="M 45 30
           L 50 15
           L 55 30
           L 50 50 Z"
        fill="#F59E0B"
        stroke="#92400E"
        strokeWidth="1"
      />
      
      {/* Left Central Peak */}
      <path
        d="M 34 42
           L 40 28
           L 46 42
           L 40 50 Z"
        fill="#F59E0B"
        stroke="#92400E"
        strokeWidth="1"
      />
      
      {/* Right Central Peak */}
      <path
        d="M 54 42
           L 60 28
           L 66 42
           L 60 50 Z"
        fill="#F59E0B"
        stroke="#92400E"
        strokeWidth="1"
      />
      
      {/* Left Side Peak */}
      <path
        d="M 18 50
           L 24 40
           L 30 50
           L 24 58 Z"
        fill="#FBBF24"
        stroke="#92400E"
        strokeWidth="1"
      />
      
      {/* Right Side Peak */}
      <path
        d="M 70 50
           L 76 40
           L 82 50
           L 76 58 Z"
        fill="#FBBF24"
        stroke="#92400E"
        strokeWidth="1"
      />
      
      {/* Outer Left Peak */}
      <path
        d="M 10 70
           L 14 60
           L 18 50
           L 14 58 Z"
        fill="#FBBF24"
        stroke="#92400E"
        strokeWidth="1"
      />
      
      {/* Outer Right Peak */}
      <path
        d="M 82 50
           L 86 60
           L 90 70
           L 86 58 Z"
        fill="#FBBF24"
        stroke="#92400E"
        strokeWidth="1"
      />
      
      {/* Central Gem - 2D Flat Circle */}
      <circle
        cx="50"
        cy="28"
        r="4"
        fill="#FCD34D"
        stroke="#92400E"
        strokeWidth="1"
      />
      <circle
        cx="50"
        cy="28"
        r="2"
        fill="#FFFFFF"
        opacity="0.8"
      />
      
      {/* Side Gems - 2D Flat */}
      <circle
        cx="40"
        cy="38"
        r="3"
        fill="#FCD34D"
        stroke="#92400E"
        strokeWidth="0.8"
      />
      <circle
        cx="60"
        cy="38"
        r="3"
        fill="#FCD34D"
        stroke="#92400E"
        strokeWidth="0.8"
      />
      
      {/* Decorative Dots on Band - 2D Flat */}
      <circle cx="20" cy="72" r="1.5" fill="#F59E0B" />
      <circle cx="30" cy="73" r="1.5" fill="#F59E0B" />
      <circle cx="50" cy="73" r="1.5" fill="#F59E0B" />
      <circle cx="70" cy="73" r="1.5" fill="#F59E0B" />
      <circle cx="80" cy="72" r="1.5" fill="#F59E0B" />
      
      {/* Outline for definition */}
      <path
        d="M 10 70
           L 18 50
           L 26 58
           L 34 42
           L 42 50
           L 50 30
           L 58 50
           L 66 42
           L 74 58
           L 82 50
           L 90 70
           L 90 75
           Q 50 85 10 75 Z"
        fill="none"
        stroke="#78350F"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

export default PrestigeCrown2D;

