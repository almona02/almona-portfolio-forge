/**
 * Standalone Optimizer Tool
 * Public-facing optimizer for lead generation
 */

import { WasteComparisonReport } from '@/components/analytics/WasteComparisonReport';
import { calculateManualCuttingPlan, compareWaste } from '@/lib/analytics/WasteCalculator';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { CheckCircle2, Loader2, Mail, Scissors, TrendingUp } from 'lucide-react';
import React, { useState } from 'react';

interface CutInput {
  length: number;
  quantity: number;
}

export const StandaloneOptimizer: React.FC = () => {
  const [cuts, setCuts] = useState<CutInput[]>([{ length: 0, quantity: 1 }]);
  const [stockLength, setStockLength] = useState(6000);
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [savings, setSavings] = useState<number>(0);

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      // Simulate optimization (in production would use actual optimizer)
      const requiredCuts = cuts.flatMap((cut) =>
        Array(cut.quantity)
          .fill(0)
          .map(() => ({
            id: `cut-${Date.now()}-${Math.random()}`,
            profileId: '',
            length: cut.length,
            quantity: 1,
            angle: 90,
            componentId: '',
            waste: 0,
          }))
      );

      const manualPlan = calculateManualCuttingPlan(requiredCuts, [], stockLength);

      // Simulate optimized plan (simplified)
      const optimizedBarsUsed = Math.ceil(
        requiredCuts.reduce((sum, c) => sum + c.length, 0) / stockLength
      );
      const optimizedWaste = optimizedBarsUsed * stockLength - requiredCuts.reduce((sum, c) => sum + c.length, 0);
      const _optimizedWastePercentage = (optimizedWaste / (optimizedBarsUsed * stockLength)) * 100;

      const comparison = compareWaste(
        manualPlan,
        [
          {
            profile: { id: '', name: 'Default', cost_per_meter: 0 } as any,
            stockLength,
            cuts: requiredCuts,
            totalWaste: optimizedWaste,
            utilization: optimizedBarsUsed > 0 ? ((optimizedBarsUsed * stockLength - optimizedWaste) / (optimizedBarsUsed * stockLength)) * 100 : 0,
          },
        ],
        500
      );

      setResult(comparison);
      setSavings(comparison.savings.costSavings);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) return;

    try {
      await (supabase as any).from('optimizer_leads').insert({
        email,
        optimization_result: result,
        savings_egp: savings,
      });

      setEmailSubmitted(true);
    } catch (error) {
      console.error('Failed to save lead:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white py-12 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Free Cutting Optimizer
          </h1>
          <p className="text-gray-400">
            Optimize your material cutting to reduce waste and save money
          </p>
        </div>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-orange-400" />
              Enter Your Cut List
            </CardTitle>
            <CardDescription>
              Add the lengths you need to cut from {stockLength}mm stock bars
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Stock Length (mm)</Label>
              <Input
                type="number"
                value={stockLength}
                onChange={(e) => setStockLength(Number(e.target.value))}
                className="bg-gray-900 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Cuts Required</Label>
              {cuts.map((cut, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Length (mm)"
                    value={cut.length || ''}
                    onChange={(e) => {
                      const newCuts = [...cuts];
                      newCuts[idx].length = Number(e.target.value);
                      setCuts(newCuts);
                    }}
                    className="bg-gray-900 border-gray-700"
                  />
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={cut.quantity || ''}
                    onChange={(e) => {
                      const newCuts = [...cuts];
                      newCuts[idx].quantity = Number(e.target.value);
                      setCuts(newCuts);
                    }}
                    className="bg-gray-900 border-gray-700 w-24"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCuts(cuts.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCuts([...cuts, { length: 0, quantity: 1 }])}
              >
                Add Cut
              </Button>
            </div>

            <Button
              onClick={handleOptimize}
              disabled={optimizing || cuts.some((c) => c.length <= 0)}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {optimizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Optimize Cutting Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <>
            <WasteComparisonReport comparison={result} currency="EGP" />

            {!emailSubmitted ? (
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-orange-400" />
                    Get Full Access
                  </CardTitle>
                  <CardDescription>
                    Enter your email to receive the full optimization report and learn about
                    Fabricator Pro
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="bg-gray-900 border-gray-700"
                    />
                  </div>
                  <Button
                    onClick={handleEmailSubmit}
                    disabled={!email || !email.includes('@')}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    Get Full Report & Learn More
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  Thank you! Check your email for the full report and information about Fabricator
                  Pro.
                </AlertDescription>
              </Alert>
            )}

            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Want More?</h3>
                <p className="text-sm text-gray-300 mb-4">
                  Manage your entire workshop, save these results, and track remnants with
                  Fabricator Pro.
                </p>
                <Button
                  onClick={() => (window.location.href = '/register')}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                >
                  Sign Up for Fabricator Pro
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

