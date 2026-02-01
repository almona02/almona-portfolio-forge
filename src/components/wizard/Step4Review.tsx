/**
 * Step 4: Review & Customize
 * 
 * @since Phase 3: Cognitive Intelligence (Week 17)
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { SmartDefaultsResult } from '@/lib/intelligence/SmartDefaults';

interface Step4ReviewProps {
  projectType: string;
  region: string;
  width: number;
  height: number;
  defaults: SmartDefaultsResult | null;
  onWhyClick?: (category: string) => void;
}

export const Step4Review: React.FC<Step4ReviewProps> = ({
  projectType,
  region,
  width,
  height,
  defaults,
  onWhyClick
}) => {
  return (
    <div className="space-y-4">
      <h3 className="typography-h3 text-lg">Review Your Window</h3>
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-400">Project Type:</span>
            <span className="font-semibold">{projectType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Location:</span>
            <span className="font-semibold">{region}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Dimensions:</span>
            <span className="font-semibold">{width}mm × {height}mm</span>
          </div>
          {defaults && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">System:</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{defaults.systemPackId}</span>
                  {defaults.explanations.systemPackId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onWhyClick?.('systemPackId')}
                      className="h-6 px-2"
                    >
                      <Info className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Color:</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{defaults.color}</span>
                  {defaults.explanations.color && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onWhyClick?.('color')}
                      className="h-6 px-2"
                    >
                      <Info className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Opening Type:</span>
                <span className="font-semibold">{defaults.openingType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Confidence:</span>
                <span className={`font-semibold ${
                  defaults.confidence > 0.8 ? 'text-green-400' :
                  defaults.confidence > 0.6 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {(defaults.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {defaults && defaults.confidence < 0.7 && (
        <Alert className="bg-yellow-900/20 border-yellow-700">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Lower confidence detected. Consider reviewing recommendations.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};


