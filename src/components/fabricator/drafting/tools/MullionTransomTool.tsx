// src/components/fabricator/drafting/tools/MullionTransomTool.tsx

/**
 * Mullion/Transom Placement Tool
 * Interactive tool for placing structural elements (mullions, transoms, reinforcement)
 * with material-aware spacing and validation
 */

import { Ruler } from 'lucide-react';
import React from 'react';
import { useDraftingContext } from '../DraftingContext';
import type { MaterialType, StructuralElement } from '../types/materialAware';
import { calculateMullionSpacing } from '../utils/materialSpecs';

export type StructuralType = 'mullion' | 'transom' | 'reinforcement';

interface MullionTransomToolProps {
  structuralType: StructuralType;
  material: MaterialType;
  onPlace?: (element: StructuralElement) => void;
}

export const MullionTransomTool: React.FC<MullionTransomToolProps> = ({
  structuralType,
  material,
  _onPlace
}) => {
  const drafting = useDraftingContext();
  // TODO: Implement preview functionality
  // const [previewPosition, setPreviewPosition] = useState<number | null>(null);

  // TODO: Implement placement handler when tool is integrated
  // const handlePlacement = useCallback((position: number, width: number, height: number) => {
  //   const geometry = drafting.getGeometry();
  //   
  //   // Calculate if reinforcement is needed
  //   const span = structuralType === 'mullion' 
  //     ? geometry.rectangles.reduce((max, r) => Math.max(max, r.width), 0)
  //     : geometry.rectangles.reduce((max, r) => Math.max(max, r.height), 0);
  //   
  //   const needsReinforcement = requiresReinforcement(span, material);
  //
  //   const element: StructuralElement = {
  //     id: `${structuralType}-${Date.now()}-${Math.random()}`,
  //     type: structuralType,
  //     material,
  //     position,
  //     dimensions: {
  //       width: structuralType === 'mullion' ? width : height,
  //       depth: material === 'aluminum' ? 60 : 60, // Profile depth
  //       height: structuralType === 'mullion' ? height : width
  //     },
  //     structuralType: needsReinforcement ? 'structural' : 'standard',
  //     reinforcement: needsReinforcement ? {
  //       type: material === 'aluminum' ? 'aluminum' : 'steel',
  //       dimensions: {
  //         width: 20,
  //         height: 20
  //       }
  //     } : undefined
  //   };
  //
  //   onPlace?.(element);
  // }, [drafting, structuralType, material, onPlace]);

  // Calculate recommended spacing
  const geometry = drafting.getGeometry();
  const totalWidth = geometry.rectangles.reduce((max, r) => 
    Math.max(max, r.x + r.width), 0
  ) - geometry.rectangles.reduce((min, r) => 
    Math.min(min, r.x), Infinity
  );
  
  const recommendedSpacing = calculateMullionSpacing(totalWidth, material);

  return (
    <div className="flex flex-col gap-2 p-3 bg-green-50 rounded border border-green-200">
      <div className="flex items-center gap-2">
        <Ruler size={16} className="text-green-600" />
        <span className="text-sm font-medium text-green-800">
          {structuralType === 'mullion' ? 'Mullion' : structuralType === 'transom' ? 'Transom' : 'Reinforcement'} Tool
        </span>
      </div>
      <div className="text-xs text-green-700 space-y-1">
        <div>Material: <span className="font-medium">{material}</span></div>
        <div>Max span: <span className="font-medium">
          {material === 'aluminum' ? '3000mm' : '2400mm'}
        </span></div>
        {recommendedSpacing > 0 && (
          <div>Recommended spacing: <span className="font-medium">
            {Math.round(recommendedSpacing)}mm
          </span></div>
        )}
      </div>
    </div>
  );
};

