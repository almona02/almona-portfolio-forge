/**
 * K-Factor Calculator Component
 * Interactive tool for calculating and visualizing K-factors (cutting deductions)
 * HIGHEST UI/UX PRIORITY - Visual feedback loop is critical
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Calculator, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { kFactorEngine, type KFactorCalculationParams } from '@/lib/calibration/KFactorEngine';
import type { Profile } from '@/types/fabricator';
import { useTranslation } from 'react-i18next';

interface KFactorCalculatorProps {
  profile?: Profile;
  onKFactorCalculated?: (kFactor: number, jointType: string) => void;
  initialKFactor?: number;
  initialJointType?: 'miter_45' | 'butt_90' | 't_joint' | 'l_joint' | 'custom';
}

export const KFactorCalculator: React.FC<KFactorCalculatorProps> = ({
  profile,
  onKFactorCalculated,
  initialKFactor,
  initialJointType = 'miter_45',
}) => {
  const { t } = useTranslation('fabricator');
  const [profileWidth, setProfileWidth] = useState<number>(profile?.width || 62);

  // Update profile width and height when profile changes
  React.useEffect(() => {
    if (profile?.width) {
      setProfileWidth(profile.width);
    }
    if (profile?.height) {
      setProfileHeight(profile.height);
    } else if (profile?.width) {
      // If no height specified, use width as default
      setProfileHeight(profile.width);
    }
  }, [profile]);
  const [profileHeight, setProfileHeight] = useState<number>(profile?.height || profile?.width || 40);
  // Get wall thickness from profile specifications, fallback to profile.thickness, then 1.5mm
  const getWallThickness = (profile?: Profile): number => {
    if (profile?.specifications) {
      // Try different possible field names for wall thickness
      const wallThickness = (profile.specifications as any).wallThicknessMm ||
                           (profile.specifications as any).thicknessMm ||
                           (profile.specifications as any).materialThicknessMm;
      if (wallThickness && typeof wallThickness === 'number') {
        return wallThickness;
      }
    }
    // Fallback to profile.thickness, but only if it's reasonable (wall thickness should be 0.5-3mm)
    if (profile?.thickness && profile.thickness >= 0.5 && profile.thickness <= 3) {
      return profile.thickness;
    }
    // Default to 1.5mm for UPVC profiles
    return 1.5;
  };

  const [materialThickness, setMaterialThickness] = useState<number>(getWallThickness(profile));

  // Update material thickness when profile changes
  React.useEffect(() => {
    setMaterialThickness(getWallThickness(profile));
  }, [profile]);
  const [_cutAngle, setCutAngle] = useState<number>(45);
  const [jointType, setJointType] = useState<'miter_45' | 'butt_90' | 't_joint' | 'l_joint' | 'custom'>(
    initialJointType
  );
  const [customAngle, setCustomAngle] = useState<number>(45);
  const [testFinalDimension, setTestFinalDimension] = useState<number>(1000);
  const [calculatedKFactor, setCalculatedKFactor] = useState<number | null>(initialKFactor || null);

  // Calculate K-factor when parameters change
  const kFactorResult = useMemo(() => {
    const angle = jointType === 'custom' ? customAngle : jointType === 'miter_45' ? 45 : 90;
    const params: KFactorCalculationParams = {
      profileWidth,
      profileHeight,
      materialThickness,
      cutAngle: angle,
      jointType: jointType === 'custom' ? undefined : jointType,
    };
    return kFactorEngine.calculateKFactor(params);
  }, [profileWidth, profileHeight, materialThickness, jointType, customAngle]);

  // Update calculated K-factor
  React.useEffect(() => {
    setCalculatedKFactor(kFactorResult.kFactor);
  }, [kFactorResult]);

  // Calculate test cut length
  const testCutLength = useMemo(() => {
    if (calculatedKFactor === null) return null;
    return kFactorEngine.calculateCutLength(testFinalDimension, calculatedKFactor);
  }, [testFinalDimension, calculatedKFactor]);

  // Validate K-factor (pass jointType for sliding frame validation)
  const validation = useMemo(() => {
    if (calculatedKFactor === null) return null;
    return kFactorEngine.validateKFactor(calculatedKFactor, jointType);
  }, [calculatedKFactor, jointType]);

  const handleJointTypeChange = (value: string) => {
    const newJointType = value as typeof jointType;
    setJointType(newJointType);
    if (newJointType === 'butt_90') {
      setCutAngle(90);
    } else if (newJointType === 'miter_45') {
      setCutAngle(45);
    }
  };

  const handleApply = () => {
    if (calculatedKFactor !== null && onKFactorCalculated) {
      onKFactorCalculated(calculatedKFactor, jointType);
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-blue-400" /> {t('calibration_wizard.k_factor.title', 'K-Factor Calculator')}
        </CardTitle>
        <CardDescription className="text-gray-400">
          {t('calibration_wizard.k_factor.description', 'Calculate cutting deductions for accurate miter joints')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Parameters */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="profile-width" className="typography-label text-gray-300">
              {t('calibration_wizard.k_factor.profile_width', 'Profile Width (mm)')}
            </Label>
            <Input
              id="profile-width"
              type="number"
              step="0.1"
              value={profileWidth}
              onChange={(e) => setProfileWidth(parseFloat(e.target.value) || 0)}
              className="mt-1 bg-gray-900 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="profile-height" className="typography-label text-gray-300">
              {t('calibration_wizard.k_factor.profile_height', 'Profile Height (mm)')}
            </Label>
            <Input
              id="profile-height"
              type="number"
              step="0.1"
              value={profileHeight}
              disabled
              className="mt-1 bg-gray-800 border-gray-600 text-gray-400 cursor-not-allowed"
              title={t('calibration_wizard.k_factor.height_readonly', 'Profile height is for verification only - not used in K-factor calculation')}
            />
          </div>
          <div>
            <Label htmlFor="material-thickness" className="typography-label text-gray-300">
              {t('calibration_wizard.k_factor.material_thickness', 'Material Thickness (mm)')}
            </Label>
            <Input
              id="material-thickness"
              type="number"
              step="0.1"
              value={materialThickness}
              onChange={(e) => setMaterialThickness(parseFloat(e.target.value) || 0)}
              className="mt-1 bg-gray-900 border-gray-600 text-white"
            />
          </div>
        </div>

        {/* Joint Type Selection */}
        <div>
          <Label htmlFor="joint-type" className="typography-label text-gray-300">
            {t('calibration_wizard.k_factor.joint_type', 'Joint Type')}
          </Label>
          <Select value={jointType} onValueChange={handleJointTypeChange}>
            <SelectTrigger id="joint-type" className="mt-1 bg-gray-900 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="miter_45">{t('calibration_wizard.k_factor.miter45', '45° Miter Joint (Frame corners)')}</SelectItem>
              <SelectItem value="butt_90">{t('calibration_wizard.k_factor.butt', '90° Butt Joint (Mullion connections)')}</SelectItem>
              <SelectItem value="t_joint">{t('calibration_wizard.k_factor.t_joint', 'T-Joint (Mullion to frame)')}</SelectItem>
              <SelectItem value="l_joint">{t('calibration_wizard.k_factor.l_joint', 'L-Joint (Corner reinforcements)')}</SelectItem>
              <SelectItem value="custom">{t('calibration_wizard.k_factor.custom', 'Custom Angle')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Angle Input */}
        {jointType === 'custom' && (
          <div>
            <Label htmlFor="custom-angle" className="typography-label text-gray-300">
              {t('calibration_wizard.k_factor.cut_angle', 'Cut Angle (degrees)')}
            </Label>
            <Input
              id="custom-angle"
              type="number"
              step="1"
              min="0"
              max="180"
              value={customAngle}
              onChange={(e) => {
                const angle = parseFloat(e.target.value) || 45;
                setCustomAngle(angle);
                setCutAngle(angle);
              }}
              className="mt-1 bg-gray-900 border-gray-600 text-white"
            />
          </div>
        )}

        {/* K-Factor Result Display */}
        <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">{t('calibration_wizard.k_factor.calculated', 'Calculated K-Factor')}</span>
            {validation && (
              <div className="flex items-center gap-1">
                {validation.isValid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {calculatedKFactor !== null ? `${calculatedKFactor.toFixed(2)} mm` : '—'}
          </div>
          {/* Show info message for positive K-factors in sliding frames (not a warning) */}
          {calculatedKFactor !== null && calculatedKFactor > 0 && (jointType === 'miter_45' || jointType === 'l_joint') && !validation?.warning && (
            <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
              ✓ Positive K-factor is correct for sliding frames with corner joints. You cut MORE than the final dimension to account for miter joint geometry.
            </div>
          )}
          {validation?.warning && (
            <Alert className={`mt-2 ${validation.isValid ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">{validation.warning}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Formula Display */}
        <div className="p-3 bg-gray-900 rounded border border-gray-700">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">{t('calibration_wizard.k_factor.formula', 'Formula:')}</p>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                {kFactorResult.formula}
              </pre>
              <p className="text-xs text-gray-400 mt-2">{kFactorResult.explanation}</p>
            </div>
          </div>
        </div>

        {/* Test Cut Simulation */}
        <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
          <Label htmlFor="test-dimension" className="typography-label text-gray-300 mb-2 block">
            {t('calibration_wizard.k_factor.test_simulation', 'Test Cut Simulation')}
          </Label>
          <p className="text-xs text-gray-400 mb-3">
            {t('calibration_wizard.k_factor.test_simulation_desc', 'Enter your desired final dimension to see the required cut length')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="final-dimension" className="typography-label text-xs text-gray-400">
                {t('calibration_wizard.k_factor.final_dimension', 'Final Dimension (mm)')}
              </Label>
              <Input
                id="final-dimension"
                type="number"
                step="0.1"
                value={testFinalDimension}
                onChange={(e) => setTestFinalDimension(parseFloat(e.target.value) || 0)}
                className="mt-1 bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="cut-length" className="typography-label text-xs text-gray-400">
                {t('calibration_wizard.k_factor.cut_length', 'Cut Length (mm)')}
              </Label>
              <div className="mt-1 p-2 bg-gray-800 border border-gray-600 rounded text-white font-semibold">
                {testCutLength !== null ? `${testCutLength.toFixed(2)} mm` : '—'}
              </div>
            </div>
          </div>
          {testCutLength !== null && calculatedKFactor !== null && (
            <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
              <p className="text-xs text-blue-300">
                {t('calibration_wizard.k_factor.achievement', {
                  final: testFinalDimension,
                  cut: testCutLength.toFixed(2),
                  defaultValue: `To achieve ${testFinalDimension}mm final dimension, cut at ${testCutLength.toFixed(2)}mm`
                })}
                {calculatedKFactor < 0 && (
                  <span className="block mt-1 text-gray-400">
                    ({t('calibration_wizard.k_factor.deduction', 'Deduction')}: {Math.abs(calculatedKFactor).toFixed(2)}mm)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Apply Button */}
        {onKFactorCalculated && (
          <Button
            onClick={handleApply}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            disabled={calculatedKFactor === null || (validation && !validation.isValid)}
          >
            {t('calibration_wizard.k_factor.apply', 'Apply K-Factor')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

