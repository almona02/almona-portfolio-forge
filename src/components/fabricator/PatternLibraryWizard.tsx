/**
 * PatternLibraryWizard - Tier 2: Pattern Library (5-10 clicks, 2-3 minutes)
 * 
 * For intermediate users (8% of projects):
 * - Browse 20-30 smart patterns
 * - Parametric customization
 * - Real-time validation
 * - Live 3D preview
 * 
 * @since Phase 3: Cognitive Intelligence (Week 18)
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import { EGYPTIAN_PATTERNS } from '@/data/egyptian-window-patterns';
import { UnifiedCognitionEngine } from '@/lib/cognition/UnifiedCognitionEngine';
import type { WindowUnit } from '@/types/fabricator';
import React, { useMemo, useState } from 'react';
import { PatternCard } from './patterns/PatternCard';

interface PatternLibraryWizardProps {
  onPatternSelected?: (pattern: EgyptianPattern, params: Record<string, any>) => void;
  onCancel?: () => void;
}

export const PatternLibraryWizard: React.FC<PatternLibraryWizardProps> = ({
  onPatternSelected,
  onCancel
}) => {
  const [selectedPattern, setSelectedPattern] = useState<EgyptianPattern | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [width, setWidth] = useState<number>(1800);
  const [height, setHeight] = useState<number>(1500);

  const cognitionEngine = useMemo(() => new UnifiedCognitionEngine(), []);

  // Get available patterns (filter by availability)
  const availablePatterns = useMemo(() => {
    // Return all patterns from the library
    return EGYPTIAN_PATTERNS.filter((p: any) => p.available !== false);
  }, []);

  const handlePatternSelect = (pattern: EgyptianPattern) => {
    setSelectedPattern(pattern);
    // Initialize parameters with pattern defaults
    // For now, patterns don't have parameters - this is for future enhancement
    setParameters({});
  };

  const handleGenerate = async () => {
    if (!selectedPattern) return;

    // Create window unit from pattern and parameters
    const windowUnit: Partial<WindowUnit> = {
      overallWidth: width,
      overallHeight: height
    };

    // Get cognitive analysis
    const analysis = await cognitionEngine.analyzeContext(windowUnit, selectedPattern);

    onPatternSelected?.(selectedPattern, {
      ...parameters,
      width,
      height,
      recommendations: analysis.recommendations
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-gray-900 border-gray-800 card-dark">
          <CardHeader>
            <CardTitle className="text-2xl">Pattern Library</CardTitle>
            <p className="text-gray-400">Choose a smart pattern and customize it (2-3 minutes)</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedPattern ? (
              // Pattern selection view
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {availablePatterns.map((pattern: any) => (
                    <PatternCard
                      key={pattern.id}
                      pattern={pattern}
                      onClick={() => handlePatternSelect(pattern)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              // Parameter customization view
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="typography-h3 text-lg">Customize Pattern</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="typography-label text-sm text-gray-400">Width (mm)</label>
                        <Input
                          type="number"
                          value={width}
                          onChange={(e) => setWidth(Number(e.target.value))}
                          className="bg-gray-800 border-gray-700"
                        />
                      </div>
                      <div>
                        <label className="typography-label text-sm text-gray-400">Height (mm)</label>
                        <Input
                          type="number"
                          value={height}
                          onChange={(e) => setHeight(Number(e.target.value))}
                          className="bg-gray-800 border-gray-700"
                        />
                      </div>
                    </div>
                    {/* Parameters will be added in future enhancement */}
                    {selectedPattern.constraints && (
                      <div className="text-sm text-gray-400">
                        <div>Min sash width: {selectedPattern.constraints.minSashWidth || 'N/A'}mm</div>
                        <div>Max sash width: {selectedPattern.constraints.maxSashWidth || 'N/A'}mm</div>
                        {selectedPattern.constraints.windLoadCategory && (
                          <div>Wind load: {selectedPattern.constraints.windLoadCategory}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="typography-h3 text-lg">Preview</h3>
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Pattern:</span>
                          <span className="font-semibold">{selectedPattern.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Dimensions:</span>
                          <span className="font-semibold">{width}mm × {height}mm</span>
                        </div>
                        {Object.entries(parameters).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-400">{key}:</span>
                            <span className="font-semibold">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedPattern) {
                    setSelectedPattern(null);
                    setParameters({});
                  } else {
                    onCancel?.();
                  }
                }}
                className="bg-gray-800 border-gray-700"
              >
                {selectedPattern ? 'Back to Patterns' : 'Cancel'}
              </Button>
              {selectedPattern && (
                <Button
                  onClick={handleGenerate}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Generate Window
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

