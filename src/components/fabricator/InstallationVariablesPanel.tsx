import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Input } from '@/shared/ui/ui/input';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import { Badge } from '@/shared/ui/ui/badge';
import { Calculator, Building2, Wrench } from 'lucide-react';
import { 
  EgyptianInstallationCalculator, 
  InstallationVariables, 
  InstallationCostBreakdown 
} from '@/lib/installation/EgyptianInstallationCalculator';

interface InstallationVariablesPanelProps {
  projectArea: number; // m²
  openingCount?: number; // Number of openings/windows
  floorLevel?: number; // Default floor level
  onVariablesChange?: (variables: InstallationVariables) => void;
  onCostCalculated?: (breakdown: InstallationCostBreakdown) => void;
  className?: string;
}

export const InstallationVariablesPanel: React.FC<InstallationVariablesPanelProps> = ({ 
  projectArea,
  openingCount = 1,
  floorLevel: initialFloorLevel = 1,
  onVariablesChange,
  onCostCalculated,
  className
}) => {
  const calculator = useMemo(() => new EgyptianInstallationCalculator(), []);
  
  const [variables, setVariables] = useState<InstallationVariables>(() => 
    EgyptianInstallationCalculator.getDefaultVariables(initialFloorLevel, projectArea)
  );

  const [breakdown, setBreakdown] = useState<InstallationCostBreakdown | null>(null);

  // Recalculate when variables or project area changes
  useEffect(() => {
    if (projectArea > 0) {
      const costBreakdown = calculator.calculateInstallationCost(
        projectArea,
        variables,
        openingCount
      );
      setBreakdown(costBreakdown);
      onCostCalculated?.(costBreakdown);
    }
  }, [calculator, variables, projectArea, openingCount, onCostCalculated]);

  const handleVariableChange = (key: keyof InstallationVariables, value: unknown) => {
    const updated = { ...variables, [key]: value } as InstallationVariables;
    setVariables(updated);
    onVariablesChange?.(updated);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-warning" />
          Installation Variables
        </CardTitle>
        <CardDescription>
          Configure installation parameters for accurate cost calculation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wall Type Selection */}
        <div className="space-y-2">
          <Label className="typography-label flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Wall Type
          </Label>
          <Select
            value={variables.wallType}
            onValueChange={(value) => handleVariableChange('wallType', value)}
          >
            <SelectTrigger className="bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="hollow-block">Hollow Block (جوفاء) - Standard</SelectItem>
              <SelectItem value="brick">Brick (طوب) - Traditional</SelectItem>
              <SelectItem value="concrete">Concrete (خرسانة) - Requires Drilling</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {variables.wallType === 'brick' && 'Traditional brick walls require more preparation work (+25 EGP per opening)'}
            {variables.wallType === 'hollow-block' && 'Standard new construction - most common in Egypt'}
            {variables.wallType === 'concrete' && 'Concrete walls require drilling - higher preparation cost (+50 EGP per opening)'}
          </p>
        </div>

        {/* Floor Level */}
        <div className="space-y-2">
          <Label>Floor Level</Label>
          <Select
            value={String(variables.floorLevel)}
            onValueChange={(value) => {
              const level = parseInt(value);
              handleVariableChange('floorLevel', level);
              // Auto-enable scaffolding for upper floors
              if (level > 1 && !variables.scaffoldingRequired) {
                handleVariableChange('scaffoldingRequired', true);
              }
            }}
          >
            <SelectTrigger className="bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                <SelectItem key={level} value={String(level)}>
                  {level === 1 ? 'Ground Floor' : `Floor ${level}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Scaffolding */}
        <div className="space-y-3 p-4 bg-card/40 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-warning" />
              <Label className="typography-label font-medium">Scaffolding Required</Label>
            </div>
            <Checkbox
              checked={variables.scaffoldingRequired}
              onCheckedChange={(checked) => handleVariableChange('scaffoldingRequired', checked)}
              className="btn-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Required for installations above ground floor or large projects (&gt;10 m²)
          </p>

          {variables.scaffoldingRequired && (
            <div className="space-y-2 mt-3">
              <div className="flex justify-between items-center">
                <Label className="typography-label text-sm">
                  Scaffolding Cost: <span className="text-warning font-mono">{variables.scaffoldingCostPerM2} EGP/m²</span>
                </Label>
                <Badge variant="outline" className="bg-amber-900/30 text-warning border-amber-800">
                  {breakdown ? `${(breakdown.scaffoldingCost).toFixed(0)} EGP` : '0 EGP'}
                </Badge>
              </div>
              <Input
                type="range"
                min="50"
                max="150"
                step="10"
                value={variables.scaffoldingCostPerM2}
                onChange={(e) => handleVariableChange('scaffoldingCostPerM2', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>50 EGP (Simple)</span>
                <span>100 EGP (Standard)</span>
                <span>150 EGP (Complex)</span>
              </div>
            </div>
          )}
        </div>

        {/* Installation Complexity */}
        <div className="space-y-2">
          <Label>Installation Complexity</Label>
          <Select
            value={variables.installationComplexity}
            onValueChange={(value) => handleVariableChange('installationComplexity', value)}
          >
            <SelectTrigger className="bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="simple">Simple - Standard windows only</SelectItem>
              <SelectItem value="standard">Standard - Doors + windows (default)</SelectItem>
              <SelectItem value="complex">Complex - Curtain walls, skylights, specialty</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {variables.installationComplexity === 'simple' && '20% discount on labor'}
            {variables.installationComplexity === 'standard' && 'Standard Egyptian market rate'}
            {variables.installationComplexity === 'complex' && '50% premium for complex installations'}
          </p>
        </div>

        {/* Reveal Preparation */}
        <div className="space-y-2">
          <Label>Reveal Preparation</Label>
          <Select
            value={variables.revealPreparation}
            onValueChange={(value) => handleVariableChange('revealPreparation', value)}
          >
            <SelectTrigger className="bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              <SelectItem value="none">None - Square opening ready</SelectItem>
              <SelectItem value="basic">Basic - Minor adjustments needed</SelectItem>
              <SelectItem value="extensive">Extensive - Non-square walls, major prep</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Egyptian walls rarely square - Rule 18 applies (15mm deduction standard)
          </p>
        </div>

        {/* Cost Breakdown */}
        {breakdown && (
          <div className="mt-6 p-4 bg-card/60 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-success" />
              <Label className="typography-label font-semibold text-success">Installation Cost Breakdown</Label>
            </div>
            <div className="space-y-2 text-sm">
              {breakdown.scaffoldingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scaffolding</span>
                  <span className="font-mono text-foreground">{breakdown.scaffoldingCost.toFixed(0)} EGP</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wall Preparation</span>
                <span className="font-mono text-foreground">{breakdown.wallPreparationCost.toFixed(0)} EGP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fixing Materials</span>
                <span className="font-mono text-foreground">{breakdown.fixingMaterialsCost.toFixed(0)} EGP</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pl-4">
                <span>• Screws: {breakdown.fixingMaterials.screws} pcs</span>
                <span>• Anchors: {breakdown.fixingMaterials.anchors} pcs</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pl-4">
                <span>• Silicon: {breakdown.fixingMaterials.siliconCartridges} cartridges</span>
                <span>• Foam: {breakdown.fixingMaterials.foamCans} cans</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labor</span>
                <span className="font-mono text-foreground">{breakdown.laborCost.toFixed(0)} EGP</span>
              </div>
              <div className="h-px bg-muted my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span className="text-warning">Total Installation</span>
                <span className="font-mono text-warning">{breakdown.totalInstallationCost.toFixed(0)} EGP</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Estimated Time</span>
                <span className="font-mono">{breakdown.installationTimeDays} days</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

