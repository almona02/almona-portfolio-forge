/**
 * Calibration Wizard Component
 * Visual calibration dashboard with real-time simulation and side-by-side comparison
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Profile, CuttingCalibration } from '@/types/fabricator';
import { enhancedCalibrationManager } from '@/lib/calibration/EnhancedCalibrationManager';
import { regionalLocalizationEngine } from '@/lib/regional/RegionalLocalizationEngine';
import { Settings, BarChart3 } from 'lucide-react';
import { KFactorCalculator } from './KFactorCalculator';
import { profileDefinitionManager } from '@/lib/profile/ProfileDefinitionManager';
import { calibrationAnalytics } from '@/lib/analytics/CalibrationAnalytics';
import { personalAnalytics } from '@/lib/analytics/PersonalAnalytics';
import { AISuggestionPanel } from './AISuggestionPanel';

interface CalibrationWizardProps {
  profile: Profile;
  systemPackId: string;
  onCalibrationComplete?: (calibration: CuttingCalibration) => void;
  userId?: string;
}

export const CalibrationWizard: React.FC<CalibrationWizardProps> = React.memo(({
  profile,
  systemPackId,
  onCalibrationComplete,
  userId,
}) => {
  const [step, setStep] = useState(1);
  const [calibration, setCalibration] = useState<Partial<CuttingCalibration>>({
    profileId: profile.id,
    systemPackId,
    profileType: profile.type as any,
    lengthModifier: 0,
    bladeWidthCompensation: 0,
    isActive: true,
  });

  const [testResults, setTestResults] = useState<Array<{
    expectedLength: number;
    actualLength: number;
    difference: number;
    testDate: Date;
  }>>([]);

  const [simulationResult, setSimulationResult] = useState<{
    baseLength: number;
    adjustedLength: number;
    adjustments: string[];
  } | null>(null);

  const [_quickInsight, setQuickInsight] = useState<string | null>(null);

  // Load existing calibration if available
  const loadExistingCalibration = useCallback(async () => {
    try {
      const suggestions = await enhancedCalibrationManager.suggestOptimalSettings(
        profile,
        systemPackId
      );
      setCalibration((prev) => ({ ...prev, ...suggestions }));
    } catch (error) {
      console.error('Error loading calibration:', error);
    }
  }, [profile, systemPackId]);

  // Load quick insight for this profile
  const loadQuickInsight = useCallback(async () => {
    if (!userId) return;
    try {
      const stats = await personalAnalytics.getCalibrationStats(
        profile.id,
        userId,
        'miter_45'
      );
      if (stats.totalTests > 0) {
        setQuickInsight(
          `Based on ${stats.totalTests} previous tests, average accuracy: ${stats.averageAccuracy}mm. ${stats.confidenceScore > 0.7 ? 'High confidence calibration.' : 'Consider running more tests for better accuracy.'}`
        );
      }
    } catch (error) {
      console.error('Error loading quick insight:', error);
    }
  }, [profile.id, userId]);

  // Load existing calibration if available
  useEffect(() => {
    loadExistingCalibration();
  }, [loadExistingCalibration]);

  // Load quick insight for this profile
  useEffect(() => {
    if (userId) {
      loadQuickInsight();
    }
  }, [loadQuickInsight, userId]);

  const handleInputChange = (field: string, value: number) => {
    setCalibration((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAllowanceChange = (field: string, value: number) => {
    setCalibration((prev) => ({
      ...prev,
      allowances: {
        ...prev.allowances,
        [field]: value,
      } as any,
    }));
  };

  const handleStrokeChange = (field: string, value: number) => {
    setCalibration((prev) => ({
      ...prev,
      strokes: {
        ...prev.strokes,
        [field]: value,
      } as any,
    }));
  };

  const handleVariationChange = (field: string, value: number) => {
    setCalibration((prev) => ({
      ...prev,
      variations: {
        ...prev.variations,
        [field]: value,
      } as any,
    }));
  };

  const simulateCut = (baseLength: number, angle: number = 90, temperature: number = 20) => {
    const adjusted = enhancedCalibrationManager.calculateCalibrationAdjustment(
      baseLength,
      calibration as CuttingCalibration,
      { angle, temperature, profileType: profile.type }
    );

    const adjustments: string[] = [];
    if (calibration.lengthModifier) {
      adjustments.push(`Length modifier: ${calibration.lengthModifier > 0 ? '+' : ''}${calibration.lengthModifier}mm`);
    }
    if (calibration.allowances?.basicCutting) {
      adjustments.push(`Basic cutting: +${calibration.allowances.basicCutting}mm`);
    }
    if (angle === 45 && calibration.allowances?.miter45Extra) {
      adjustments.push(`Miter 45° extra: +${calibration.allowances.miter45Extra}mm`);
    }

    setSimulationResult({
      baseLength,
      adjustedLength: adjusted,
      adjustments,
    });
  };

  const addTestResult = async (expectedLength: number, actualLength: number) => {
    const difference = actualLength - expectedLength;
    const newResult = {
      expectedLength,
      actualLength,
      difference,
      testDate: new Date(),
    };

    setTestResults((prev) => [...prev, newResult]);

    // Learn from adjustment
    enhancedCalibrationManager.learnFromUserAdjustments(
      expectedLength,
      actualLength,
      calibration as CuttingCalibration
    );

    // Record test result for ML training (data collection)
    if (profile.userId) {
      await calibrationAnalytics.recordTestResult({
        profileId: profile.id,
        userId: profile.userId,
        jointType: 'miter_45', // Default, should be configurable
        expectedLength,
        actualLength,
        difference,
        kFactor: (profile as any).default_k_factor_45 || 0,
        cutAngle: 45,
        profileWidth: profile.width,
        profileHeight: profile.height,
        materialThickness: profile.thickness,
        testDate: new Date(),
      });
    }
  };

  const saveCalibration = async () => {
    try {
      const fullCalibration: CuttingCalibration = {
        id: `cal_${Date.now()}`,
        profileId: profile.id,
        systemPackId,
        profileType: profile.type as any,
        lengthModifier: calibration.lengthModifier || 0,
        bladeWidthCompensation: calibration.bladeWidthCompensation || 0,
        allowances: calibration.allowances,
        strokes: calibration.strokes,
        variations: calibration.variations,
        isActive: true,
        testResults: testResults.map((r) => ({
          ...r,
          testDate: r.testDate,
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // TODO: Save to database via API
      console.log('Saving calibration:', fullCalibration);

      if (onCalibrationComplete) {
        onCalibrationComplete(fullCalibration);
      }
    } catch (error) {
      console.error('Error saving calibration:', error);
    }
  };

  const systemPack = regionalLocalizationEngine.getRegionalSystemPack(systemPackId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Calibration Wizard: {profile.name}
          </CardTitle>
          <CardDescription>
            {systemPack?.name || systemPackId} - {profile.type} profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="k-factor" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="k-factor">K-Factor</TabsTrigger>
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="allowances">Allowances</TabsTrigger>
              <TabsTrigger value="strokes">Strokes</TabsTrigger>
              <TabsTrigger value="variations">Variations</TabsTrigger>
            </TabsList>

            <TabsContent value="k-factor" className="space-y-4">
              {/* AI Suggestion Panel */}
              {userId && (
                <AISuggestionPanel
                  profile={profile}
                  jointType="miter_45"
                  cutAngle={45}
                  userId={userId}
                  onSuggestionApplied={(kFactor) => {
                    // Auto-apply AI suggestion to calculator
                    setCalibration((prev) => ({
                      ...prev,
                      allowances: {
                        ...prev.allowances,
                        miter45Extra: kFactor,
                      },
                    }));
                  }}
                  onSuggestionIgnored={() => {
                    // User chose to ignore - that's fine, they'll enter manually
                  }}
                />
              )}

              <KFactorCalculator
                profile={profile}
                onKFactorCalculated={async (kFactor, jointType) => {
                  // Save K-factor to profile calibration
                  try {
                    const userId = profile.userId || '';
                    if (userId) {
                      await profileDefinitionManager.updateProfileCalibration(
                        profile.id,
                        userId,
                        {
                          jointType: jointType as any,
                          kFactor,
                          cutAngle: jointType === 'miter_45' ? 45 : 90,
                          testResults: testResults.map((r) => ({
                            expected: r.expectedLength,
                            actual: r.actualLength,
                            difference: r.difference,
                            date: r.testDate.toISOString(),
                          })),
                        }
                      );
                    }
                    // Update local calibration state
                    if (jointType === 'miter_45') {
                      setCalibration((prev) => ({
                        ...prev,
                        allowances: {
                          ...prev.allowances,
                          miter45Extra: kFactor,
                        },
                      }));
                    }
                  } catch (error) {
                    console.error('Error saving K-factor:', error);
                  }
                }}
                initialKFactor={(profile as any).default_k_factor_45}
                initialJointType="miter_45"
              />
            </TabsContent>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lengthModifier">Length Modifier (mm)</Label>
                  <Input
                    id="lengthModifier"
                    type="number"
                    step="0.1"
                    value={calibration.lengthModifier || 0}
                    onChange={(e) => handleInputChange('lengthModifier', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="bladeWidthCompensation">Blade Width Compensation (mm)</Label>
                  <Input
                    id="bladeWidthCompensation"
                    type="number"
                    step="0.1"
                    value={calibration.bladeWidthCompensation || 0}
                    onChange={(e) => handleInputChange('bladeWidthCompensation', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="allowances" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="basicCutting">Basic Cutting Allowance (mm)</Label>
                  <Input
                    id="basicCutting"
                    type="number"
                    step="0.1"
                    value={calibration.allowances?.basicCutting || 0}
                    onChange={(e) => handleAllowanceChange('basicCutting', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="miter45Extra">Miter 45° Extra (mm)</Label>
                  <Input
                    id="miter45Extra"
                    type="number"
                    step="0.1"
                    value={calibration.allowances?.miter45Extra || 0}
                    onChange={(e) => handleAllowanceChange('miter45Extra', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="thermalBreakCompensation">Thermal Break Compensation (mm)</Label>
                  <Input
                    id="thermalBreakCompensation"
                    type="number"
                    step="0.1"
                    value={calibration.allowances?.thermalBreakCompensation || 0}
                    onChange={(e) => handleAllowanceChange('thermalBreakCompensation', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="grainDirectionFactor">Grain Direction Factor</Label>
                  <Input
                    id="grainDirectionFactor"
                    type="number"
                    step="0.01"
                    value={calibration.allowances?.grainDirectionFactor || 1.0}
                    onChange={(e) => handleAllowanceChange('grainDirectionFactor', parseFloat(e.target.value) || 1.0)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="strokes" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sawBladeThickness">Saw Blade Thickness (mm)</Label>
                  <Input
                    id="sawBladeThickness"
                    type="number"
                    step="0.1"
                    value={calibration.strokes?.sawBladeThickness || 0}
                    onChange={(e) => handleStrokeChange('sawBladeThickness', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="machiningTolerance">Machining Tolerance (mm)</Label>
                  <Input
                    id="machiningTolerance"
                    type="number"
                    step="0.01"
                    value={calibration.strokes?.machiningTolerance || 0}
                    onChange={(e) => handleStrokeChange('machiningTolerance', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="cornerClearance">Corner Clearance (mm)</Label>
                  <Input
                    id="cornerClearance"
                    type="number"
                    step="0.1"
                    value={calibration.strokes?.cornerClearance || 0}
                    onChange={(e) => handleStrokeChange('cornerClearance', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="variations" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="temperatureExpansion">Temperature Expansion (mm/°C)</Label>
                  <Input
                    id="temperatureExpansion"
                    type="number"
                    step="0.001"
                    value={calibration.variations?.temperatureExpansion || 0}
                    onChange={(e) => handleVariationChange('temperatureExpansion', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="materialFlexibility">Material Flexibility Factor</Label>
                  <Input
                    id="materialFlexibility"
                    type="number"
                    step="0.01"
                    value={calibration.variations?.materialFlexibility || 1.0}
                    onChange={(e) => handleVariationChange('materialFlexibility', parseFloat(e.target.value) || 1.0)}
                  />
                </div>
                <div>
                  <Label htmlFor="assemblyClearance">Assembly Clearance (mm)</Label>
                  <Input
                    id="assemblyClearance"
                    type="number"
                    step="0.1"
                    value={calibration.variations?.assemblyClearance || 0}
                    onChange={(e) => handleVariationChange('assemblyClearance', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Real-time Simulation */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Real-time Cut Simulation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="simBaseLength">Base Length (mm)</Label>
                  <Input
                    id="simBaseLength"
                    type="number"
                    placeholder="1000"
                    onChange={(e) => {
                      const length = parseFloat(e.target.value);
                      if (length) simulateCut(length);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="simAngle">Angle (°)</Label>
                  <Select
                    onValueChange={(value) => {
                      const length = parseFloat(
                        (document.getElementById('simBaseLength') as HTMLInputElement)?.value || '1000'
                      );
                      if (length) simulateCut(length, parseInt(value));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="90" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90°</SelectItem>
                      <SelectItem value="45">45°</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="simTemperature">Temperature (°C)</Label>
                  <Input
                    id="simTemperature"
                    type="number"
                    placeholder="20"
                    defaultValue={20}
                    onChange={(e) => {
                      const length = parseFloat(
                        (document.getElementById('simBaseLength') as HTMLInputElement)?.value || '1000'
                      );
                      const angle = parseInt(
                        (document.getElementById('simAngle') as HTMLSelectElement)?.value || '90'
                      );
                      const temp = parseFloat(e.target.value) || 20;
                      if (length) simulateCut(length, angle, temp);
                    }}
                  />
                </div>
              </div>

              {simulationResult && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-900 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-400">Expected Length</div>
                    <div className="text-2xl font-bold">{simulationResult.baseLength.toFixed(2)} mm</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Adjusted Length</div>
                    <div className="text-2xl font-bold text-green-400">
                      {simulationResult.adjustedLength.toFixed(2)} mm
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-gray-400 mb-2">Applied Adjustments:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {simulationResult.adjustments.map((adj, idx) => (
                        <li key={idx} className="text-sm">{adj}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Test Results & Learning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="testExpected">Expected Length (mm)</Label>
                  <Input id="testExpected" type="number" step="0.1" />
                </div>
                <div>
                  <Label htmlFor="testActual">Actual Length (mm)</Label>
                  <Input id="testActual" type="number" step="0.1" />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      const expected = parseFloat(
                        (document.getElementById('testExpected') as HTMLInputElement)?.value || '0'
                      );
                      const actual = parseFloat(
                        (document.getElementById('testActual') as HTMLInputElement)?.value || '0'
                      );
                      if (expected && actual) {
                        addTestResult(expected, actual);
                        (document.getElementById('testExpected') as HTMLInputElement).value = '';
                        (document.getElementById('testActual') as HTMLInputElement).value = '';
                      }
                    }}
                  >
                    Add Test
                  </Button>
                </div>
              </div>

              {testResults.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-semibold mb-2">Historical Test Results:</div>
                  <div className="space-y-2">
                    {testResults.map((result, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-900 rounded">
                        <span className="text-sm">
                          Expected: {result.expectedLength.toFixed(2)}mm → Actual: {result.actualLength.toFixed(2)}mm
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            Math.abs(result.difference) < 0.5 ? 'text-green-400' : 'text-yellow-400'
                          }`}
                        >
                          {result.difference > 0 ? '+' : ''}
                          {result.difference.toFixed(2)}mm
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
              Previous
            </Button>
            <Button onClick={saveCalibration} className="bg-orange-500 hover:bg-orange-600">
              Save Calibration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

CalibrationWizard.displayName = 'CalibrationWizard';
