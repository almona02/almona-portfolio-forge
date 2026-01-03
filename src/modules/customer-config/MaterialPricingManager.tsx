/**
 * MaterialPricingManager - Configure cost calculations for materials
 * Set material-specific pricing (aluminum/uPVC/wood)
 */

import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { CheckCircle, DollarSign, Save, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface MaterialPricing {
  material: 'aluminum' | 'upvc' | 'wood' | 'composite';
  baseCostPerMeter: number;
  laborMultiplier: number; // e.g., 0.3 = 30% of material cost
  hardwareMultiplier: number;
  glazingMultiplier: number;
  markup: number; // Profit margin percentage
  region?: string;
  currency?: string;
}

interface MaterialPricingManagerProps {
  pricing: MaterialPricing[];
  onPricingUpdate: (pricing: MaterialPricing[]) => void;
}

const defaultPricing: MaterialPricing[] = [
  {
    material: 'aluminum',
    baseCostPerMeter: 0,
    laborMultiplier: 0.3,
    hardwareMultiplier: 0.15,
    glazingMultiplier: 0.4,
    markup: 35,
    region: 'global',
    currency: 'USD',
  },
  {
    material: 'upvc',
    baseCostPerMeter: 0,
    laborMultiplier: 0.25,
    hardwareMultiplier: 0.12,
    glazingMultiplier: 0.35,
    markup: 30,
    region: 'global',
    currency: 'USD',
  },
  {
    material: 'wood',
    baseCostPerMeter: 0,
    laborMultiplier: 0.4,
    hardwareMultiplier: 0.18,
    glazingMultiplier: 0.45,
    markup: 40,
    region: 'global',
    currency: 'USD',
  },
  {
    material: 'composite',
    baseCostPerMeter: 0,
    laborMultiplier: 0.35,
    hardwareMultiplier: 0.16,
    glazingMultiplier: 0.42,
    markup: 38,
    region: 'global',
    currency: 'USD',
  },
];

export const MaterialPricingManager: React.FC<MaterialPricingManagerProps> = ({
  pricing: initialPricing,
  onPricingUpdate,
}) => {
  const [pricing, setPricing] = useState<MaterialPricing[]>(
    initialPricing.length > 0 ? initialPricing : defaultPricing
  );
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialPricing.length > 0) {
      setPricing(initialPricing);
    }
  }, [initialPricing]);

  const handlePricingChange = (material: MaterialPricing['material'], field: keyof MaterialPricing, value: number | string) => {
    setPricing(
      pricing.map((p) =>
        p.material === material ? { ...p, [field]: value } : p
      )
    );
  };

  const handleSave = () => {
    onPricingUpdate(pricing);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const calculateExamplePrice = (materialPricing: MaterialPricing) => {
    const materialCost = 100; // Example 100m
    const laborCost = materialCost * materialPricing.laborMultiplier;
    const hardwareCost = materialCost * materialPricing.hardwareMultiplier;
    const glazingCost = materialCost * materialPricing.glazingMultiplier;
    const subtotal = materialCost + laborCost + hardwareCost + glazingCost;
    const finalPrice = subtotal * (1 + materialPricing.markup / 100);
    return {
      materialCost,
      laborCost,
      hardwareCost,
      glazingCost,
      subtotal,
      finalPrice,
    };
  };

  const getMaterialColor = (material: string) => {
    const colors: Record<string, string> = {
      aluminum: 'text-blue-400',
      upvc: 'text-green-400',
      wood: 'text-amber-400',
      composite: 'text-purple-400',
    };
    return colors[material] || 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="bg-green-900/20 border-green-500">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Pricing configuration saved successfully!</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end mb-4">
        <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
          <Save className="h-4 w-4 mr-2" />
          Save All Pricing
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pricing.map((materialPricing) => {
          const example = calculateExamplePrice(materialPricing);
          return (
            <Card key={materialPricing.material} className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className={`h-5 w-5 ${getMaterialColor(materialPricing.material)}`} />
                  <span className={getMaterialColor(materialPricing.material)}>
                    {materialPricing.material.toUpperCase()} Pricing
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label>Base Cost per Meter ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={materialPricing.baseCostPerMeter}
                      onChange={(e) =>
                        handlePricingChange(materialPricing.material, 'baseCostPerMeter', Number(e.target.value))
                      }
                    />
                  </div>

                  <div>
                    <Label>Labor Multiplier</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={materialPricing.laborMultiplier}
                      onChange={(e) =>
                        handlePricingChange(materialPricing.material, 'laborMultiplier', Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Labor cost = Material cost × {materialPricing.laborMultiplier} ({materialPricing.laborMultiplier * 100}%)
                    </p>
                  </div>

                  <div>
                    <Label>Hardware Multiplier</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={materialPricing.hardwareMultiplier}
                      onChange={(e) =>
                        handlePricingChange(materialPricing.material, 'hardwareMultiplier', Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Hardware cost = Material cost × {materialPricing.hardwareMultiplier} ({materialPricing.hardwareMultiplier * 100}%)
                    </p>
                  </div>

                  <div>
                    <Label>Glazing Multiplier</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={materialPricing.glazingMultiplier}
                      onChange={(e) =>
                        handlePricingChange(materialPricing.material, 'glazingMultiplier', Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Glazing cost = Material cost × {materialPricing.glazingMultiplier} ({materialPricing.glazingMultiplier * 100}%)
                    </p>
                  </div>

                  <div>
                    <Label>Profit Markup (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={materialPricing.markup}
                      onChange={(e) =>
                        handlePricingChange(materialPricing.material, 'markup', Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Final price = Subtotal × (1 + {materialPricing.markup}%)
                    </p>
                  </div>
                </div>

                {/* Example Calculation */}
                <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-orange-400" />
                    <span className="text-sm font-semibold">Example Calculation (100m base)</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Material:</span>
                      <span>${example.materialCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Labor:</span>
                      <span>${example.laborCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hardware:</span>
                      <span>${example.hardwareCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Glazing:</span>
                      <span>${example.glazingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-600 pt-1 mt-1">
                      <span className="font-semibold">Subtotal:</span>
                      <span className="font-semibold">${example.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Markup ({materialPricing.markup}%):</span>
                      <span className="text-gray-400">
                        ${(example.finalPrice - example.subtotal).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-600 pt-1 mt-1">
                      <span className="font-bold text-orange-400">Final Price:</span>
                      <span className="font-bold text-orange-400">${example.finalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

