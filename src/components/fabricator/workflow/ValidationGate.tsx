import { WorkflowValidator, type ValidationIssue, type ValidationResult } from '@/lib/fabricator/validation/WorkflowValidator';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/store/workflowStore';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ValidationGate — Displays validation status between the step navigator
 * and the page content. Shows errors, warnings, and pass status based on
 * the current workflow step's prerequisites.
 *
 * Inspired by Logikal's continuous plausibility checks.
 */
export const ValidationGate: React.FC = () => {
  const location = useLocation();
  const { currentProject, measurementData, bom, optimizationResult } = useWorkflowStore();

  const activeStep = useMemo(() => {
    const path = location.pathname;
    if (path.endsWith('/design')) return 'design';
    if (path.endsWith('/bom')) return 'bom';
    if (path.endsWith('/optimization')) return 'optimization';
    if (path.endsWith('/commercial')) return 'commercial';
    if (path.endsWith('/production')) return 'production';
    return null;
  }, [location.pathname]);

  const validation = useMemo<ValidationResult | null>(() => {
    if (!activeStep) return null;

    switch (activeStep) {
      case 'design':
        return WorkflowValidator.validateMeasuringToDesign(measurementData, currentProject);
      case 'bom':
        return WorkflowValidator.validateDesignToBOM(currentProject);
      case 'optimization':
        return WorkflowValidator.validateBOMToOptimization(bom);
      case 'commercial':
        return WorkflowValidator.validateOptimizationToCommercial(optimizationResult);
      case 'production':
        return WorkflowValidator.validateCommercialToProduction(optimizationResult, currentProject);
      default:
        return null;
    }
  }, [activeStep, currentProject, measurementData, bom, optimizationResult]);

  if (!validation) return null;
  if (validation.passed && validation.warnings.length === 0) return null;

  return (
    <div className={cn(
      'px-4 py-2 border-b flex items-start gap-2 text-xs',
      !validation.passed
        ? 'bg-red-950/30 border-red-600/30'
        : 'bg-amber-950/20 border-amber-600/20',
    )}>
      {!validation.passed ? (
        <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
      ) : (
        <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
      )}

      <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1">
        {validation.issues.map((issue) => (
          <IssueChip key={issue.code} issue={issue} />
        ))}
        {validation.warnings.map((issue) => (
          <IssueChip key={issue.code} issue={issue} />
        ))}
      </div>

      {validation.passed && (
        <CheckCircle2 size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
      )}
    </div>
  );
};

const IssueChip: React.FC<{ issue: ValidationIssue }> = ({ issue }) => {
  const Icon = issue.severity === 'error' ? XCircle
    : issue.severity === 'warning' ? AlertTriangle
    : Info;

  const color = issue.severity === 'error' ? 'text-red-300'
    : issue.severity === 'warning' ? 'text-amber-300'
    : 'text-slate-400';

  return (
    <span className={cn('flex items-center gap-1', color)}>
      <Icon size={10} />
      <span className="font-mono text-[10px] opacity-60">{issue.code}</span>
      <span>{issue.message}</span>
    </span>
  );
};
