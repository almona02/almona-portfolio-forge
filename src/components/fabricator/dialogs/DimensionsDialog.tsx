/**
 * DimensionsDialog Component
 * 
 * Modal dialog for capturing dimensions when starting a new design.
 * Part of Phase 3: Measurement-First Workflow Redesign.
 * 
 * Features:
 * - Width/Height input fields (mm)
 * - Quick template buttons for common sizes
 * - Optional system pack selector
 * - Pre-fill from project if available
 * - Validation based on system pack constraints
 * - Keyboard shortcuts (Enter to submit, Escape to cancel)
 */

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { GoldTierInput } from '@/components/ui/input-gold-tier';
import type { ValidationError } from '@/lib/fabricatorValidation';
import { getConstraintsForSystemPack, validateMeasurements } from '@/lib/fabricatorValidation';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { Label } from '@/shared/ui/ui/label';
import type { WindowUnit } from '@/types/fabricator';
import { AlertCircle, Ruler } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_MEASUREMENTS } from '../measuringConstants';

export interface DimensionsData {
  width: number;
  height: number;
  systemPackId?: string | null;
}

export interface DimensionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DimensionsData) => void;
  initialDimensions?: {
    width?: number;
    height?: number;
  };
  systemPackId?: string | null;
  project?: WindowUnit | null;
  className?: string;
}

// Common window sizes for quick selection (Egyptian market standard sizes)
const COMMON_SIZES = [
  { width: 1800, height: 1500, label: '1800×1500' },
  { width: 1200, height: 1200, label: '1200×1200' },
  { width: 2100, height: 1800, label: '2100×1800' },
  { width: 1500, height: 1500, label: '1500×1500' },
  { width: 2400, height: 1500, label: '2400×1500' },
  { width: 1800, height: 2000, label: '1800×2000' },
];

export const DimensionsDialog: React.FC<DimensionsDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialDimensions,
  systemPackId,
  project,
  className = '',
}) => {
  const { t } = useTranslation('fabricator');
  
  // Initialize dimensions from props or project
  const getInitialDimensions = useCallback(() => {
    if (project) {
      return {
        width: project.overallWidth || DEFAULT_MEASUREMENTS.DEFAULT_WIDTH_MM,
        height: project.overallHeight || DEFAULT_MEASUREMENTS.DEFAULT_HEIGHT_MM,
      };
    }
    if (initialDimensions) {
      return {
        width: initialDimensions.width || DEFAULT_MEASUREMENTS.DEFAULT_WIDTH_MM,
        height: initialDimensions.height || DEFAULT_MEASUREMENTS.DEFAULT_HEIGHT_MM,
      };
    }
    return {
      width: DEFAULT_MEASUREMENTS.DEFAULT_WIDTH_MM,
      height: DEFAULT_MEASUREMENTS.DEFAULT_HEIGHT_MM,
    };
  }, [project, initialDimensions]);

  const [dimensions, setDimensions] = useState(getInitialDimensions);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Get system constraints for validation
  const constraints = useMemo(() => {
    return getConstraintsForSystemPack(systemPackId || project?.systemPackId);
  }, [systemPackId, project?.systemPackId]);

  // Reset dimensions when dialog opens or project/initialDimensions change
  useEffect(() => {
    if (open) {
      const initial = getInitialDimensions();
      setDimensions(initial);
      setErrors({});
      setValidationErrors([]);
    }
  }, [open, getInitialDimensions]);

  // Handle dimension change
  const handleDimensionChange = useCallback((field: 'width' | 'height', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setDimensions((prev) => ({ ...prev, [field]: numValue }));
      // Clear error for this field when user types
      setErrors((prev) => ({ ...prev, [field]: '' }));
    } else if (value === '') {
      // Allow empty input for user experience
      setDimensions((prev) => ({ ...prev, [field]: 0 }));
    }
  }, []);

  // Handle common size selection
  const handleCommonSizeSelect = useCallback((size: { width: number; height: number }) => {
    setDimensions({ width: size.width, height: size.height });
    setErrors({});
    setValidationErrors([]);
  }, []);

  // Validate dimensions
  const validate = useCallback(() => {
    const validation = validateMeasurements(
      {
        width: String(dimensions.width),
        height: String(dimensions.height),
        systemPackId: systemPackId || project?.systemPackId,
      } as any,
      constraints
    );

    const fieldErrors: Record<string, string> = {};
    if (!validation.isValid) {
      validation.errors.forEach((error) => {
        fieldErrors[error.field] = error.message;
      });
    }

    setValidationErrors(validation.errors);
    setErrors(fieldErrors);

    return validation.isValid;
  }, [dimensions, systemPackId, project?.systemPackId, constraints]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!validate()) {
      return;
    }

    onSubmit({
      width: dimensions.width,
      height: dimensions.height,
      systemPackId: systemPackId || project?.systemPackId || null,
    });
    onOpenChange(false);
  }, [dimensions, systemPackId, project?.systemPackId, validate, onSubmit, onOpenChange]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleSubmit, onOpenChange]);

  // Format constraint info for display
  const constraintInfo = useMemo(() => {
    if (!constraints) return null;
    const parts: string[] = [];
    if (constraints.minWidthMm) parts.push(`Min W: ${constraints.minWidthMm}mm`);
    if (constraints.maxWidthMm) parts.push(`Max W: ${constraints.maxWidthMm}mm`);
    if (constraints.minHeightMm) parts.push(`Min H: ${constraints.minHeightMm}mm`);
    if (constraints.maxHeightMm) parts.push(`Max H: ${constraints.maxHeightMm}mm`);
    return parts.length > 0 ? parts.join(', ') : null;
  }, [constraints]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-md', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-amber-500" />
            {t('dimensions_dialog.title', 'Enter Window Dimensions')}
          </DialogTitle>
          <DialogDescription>
            {t('dimensions_dialog.description', 'Enter the width and height for your window design (in millimeters)')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Constraint Info */}
          {constraintInfo && (
            <Alert className="bg-amber-900/20 border-amber-600/30">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-xs text-amber-300">
                {t('dimensions_dialog.constraints', 'System constraints')}: {constraintInfo}
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Size Templates */}
          <div className="space-y-2">
            <Label className="text-sm text-amber-200">
              {t('dimensions_dialog.quick_sizes', 'Quick Sizes (mm)')}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {COMMON_SIZES.map((size) => (
                <Button
                  key={size.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleCommonSizeSelect(size)}
                  className={cn(
                    'h-9 text-xs',
                    dimensions.width === size.width && dimensions.height === size.height
                      ? 'bg-amber-900/30 border-amber-500 text-amber-200'
                      : 'border-amber-600/30 text-amber-300 hover:bg-amber-900/20'
                  )}
                >
                  {size.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Dimension Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <GoldTierInput
                id="width"
                type="number"
                label={t('dimensions_dialog.width', 'Width') + ' (mm)'}
                value={dimensions.width || ''}
                onChange={(e) => handleDimensionChange('width', e.target.value)}
                onBlur={validate}
                min={constraints?.minWidthMm || 300}
                max={constraints?.maxWidthMm || 10000}
                step="1"
                variant={errors.width ? 'error' : 'default'}
                error={errors.width}
                helperText={!errors.width ? 'Enter width in millimeters' : undefined}
                leftIcon={<Ruler className="h-4 w-4" />}
                className="font-mono"
                placeholder={String(DEFAULT_MEASUREMENTS.DEFAULT_WIDTH_MM)}
                fullWidth
              />
            </div>

            <div className="space-y-2">
              <GoldTierInput
                id="height"
                type="number"
                label={t('dimensions_dialog.height', 'Height') + ' (mm)'}
                value={dimensions.height || ''}
                onChange={(e) => handleDimensionChange('height', e.target.value)}
                onBlur={validate}
                min={constraints?.minHeightMm || 300}
                max={constraints?.maxHeightMm || 10000}
                step="1"
                variant={errors.height ? 'error' : 'default'}
                error={errors.height}
                helperText={!errors.height ? 'Enter height in millimeters' : undefined}
                leftIcon={<Ruler className="h-4 w-4" />}
                className="font-mono"
                placeholder={String(DEFAULT_MEASUREMENTS.DEFAULT_HEIGHT_MM)}
                fullWidth
              />
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-xs text-red-300">
                  {validationErrors.map((error, idx) => (
                    <li key={idx}>{error.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-amber-600/30 text-amber-300 hover:bg-amber-900/20"
          >
            {t('dimensions_dialog.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!dimensions.width || !dimensions.height || dimensions.width <= 0 || dimensions.height <= 0}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {t('dimensions_dialog.submit', 'Continue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};