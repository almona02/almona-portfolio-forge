/**
 * Enhanced Measurement Tools Component
 * 
 * Professional measurement input with:
 * - Real-time validation against Egyptian standards
 * - Visual feedback indicators
 * - Common Egyptian window size quick-select
 * - Measurement visualization
 * - Error recovery and suggestions
 * 
 * Part of Journey 1 Polish: Measurement → Design → BOM
 */

import { getCommonWindowSizes, type CommonWindowSize } from '@/data/egyptian-common-window-sizes';
import { getConstraintsForSystemPack, validateMeasurements, type SystemConstraints } from '@/lib/fabricatorValidation';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/ui/tooltip';
import type { MeasurementData } from '@/types/fabricator';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Sparkles,
  X
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebouncedCallback } from 'use-debounce';

export interface EnhancedMeasurementToolsProps {
  /** Current width value (mm) */
  width: string;
  /** Current height value (mm) */
  height: string;
  /** Window type */
  windowType?: string;
  /** System pack ID for constraint validation */
  systemPackId?: string | null;
  /** Measurement mode ('hole' or 'manufacturing') */
  measurementMode?: 'hole' | 'manufacturing';
  /** Wall deduction (mm) */
  wallDeduction?: string;
  /** Callback when width changes */
  onWidthChange: (value: string) => void;
  /** Callback when height changes */
  onHeightChange: (value: string) => void;
  /** Callback when a common size is selected */
  onCommonSizeSelect?: (size: CommonWindowSize) => void;
  /** Current field errors */
  fieldErrors?: Record<string, string>;
  /** Optional className */
  className?: string;
}

interface ValidationState {
  isValid: boolean;
  error?: string;
  warning?: string;
  widthValid: boolean;
  heightValid: boolean;
}

/**
 * Enhanced Measurement Tools Component
 */
export const EnhancedMeasurementTools: React.FC<EnhancedMeasurementToolsProps> = ({
  width,
  height,
  windowType = 'sliding_window',
  systemPackId,
  measurementMode = 'hole',
  wallDeduction = '15',
  onWidthChange,
  onHeightChange,
  onCommonSizeSelect,
  fieldErrors = {},
  className = '',
}) => {
  const { t } = useTranslation('fabricator');

  // System constraints
  const systemConstraints = useMemo<SystemConstraints | null>(() => {
    return getConstraintsForSystemPack(systemPackId);
  }, [systemPackId]);

  // Real-time validation state
  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    widthValid: true,
    heightValid: true,
  });

  // Show common sizes popover
  const [showCommonSizes, setShowCommonSizes] = useState(false);

  // Get common sizes filtered by window type
  const commonSizes = useMemo(() => {
    return getCommonWindowSizes({
      windowType: windowType as CommonWindowSize['recommendedTypes'][number],
      limit: 8,
    });
  }, [windowType]);

  /**
   * Perform real-time validation
   */
  const performValidation = useCallback((widthVal: string, heightVal: string) => {
    const widthNum = Number(widthVal);
    const heightNum = Number(heightVal);

    // Skip validation if values are empty or invalid numbers
    if (!widthVal || !heightVal || isNaN(widthNum) || isNaN(heightNum)) {
      setValidationState({
        isValid: true,
        widthValid: true,
        heightValid: true,
      });
      return;
    }

    // Calculate manufacturing dimensions if in hole mode
    const deduction = Number(wallDeduction || '0');
    const isHoleMode = measurementMode === 'hole';
    const manufacturingWidth = isHoleMode ? widthNum - deduction : widthNum;
    const manufacturingHeight = isHoleMode ? heightNum - deduction : heightNum;

    // Check for negative manufacturing dimensions
    if (isHoleMode && (manufacturingWidth <= 0 || manufacturingHeight <= 0)) {
      setValidationState({
        isValid: false,
        error: 'Wall deduction makes dimensions invalid',
        widthValid: manufacturingWidth > 0,
        heightValid: manufacturingHeight > 0,
      });
      return;
    }

    // Validate using measurement validation function
    const validation = validateMeasurements(
      {
        width: String(manufacturingWidth),
        height: String(manufacturingHeight),
        windowType,
        systemPackId: systemPackId || undefined,
      } as MeasurementData,
      systemConstraints,
    );

    // Extract field-specific validation
    const widthError = validation.errors.find((e) => e.field === 'width');
    const heightError = validation.errors.find((e) => e.field === 'height');
    const otherErrors = validation.errors.filter(
      (e) => e.field !== 'width' && e.field !== 'height'
    );

    setValidationState({
      isValid: validation.isValid,
      error: otherErrors.length > 0 ? otherErrors[0].message : undefined,
      widthValid: !widthError,
      heightValid: !heightError,
    });
  }, [systemPackId, systemConstraints, windowType, measurementMode, wallDeduction]);

  // Debounced validation (300ms delay)
  const debouncedValidation = useDebouncedCallback(
    performValidation,
    300
  );

  // Run validation when values change
  useEffect(() => {
    debouncedValidation(width, height);
  }, [width, height, debouncedValidation]);

  /**
   * Handle common size selection
   */
  const handleCommonSizeSelect = useCallback((size: CommonWindowSize) => {
    onWidthChange(String(size.width));
    onHeightChange(String(size.height));
    setShowCommonSizes(false);
    if (onCommonSizeSelect) {
      onCommonSizeSelect(size);
    }
  }, [onWidthChange, onHeightChange, onCommonSizeSelect]);

  /**
   * Get validation class for input
   */
  const getValidationClass = (isValid: boolean, hasError: boolean) => {
    if (hasError) {
      return 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20';
    }
    if (isValid && width && height && !hasError) {
      return 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20';
    }
    return '';
  };

  /**
   * Get validation icon
   */
  const ValidationIcon = ({ isValid, hasError }: { isValid: boolean; hasError: boolean }) => {
    if (hasError) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (isValid && width && height) {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
    return null;
  };

  const widthError = fieldErrors.width || (validationState.widthValid ? undefined : 'Invalid width');
  const heightError = fieldErrors.height || (validationState.heightValid ? undefined : 'Invalid height');

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Common Sizes Quick Select */}
      {commonSizes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-xs text-amber-500/80 font-semibold">
            {t('smart_measuring.common_sizes', 'Common Sizes:')}
          </Label>
          <Popover open={showCommonSizes} onOpenChange={setShowCommonSizes}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-amber-900/20 border-amber-600/30 text-amber-300 hover:bg-amber-900/30"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Quick Select
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 bg-[#0f0f0f]/95 backdrop-blur-xl border-amber-600/30"
              align="start"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-200">
                    {t('smart_measuring.select_common_size', 'Select Common Size')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => setShowCommonSizes(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {commonSizes.map((size) => (
                    <Button
                      key={`${size.width}-${size.height}`}
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-3 flex flex-col items-start bg-[#1a1a1a] border-amber-600/20 hover:border-amber-500/50 hover:bg-amber-900/20"
                      onClick={() => handleCommonSizeSelect(size)}
                    >
                      <span className="text-xs font-semibold text-amber-300">
                        {size.width}×{size.height}mm
                      </span>
                      <span className="text-[10px] text-amber-600/80 mt-0.5">
                        {size.name}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Width Input */}
      <div className="group">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs uppercase tracking-[0.15em] text-amber-500/80 group-focus-within:text-amber-400 transition-colors font-semibold">
            {t('smart_measuring.dimensions.width', 'Total Width (mm)')}
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  {systemConstraints?.minWidthMm && systemConstraints?.maxWidthMm && (
                    <span className="text-[10px] text-amber-600/60">
                      {systemConstraints.minWidthMm}-{systemConstraints.maxWidthMm}mm
                    </span>
                  )}
                  <ValidationIcon
                    isValid={validationState.widthValid && !widthError}
                    hasError={!!widthError}
                  />
                </div>
              </TooltipTrigger>
              {systemConstraints?.minWidthMm && systemConstraints?.maxWidthMm && (
                <TooltipContent>
                  <p className="text-xs">
                    Valid range: {systemConstraints.minWidthMm}mm - {systemConstraints.maxWidthMm}mm
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="relative">
          <Input
            value={width}
            onChange={(e) => onWidthChange(e.target.value)}
            className={`btn-secondary-dark ${getValidationClass(validationState.widthValid, !!widthError)}`}
            placeholder="1200"
            type="number"
            min={systemConstraints?.minWidthMm ?? 300}
            max={systemConstraints?.maxWidthMm ?? 5000}
            aria-invalid={!!widthError}
            aria-describedby={widthError ? "width-error" : undefined}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-600/70 text-sm">
            mm
          </span>
        </div>
        <AnimatePresence>
          {widthError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1"
            >
              <p id="width-error" className="text-sm text-red-400 flex items-center gap-1" role="alert">
                <AlertCircle className="h-3 w-3" />
                {widthError}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Height Input */}
      <div className="group">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs uppercase tracking-[0.15em] text-amber-500/80 group-focus-within:text-amber-400 transition-colors font-semibold">
            {t('smart_measuring.dimensions.height', 'Total Height (mm)')}
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  {systemConstraints?.minHeightMm && systemConstraints?.maxHeightMm && (
                    <span className="text-[10px] text-amber-600/60">
                      {systemConstraints.minHeightMm}-{systemConstraints.maxHeightMm}mm
                    </span>
                  )}
                  <ValidationIcon
                    isValid={validationState.heightValid && !heightError}
                    hasError={!!heightError}
                  />
                </div>
              </TooltipTrigger>
              {systemConstraints?.minHeightMm && systemConstraints?.maxHeightMm && (
                <TooltipContent>
                  <p className="text-xs">
                    Valid range: {systemConstraints.minHeightMm}mm - {systemConstraints.maxHeightMm}mm
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="relative">
          <Input
            value={height}
            onChange={(e) => onHeightChange(e.target.value)}
            className={`btn-secondary-dark ${getValidationClass(validationState.heightValid, !!heightError)}`}
            placeholder="1500"
            type="number"
            min={systemConstraints?.minHeightMm ?? 300}
            max={systemConstraints?.maxHeightMm ?? 5000}
            aria-invalid={!!heightError}
            aria-describedby={heightError ? "height-error" : undefined}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-600/70 text-sm">
            mm
          </span>
        </div>
        <AnimatePresence>
          {heightError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1"
            >
              <p id="height-error" className="text-sm text-red-400 flex items-center gap-1" role="alert">
                <AlertCircle className="h-3 w-3" />
                {heightError}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Validation Summary */}
      <AnimatePresence>
        {validationState.isValid && width && height && !widthError && !heightError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="bg-emerald-900/20 border-emerald-500/50">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <AlertDescription className="text-sm text-emerald-200">
                {t('smart_measuring.measurements_valid', 'Measurements are valid and ready')}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
        {validationState.error && !validationState.isValid && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="bg-red-900/20 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-sm text-red-200">
                {validationState.error}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
