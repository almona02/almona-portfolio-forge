/**
 * Step 1: Project Type Selection
 * 
 * @since Phase 3: Cognitive Intelligence (Week 17)
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Home, Building2, Factory } from 'lucide-react';

export type ProjectType = 'residential' | 'commercial' | 'industrial';

interface Step1ProjectTypeProps {
  selectedType?: ProjectType;
  onSelect: (type: ProjectType) => void;
}

export const Step1ProjectType: React.FC<Step1ProjectTypeProps> = ({
  selectedType,
  onSelect
}) => {
  return (
    <div className="space-y-4">
      <h3 className="typography-h3 text-lg">What type of project is this?</h3>
      <div className="grid grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition-all ${
            selectedType === 'residential'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-700 bg-gray-800 hover:border-gray-600'
          }`}
          onClick={() => onSelect('residential')}
        >
          <CardContent className="p-6 text-center">
            <Home className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <div className="font-semibold">Residential</div>
            <div className="text-sm text-gray-400 mt-2">Homes, apartments</div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${
            selectedType === 'commercial'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-700 bg-gray-800 hover:border-gray-600'
          }`}
          onClick={() => onSelect('commercial')}
        >
          <CardContent className="p-6 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <div className="font-semibold">Commercial</div>
            <div className="text-sm text-gray-400 mt-2">Offices, shops</div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${
            selectedType === 'industrial'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-700 bg-gray-800 hover:border-gray-600'
          }`}
          onClick={() => onSelect('industrial')}
        >
          <CardContent className="p-6 text-center">
            <Factory className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <div className="font-semibold">Industrial</div>
            <div className="text-sm text-gray-400 mt-2">Factories, warehouses</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


