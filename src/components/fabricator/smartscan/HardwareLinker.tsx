import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { AlertCircle, CheckCircle, Package, Shield, TrendingUp } from 'lucide-react';
import { EgyptianHardware, HardwareCategory } from '@/data/egyptian-hardware-database';
import { validateHardwareFit, findCompatibleHardware } from '@/lib/fabricator/hardwareValidator';
import type { ImportedProfile } from './DXFProfileImporter';
import { HardwareVisualizer } from './HardwareVisualizer';

interface HardwareLinkerProps {
  profiles: ImportedProfile[];
  selectedProfileId?: string | null;
  onHardwareLinked?: (hardware: EgyptianHardware[]) => void;
}

export const HardwareLinker: React.FC<HardwareLinkerProps> = ({
  profiles,
  selectedProfileId,
  onHardwareLinked,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<HardwareCategory | 'all'>('all');
  const [selectedHardware, setSelectedHardware] = useState<EgyptianHardware[]>([]);
  const [validationResults, setValidationResults] = useState<Record<string, ReturnType<typeof validateHardwareFit>>>(
    {},
  );

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) || profiles[0],
    [profiles, selectedProfileId],
  );

  const chamber = useMemo(() => {
    if (!selectedProfile) return { width: 40, depth: 20 };
    // Estimate chamber as a percentage of profile bbox
    return {
      width: (selectedProfile.widthMm || 60) * 0.7,
      depth: (selectedProfile.heightMm || 40) * 0.6,
    };
  }, [selectedProfile]);

  const compatibleHardware = useMemo(() => {
    if (!selectedProfile) return [];
    return findCompatibleHardware(
      { width: selectedProfile.widthMm, height: selectedProfile.heightMm, thickness: undefined },
      chamber,
      selectedCategory === 'all' ? undefined : selectedCategory,
    );
  }, [selectedCategory, selectedProfile, chamber]);

  useEffect(() => {
    const results: Record<string, ReturnType<typeof validateHardwareFit>> = {};
    selectedHardware.forEach((hw) => {
      if (!selectedProfile) return;
      results[hw.id] = validateHardwareFit(hw, {
        width: selectedProfile.widthMm,
        height: selectedProfile.heightMm,
        thickness: (selectedProfile.metadata as any)?.thickness ?? undefined,
      }, chamber);
    });
    setValidationResults(results);
  }, [selectedHardware, selectedProfile, chamber]);

  const handleSelectHardware = (hw: EgyptianHardware) => {
    const exists = selectedHardware.some((h) => h.id === hw.id);
    if (exists) {
      setSelectedHardware((prev) => prev.filter((h) => h.id !== hw.id));
      return;
    }
    // Replace lock if selecting another lock
    if (hw.category === 'lock') {
      setSelectedHardware((prev) => [...prev.filter((h) => h.category !== 'lock'), hw]);
    } else {
      setSelectedHardware((prev) => [...prev, hw]);
    }
  };

  const handleSave = () => {
    onHardwareLinked?.(selectedHardware);
  };

  const categories: (HardwareCategory | 'all')[] = ['all', 'lock', 'handle', 'hinge', 'roller', 'corner_key', 'seal'];

  if (!selectedProfile) {
    return (
      <Alert className="bg-gray-900/60 border-gray-800 text-sm text-gray-200 card-dark">
        <AlertDescription>No profile selected. Import a DXF first.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Hardware Placement Preview
            </CardTitle>
            <CardDescription>Visualize hardware on profile cross-section. Red = incompatible.</CardDescription>
          </CardHeader>
          <CardContent>
            <HardwareVisualizer
              profile={selectedProfile}
              hardware={selectedHardware}
              validationResults={validationResults}
            />

            {selectedHardware.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="typography-h4 font-medium text-sm">Selected Hardware</h4>
                {selectedHardware.map((hw) => {
                  const vr = validationResults[hw.id];
                  return (
                    <div
                      key={hw.id}
                      className="flex items-center justify-between p-3 border rounded bg-gray-900/40 border-gray-800 card-dark"
                    >
                      <div>
                        <div className="font-medium text-white">{hw.name}</div>
                        <div className="text-xs text-gray-400">
                          {hw.supplier} • Lead: {hw.leadTimeDays}d {hw.costEGP ? `• ${hw.costEGP} EGP` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {vr?.isValid ? (
                          <CheckCircle className="h-5 w-5  status-valid" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleSelectHardware(hw)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Egyptian Hardware Catalog
            </CardTitle>
            <CardDescription>Select hardware compatible with your profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
              <TabsList className="grid grid-cols-4">
                {categories.map((cat) => (
                  <TabsTrigger key={cat} value={cat} className="capitalize">
                    {cat === 'all' ? 'All' : cat.replace('_', ' ')}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="mt-4 space-y-3 max-h-[480px] overflow-y-auto">
                {compatibleHardware
                  .filter((h) => selectedCategory === 'all' || h.category === selectedCategory)
                  .map((hw) => {
                    const isSelected = selectedHardware.some((h) => h.id === hw.id);
                    const vr = validationResults[hw.id];
                    return (
                      <div
                        key={hw.id}
                        onClick={() => handleSelectHardware(hw)}
                        className={`p-3 border rounded cursor-pointer transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                        } ${vr && !vr.isValid ? 'border-red-300 bg-red-50' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{hw.name}</div>
                            <div className="text-xs text-gray-600">
                              {hw.dimensions.width}×{hw.dimensions.height}mm
                              {hw.maxLoadKg ? ` • ${hw.maxLoadKg}kg` : ''}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {hw.supplier}
                              </Badge>
                              {hw.securityLevel && (
                                <Badge variant="secondary" className="text-xs">
                                  Security {hw.securityLevel}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isSelected && <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                        </div>
                        {vr && vr.warnings.length > 0 && (
                          <div className="mt-2 text-xs text-amber-700 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {vr.warnings[0]}
                          </div>
                        )}
                        {vr && vr.errors.length > 0 && (
                          <div className="mt-2 text-xs text-red-700 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {vr.errors[0]}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </Tabs>

            <div className="mt-4">
              <Button className="w-full" onClick={handleSave} disabled={selectedHardware.length === 0}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Link {selectedHardware.length || ''} Hardware
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedHardware.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Hardware Compatibility Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedHardware.map((hw) => {
                const vr = validationResults[hw.id];
                return (
                  <div key={hw.id} className="p-3 border rounded bg-gray-900/30 border-gray-800 card-dark">
                    <div className="font-medium text-white">{hw.name}</div>
                    {vr?.errors.length ? (
                      <div className="mt-1 text-sm text-red-400">
                        {vr.errors.map((e, i) => (
                          <div key={i} className="flex items-start gap-1">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span>{e}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-green-400 mt-1">No blocking errors.</div>
                    )}
                    {vr?.warnings.length > 0 && (
                      <div className="mt-1 text-sm text-amber-300">
                        {vr.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-1">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {vr?.suggestions.length > 0 && (
                      <div className="mt-1 text-sm text-blue-300">
                        {vr.suggestions.map((s, i) => (
                          <div key={i}>💡 {s}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

