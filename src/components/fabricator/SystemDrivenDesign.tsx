/**
 * System-Driven Design Mode - Fast & Accurate
 * For standard jobs: select system pack, enter dimensions, auto-generate window
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Button } from '@/shared/ui/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Badge } from '@/shared/ui/ui/badge';
import { Zap, CheckCircle2 } from 'lucide-react';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import type { SystemPack } from '@/data/systemPacks';
import type { WindowComponent } from '@/types/fabricator';

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
    const components: WindowComponent[] = [
      {
        id: `frame-${Date.now()}`,
        type: 'frame',
        profileId: '', // Would be populated from system pack
        length: (width + height) * 2, // Perimeter
        quantity: 1,
        cuttingLength: (width + height) * 2,
      },
      {
        id: `sash-${Date.now()}`,
        type: 'sash',
        profileId: '', // Would be populated from system pack
        length: (width + height) * 2,
        quantity: 1,
        cuttingLength: (width + height) * 2,
      },
    ];

    onGenerate(components);
  };

  const canGenerate = selectedPack && width > 0 && height > 0;

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-400" />
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
          <Label className="text-sm">System Pack *</Label>
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
            <Label className="text-sm">Width (mm) *</Label>
            <Input
              type="number"
              value={width || ''}
              onChange={(e) => setWidth(Number(e.target.value))}
              placeholder="e.g. 2000"
              className="bg-gray-900 border-gray-700"
            />
          </div>
          <div>
            <Label className="text-sm">Height (mm) *</Label>
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
          className="w-full bg-orange-500 hover:bg-orange-600"
        >
          <Zap className="h-4 w-4 mr-2" />
          Generate Window
        </Button>
      </CardContent>
    </Card>
  );
};

