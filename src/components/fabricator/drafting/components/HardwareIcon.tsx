// src/components/fabricator/drafting/components/HardwareIcon.tsx

/**
 * Hardware Icon Component
 * Renders hardware components (hinges, handles, locks, rollers) on the canvas
 */

import React from 'react';
import type { HardwarePlacement } from '../types/materialAware';

interface HardwareIconProps {
  hardware: HardwarePlacement;
  scale?: number;
}

export const HardwareIcon: React.FC<HardwareIconProps> = ({ hardware, scale = 1 }) => {
  const iconSize = 16 * scale;
  const { position, type, specifications } = hardware;

  // Get icon color and symbol based on type
  const getIconProps = () => {
    switch (type) {
      case 'hinge':
        return { color: '#2563eb', symbol: 'H' }; // Blue
      case 'handle':
        return { color: '#16a34a', symbol: 'G' }; // Green
      case 'lock':
        return { color: '#dc2626', symbol: 'L' }; // Red
      case 'roller':
        return { color: '#9333ea', symbol: 'R' }; // Purple
      default:
        return { color: '#6b7280', symbol: '?' }; // Gray
    }
  };

  const iconProps = getIconProps();

  // Get tooltip text
  const getTooltip = () => {
    const parts = [specifications.model];
    if (specifications.positionFromBottom) {
      parts.push(`${specifications.positionFromBottom}mm from bottom`);
    }
    if (specifications.positionFromTop) {
      parts.push(`${specifications.positionFromTop}mm from top`);
    }
    if (specifications.egyptianStandard) {
      parts.push('Egyptian Standard');
    }
    return parts.join(' • ');
  };

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      className="cursor-pointer"
    >
      {/* Background circle for visibility */}
      <circle
        cx={0}
        cy={0}
        r={iconSize / 2 + 2}
        fill="white"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.9"
      />
      {/* Icon - Text symbol */}
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={iconSize}
        fill={iconProps.color}
        fontWeight="bold"
        className="pointer-events-none"
      >
        {iconProps.symbol}
      </text>
      {/* Tooltip on hover */}
      <title>{getTooltip()}</title>
    </g>
  );
};

