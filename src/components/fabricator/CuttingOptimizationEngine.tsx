import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Scissors, TrendingUp, Package, Clock, DollarSign } from 'lucide-react';

interface CuttingOptimizationEngineProps {
  project: any;
  optimization: any;
  isGenerating: boolean;
}

export const CuttingOptimizationEngine: React.FC<CuttingOptimizationEngineProps> = ({ 
  project, 
  optimization, 
  isGenerating 
}) => {
  if (isGenerating) {
    return (
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Generating Cutting Plan</h3>
          <p className="text-gray-400">AI is optimizing your material usage...</p>
        </CardContent>
      </Card>
    );
  }

  if (!optimization) {
    return (
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-8 text-center">
          <Scissors className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Optimization Data</h3>
          <p className="text-gray-400">Complete the design phase to generate cutting optimization.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Optimization Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">{optimization.nestingEfficiency}%</div>
            <div className="text-sm text-gray-400">Efficiency</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-400">{optimization.wastePercentage.toFixed(1)}%</div>
            <div className="text-sm text-gray-400">Waste</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-400">{optimization.estimatedProductionTime}m</div>
            <div className="text-sm text-gray-400">Production Time</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 text-orange-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-400">${optimization.costBreakdown.totalCost.toFixed(0)}</div>
            <div className="text-sm text-gray-400">Total Cost</div>
          </CardContent>
        </Card>
      </div>

      {/* Cutting Plans */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-orange-400" />
            Cutting Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {optimization.cuttingPlan.map((plan: any, index: number) => (
              <div key={index} className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{plan.profile.name}</h4>
                    <p className="text-sm text-gray-400">
                      Stock Length: {plan.stockLength}mm
                    </p>
                  </div>
                  <Badge variant="outline">
                    {plan.utilization.toFixed(1)}% Utilization
                  </Badge>
                </div>
                
                <Progress value={plan.utilization} className="mb-3" />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {plan.cuts.map((cut: any, cutIndex: number) => (
                    <div key={cutIndex} className="p-2 bg-gray-700 rounded text-center">
                      <div className="font-medium">{cut.length}mm</div>
                      <div className="text-gray-400">{cut.angle}°</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Material Cost:</span>
              <span>${optimization.costBreakdown.materialCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Labor Cost:</span>
              <span>${optimization.costBreakdown.laborCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Hardware Cost:</span>
              <span>${optimization.costBreakdown.hardwareCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Glazing Cost:</span>
              <span>${optimization.costBreakdown.glazingCost.toFixed(2)}</span>
            </div>
            <hr className="border-gray-600" />
            <div className="flex justify-between font-semibold">
              <span>Total Cost:</span>
              <span>${optimization.costBreakdown.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
