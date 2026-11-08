/**
 * EgyptianSpecialsDesigner - UI Component for Egyptian Special Presets
 * 
 * Provides interface for:
 * - Sand/dust protection systems
 * - Thermal break optimization
 * - Climate-specific recommendations
 * 
 * @since Phase 1: Special Presets (Weeks 7-8)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { 
  Shield, 
  Thermometer, 
  Loader2,
  AlertTriangle,
  Droplets,
  Wind,
  Sun
} from 'lucide-react';
import type { WindowUnit } from '@/types/fabricator';
import { SandDustProtectionEngine, type SandDustProtectionSpec } from '@/lib/presets/SandDustProtectionEngine';
import { ThermalBreakOptimizer, type ThermalBreakSpec } from '@/lib/presets/ThermalBreakOptimizer';
import { EgyptianClimateAnalyzer } from '@/lib/presets/EgyptianClimateAnalyzer';

interface EgyptianSpecialsDesignerProps {
  windowUnit: WindowUnit;
  onDesignComplete?: (specs: { sandDust?: SandDustProtectionSpec; thermalBreak?: ThermalBreakSpec }) => void;
  onCancel?: () => void;
}

export const EgyptianSpecialsDesigner: React.FC<EgyptianSpecialsDesignerProps> = ({
  windowUnit,
  onDesignComplete,
  onCancel
}) => {
  const [activeTab, setActiveTab] = useState<'sand_dust' | 'thermal_break'>('sand_dust');
  const [sandDustSpec, setSandDustSpec] = useState<SandDustProtectionSpec | null>(null);
  const [thermalBreakSpec, setThermalBreakSpec] = useState<ThermalBreakSpec | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sandDustEngine = useMemo(() => new SandDustProtectionEngine(), []);
  const thermalBreakOptimizer = useMemo(() => new ThermalBreakOptimizer(), []);
  const climateAnalyzer = useMemo(() => new EgyptianClimateAnalyzer(), []);

  const climate = useMemo(() => {
    return climateAnalyzer.analyzeClimate(windowUnit);
  }, [windowUnit, climateAnalyzer]);

  const handleGenerateSandDust = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const spec = await sandDustEngine.generateSandDustProtection(windowUnit);
      setSandDustSpec(spec);

      if (onDesignComplete) {
        onDesignComplete({ sandDust: spec });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate sand/dust protection');
    } finally {
      setIsGenerating(false);
    }
  }, [windowUnit, sandDustEngine, onDesignComplete]);

  const handleOptimizeThermalBreak = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const spec = await thermalBreakOptimizer.optimizeThermalBreak(windowUnit);
      setThermalBreakSpec(spec);

      if (onDesignComplete) {
        onDesignComplete({ thermalBreak: spec });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to optimize thermal break');
    } finally {
      setIsGenerating(false);
    }
  }, [windowUnit, thermalBreakOptimizer, onDesignComplete]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="typography-h1 text-foreground flex items-center gap-3">
              <Shield className="h-8 w-8 text-warning" />
              Egyptian Special Presets
            </h1>
            <p className="text-muted-foreground mt-2">
              Climate-specific solutions for Egyptian market
            </p>
          </div>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {/* Climate Analysis */}
        <Card className="bg-background/50 border-border card-dark">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Sun className="h-5 w-5 text-warning" />
              Climate Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Region</p>
                <p className="text-foreground font-semibold capitalize">{climate.region.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Temperature</p>
                <p className="text-foreground font-semibold">{climate.averageTemperature}°C</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Humidity</p>
                <Badge variant="outline" className="bg-card text-foreground capitalize">
                  {climate.humidityLevel}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Risks</p>
                <div className="flex gap-1 flex-wrap">
                  {climate.hasSandDustRisk && (
                    <Badge variant="outline" className="bg-yellow-900/30 text-warning">
                      <Wind className="h-3 w-3 mr-1" />
                      Sand/Dust
                    </Badge>
                  )}
                  {climate.isCoastal && (
                    <Badge variant="outline" className="bg-blue-900/30 text-info">
                      <Droplets className="h-3 w-3 mr-1" />
                      Coastal
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {climate.recommendations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-foreground mb-2">Recommendations:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {climate.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="bg-background/50 border-border card-dark">
            <TabsTrigger value="sand_dust" className="btn-primary">
              <Shield className="h-4 w-4 mr-2" />
              Sand/Dust Protection
            </TabsTrigger>
            <TabsTrigger value="thermal_break" className="btn-primary">
              <Thermometer className="h-4 w-4 mr-2" />
              Thermal Break
            </TabsTrigger>
          </TabsList>

          {/* Sand/Dust Protection Tab */}
          <TabsContent value="sand_dust" className="space-y-6">
            <Card className="bg-background/50 border-border card-dark">
              <CardHeader>
                <CardTitle className="text-foreground">Sand/Dust Protection System</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enhanced seals, gaskets, and fine mesh for desert conditions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => void handleGenerateSandDust()}
                  disabled={isGenerating}
                  className="btn-primary"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Generate Sand/Dust Protection
                    </>
                  )}
                </Button>

                {sandDustSpec && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Seals</p>
                        <p className="text-foreground font-semibold">{sandDustSpec.seals.length} types</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gaskets</p>
                        <p className="text-foreground font-semibold">{sandDustSpec.gaskets.length} types</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-warning font-semibold">{sandDustSpec.totalCost.toFixed(2)} EGP</p>
                      </div>
                      {sandDustSpec.screenMesh && (
                        <div>
                          <p className="text-sm text-muted-foreground">Fine Mesh</p>
                          <p className="text-foreground font-semibold">{sandDustSpec.screenMesh.area.toFixed(2)} m²</p>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="bg-card/50 p-4 rounded space-y-3">
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Seals:</p>
                        {sandDustSpec.seals.map((seal, idx) => (
                          <div key={idx} className="text-sm text-muted-foreground">
                            {seal.type}: {seal.material} - {seal.dimensions.length.toFixed(0)}mm ({seal.cost.toFixed(2)} EGP)
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Gaskets:</p>
                        {sandDustSpec.gaskets.map((gasket, idx) => (
                          <div key={idx} className="text-sm text-muted-foreground">
                            {gasket.type}: {gasket.material} - {gasket.dimensions.length.toFixed(0)}mm ({gasket.cost.toFixed(2)} EGP)
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Thermal Break Tab */}
          <TabsContent value="thermal_break" className="space-y-6">
            <Card className="bg-background/50 border-border card-dark">
              <CardHeader>
                <CardTitle className="text-foreground">Thermal Break Optimization</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Energy-efficient thermal break solutions for Egyptian climate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => void handleOptimizeThermalBreak()}
                  disabled={isGenerating}
                  className="btn-primary"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Thermometer className="h-4 w-4 mr-2" />
                      Optimize Thermal Break
                    </>
                  )}
                </Button>

                {thermalBreakSpec && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <Badge variant="outline" className="bg-card text-foreground capitalize">
                          {thermalBreakSpec.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">U-Value Improvement</p>
                        <p className="text-success font-semibold">-{thermalBreakSpec.uValueImprovement.toFixed(1)} W/m²K</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-warning font-semibold">{thermalBreakSpec.totalCost.toFixed(2)} EGP</p>
                      </div>
                      {thermalBreakSpec.paybackPeriod && (
                        <div>
                          <p className="text-sm text-muted-foreground">Payback Period</p>
                          <p className="text-foreground font-semibold">{thermalBreakSpec.paybackPeriod.toFixed(1)} years</p>
                        </div>
                      )}
                    </div>

                    {/* Recommendations */}
                    {thermalBreakSpec.recommendations.length > 0 && (
                      <Alert className="bg-blue-900/20 border-blue-800">
                        <AlertDescription>
                          <p className="text-info font-medium mb-2">Recommendations:</p>
                          <ul className="list-disc list-inside text-blue-200 text-sm space-y-1">
                            {thermalBreakSpec.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};


