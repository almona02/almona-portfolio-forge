/**
 * SmartWizard - Tier 1: 3-Click, 30-Second Workflow
 * 
 * Designed for beginners (90% of projects):
 * - Step 1: Dimensions (width, height)
 * - Step 2: Opening type (sliding, casement, fixed)
 * - Step 3: Review & Generate
 * 
 * Powered by UnifiedCognitionEngine for smart defaults
 * 
 * @since Phase 3: Cognitive Intelligence (Week 16)
 */

'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UnifiedCognitionEngine } from '@/lib/cognition/UnifiedCognitionEngine';
import { SmartDefaults } from '@/lib/intelligence/SmartDefaults';
import type { WindowUnit } from '@/types/fabricator';
import { CheckCircle2, Info, Loader2 } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { Step1ProjectType, type ProjectType } from './Step1ProjectType';
import { Step2Location, type LocationRegion } from './Step2Location';
import { Step3Size } from './Step3Size';
import { Step4Review } from './Step4Review';

export interface SmartWizardResult {
  windowUnit: WindowUnit;
  confidence: number;
  recommendations: any[];
}

interface SmartWizardProps {
  onComplete?: (result: SmartWizardResult) => void;
  onCancel?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

export const SmartWizard: React.FC<SmartWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState<WizardStep>(1);
  const [projectType, setProjectType] = useState<ProjectType | undefined>();
  const [region, setRegion] = useState<LocationRegion | undefined>();
  const [width, setWidth] = useState<number>(1800);
  const [height, setHeight] = useState<number>(1500);
  const [loading, setLoading] = useState(false);
  const [showWhyExplanation, setShowWhyExplanation] = useState<string | null>(null);

  const smartDefaults = useMemo(() => new SmartDefaults(), []);
  const cognitionEngine = useMemo(() => new UnifiedCognitionEngine(), []);

  const [defaults, setDefaults] = useState<any>(null);
  const [, setRecommendations] = useState<any[]>([]);

  // Load smart defaults on mount
  React.useEffect(() => {
    const loadDefaults = async () => {
      const windowUnit: Partial<WindowUnit> = {
        overallWidth: width,
        overallHeight: height
      };
      const defaultsResult = await smartDefaults.generateSmartDefaults(windowUnit);
      setDefaults(defaultsResult);

      const analysis = await cognitionEngine.analyzeContext(windowUnit);
      setRecommendations(analysis.recommendations);
    };
    loadDefaults();
  }, [width, height, smartDefaults, cognitionEngine]);

  const handleNext = useCallback(async () => {
    if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      // Generate final result
      setLoading(true);
      try {
        const windowUnit: Partial<WindowUnit> = {
          overallWidth: width,
          overallHeight: height
        };

        const analysis = await cognitionEngine.analyzeContext(windowUnit);
        const finalDefaults = await smartDefaults.generateSmartDefaults(windowUnit);

        const result: SmartWizardResult = {
          windowUnit: {
            ...windowUnit,
            systemPackId: finalDefaults.systemPackId,
            color: finalDefaults.color,
            glazingType: finalDefaults.glazingType
          } as WindowUnit,
          confidence: analysis.confidence,
          recommendations: analysis.recommendations
        };

        onComplete?.(result);
      } finally {
        setLoading(false);
      }
    } else {
      setStep((s) => (s + 1) as WizardStep);
    }
  }, [step, width, height, cognitionEngine, smartDefaults, onComplete]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((s) => (s - 1) as WizardStep);
    } else {
      onCancel?.();
    }
  }, [step, onCancel]);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gray-900 border-gray-800 card-dark">
          <CardHeader>
            <CardTitle className="text-2xl">Smart Window Wizard</CardTitle>
            <CardDescription>
              Create your window in 3 simple steps (30 seconds)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Project Type */}
            {step === 1 && (
              <Step1ProjectType
                selectedType={projectType}
                onSelect={(type) => {
                  setProjectType(type);
                  setStep(2);
                }}
              />
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <Step2Location
                region={region}
                onRegionChange={(r) => {
                  setRegion(r);
                  setStep(3);
                }}
              />
            )}

            {/* Step 3: Size */}
            {step === 3 && (
              <Step3Size
                width={width}
                height={height}
                onWidthChange={setWidth}
                onHeightChange={setHeight}
              />
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <Step4Review
                projectType={projectType || 'residential'}
                region={region || 'Cairo'}
                width={width}
                height={height}
                defaults={defaults}
                onWhyClick={(category) => {
                  if (defaults?.explanations[category]) {
                    setShowWhyExplanation(defaults.explanations[category]);
                  }
                }}
              />
            )}

            {/* Why Explanation Modal */}
            {showWhyExplanation && (
              <Alert className="mt-4 bg-blue-900/20 border-blue-700">
                <Info className="h-4 w-4" />
                <AlertDescription className="whitespace-pre-line">
                  {showWhyExplanation}
                </AlertDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWhyExplanation(null)}
                  className="mt-2"
                >
                  Close
                </Button>
              </Alert>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={loading}
                className="bg-gray-800 border-gray-700"
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </Button>
              <Button
                onClick={handleNext}
                disabled={loading || (step === 3 && (!width || !height))}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : step === 4 ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Generate Window
                  </>
                ) : (
                  'Next'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

