/**
 * Safety Verification Flow Orchestrator
 * 
 * Gold Tier Implementation:
 * - Orchestrates 3-step safety verification flow
 * - Manages state transitions between modals
 * - Integrates with safety logging service
 * - Performance optimized (memoized callbacks)
 * - Type-safe with comprehensive error handling
 * 
 * Purpose: Coordinate the 3-step safety verification process
 */

import { useAuth } from '@/context/AuthContext';
import { SafetyLoggingService } from '@/lib/safety/SafetyLoggingService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/ui/alert-dialog';
import type { OptimizationResult, Profile, WindowComponent } from '@/types/fabricator';
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FinalVerificationModal, type FinalVerificationData } from './FinalVerificationModal';
import { SafetyWarningModal, type SafetyWarning } from './SafetyWarningModal';
import { ToolpathPreviewModal, type CollisionCheckResult } from './ToolpathPreviewModal';

export type SafetyVerificationStep = 'step1' | 'step2' | 'step3' | 'complete';

export interface SafetyVerificationFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (verificationData: FinalVerificationData) => Promise<void>;
  components: WindowComponent[];
  profiles: Profile[];
  optimizationResult?: OptimizationResult;
  jobId: string;
  machineType: string;
  gcodePreview?: string;
}

/**
 * Safety Verification Flow Component
 * 
 * Orchestrates the 3-step safety verification process
 */
export const SafetyVerificationFlow: React.FC<SafetyVerificationFlowProps> = ({
  open,
  onOpenChange,
  onComplete,
  components,
  profiles,
  optimizationResult,
  jobId,
  machineType,
  gcodePreview,
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<SafetyVerificationStep>('step1');
  const [collisionCheckResult, setCollisionCheckResult] = useState<CollisionCheckResult | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Generate safety warnings based on optimization result
  const safetyWarnings = useMemo<SafetyWarning[]>(() => {
    const warnings: SafetyWarning[] = [];

    // Critical: No optimization result
    if (!optimizationResult) {
      warnings.push({
        id: 'no-optimization',
        severity: 'critical',
        title: 'No Optimization Result',
        message: 'Optimization result is missing. Cannot proceed without valid optimization data.',
        requiresAcknowledgment: true,
      });
    }

    // Critical: High waste percentage
    if (optimizationResult && optimizationResult.wastePercentage > 25) {
      warnings.push({
        id: 'high-waste',
        severity: 'critical',
        title: 'High Material Waste Detected',
        message: `Material waste is ${optimizationResult.wastePercentage.toFixed(1)}%. This exceeds recommended thresholds. Please review your cutting plan.`,
        requiresAcknowledgment: true,
      });
    }

    // Warning: Low efficiency
    if (optimizationResult && optimizationResult.nestingEfficiency < 85) {
      warnings.push({
        id: 'low-efficiency',
        severity: 'warning',
        title: 'Low Nesting Efficiency',
        message: `Nesting efficiency is ${optimizationResult.nestingEfficiency.toFixed(1)}%. Consider optimizing your cutting plan.`,
        requiresAcknowledgment: true,
      });
    }

    // Info: Machine type
    warnings.push({
      id: 'machine-type',
      severity: 'info',
      title: 'Machine Configuration',
      message: `G-code will be generated for ${machineType}. Ensure this matches your physical machine.`,
      requiresAcknowledgment: false,
    });

    return warnings;
  }, [optimizationResult, machineType]);

  // Handle Step 1 completion
  const handleStep1Complete = useCallback(async () => {
    if (!user) return;

    try {
      // Log Step 1
      await SafetyLoggingService.logStep1({
        jobId,
        userId: user.id,
        machineType,
        warningsAcknowledged: safetyWarnings
          .filter((w) => w.requiresAcknowledgment)
          .map((w) => w.id),
        timestamp: new Date().toISOString(),
      });

      // Move to Step 2
      setCurrentStep('step2');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete safety verification step 1';
      toast.error('Safety Verification Error', {
        description: errorMessage,
        duration: 5000,
      });
      // Keep on Step 1 on error - user can retry
    }
  }, [user, jobId, machineType, safetyWarnings]);

  // Handle Step 2 completion
  const handleStep2Complete = useCallback(async (collisionCheck: CollisionCheckResult) => {
    if (!user) return;

    try {
      // Store collision check result
      setCollisionCheckResult(collisionCheck);

      // Log Step 2
      await SafetyLoggingService.logStep2({
        jobId,
        userId: user.id,
        machineType,
        collisionCheckPassed: collisionCheck.passed,
        collisionsDetected: collisionCheck.collisions.length,
        outOfBoundsDetected: collisionCheck.outOfBounds.length,
        timestamp: new Date().toISOString(),
      });

      // Only proceed to Step 3 if collision check passed
      if (collisionCheck.passed) {
        setCurrentStep('step3');
      } else {
        // Show error - cannot proceed
        toast.error('Collision Check Failed', {
          description: 'Please resolve all critical collisions and out-of-bounds issues before proceeding to final verification.',
          duration: 6000,
          action: {
            label: 'Review Issues',
            onClick: () => {
              // Focus on collision details in the modal
              const collisionSection = document.querySelector('[data-collision-section]');
              collisionSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            },
          },
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete collision check';
      toast.error('Collision Check Error', {
        description: errorMessage,
        duration: 5000,
      });
      // Keep on Step 2 on error - user can retry
    }
  }, [user, jobId, machineType]);

  // Handle Step 3 completion
  const handleStep3Complete = useCallback(async (verificationData: FinalVerificationData) => {
    if (!user) return;

    try {
      // Log Step 3
      await SafetyLoggingService.logStep3({
        jobId: verificationData.jobId,
        userId: user.id,
        machineType: verificationData.machineType,
        verifiedAt: verificationData.verifiedAt,
        ipAddress: verificationData.ipAddress,
        digitalSignature: verificationData.digitalSignature,
        gcodeHashBefore: verificationData.gcodeHashBefore,
      });

      // Mark as complete
      setCurrentStep('complete');

      // Call parent completion handler
      await onComplete(verificationData);

      // Close flow
      onOpenChange(false);
      
      // Show success notification
      toast.success('Safety Verification Complete', {
        description: 'G-code generation can now proceed.',
        duration: 3000,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete final verification';
      toast.error('Final Verification Error', {
        description: errorMessage,
        duration: 5000,
      });
      // Keep modal open on error - user can retry
    }
  }, [user, onComplete, onOpenChange]);

  // Handle modal close
  const handleClose = useCallback((newOpen: boolean) => {
    if (!newOpen && currentStep !== 'complete') {
      // User trying to close before completion - show confirmation dialog
      setShowCancelConfirm(true);
    } else {
      onOpenChange(newOpen);
      if (!newOpen) {
        // Reset state when closed
        setCurrentStep('step1');
        setCollisionCheckResult(null);
      }
    }
  }, [currentStep, onOpenChange]);

  // Handle cancel confirmation
  const handleCancelConfirm = useCallback(() => {
    setShowCancelConfirm(false);
    onOpenChange(false);
    // Reset state
    setCurrentStep('step1');
    setCollisionCheckResult(null);
    toast.warning('Safety Verification Cancelled', {
      description: 'Safety verification was not completed. G-code generation is blocked.',
      duration: 4000,
    });
  }, [onOpenChange]);

  // Render current step
  return (
    <>
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent className="bg-gray-900 border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-400">Cancel Safety Verification?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to cancel? Safety verification will not be completed and G-code generation will be blocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-800">
              Continue Verification
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Cancel Verification
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Step 1: Safety Warning Modal */}
      <SafetyWarningModal
        open={open && currentStep === 'step1'}
        onOpenChange={handleClose}
        warnings={safetyWarnings}
        onProceed={handleStep1Complete}
        jobId={jobId}
        machineType={machineType}
      />

      {/* Step 2: Toolpath Preview Modal */}
      <ToolpathPreviewModal
        open={open && currentStep === 'step2'}
        onOpenChange={handleClose}
        components={components}
        profiles={profiles}
        optimizationResult={optimizationResult}
        onProceed={handleStep2Complete}
        jobId={jobId}
        machineType={machineType}
      />

      {/* Step 3: Final Verification Modal */}
      <FinalVerificationModal
        open={open && currentStep === 'step3'}
        onOpenChange={handleClose}
        onConfirm={handleStep3Complete}
        jobId={jobId}
        machineType={machineType}
        gcodePreview={gcodePreview}
        collisionCheckPassed={collisionCheckResult?.passed ?? false}
      />
    </>
  );
};

