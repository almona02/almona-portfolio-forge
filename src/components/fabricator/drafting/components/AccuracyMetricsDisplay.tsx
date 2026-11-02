// src/components/fabricator/drafting/components/AccuracyMetricsDisplay.tsx

import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { PatternResult } from '../utils/patternUtils';

interface AccuracyMetricsDisplayProps {
  result: PatternResult | null;
  onClose?: () => void;
}

export const AccuracyMetricsDisplay: React.FC<AccuracyMetricsDisplayProps> = ({ result, onClose }) => {
  if (!result) return null;

  const { accuracy } = result;
  const metrics = {
    precision: accuracy.precision,
    tolerance: accuracy.tolerance,
    validation: accuracy.validation,
    issues: accuracy.issues
  };

  const getValidationIcon = () => {
    switch (metrics.validation) {
      case 'pass':
        return <CheckCircle className="text-success" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-warning" size={20} />;
      case 'fail':
        return <XCircle className="text-destructive" size={20} />;
      default:
        return null;
    }
  };

  const getValidationColor = () => {
    switch (metrics.validation) {
      case 'pass':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'fail':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground">Accuracy Metrics</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground"
          >
            ×
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Validation Status */}
        <div className="flex items-center gap-2">
          {getValidationIcon()}
          <span className={`font-medium ${getValidationColor()}`}>
            Validation: {metrics.validation.toUpperCase()}
          </span>
        </div>

        {/* Precision */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Precision:</span>
          <span className="text-sm font-medium text-foreground">
            {metrics.precision.toFixed(2)} mm
          </span>
        </div>

        {/* Tolerance */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Tolerance:</span>
          <span className="text-sm font-medium text-foreground">
            {metrics.tolerance.toFixed(2)}%
          </span>
        </div>

        {/* Standards Reference */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            CAD Industry Standards: 0.4mm precision (1/64"), 1% tolerance for mechanical drafting
          </p>
        </div>

        {/* Issues */}
        {metrics.issues.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-sm font-medium text-destructive mb-1">Issues:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              {metrics.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

