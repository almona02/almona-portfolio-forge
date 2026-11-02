// src/components/fabricator/drafting/ConstraintValidationPanel.tsx
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import React, { useMemo } from 'react';
import { useDraftingContext } from './DraftingContext';
import { validateConstraints, type DesignConstraint } from './utils/constraintValidator';

interface ConstraintValidationPanelProps {
  constraints?: DesignConstraint[];
}

export const ConstraintValidationPanel: React.FC<ConstraintValidationPanelProps> = ({
  constraints = [],
}) => {
  const drafting = useDraftingContext();
  const geometry = drafting.getGeometry();

  const validationIssues = useMemo(() => {
    if (constraints.length === 0 || geometry.rectangles.length === 0) {
      return [];
    }
    return validateConstraints(geometry, constraints);
  }, [geometry, constraints]);

  const errors = validationIssues.filter((issue) => issue.severity === 'error');
  const warnings = validationIssues.filter((issue) => issue.severity === 'warning');
  const infos = validationIssues.filter((issue) => issue.severity === 'info');

  if (constraints.length === 0) {
    return (
      <div className="p-3 bg-background/50 border border-border/50 rounded-lg">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info size={14} />
          <span className="text-xs">No constraints defined</span>
        </div>
      </div>
    );
  }

  if (validationIssues.length === 0) {
    return (
      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle size={14} />
          <span className="text-xs font-medium">All constraints satisfied</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Errors */}
      {errors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-destructive" />
            <span className="text-xs font-semibold text-destructive">Errors ({errors.length})</span>
          </div>
          <div className="space-y-1">
            {errors.map((issue, index) => (
              <div
                key={index}
                className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-destructive"
              >
                {issue.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-warning" />
            <span className="text-xs font-semibold text-warning">Warnings ({warnings.length})</span>
          </div>
          <div className="space-y-1">
            {warnings.map((issue, index) => (
              <div
                key={index}
                className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-warning"
              >
                {issue.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      {infos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Info size={14} className="text-info" />
            <span className="text-xs font-semibold text-info">Info ({infos.length})</span>
          </div>
          <div className="space-y-1">
            {infos.map((issue, index) => (
              <div
                key={index}
                className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-info"
              >
                {issue.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

