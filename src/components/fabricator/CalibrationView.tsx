/**
 * Calibration View - Reality Check Loop
 * 
 * This is the CODE THAT SAVES THE BUSINESS.
 * 
 * Input: Planned Length vs Actual Cut Length
 * Output: Suggested Correction
 * 
 * This closes the loop between prediction and reality.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp,
  Save,
  RefreshCw
} from 'lucide-react';
import { micronEngine } from '@/lib/fabricator/MicronEngine';

interface Cut {
  id: string;
  label: string;
  plannedLength: number; // mm
  role: 'frame' | 'sash' | 'mullion' | 'transom' | 'bead' | 'screen_sash';
}

interface CalibrationViewProps {
  projectId: string;
  cutList: Cut[];
  onCorrectionApplied?: (corrections: CalibrationCorrections) => void;
}

interface CalibrationCorrections {
  suggestedKerf: number;
  suggestedTrim: number;
  patterns: string[];
}

export const CalibrationView: React.FC<CalibrationViewProps> = ({
  projectId,
  cutList,
  onCorrectionApplied
}) => {
  const [actualCuts, setActualCuts] = useState<Record<string, number>>({});
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const [patterns, setPatterns] = useState<string[]>([]);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [totalError, setTotalError] = useState<number>(0);
  const [materialWaste, setMaterialWaste] = useState<number>(0);

  // Calculate deltas when actual cuts change
  useEffect(() => {
    if (cutList.length > 0 && Object.keys(actualCuts).length === cutList.length) {
      const newDeltas: Record<string, number> = {};
      let totalDelta = 0;
      let totalPlanned = 0;

      cutList.forEach(cut => {
        const actual = actualCuts[cut.id];
        if (actual !== undefined) {
          const delta = actual - cut.plannedLength;
          newDeltas[cut.id] = delta;
          totalDelta += Math.abs(delta);
          totalPlanned += cut.plannedLength;
        }
      });

      setDeltas(newDeltas);
      
      // Calculate accuracy
      const acc = totalPlanned > 0 
        ? Math.max(0, 100 - (totalDelta / totalPlanned) * 100)
        : null;
      setAccuracy(acc);
      setTotalError(totalDelta);
      
      // Calculate material waste (only negative deltas = wasted material)
      const waste = Object.values(newDeltas)
        .filter(d => d < 0)
        .reduce((sum, d) => sum + Math.abs(d), 0);
      setMaterialWaste(waste);

      // Detect patterns
      detectPatterns(newDeltas, cutList);
    }
  }, [actualCuts, cutList]);

  /**
   * Detect calibration patterns
   * 
   * Correction 2: Calibration Threshold
   * Only trigger if error is consistent AND significant (> 1.0mm)
   */
  const detectPatterns = (deltas: Record<string, number>, cuts: Cut[]) => {
    const deltaValues = Object.values(deltas);
    if (deltaValues.length === 0) return;

    const newPatterns: string[] = [];

    // Pattern 1: All cuts consistently short (kerf issue)
    const allNegative = deltaValues.every(delta => delta < 0);
    const averageDelta = deltaValues.reduce((a, b) => a + b, 0) / deltaValues.length;

    // Correction 2: Only trigger if error is significant (> 1.0mm)
    if (allNegative && Math.abs(averageDelta) > 1.0) {
      newPatterns.push(
        `All cuts ${Math.abs(averageDelta).toFixed(1)}mm too short - Adjust saw kerf to ${(micronEngine.getConfig().sawBladeKerf + Math.abs(averageDelta)).toFixed(1)}mm`
      );
    }

    // Pattern 2: First/last cuts different (bar trim issue)
    const firstCut = cuts[0];
    const lastCut = cuts[cuts.length - 1];
    if (firstCut && lastCut) {
      const firstDelta = Math.abs(deltas[firstCut.id] || 0);
      const lastDelta = Math.abs(deltas[lastCut.id] || 0);
      
      if (firstDelta > 10 || lastDelta > 10) {
        newPatterns.push(
          `First/last cuts significantly different (${firstDelta.toFixed(1)}mm / ${lastDelta.toFixed(1)}mm) - Check bar end trim`
        );
      }
    }

    // Pattern 3: Transoms causing gaps (milling issue)
    const transomIndices = cuts
      .map((cut, i) => cut.role === 'transom' ? i : -1)
      .filter(i => i !== -1);
    
    if (transomIndices.length > 0) {
      const transomDeltas = transomIndices.map(i => {
        const cut = cuts[i];
        return deltas[cut.id] || 0;
      });

      const allTransomsShort = transomDeltas.every(d => d < -2);
      if (allTransomsShort) {
        const avgTransomDelta = transomDeltas.reduce((a, b) => a + b, 0) / transomDeltas.length;
        newPatterns.push(
          `Transoms ${Math.abs(avgTransomDelta).toFixed(1)}mm too short - Add milling depth (currently ${micronEngine.getConfig().barEndTrim}mm)`
        );
      }
    }

    setPatterns(newPatterns);
  };

  /**
   * Apply correction and send to backend
   */
  const applyCorrection = async () => {
    const corrections: CalibrationCorrections = {
      suggestedKerf: patterns.some(p => p.includes('kerf'))
        ? micronEngine.getConfig().sawBladeKerf + 0.3 // Suggest +0.3mm if kerf issue
        : micronEngine.getConfig().sawBladeKerf,
      suggestedTrim: patterns.some(p => p.includes('trim'))
        ? micronEngine.getConfig().barEndTrim + 5 // Suggest +5mm if trim issue
        : micronEngine.getConfig().barEndTrim,
      patterns
    };

    try {
      // Send to backend for ML training
      const response = await fetch('/api/calibration/correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          deltas: Object.values(deltas),
          patterns,
          suggestedKerf: corrections.suggestedKerf,
          suggestedTrim: corrections.suggestedTrim,
          accuracy,
          totalError,
          materialWaste
        })
      });

      if (response.ok) {
        // Update local config
        micronEngine.updateConfig({
          sawBladeKerf: corrections.suggestedKerf,
          barEndTrim: corrections.suggestedTrim
        });

        if (onCorrectionApplied) {
          onCorrectionApplied(corrections);
        }
      }
    } catch (error) {
      console.error('Failed to apply correction:', error);
    }
  };

  const handleActualChange = (cutId: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setActualCuts(prev => ({ ...prev, [cutId]: numValue }));
    } else {
      setActualCuts(prev => {
        const newCuts = { ...prev };
        delete newCuts[cutId];
        return newCuts;
      });
    }
  };

  const calculateAccuracy = (): number => {
    if (!accuracy) return 0;
    return Math.round(accuracy * 100) / 100;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
          <RefreshCw className="h-6 w-6 sm:h-7 sm:w-7" />
          Reality Check: Predicted vs Actual
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Input actual cut lengths to detect calibration patterns and improve accuracy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-6">
        {/* Accuracy Summary */}
        {accuracy !== null && (
          <Alert className={accuracy >= 98 ? 'bg-green-50 border-green-200' : accuracy >= 95 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}>
            {accuracy >= 98 ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            )}
            <AlertTitle>Accuracy: {calculateAccuracy()}%</AlertTitle>
            <AlertDescription>
              Total Error: {totalError.toFixed(1)}mm | Material Waste: {(materialWaste / 1000).toFixed(3)} meters
            </AlertDescription>
          </Alert>
        )}

        {/* Calibration Input - Mobile-Optimized Card Layout */}
        <div className="space-y-3">
          {cutList.map((cut) => {
            const actual = actualCuts[cut.id];
            const delta = deltas[cut.id];
            const isNegative = delta !== undefined && delta < 0;

            return (
              <div
                key={cut.id}
                className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Piece Label */}
                  <div className="flex-1">
                    <p className="font-semibold text-base">{cut.label}</p>
                    <p className="text-sm text-gray-500">{cut.role}</p>
                  </div>

                  {/* Planned Length */}
                  <div className="text-center sm:text-right">
                    <p className="text-xs text-gray-500 mb-1">Planned</p>
                    <p className="text-lg font-mono font-semibold">{cut.plannedLength.toFixed(1)}mm</p>
                  </div>

                  {/* Actual Input - Mobile-Optimized */}
                  <div className="flex-1 sm:flex-initial">
                    <label className="block text-xs text-gray-500 mb-2">Actual (mm)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={actual || ''}
                      onChange={(e) => handleActualChange(cut.id, e.target.value)}
                      placeholder="Enter measured"
                      className="w-full sm:w-32 text-lg text-center sm:text-right font-mono h-12 text-base"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>

                  {/* Delta Display */}
                  <div className="text-center sm:text-right">
                    <p className="text-xs text-gray-500 mb-1">Delta</p>
                    {delta !== undefined ? (
                      <div className={`flex items-center justify-center sm:justify-end gap-1 text-lg font-mono font-semibold ${
                        isNegative ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {isNegative ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                        <span>{delta > 0 ? '+' : ''}{delta.toFixed(1)}mm</span>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-lg">-</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Patterns Detected */}
        {patterns.length > 0 && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertTitle>Patterns Detected:</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                {patterns.map((pattern, idx) => (
                  <li key={idx} className="text-sm">{pattern}</li>
                ))}
              </ul>
              <Button
                onClick={applyCorrection}
                className="mt-4 w-full sm:w-auto h-12 text-base"
                size="lg"
              >
                <Save className="h-5 w-5 mr-2" />
                Apply Correction & Update Calibration
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats - Mobile-Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center sm:text-left p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono">
              {accuracy !== null ? `${calculateAccuracy()}%` : '-'}
            </p>
          </div>
          <div className="text-center sm:text-left p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Total Error</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono">
              {totalError.toFixed(1)}mm
            </p>
          </div>
          <div className="text-center sm:text-left p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Material Waste</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono">
              {(materialWaste / 1000).toFixed(3)}m
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

