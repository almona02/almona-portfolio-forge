/**
 * Step 2: Location/Context Selection
 * 
 * @since Phase 3: Cognitive Intelligence (Week 17)
 */

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type LocationRegion = 'Cairo' | 'Alexandria' | 'Upper_Egypt' | 'Sinai' | 'Red_Sea';

interface Step2LocationProps {
  region?: LocationRegion;
  onRegionChange: (region: LocationRegion) => void;
}

export const Step2Location: React.FC<Step2LocationProps> = ({
  region,
  onRegionChange
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Where is this project located?</h3>
      <div className="space-y-2">
        <Label htmlFor="region">Region</Label>
        <Select value={region} onValueChange={(value) => onRegionChange(value as LocationRegion)}>
          <SelectTrigger className="bg-gray-800 border-gray-700">
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Cairo">Cairo</SelectItem>
            <SelectItem value="Alexandria">Alexandria (Coastal)</SelectItem>
            <SelectItem value="Upper_Egypt">Upper Egypt</SelectItem>
            <SelectItem value="Sinai">Sinai</SelectItem>
            <SelectItem value="Red_Sea">Red Sea Coast</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};


