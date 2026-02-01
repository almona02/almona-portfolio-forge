/**
 * Production Preview Dialog
 * MANDATORY SAFETY CHECK - Blocks progression until user confirms
 * This is a gatekeeper modal, not an optional preview
 */

import { cutSimulator } from '@/lib/simulation/CutSimulator';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/ui/dialog';
import type { OptimizationResult, Profile, WindowComponent } from '@/types/fabricator';
import { AlertTriangle, CheckCircle2, Loader2, Settings, XCircle } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CutSimulationViewer } from './CutSimulationViewer';

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
    const profileIds = new Set(components.map((c) => c.profile.id));
    const uncalibrated: string[] = [];
    const partiallyCalibrated: string[] = [];

    for (const profileId of profileIds) {
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) continue;

      // Check if profile has calibrations with allowances
      const hasCalibration = profile.calibrations && profile.calibrations.length > 0;
      const hasMiter45Allowance = profile.calibrations?.some(
        (cal) => cal.allowances?.miter45Extra !== undefined && cal.allowances.miter45Extra !== 0
      );
      const hasBasicAllowance = profile.calibrations?.some(
        (cal) => cal.allowances?.basicCutting !== undefined && cal.allowances.basicCutting !== 0
      );

      if (!hasCalibration || (!hasMiter45Allowance && !hasBasicAllowance)) {
        uncalibrated.push(profile.name);
      } else if (!hasMiter45Allowance || !hasBasicAllowance) {
        partiallyCalibrated.push(profile.name);
      }
    }

    return {
      uncalibrated,
      partiallyCalibrated,
      allCalibrated: uncalibrated.length === 0 && partiallyCalibrated.length === 0,
    };
  }, [components, profiles]);

  // Calculate summary statistics from optimization result or components
  const summary = useMemo(() => {
    // Try to get data from optimization result first (most accurate)
    if (optimizationResult?.cuttingPlan && optimizationResult.cuttingPlan.length > 0) {
      let totalCuts = 0;
      const uniqueProfiles = new Set<string>();
      let totalMaterialLength = 0;
      let totalBars = 0;

      optimizationResult.cuttingPlan.forEach((plan) => {
        totalCuts += plan.cuts.length;
        uniqueProfiles.add(plan.profile.name || plan.profile.id);
        plan.cuts.forEach((cut) => {
          totalMaterialLength += cut.length || 0;
        });
        totalBars += 1; // Each plan represents one bar
      });

      return {
        totalCuts,
        uniqueProfiles: uniqueProfiles.size,
        totalMaterialLength: Math.round(totalMaterialLength),
        estimatedBars: totalBars || Math.ceil(totalMaterialLength / 6000),
        totalWaste: optimizationResult.wastePercentage || 0,
        efficiency: optimizationResult.nestingEfficiency || 0,
      };
    }

    // Fallback: Calculate from components
    if (components && components.length > 0) {
      const uniqueProfiles = new Set<string>();
      let totalMaterialLength = 0;
      let totalCuts = 0;

      components.forEach((comp) => {
        if (comp.profile?.id) {
          uniqueProfiles.add(comp.profile.id);
        }
        
        // Calculate from cutting lengths if available
        if (comp.cuttingLengths && comp.cuttingLengths.length > 0) {
          comp.cuttingLengths.forEach((len) => {
            totalMaterialLength += len;
            totalCuts += 1;
          });
        } else if (comp.width && comp.height) {
          // Fallback: estimate from dimensions
          totalMaterialLength += (comp.width + comp.height) * 2; // Perimeter estimate
          totalCuts += 4; // 4 sides
        }
      });

      return {
        totalCuts,
        uniqueProfiles: uniqueProfiles.size,
        totalMaterialLength: Math.round(totalMaterialLength),
        estimatedBars: Math.ceil(totalMaterialLength / 6000),
        totalWaste: 0,
        efficiency: 0,
      };
    }

    // Last resort: Use simulation data
    const totalCuts = simulation.cuts.length;
    const uniqueProfiles = new Set(simulation.cuts.map((c) => c.profileName));
    const totalMaterialLength = simulation.cuts.reduce((sum, c) => sum + c.cutLength, 0);

    return {
      totalCuts,
      uniqueProfiles: uniqueProfiles.size,
      totalMaterialLength: Math.round(totalMaterialLength),
      estimatedBars: Math.ceil(totalMaterialLength / 6000),
      totalWaste: 0,
      efficiency: 0,
    };
  }, [optimizationResult, components, simulation]);

  // Check if user can proceed (no critical errors)
  const canProceed = validation.isValid && calibrationStatus.allCalibrated;
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    if (canProceed && !isProcessing) {
      setIsProcessing(true);
      try {
        // Call onConfirm (which is executePendingAction) and wait for it
        await onConfirm();
        // Don't close immediately - let the parent handle closing after success
        // The dialog will close when showProductionPreview is set to false by parent
      } catch (error) {
        console.error('Error in production preview confirmation:', error);
        // Keep dialog open on error so user can see the error message
      } finally {
        setIsProcessing(false);
      }
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
            <AlertTriangle className="h-6 w-6 text-amber-400" /> Final Safety Check
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Review your cuts carefully. This is your final safety check to protect your materials and money.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary Statistics - Professional Dynamic Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg border border-blue-500/30 shadow-lg hover:shadow-blue-500/20 transition-all duration-300 group">
              <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <p className="text-xs font-semibold text-blue-300/80 uppercase tracking-wider mb-2">Total Cuts</p>
              <p className="text-3xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
                {summary.totalCuts.toLocaleString()}
              </p>
              <p className="text-[10px] text-blue-400/60 mt-1">Optimized cuts</p>
            </div>
            
            <div className="relative p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg border border-green-500/30 shadow-lg hover:shadow-green-500/20 transition-all duration-300 group">
              <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-xs font-semibold text-green-300/80 uppercase tracking-wider mb-2">Profiles</p>
              <p className="text-3xl font-bold text-green-400 group-hover:text-green-300 transition-colors">
                {summary.uniqueProfiles}
              </p>
              <p className="text-[10px] text-green-400/60 mt-1">Unique types</p>
            </div>
            
            <div className="btn-primary-gradient">
              <div className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
              <p className="text-xs font-semibold text-amber-300/80 uppercase tracking-wider mb-2">Material Length</p>
              <p className="text-3xl font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                {summary.totalMaterialLength > 0 
                  ? `${(summary.totalMaterialLength / 1000).toFixed(2)}m`
                  : '0m'}
              </p>
              <p className="text-[10px] text-amber-400/60 mt-1">
                {summary.totalMaterialLength > 0 
                  ? `${summary.totalMaterialLength.toLocaleString()}mm`
                  : 'No material'}
              </p>
            </div>
            
            <div className="relative p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg border border-purple-500/30 shadow-lg hover:shadow-purple-500/20 transition-all duration-300 group">
              <div className="absolute top-2 right-2 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <p className="text-xs font-semibold text-purple-300/80 uppercase tracking-wider mb-2">Est. Bars</p>
              <p className="text-3xl font-bold text-purple-400 group-hover:text-purple-300 transition-colors">
                {summary.estimatedBars}
              </p>
              <p className="text-[10px] text-purple-400/60 mt-1">
                {summary.efficiency > 0 
                  ? `${summary.efficiency.toFixed(1)}% efficiency`
                  : 'Stock bars needed'}
              </p>
            </div>
          </div>

          {/* Additional Metrics Row - Only show if optimization data available */}
          {optimizationResult && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <p className="text-xs text-gray-400 mb-1">Efficiency</p>
                <p className="text-xl font-bold status-valid">
                  {optimizationResult.nestingEfficiency?.toFixed(1) || '0'}%
                </p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <p className="text-xs text-gray-400 mb-1">Waste</p>
                <p className="text-xl font-bold text-red-400">
                  {optimizationResult.wastePercentage?.toFixed(1) || '0'}%
                </p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <p className="text-xs text-gray-400 mb-1">Est. Cost</p>
                <p className="text-xl font-bold text-yellow-400">
                  {optimizationResult.costBreakdown?.totalCost 
                    ? `${optimizationResult.costBreakdown.totalCost.toFixed(0)} EGP`
                    : 'N/A'}
                </p>
              </div>
            </div>
          )}

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
                  className="btn-primary"
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
                className="btn-primary"
              >
                <Settings className="h-4 w-4 mr-1" />
                Adjust Calibration
              </Button>
            )}
            <Button
              onClick={handleConfirm}
              disabled={!canProceed || isProcessing}
              className="bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm & Generate
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

