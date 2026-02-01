/**
 * Step1WorkshopProfile - Workshop Profile Setup
 * 
 * Collects workshop information:
 * - Name, location, size
 * - Specialization
 * - Machines
 * - Primary material
 */

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OnboardingData } from '../OnboardingWizard';

interface Step1WorkshopProfileProps {
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
}

export const Step1WorkshopProfile: React.FC<Step1WorkshopProfileProps> = ({
  data,
  onUpdate
}) => {
  const updateWorkshopProfile = (updates: Partial<OnboardingData['workshopProfile']>) => {
    onUpdate({
      workshopProfile: { ...data.workshopProfile, ...updates }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="typography-h3 text-lg mb-4">Workshop Information</h3>
        <p className="text-gray-400 mb-6">Tell us about your workshop to personalize your experience</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Workshop Name</Label>
          <Input
            value={data.workshopProfile.name}
            onChange={(e) => updateWorkshopProfile({ name: e.target.value })}
            className="bg-gray-800 border-gray-700"
            placeholder="Enter workshop name"
          />
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <Select
            value={data.workshopProfile.location}
            onValueChange={(v) => updateWorkshopProfile({ location: v as any })}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cairo">Cairo</SelectItem>
              <SelectItem value="Alexandria">Alexandria</SelectItem>
              <SelectItem value="Upper_Egypt">Upper Egypt</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Workshop Size</Label>
          <Select
            value={data.workshopProfile.size}
            onValueChange={(v) => updateWorkshopProfile({ size: v as any })}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small (1-5 employees)</SelectItem>
              <SelectItem value="medium">Medium (6-20 employees)</SelectItem>
              <SelectItem value="large">Large (21+ employees)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Primary Material</Label>
          <Select
            value={data.workshopProfile.primaryMaterial}
            onValueChange={(v) => updateWorkshopProfile({ primaryMaterial: v as any })}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aluminum">Aluminum</SelectItem>
              <SelectItem value="upvc">UPVC</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

