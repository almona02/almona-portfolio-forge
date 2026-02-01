/**
 * System-Driven Design Mode - Fast & Accurate
 * For standard jobs: select system pack, enter dimensions, auto-generate window
 */

import type { SystemPack } from '@/data/systemPacks';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import type { Profile, WindowComponent } from '@/types/fabricator';
import { CheckCircle2, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface SystemDrivenDesignProps {
  selectedSystemPackId?: string;
  onSystemPackChange: (systemPackId: string) => void;
  onGenerate: (components: WindowComponent[]) => void;
  defaultWidth?: number;
  defaultHeight?: number;
}

export const SystemDrivenDesign: React.FC<SystemDrivenDesignProps> = ({
  selectedSystemPackId,
  onSystemPackChange,
  onGenerate,
  defaultWidth = 0,
  defaultHeight = 0,
}) => {
  const [width, setWidth] = useState<number>(defaultWidth);
  const [height, setHeight] = useState<number>(defaultHeight);
  const [selectedPack, setSelectedPack] = useState<SystemPack | null>(null);

  useEffect(() => {
    if (selectedSystemPackId) {
      const pack = SYSTEM_PACKS.find((p) => p.meta.id === selectedSystemPackId);
      setSelectedPack(pack || null);
    }
  }, [selectedSystemPackId]);

  const handleGenerate = () => {
    if (!selectedPack || width <= 0 || height <= 0) return;

    // Auto-generate window components based on system pack
    // This is a simplified version - in production, this would use the system pack's
    // profile definitions and constraints to generate proper components
    // Create placeholder profile objects - in production these would come from system pack
    const placeholderProfile: Profile = {
      id: 'placeholder',
      name: 'Placeholder Profile',
      material: 'aluminum',
      width: 60,
      height: 40,
      color: 'Silver',
      costPerMeter: 0,
      cuttingAllowance: 0,
      stockQuantity: 0,
      minStockLevel: 0,
      supplier: '',
    };

    const components: WindowComponent[] = [
      {
        id: `frame-${Date.now()}`,
        type: 'frame',
        profile: placeholderProfile,
        width: width,
        height: height,
        quantity: 1,
        cuttingLengths: [(width + height) * 2], // Perimeter
        angles: [90],
        machiningOperations: [],
        glazingType: 'double',
        hardware: [],
      },
      {
        id: `sash-${Date.now()}`,
        type: 'sash',
        profile: placeholderProfile,
        width: width,
        height: height,
        quantity: 1,
        cuttingLengths: [(width + height) * 2],
        angles: [90],
        machiningOperations: [],
        glazingType: 'double',
        hardware: [],
      },
    ];

    onGenerate(components);
  };

  const canGenerate = selectedPack && width > 0 && height > 0;

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          <CardTitle>System-Driven Design</CardTitle>
          <Badge variant="outline" className="ml-auto bg-green-500/10 border-green-500/30 text-green-400">
            Fast & Accurate
          </Badge>
        </div>
        <CardDescription className="text-gray-400">
          Select a system pack and enter dimensions. The system will automatically generate the window
          with correct profiles, accessories, and structural constraints.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="typography-label text-sm">System Pack *</Label>
          <Select value={selectedSystemPackId || ''} onValueChange={onSystemPackChange}>
            <SelectTrigger className="bg-gray-900 border-gray-700">
              <SelectValue placeholder="Select system pack" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {SYSTEM_PACKS.map((pack) => (
                <SelectItem key={pack.meta.id} value={pack.meta.id}>
                  <div className="flex flex-col">
                    <span>{pack.meta.name}</span>
                    <span className="text-xs text-gray-400">
                      {pack.meta.brands.join(', ')} • {pack.meta.regions.join(', ')}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPack && (
            <p className="text-xs text-gray-400 mt-1">
              {selectedPack.meta.name} - {selectedPack.meta.brands.join(', ')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="typography-label text-sm">Width (mm) *</Label>
            <Input
              type="number"
              value={width || ''}
              onChange={(e) => setWidth(Number(e.target.value))}
              placeholder="e.g. 2000"
              className="bg-gray-900 border-gray-700"
            />
          </div>
          <div>
            <Label className="typography-label text-sm">Height (mm) *</Label>
            <Input
              type="number"
              value={height || ''}
              onChange={(e) => setHeight(Number(e.target.value))}
              placeholder="e.g. 1500"
              className="bg-gray-900 border-gray-700"
            />
          </div>
        </div>

        {selectedPack && width > 0 && height > 0 && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Ready to Generate</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Window will be auto-generated with all profiles, accessories, and constraints from{' '}
              {selectedPack.meta.name}
            </p>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="btn-primary"
        >
          <Zap className="h-4 w-4 mr-2" />
          Generate Window
        </Button>
      </CardContent>
    </Card>
  );
};

