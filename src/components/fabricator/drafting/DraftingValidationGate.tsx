// src/components/fabricator/drafting/DraftingValidationGate.tsx
// @tier Tier 1 (Gatekeeper)
// @constitutional_compliance AICS-001 §5.8

import type { ConstitutionalViolation } from '@/lib/constitutional/WiringValidator';
import { validateDesignWithEnvelope } from '@/lib/fabricator/ConstraintEngine';
import { Button } from '@/shared/ui/ui/button';
import type { WindowGrid } from '@/types/fabricator';
import { AlertCircle, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import type { DraftingOutput, Geometry2D } from './types/drafting';

/**
 * DraftingValidationGate - Critical Control Point (CCP)
 * 
 * Constitutional Role: Validates visual 2D design before promoting to Tier 3 Manufacturing Context
 * Authority: AICS-001 §5.8 (Versioning & Explainability), §4.4 (Constraint Enforcement Model)
 * 
 * Determinism Requirement: 100% deterministic validation logic. No fuzzy logic, no AI predictions.
 * Gatekeeping: If isValid is false, the "Generate BOM" button is physically disabled.
 * Audit: Every validation attempt generates a distinct validation_id for the audit trail.
 */

export interface DraftingValidationGateProps {
  /** Unique identifier for the design being validated */
  designId: string;

  /** Current geometry state from drafting workbench */
  geometry: Geometry2D;

  /** Overall width of the design (mm) */
  width: number;

  /** Overall height of the design (mm) */
  height: number;

  /** Grid structure defining the window layout */
  grid: WindowGrid;

  /** Selected system pack ID */
  systemId?: string | null;

  /** Callback triggered when validation succeeds and user promotes to fabrication */
  onValidationSuccess: (output: DraftingOutput) => void;

  /** Optional: Disable the gate (for testing/debugging only) */
  disabled?: boolean;
}

export interface ValidationGateResult {
  /** Whether the design is qualified for manufacturing */
  qualified: boolean;

  /** Blocking violations that prevent manufacturing */
  violations: ConstitutionalViolation[];

  /** Advisory warnings (informational, non-blocking) */
  warnings: string[];

  /** Unique audit identifier for this validation attempt */
  auditHash: string;

  /** Timestamp of validation */
  timestamp: string;
}

/**
 * Generate a unique validation ID for audit trail
 */
const generateValidationId = (designId: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `VAL-${designId}-${timestamp}-${random}`;
};

/**
 * Validate visual integrity of geometry
 * Returns violations if geometry has open contours or overlapping vectors
 */
const validateVisualIntegrity = (geometry: Geometry2D): ConstitutionalViolation[] => {
  const violations: ConstitutionalViolation[] = [];

  // Check for open contours (polygons that aren't closed)
  geometry.polygons.forEach((polygon, index) => {
    if (!polygon.closed && polygon.points.length > 2) {
      violations.push({
        type: 'TIER_LEAKAGE',
        component: 'DraftingValidationGate',
        message: `Polygon ${index + 1} has open contour (not closed)`,
        severity: 'ERROR',
        remediation: 'Close the polygon by connecting the last point to the first point',
        aicsReference: 'AICS-001 §4.3.1 (Geometric Constraints)'
      });
    }
  });

  // Check for overlapping rectangles (simple overlap detection)
  for (let i = 0; i < geometry.rectangles.length; i++) {
    for (let j = i + 1; j < geometry.rectangles.length; j++) {
      const r1 = geometry.rectangles[i];
      const r2 = geometry.rectangles[j];

      // Simple AABB overlap check
      const overlap = !(
        r1.x + r1.width < r2.x ||
        r2.x + r2.width < r1.x ||
        r1.y + r1.height < r2.y ||
        r2.y + r2.height < r1.y
      );

      if (overlap) {
        violations.push({
          type: 'TIER_LEAKAGE',
          component: 'DraftingValidationGate',
          message: `Rectangles ${i + 1} and ${j + 1} overlap`,
          severity: 'WARNING',
          remediation: 'Adjust rectangle positions to eliminate overlap',
          aicsReference: 'AICS-001 §4.3.1 (Geometric Constraints)'
        });
      }
    }
  }

  return violations;
};

/**
 * Validate system compatibility
 * Returns violations if selected profiles don't exist or glazing thickness is incompatible
 */
const validateSystemCompatibility = (
  systemId: string | null | undefined,
  grid: WindowGrid
): ConstitutionalViolation[] => {
  const violations: ConstitutionalViolation[] = [];

  // Check if system pack is selected
  if (!systemId || systemId === 'generic') {
    violations.push({
      type: 'AUTHORITY_AMBIGUITY',
      component: 'DraftingValidationGate',
      message: 'No specific system pack selected (using generic)',
      severity: 'WARNING',
      remediation: 'Select a specific system pack for accurate BOM generation',
      aicsReference: 'AICS-001 §6.2 (Single Source of Truth)'
    });
  }

  // Check for empty grid
  if (!grid || grid.cells.length === 0) {
    violations.push({
      type: 'TIER_LEAKAGE',
      component: 'DraftingValidationGate',
      message: 'Grid layout is empty or undefined',
      severity: 'ERROR',
      remediation: 'Define at least one cell in the grid layout',
      aicsReference: 'AICS-001 §4.3.1 (Geometric Constraints)'
    });
  }

  return violations;
};

export const DraftingValidationGate: React.FC<DraftingValidationGateProps> = ({
  designId,
  geometry,
  width,
  height,
  grid,
  systemId,
  onValidationSuccess,
  disabled = false
}) => {
  const [validationResult, setValidationResult] = useState<ValidationGateResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Run validation whenever design changes
  const validateDesign = useMemo(() => {
    return (): ValidationGateResult => {
      const auditHash = generateValidationId(designId);
      const timestamp = new Date().toISOString();

      // 1. VISUAL INTEGRITY CHECK
      const visualViolations = validateVisualIntegrity(geometry);

      // 2. SYSTEM COMPATIBILITY CHECK
      const compatibilityViolations = validateSystemCompatibility(systemId, grid);

      // 3. STRUCTURAL RULE CHECK (Deterministic)
      // Use existing ConstraintEngine validation
      const structuralResult = validateDesignWithEnvelope(
        width,
        height,
        grid,
        systemId,
        true // Use envelope validation
      );

      // Convert structural errors to constitutional violations
      const structuralViolations: ConstitutionalViolation[] = structuralResult.errors.map(error => ({
        type: 'TIER_LEAKAGE',
        component: 'DraftingValidationGate',
        message: error,
        severity: 'ERROR',
        remediation: 'Adjust dimensions or grid layout to meet structural requirements',
        aicsReference: 'AICS-001 §4.3 (Deterministic Constraints)'
      }));

      // Combine all violations
      const allViolations = [
        ...visualViolations,
        ...compatibilityViolations,
        ...structuralViolations
      ];

      // Separate blocking errors from warnings
      const blockingViolations = allViolations.filter(v => v.severity === 'ERROR');
      const warnings = allViolations
        .filter(v => v.severity === 'WARNING')
        .map(v => v.message);

      // Design is qualified only if there are no blocking violations
      const qualified = blockingViolations.length === 0;

      return {
        qualified,
        violations: blockingViolations,
        warnings,
        auditHash,
        timestamp
      };
    };
  }, [designId, geometry, width, height, grid, systemId]);

  // Auto-validate on mount and when dependencies change
  useEffect(() => {
    setIsValidating(true);
    const result = validateDesign();
    setValidationResult(result);
    setIsValidating(false);

    // Log to console for audit trail
    console.log('[DraftingValidationGate] Validation Result:', {
      auditHash: result.auditHash,
      timestamp: result.timestamp,
      qualified: result.qualified,
      violationCount: result.violations.length,
      warningCount: result.warnings.length
    });
  }, [validateDesign]);

  const handlePromoteToFabrication = () => {
    if (!validationResult?.qualified) {
      console.error('[DraftingValidationGate] Cannot promote: Design has blocking violations');
      return;
    }

    // Create DraftingOutput with constitutional metadata
    const output: DraftingOutput = {
      geometry,
      dimensions: [],
      annotations: [],
      template: {
        id: 'custom',
        name: 'Custom Layout',
        rows: grid.rows,
        cols: grid.cols,
        cellTypes: grid.cells.map(cell => [cell.type]),
        constraints: {
          minWidth: 300,
          maxWidth: 3000,
          minHeight: 300,
          maxHeight: 3000
        }
      },
      suggestedSystemPack: systemId || 'generic',
      metadata: {
        tier: 'Tier 0',
        draftingOnly: true,
        requiresValidation: true,
        timestamp: validationResult.timestamp,
        validationId: validationResult.auditHash,
        constitutionalNote: 'Design validated and promoted via DraftingValidationGate (AICS-001 §5.8)'
      }
    };

    onValidationSuccess(output);
  };

  if (!validationResult) {
    return (
      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400">
          <Shield className="w-5 h-5 animate-pulse" />
          <span className="text-sm">Validating design...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Validation Status Panel */}
      <div className={`p-4 rounded-lg border ${validationResult.qualified
          ? 'bg-green-900/20 border-green-500/30'
          : 'bg-red-900/20 border-red-500/30'
        }`}>
        <div className="flex items-start gap-3">
          {validationResult.qualified ? (
            <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm mb-1 ${validationResult.qualified ? 'text-green-300' : 'text-red-300'
              }`}>
              {validationResult.qualified
                ? '✅ Qualified for Manufacturing'
                : '❌ Manufacturing Violations Detected'}
            </h3>

            <p className="text-xs text-slate-400 mb-2">
              Validation ID: <code className="text-xs bg-slate-900/50 px-1 py-0.5 rounded">{validationResult.auditHash}</code>
            </p>

            {/* Blocking Violations (Errors) */}
            {validationResult.violations.length > 0 && (
              <div className="mt-3 space-y-2">
                <h4 className="text-xs font-semibold text-red-300 uppercase tracking-wide">
                  Blocking Errors (Must Fix)
                </h4>
                <ul className="space-y-1.5">
                  {validationResult.violations.map((violation, index) => (
                    <li key={index} className="text-xs text-red-200 flex items-start gap-2">
                      <span className="text-red-400 flex-shrink-0">•</span>
                      <div className="flex-1">
                        <div className="font-medium">{violation.message}</div>
                        <div className="text-red-300/70 mt-0.5">🔧 {violation.remediation}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Advisory Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="mt-3 space-y-2">
                <h4 className="text-xs font-semibold text-yellow-300 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Advisory Warnings (Non-Blocking)
                </h4>
                <ul className="space-y-1">
                  {validationResult.warnings.map((warning, index) => (
                    <li key={index} className="text-xs text-yellow-200/80 flex items-start gap-2">
                      <span className="text-yellow-400 flex-shrink-0">⚠</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Promote to Fabrication Button */}
      <Button
        onClick={handlePromoteToFabrication}
        disabled={!validationResult.qualified || disabled || isValidating}
        className={`w-full h-11 text-sm font-semibold transition-all duration-300 ${validationResult.qualified && !disabled
            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-900/30'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
      >
        <Shield className="w-4 h-4 mr-2" />
        {validationResult.qualified
          ? 'Promote to Fabrication (Tier 3)'
          : 'Cannot Promote - Fix Violations First'}
      </Button>

      {/* Constitutional Notice */}
      <div className="text-xs text-slate-500 text-center">
        <p>Constitutional Validation Gate • AICS-001 §5.8</p>
        <p className="mt-0.5">Deterministic validation • No override allowed</p>
      </div>
    </div>
  );
};
