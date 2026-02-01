// src/components/fabricator/drafting/tools/HardwarePlacementTool.tsx

/**
 * Hardware Placement Tool
 * Interactive tool for placing hardware components (hinges, handles, locks, rollers)
 * with Egyptian standard positioning
 */

import { Wrench } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useDraftingContext } from '../DraftingContext';
import type { HardwarePlacement, Point } from '../types/materialAware';

export type HardwareType = 'hinge' | 'handle' | 'lock' | 'roller';

interface HardwarePlacementToolProps {
  hardwareType: HardwareType;
  onPlace?: (placement: HardwarePlacement) => void;
}

export const HardwarePlacementTool: React.FC<HardwarePlacementToolProps> = ({
  hardwareType,
  onPlace
}) => {
  const drafting = useDraftingContext();
  // TODO: Implement preview functionality
  // const [previewPosition, setPreviewPosition] = useState<Point | null>(null);
  const [_selectedElement, _setSelectedElement] = useState<number | null>(null);

  const _handleCanvasClick = useCallback((point: Point) => {
    const geometry = drafting.getGeometry();
    
    // Find rectangle containing the point
    const elementIndex = geometry.rectangles.findIndex(rect =>
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );

    if (elementIndex >= 0) {
      const rect = geometry.rectangles[elementIndex];
      
      // Calculate position based on hardware type and Egyptian standards
      let position: Point;
      let positionFromBottom: number | undefined;
      let positionFromTop: number | undefined;

      switch (hardwareType) {
        case 'handle':
          // Egyptian standard: 1100mm from bottom
          positionFromBottom = 1100;
          position = {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height - 1100
          };
          break;
        
        case 'hinge':
          // Egyptian standard: 150mm from top and bottom
          positionFromTop = 150;
          position = {
            x: rect.x + (hardwareType === 'hinge' ? 50 : rect.width / 2),
            y: rect.y + 150
          };
          break;
        
        case 'lock':
          // Position at handle location or top
          position = {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height - 1100 // Same as handle
          };
          break;
        
        case 'roller':
          // Position at bottom for sliding windows
          position = {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height - 50
          };
          break;
        
        default:
          position = point;
      }

      const placement: HardwarePlacement = {
        id: `hardware-${Date.now()}-${Math.random()}`,
        type: hardwareType,
        position,
        orientation: hardwareType === 'hinge' ? 'vertical' : 'horizontal',
        specifications: {
          model: getDefaultHardwareModel(hardwareType),
          egyptianStandard: true,
          positionFromBottom,
          positionFromTop
        }
      };

      onPlace?.(placement);
      setSelectedElement(elementIndex);
    }
  }, [drafting, hardwareType, onPlace]);

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

function getDefaultHardwareModel(type: HardwareType): string {
  switch (type) {
    case 'hinge':
      return 'Casement Hinge Standard';
    case 'handle':
      return 'Standard Window Handle';
    case 'lock':
      return 'Multi-Point Lock';
    case 'roller':
      return 'Standard Roller';
    default:
      return 'Standard';
  }
}

