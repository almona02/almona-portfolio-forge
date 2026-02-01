import { cn } from "@/lib/utils";
import React from "react";

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => (
  <svg
    className={cn(
      "w-full h-full transition-transform duration-500 group-hover:rotate-180",
      className
    )}
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" opacity="0.15" />
    <circle cx="50" cy="50" r="42" fill="url(#logoGradient)" />
    <circle cx="50" cy="50" r="42" fill="url(#metallicSheen)" opacity="0.3" />
    {[...Array(48)].map((_, i) => {
      const angle = (i * 7.5 - 2.5) * Math.PI / 180; // 360 / 48 = 7.5 degrees per tooth
      const tipRadius = 48;
      const innerRadius = 39.5;
      
      // Sharp carbide blade edge: triangular tooth with sharp tip
      const tipX = 50 + tipRadius * Math.cos(angle);
      const tipY = 50 + tipRadius * Math.sin(angle);
      
      // Create sharp angular edges (carbide blade style)
      const leftAngle = angle - (3.75 * Math.PI / 180); // Half tooth width
      const rightAngle = angle + (3.75 * Math.PI / 180);
      
      const leftInnerX = 50 + innerRadius * Math.cos(leftAngle);
      const leftInnerY = 50 + innerRadius * Math.sin(leftAngle);
      const rightInnerX = 50 + innerRadius * Math.cos(rightAngle);
      const rightInnerY = 50 + innerRadius * Math.sin(rightAngle);
      
      // Sharp triangular tooth path (carbide blade style)
      return (
        <path
          key={i}
          d={`M ${leftInnerX} ${leftInnerY} L ${tipX} ${tipY} L ${rightInnerX} ${rightInnerY} Z`}
          fill="#fff"
          stroke="#FFC107"
          strokeWidth="0.5"
          opacity="0.95"
        />
      );
    })}
    {[...Array(4)].map((_, i) => {
      const angle = (i * 90 + 45) * Math.PI / 180;
      const x1 = 50 + 28 * Math.cos(angle);
      const y1 = 50 + 28 * Math.sin(angle);
      const x2 = 50 + 38 * Math.cos(angle);
      const y2 = 50 + 38 * Math.sin(angle);
      return (
        <line
          key={`slot-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
        />
      );
    })}
    <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
    <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
    <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
    <circle cx="50" cy="50" r="16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="10" fill="#0d0f12" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
    <circle cx="50" cy="50" r="6" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
    <circle
      cx="50"
      cy="50"
      r="26"
      fill="none"
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="0.5"
      strokeDasharray="2,2"
    />
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF5F1F" />
        <stop offset="50%" stopColor="#FF8C00" />
        <stop offset="100%" stopColor="#E14A00" />
      </linearGradient>
      <radialGradient id="metallicSheen" cx="30%" cy="30%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

export default Logo;

