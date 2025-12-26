/**
 * Step 3: Visual Size Picker
 * 
 * @since Phase 3: Cognitive Intelligence (Week 17)
 */

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface Step3SizeProps {
  width: number;
  height: number;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
}

export const Step3Size: React.FC<Step3SizeProps> = ({
  width,
  height,
  onWidthChange,
  onHeightChange
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Window Dimensions</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="width">Width (mm)</Label>
          <Input
            id="width"
            type="number"
            value={width}
            onChange={(e) => onWidthChange(Number(e.target.value))}
            className="bg-gray-800 border-gray-700"
            min={500}
            max={5000}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="height">Height (mm)</Label>
          <Input
            id="height"
            type="number"
            value={height}
            onChange={(e) => onHeightChange(Number(e.target.value))}
            className="bg-gray-800 border-gray-700"
            min={500}
            max={5000}
          />
        </div>
      </div>
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="text-sm text-gray-400">
            Area: {((width * height) / 1_000_000).toFixed(2)} m²
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


