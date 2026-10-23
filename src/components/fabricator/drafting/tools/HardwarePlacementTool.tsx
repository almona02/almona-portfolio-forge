// src/components/fabricator/drafting/tools/HardwarePlacementTool.tsx

/**
 * Hardware Placement Tool
 * Interactive tool for placing hardware components (hinges, handles, locks, rollers)
 * with Egyptian standard positioning
 */

import { Wrench } from 'lucide-react';
import React from 'react';
import type { HardwarePlacement } from '../types/materialAware';

export type HardwareType = 'hinge' | 'handle' | 'lock' | 'roller';

interface HardwarePlacementToolProps {
  hardwareType: HardwareType;
  onPlace?: (placement: HardwarePlacement) => void;
}

export const HardwarePlacementTool: React.FC<HardwarePlacementToolProps> = ({
  hardwareType
}) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
      <Wrench size={16} />
      <span className="text-sm font-medium">
        {hardwareType.charAt(0).toUpperCase() + hardwareType.slice(1)} Tool
      </span>
      <span className="text-xs text-gray-600">
        Click on a window to place hardware
      </span>
    </div>
  );
};
