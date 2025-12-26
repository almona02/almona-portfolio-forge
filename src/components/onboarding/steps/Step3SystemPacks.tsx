/**
 * Step3SystemPacks - System Pack Selection
 * 
 * Select window system pack (profile system)
 */

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OnboardingData } from '../OnboardingWizard';

const SYSTEM_PACKS = [
  { id: 'standard_aluminum', name: 'Standard Aluminum System', description: 'Basic aluminum profiles for standard windows' },
  { id: 'premium_aluminum', name: 'Premium Aluminum System', description: 'High-end aluminum with thermal breaks' },
  { id: 'standard_upvc', name: 'Standard UPVC System', description: 'Basic UPVC profiles' },
  { id: 'premium_upvc', name: 'Premium UPVC System', description: 'High-end UPVC with multi-chamber design' }
];

interface Step3SystemPacksProps {
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
}

export const Step3SystemPacks: React.FC<Step3SystemPacksProps> = ({
  data,
  onUpdate
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">System Pack Selection</h3>
        <p className="text-gray-400 mb-6">Choose your primary window system pack</p>
      </div>

      <div className="space-y-2">
        <Label>System Pack</Label>
        <Select
          value={data.systemPack}
          onValueChange={(v) => onUpdate({ systemPack: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700">
            <SelectValue placeholder="Select a system pack" />
          </SelectTrigger>
          <SelectContent>
            {SYSTEM_PACKS.map((pack) => (
              <SelectItem key={pack.id} value={pack.id}>
                <div>
                  <div className="font-semibold">{pack.name}</div>
                  <div className="text-xs text-gray-400">{pack.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data.systemPack && (
        <div className="p-4 bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-300">
            Selected: {SYSTEM_PACKS.find(p => p.id === data.systemPack)?.name}
          </div>
        </div>
      )}
    </div>
  );
};

