import React from "react";
import { cn } from "@/lib/utils";

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
    {[...Array(24)].map((_, i) => {
      const angle = (i * 15 - 5) * Math.PI / 180;
      const isFlat = i % 2 === 0;
      if (isFlat) {
        const x1 = 50 + 40 * Math.cos(angle);
        const y1 = 50 + 40 * Math.sin(angle);
        const x2 = 50 + 47 * Math.cos(angle);
        const y2 = 50 + 47 * Math.sin(angle);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#E8E8E8"
            strokeWidth="2.5"
            strokeLinecap="square"
          />
        );
      } else {
        const x1 = 50 + 40 * Math.cos(angle);
        const y1 = 50 + 40 * Math.sin(angle);
        const x2 = 50 + 48 * Math.cos(angle);
        const y2 = 50 + 48 * Math.sin(angle);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      }
    })}
    {[...Array(24)].map((_, i) => {
      const angle = (i * 15 - 5) * Math.PI / 180;
      const x = 50 + 44 * Math.cos(angle);
      const y = 50 + 44 * Math.sin(angle);
      return <circle key={`tip-${i}`} cx={x} cy={y} r="0.8" fill="#FFC107" opacity="0.8" />;
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

