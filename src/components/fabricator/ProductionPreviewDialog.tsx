/**
 * Production Preview Dialog
 * MANDATORY SAFETY CHECK - Blocks progression until user confirms
 * This is a gatekeeper modal, not an optional preview
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Button } from '@/shared/ui/ui/button';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Settings, Loader2 } from 'lucide-react';
import { CutSimulationViewer } from './CutSimulationViewer';
import { cutSimulator } from '@/lib/simulation/CutSimulator';
import type { WindowComponent, Profile, OptimizationResult } from '@/types/fabricator';

interface ProductionPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  components: WindowComponent[];
  profiles: Profile[];
  optimizationResult?: OptimizationResult;
  onConfirm: () => void;
  onAdjustCalibration?: () => void;
}

export const ProductionPreviewDialog: React.FC<ProductionPreviewDialogProps> = ({
  open,
  onOpenChange,
  components,
  profiles,
  optimizationResult,
  onConfirm,
  onAdjustCalibration,
}) => {
  const [selectedCutId, setSelectedCutId] = useState<string | undefined>();

  // Generate simulation for validation
  const simulation = useMemo(() => {
    return cutSimulator.generateFrameSimulation(components, profiles, optimizationResult);
  }, [components, profiles, optimizationResult]);

  // Validate simulation
  const validation = useMemo(() => {
    return cutSimulator.validateSimulation(simulation);
  }, [simulation]);

  // Check if all profiles are calibrated
  const calibrationStatus = useMemo(() => {
    const profileIds = new Set(components.map((c) => c.profileId));
    const uncalibrated: string[] = [];
    const partiallyCalibrated: string[] = [];

    for (const profileId of profileIds) {
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) continue;

      const hasKFactor45 = profile.default_k_factor_45 !== null && profile.default_k_factor_45 !== undefined;
      const hasKFactor90 = profile.default_k_factor_90 !== null && profile.default_k_factor_90 !== undefined;

      if (!hasKFactor45 && !hasKFactor90) {
        uncalibrated.push(profile.name);
      } else if (!hasKFactor45 || !hasKFactor90) {
        partiallyCalibrated.push(profile.name);
      }
    }

    return {
      uncalibrated,
      partiallyCalibrated,
      allCalibrated: uncalibrated.length === 0 && partiallyCalibrated.length === 0,
    };
  }, [components, profiles]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalCuts = simulation.cuts.length;
    const uniqueProfiles = new Set(simulation.cuts.map((c) => c.profileName));
    const totalMaterialLength = simulation.cuts.reduce((sum, c) => sum + c.cutLength, 0);

    return {
      totalCuts,
      uniqueProfiles: uniqueProfiles.size,
      totalMaterialLength: Math.round(totalMaterialLength),
      estimatedBars: Math.ceil(totalMaterialLength / 6000), // Assuming 6m stock
    };
  }, [simulation]);

  // Check if user can proceed (no critical errors)
  const canProceed = validation.isValid && calibrationStatus.allCalibrated;

  const handleConfirm = () => {
    if (canProceed) {
      onConfirm();
      onOpenChange(false);
    }
  };

  const handleAdjustCalibration = () => {
    onOpenChange(false);
    onAdjustCalibration?.();
  };

  // Prevent closing without confirmation
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && open) {
      // User trying to close - show warning or prevent
      // For now, allow closing but show warning
      onOpenChange(false);
    } else {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-gray-900 text-white border-gray-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-orange-400" /> Final Safety Check
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Review your cuts carefully. This is your final safety check to protect your materials and money.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-800 rounded border border-gray-700">
              <p className="text-xs text-gray-400">Total Cuts</p>
              <p className="text-2xl font-bold text-blue-400">{summary.totalCuts}</p>
            </div>
            <div className="p-3 bg-gray-800 rounded border border-gray-700">
              <p className="text-xs text-gray-400">Profiles</p>
              <p className="text-2xl font-bold text-green-400">{summary.uniqueProfiles}</p>
            </div>
            <div className="p-3 bg-gray-800 rounded border border-gray-700">
              <p className="text-xs text-gray-400">Material Length</p>
              <p className="text-2xl font-bold text-orange-400">{summary.totalMaterialLength}mm</p>
            </div>
            <div className="p-3 bg-gray-800 rounded border border-gray-700">
              <p className="text-xs text-gray-400">Est. Bars</p>
              <p className="text-2xl font-bold text-purple-400">{summary.estimatedBars}</p>
            </div>
          </div>

          {/* Calibration Status */}
          {!calibrationStatus.allCalibrated && (
            <Alert
              className={
                calibrationStatus.uncalibrated.length > 0
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-yellow-500/10 border-yellow-500/30'
              }
            >
              {calibrationStatus.uncalibrated.length > 0 ? (
                <XCircle className="h-4 w-4 text-red-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
              )}
              <AlertDescription>
                <p className="font-semibold mb-1">
                  {calibrationStatus.uncalibrated.length > 0 ? 'Uncalibrated Profiles' : 'Partially Calibrated Profiles'}
                </p>
                {calibrationStatus.uncalibrated.length > 0 && (
                  <p className="text-sm mb-1">
                    The following profiles need calibration: {calibrationStatus.uncalibrated.join(', ')}
                  </p>
                )}
                {calibrationStatus.partiallyCalibrated.length > 0 && (
                  <p className="text-sm mb-1">
                    These profiles need additional calibration: {calibrationStatus.partiallyCalibrated.join(', ')}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAdjustCalibration}
                  className="mt-2 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Adjust Calibration
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Errors */}
          {validation.errors.length > 0 && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <XCircle className="h-4 w-4 text-red-400" />
              <AlertDescription>
                <p className="font-semibold text-red-400 mb-1">Critical Issues Detected</p>
                <ul className="text-sm text-red-300 space-y-1">
                  {validation.errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
                <p className="text-sm text-red-300 mt-2">
                  Please fix these issues before generating cut lists.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Warnings */}
          {validation.warnings.length > 0 && (
            <Alert className="bg-yellow-500/10 border-yellow-500/30">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertDescription>
                <p className="font-semibold text-yellow-400 mb-1">Warnings</p>
                <ul className="text-sm text-yellow-300 space-y-1">
                  {validation.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* All Good Indicator */}
          {canProceed && validation.warnings.length === 0 && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <AlertDescription>
                <p className="font-semibold text-green-400">All checks passed!</p>
                <p className="text-sm text-green-300">
                  All profiles are calibrated and cuts are validated. Ready to generate.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Cut Simulation Viewer */}
          <CutSimulationViewer
            components={components}
            profiles={profiles}
            optimizationResult={optimizationResult}
            onCutClick={(cut) => setSelectedCutId(cut.componentId)}
            selectedCutId={selectedCutId}
          />
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-gray-300 border-gray-600 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {onAdjustCalibration && (
              <Button
                variant="outline"
                onClick={handleAdjustCalibration}
                className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              >
                <Settings className="h-4 w-4 mr-1" />
                Adjust Calibration
              </Button>
            )}
            <Button
              onClick={handleConfirm}
              disabled={!canProceed}
              className="bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm & Generate
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

