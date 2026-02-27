/**
 * WorkflowValidationGate - Inter-step validation UI
 *
 * Phase 3.1.3: Blocks or warns when transitioning between fabricator workflow steps.
 * Errors = block; Warnings = allow with confirmation.
 */

import type { ValidationIssue, WorkflowValidationResult } from '@/lib/fabricator/validation/WorkflowValidator';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface WorkflowValidationGateProps {
  /** Validation result from WorkflowValidator */
  result: WorkflowValidationResult;
  /** Target step user is trying to reach */
  targetStepLabel?: string;
  /** Called when user proceeds (valid or proceeded despite warnings) */
  onProceed?: () => void;
  /** Called when user goes back to fix issues */
  onGoBack?: () => void;
  /** Optional: custom back label */
  backLabel?: string;
  /** Optional: hide proceed when there are errors */
  blockOnError?: boolean;
  className?: string;
}

export const WorkflowValidationGate: React.FC<WorkflowValidationGateProps> = ({
  result,
  targetStepLabel,
  onProceed,
  onGoBack,
  backLabel,
  blockOnError = true,
  className = '',
}) => {
  const { t } = useTranslation('fabricator');
  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;
  const canProceed = result.valid || (hasWarnings && !hasErrors);
  const isBlocked = hasErrors && blockOnError;

  if (result.valid && !hasWarnings) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {hasErrors && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {t('workflow_validation.blocking_issues', 'Cannot proceed')}
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
              {result.errors.map((e: ValidationIssue, i: number) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {hasWarnings && !hasErrors && (
        <Alert className="bg-amber-900/20 border-amber-500/50">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle>
            {t('workflow_validation.warnings', 'Warnings')}
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-amber-200/90">
              {result.warnings.map((w: ValidationIssue, i: number) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-3">
        {onGoBack && (
          <Button
            variant={isBlocked ? 'default' : 'outline'}
            onClick={onGoBack}
          >
            {backLabel ?? t('workflow_validation.go_back', 'Go back')}
          </Button>
        )}
        {onProceed && canProceed && !isBlocked && (
          <Button
            onClick={onProceed}
            className={hasWarnings ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            {hasWarnings ? (
              t('workflow_validation.proceed_anyway', 'Proceed anyway')
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {targetStepLabel
                  ? t('workflow_validation.continue_to', 'Continue to {step}', { step: targetStepLabel })
                  : t('workflow_validation.continue', 'Continue')}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

WorkflowValidationGate.displayName = 'WorkflowValidationGate';
