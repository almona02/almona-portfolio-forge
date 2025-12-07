/**
 * SystemPackSelector - Component for selecting system packs by category
 * 
 * Features:
 * - Filter system packs by category
 * - Display system pack information
 * - Handle system pack selection
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { Label } from '@/shared/ui/ui/label';
import { SystemPack as UISystemPack } from '@/types/fabricator';
import { SYSTEM_PACKS, SystemPack as DataSystemPack } from '@/data/systemPacks';

interface SystemPackSelectorProps {
  category: 'aluminum_windows' | 'aluminum_doors' | 'curtain_walls' | 'upvc_windows' | 'upvc_doors';
  onSystemPackSelect: (systemPack: UISystemPack) => void;
  allowedSystemPackIds?: string[];
}

export const SystemPackSelector: React.FC<SystemPackSelectorProps> = ({
  category,
  onSystemPackSelect,
  allowedSystemPackIds,
}) => {
  const [systemPacks, setSystemPacks] = useState<UISystemPack[]>([]);

  useEffect(() => {
    // Map SYSTEM_PACKS (DataSystemPack) to UISystemPack format
    const mappedPacks: UISystemPack[] = SYSTEM_PACKS.map((pack: DataSystemPack) => {
      const packCategory = determineCategory(pack.meta.id, pack.meta.name);
      return {
        id: pack.meta.id,
        name: pack.meta.name,
        category: packCategory,
        brand: pack.meta.brands[0] || 'Unknown',
        compatibleProfiles: [], // Will be populated from pack data
        compatibleAccessories: [], // Will be populated from pack data
        description: `System pack for ${pack.meta.name} - ${pack.meta.regions.join(', ')}`,
        technicalData: {
          certifications: [],
        },
      };
    });

    setSystemPacks(mappedPacks);
  }, []);

  // Helper function to determine category from pack ID/name
  const determineCategory = (
    id: string,
    name: string
  ): 'aluminum_windows' | 'aluminum_doors' | 'curtain_walls' | 'upvc_windows' | 'upvc_doors' => {
    const lowerId = id.toLowerCase();
    const lowerName = name.toLowerCase();

    if (lowerId.includes('curtain') || lowerName.includes('curtain')) {
      return 'curtain_walls';
    }
    if (lowerId.includes('door') || lowerName.includes('door')) {
      if (lowerId.includes('upvc') || lowerName.includes('upvc')) {
        return 'upvc_doors';
      }
      return 'aluminum_doors';
    }
    if (lowerId.includes('upvc') || lowerName.includes('upvc')) {
      return 'upvc_windows';
    }
    // Default to aluminum windows
    return 'aluminum_windows';
  };

  // Filter system packs by category and optional allowed shortlist
  const filteredPacks = systemPacks
    .filter((pack) => pack.category === category)
    .filter((pack) =>
      allowedSystemPackIds && allowedSystemPackIds.length
        ? allowedSystemPackIds.includes(pack.id)
        : true
    );

  if (filteredPacks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No system packs available for this category.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label>Select System Pack</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPacks.map((pack) => (
          <Card
            key={pack.id}
            className="bg-gray-700 border-gray-600 cursor-pointer hover:border-orange-400 transition-colors"
            onClick={() => onSystemPackSelect(pack)}
          >
            <CardContent className="p-4">
              <div className="font-semibold mb-2">{pack.name}</div>
              <div className="text-sm text-gray-400 mb-2">{pack.brand}</div>
              <div className="text-xs text-gray-500">
                {pack.compatibleProfiles.length} profiles • {pack.compatibleAccessories.length} accessories
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

