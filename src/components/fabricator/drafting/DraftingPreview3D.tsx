// src/components/fabricator/drafting/DraftingPreview3D.tsx
import React from 'react';
import { useDraftingContext } from './DraftingContext';
import { Box } from 'lucide-react';

export const DraftingPreview3D: React.FC = () => {
  const drafting = useDraftingContext();
  const geometry = drafting.getGeometry();
  
  // Simple placeholder for 3D preview
  // In production, this would integrate with Window3DGenerator
  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-center text-gray-500">
        <Box className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium">3D Preview</p>
        <p className="text-sm mt-2">
          {geometry.rectangles.length} rectangle{geometry.rectangles.length !== 1 ? 's' : ''} defined
        </p>
        <p className="text-xs mt-4 text-gray-400">
          Full 3D preview integration coming soon
        </p>
      </div>
    </div>
  );
};

