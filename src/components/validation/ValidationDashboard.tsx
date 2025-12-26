/**
 * ValidationDashboard - Track Validation Progress
 * 
 * Dashboard for tracking validation tests and results
 * 
 * @since Validation Phase (Week 1-2)
 */

'use client';

import React, { useState } from 'react';
import { ROICalculator } from '@/lib/validation/ROICalculator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const ValidationDashboard: React.FC = () => {
  const [materialWasteWith, setMaterialWasteWith] = useState<number>(12);
  const [materialWasteWithout, setMaterialWasteWithout] = useState<number>(20);
  const [timeWith, setTimeWith] = useState<number>(28);
  const [timeWithout, setTimeWithout] = useState<number>(180);
  const [projectsPerMonth, setProjectsPerMonth] = useState<number>(20);
  const [averageProjectValue, setAverageProjectValue] = useState<number>(5000);
  const [materialCostPerProject, setMaterialCostPerProject] = useState<number>(2000);

  const calculator = new ROICalculator();
  const [metrics, setMetrics] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);

  const handleCalculate = () => {
    const data = {
      materialWaste: {
        withSystem: materialWasteWith,
        withoutSystem: materialWasteWithout
      },
      timeSpent: {
        withSystem: timeWith,
        withoutSystem: timeWithout
      },
      projectsPerMonth,
      averageProjectValue,
      materialCostPerProject
    };

    const calculatedMetrics = calculator.calculateROI(data);
    const calculatedComparison = calculator.compareToCompetitors(calculatedMetrics);
    
    setMetrics(calculatedMetrics);
    setComparison(calculatedComparison);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl">Validation Dashboard</CardTitle>
            <p className="text-gray-400">Track validation tests and calculate ROI</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Material Waste With System (%)</Label>
                <Input
                  type="number"
                  value={materialWasteWith}
                  onChange={(e) => setMaterialWasteWith(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Material Waste Without System (%)</Label>
                <Input
                  type="number"
                  value={materialWasteWithout}
                  onChange={(e) => setMaterialWasteWithout(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Time With System (minutes)</Label>
                <Input
                  type="number"
                  value={timeWith}
                  onChange={(e) => setTimeWith(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Time Without System (minutes)</Label>
                <Input
                  type="number"
                  value={timeWithout}
                  onChange={(e) => setTimeWithout(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Projects Per Month</Label>
                <Input
                  type="number"
                  value={projectsPerMonth}
                  onChange={(e) => setProjectsPerMonth(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Average Project Value (EGP)</Label>
                <Input
                  type="number"
                  value={averageProjectValue}
                  onChange={(e) => setAverageProjectValue(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            <Button onClick={handleCalculate} className="w-full bg-blue-600 hover:bg-blue-700">
              Calculate ROI
            </Button>

            {metrics && (
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-400">Material Savings</div>
                    <div className="text-2xl font-bold">{metrics.materialSavings.percentage.toFixed(1)}%</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {metrics.materialSavings.annualValue.toFixed(0)} EGP/year
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-400">Time Savings</div>
                    <div className="text-2xl font-bold">{metrics.timeSavings.percentage.toFixed(1)}%</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {metrics.timeSavings.capacityIncrease.toFixed(1)}x capacity
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-400">Total Annual Value</div>
                    <div className="text-2xl font-bold">{metrics.totalROI.annualValue.toFixed(0)}</div>
                    <div className="text-sm text-gray-400 mt-1">EGP/year</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {comparison && (
              <Alert className="bg-blue-900/20 border-blue-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Competitive Advantage</div>
                  <div className="text-sm space-y-1">
                    <div>Material Savings: +{comparison.materialSavings.advantage.toFixed(1)}% vs competitors</div>
                    <div>Time Savings: +{comparison.timeSavings.advantage.toFixed(1)}% vs competitors</div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

