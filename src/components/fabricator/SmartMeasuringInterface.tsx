import {
  getDefaultGlazing,
  getDefaultProfileColor
} from '@/data/egyptian-defaults';
import { EGYPTIAN_PATTERNS, getPatternsForSystem, type EgyptianPattern } from '@/data/egyptian-window-patterns';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { useEgyptianPredictiveGrid } from '@/hooks/fabricator/useEgyptianPredictiveGrid';
import { useSystemRoleOptions } from '@/hooks/fabricator/useSystemRoleOptions';
import { calibrationAnalytics } from '@/lib/analytics/CalibrationAnalytics';
import { StoredSystemPack, addCustomSystem, loadCustomSystems } from '@/lib/fabricator/customSystemStorage';
import { ValidationError, getConstraintsForSystemPack, validateMeasurements } from '@/lib/fabricatorValidation';
import { trackError } from '@/lib/performance-monitoring';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Toggle } from '@/shared/ui/ui/toggle';
import { MeasurementData, SystemPack, SystemProfileSelections, WindowGrid, WindowUnit } from '@/types/fabricator';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Box, CheckCircle2, ChevronDown, ChevronUp, Contrast, Crown, Factory, Grid3X3, Maximize2, Minimize2, QrCode, RotateCcw, Ruler, ShieldCheck, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useDebouncedCallback } from 'use-debounce';
import { CustomSystemManager } from './CustomSystemManager';
import { Enhanced3DPreview } from './Enhanced3DPreview';
import { EnhancedMeasurementTools } from './EnhancedMeasurementTools';
import { ProductionLabel } from './ProductionLabel';
import { SmartDrawCanvas } from './SmartDrawCanvas';
import { SystemTuningStudio } from './SystemTuningStudio';
import { EgyptianPatternSelector } from './drafting/prestige/EgyptianPatternSelector';
import { PrestigeSystemPackSelector } from './drafting/prestige/PrestigeSystemPackSelector';
import {
  ANIMATION_CONSTANTS,
  BLUEPRINT_VIEW,
  DEFAULT_GLAZING_SPECS,
  DEFAULT_GRID,
  DEFAULT_MEASUREMENTS,
} from './measuringConstants';

// ✅ THEME: Centralized Blueprint Theme for Consistency and Accessibility
const DEFAULT_THEME = {
  stroke: {
    primary: 'var(--blueprint-stroke-primary, #1f2937)', // slate-800
    secondary: 'var(--blueprint-stroke-secondary, #4b5563)', // slate-600
    highlight: 'var(--blueprint-stroke-highlight, #2563eb)', // blue-600
    highlightActive: 'var(--blueprint-stroke-highlight-active, #1e40af)', // blue-800
    structural: 'var(--blueprint-stroke-structural, #dc2626)', // red-600
    grid: 'var(--blueprint-stroke-grid, #d1d5db)', // gray-300
    marker: 'var(--blueprint-stroke-marker, #ffffff)', // white
  },
  fill: {
    fixed: 'var(--blueprint-fill-fixed, rgba(59, 130, 246, 0.1))',
    sash: 'var(--blueprint-fill-sash, rgba(34, 197, 94, 0.1))',
    sliding: 'var(--blueprint-fill-sliding, rgba(234, 179, 8, 0.1))',
    panel: 'var(--blueprint-fill-panel, rgba(107, 114, 128, 0.1))',
    empty: 'var(--blueprint-fill-empty, rgba(239, 68, 68, 0.05))',
    highlight: 'var(--blueprint-fill-highlight, rgba(37, 99, 235, 0.1))', // blue-600/10
  },
  text: {
    primary: 'var(--blueprint-text-primary, #1f2937)', // slate-800
    secondary: 'var(--blueprint-text-secondary, #6b7280)', // slate-500
    highlight: 'var(--blueprint-text-highlight, #1e40af)', // blue-800
    structural: 'var(--blueprint-text-structural, #dc2626)', // red-600
  }
};

const HIGH_CONTRAST_THEME = {
  stroke: {
    primary: '#000000',
    secondary: '#000000',
    highlight: '#0000FF', // Pure Blue
    highlightActive: '#00008B', // Dark Blue
    structural: '#FF0000', // Pure Red
    grid: '#000000',
    marker: '#FFFFFF',
  },
  fill: {
    fixed: 'transparent',
    sash: 'rgba(0, 0, 0, 0.05)', // Subtle pattern
    sliding: 'rgba(0, 0, 0, 0.1)',
    panel: 'rgba(0, 0, 0, 0.2)',
    empty: 'rgba(255, 0, 0, 0.1)',
    highlight: 'rgba(255, 255, 0, 0.3)', // Yellow highlight
  },
  text: {
    primary: '#000000',
    secondary: '#000000',
    highlight: '#0000FF',
    structural: '#FF0000',
  }
};

interface SmartMeasuringInterfaceProps {
  onMeasurementComplete: (data: MeasurementData) => void;
  /** Optional preselected system pack ID, typically from NewProjectWizard */
  systemPackId?: string;
  /** Optional region hint from project header to filter system packs (e.g. 'egypt') */
  region?: 'egypt' | 'turkey' | 'mena' | 'gulf' | 'global';
}

export const SmartMeasuringInterface: React.FC<SmartMeasuringInterfaceProps> = ({
  onMeasurementComplete,
  systemPackId,
  region,
}) => {
  const { t } = useTranslation('fabricator');
  const [highContrast, setHighContrast] = useState(false);

  // Dynamic Theme switching
  const BLUEPRINT_THEME = useMemo(() => highContrast ? HIGH_CONTRAST_THEME : DEFAULT_THEME, [highContrast]);

  // Get Egyptian defaults based on region
  const egyptianDefaults = useMemo(() => {
    const defaultColor = getDefaultProfileColor(region || 'Cairo');
    const defaultGlazing = getDefaultGlazing(region || 'Cairo', true); // External window
    return {
      color: defaultColor.name,
      glazingType: defaultGlazing.type,
      glassColor: defaultGlazing.color || 'clear',
    };
  }, [region]);

  const [measurements, setMeasurements] = useState({
    // Default professional stub dimensions – can be refined per system later.
    width: String(DEFAULT_MEASUREMENTS.DEFAULT_WIDTH_MM),
    height: String(DEFAULT_MEASUREMENTS.DEFAULT_HEIGHT_MM),
    measurementMode: 'hole', // 'hole' (rough opening) or 'manufacturing'
    wallDeduction: String(DEFAULT_MEASUREMENTS.DEFAULT_WALL_DEDUCTION_MM), // mm deduction for wall tolerance
    windowType: 'sliding_window_2sash', // Default to 2-sash sliding window (matches SelectItem value)
    color: egyptianDefaults.color,
    glazingType: egyptianDefaults.glazingType || 'double', // Ensure glazingType has a default value
    glassColor: egyptianDefaults.glassColor || 'clear', // Default to 'clear' (first option) - selected by default
    flyScreenType: 'none', // Default to 'none' to avoid empty string in Select
    flatNumber: '', // Text input - OK
    buildingBlock: '', // Text input - OK
    floor: '', // Text input - OK
    unitOrApartment: '', // Text input - OK
    elevation: '', // Text input - OK
    roomOrZone: '', // Text input - OK
    windowIndex: '', // Text input - OK
    remarks: '', // Text input - OK
  });

  // Grid State for Phase 4
  const [grid, setGrid] = useState<WindowGrid>({
    rows: DEFAULT_GRID.DEFAULT_ROWS,
    cols: DEFAULT_GRID.DEFAULT_COLS,
    cells: [{ id: DEFAULT_GRID.DEFAULT_CELL_ID, row: 0, col: 0, type: 'fixed' }]
  });

  const [isGridLocked, setIsGridLocked] = useState(false);

  // Predictive Grid Logic (Phase 3)
  const { suggestedGrid, predictionReason } = useEgyptianPredictiveGrid({
    width: Number(measurements.width),
    height: Number(measurements.height),
    windowType: measurements.windowType,
    isGridLocked
  });

  // Apply suggested grid if available
  useEffect(() => {
    if (suggestedGrid && !isGridLocked) {
      setGrid(_prev => ({
        ...suggestedGrid,
        // Preserve any manual cell types if dimensions match? For now, full replace for safety.
        // In future: intelligent merge.
      }));
    }
  }, [suggestedGrid, isGridLocked]);

  const [isGridMode, setIsGridMode] = useState(false);
  const [isSystemPackCollapsed, setIsSystemPackCollapsed] = useState(false);

  const [selectedSystemPackId, setSelectedSystemPackId] = useState<string>(() => {
    if (systemPackId) return systemPackId;
    // Default to first configured system pack filtered by region (if provided)
    const packsForRegion =
      region && region !== 'global'
        ? SYSTEM_PACKS.filter((p) => p.meta.regions.includes(region) || p.meta.regions.includes('global'))
        : SYSTEM_PACKS;
    return packsForRegion[0]?.meta.id || SYSTEM_PACKS[0]?.meta.id || 'rock60';
  });

  const [systemProfileSelections, setSystemProfileSelections] = useState<SystemProfileSelections>(
    {},
  );

  const refreshCustomSystems = () => setCustomSystems(loadCustomSystems());

  const [_isScanning, _setIsScanning] = useState(false);
  const [_validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPatternId, setSelectedPatternId] = useState<string>(''); // Empty string is OK here - not used in Select value
  const [blueprintZoom, setBlueprintZoom] = useState<number>(BLUEPRINT_VIEW.DEFAULT_ZOOM); // Zoom level (1 = 100%, 1.2 = 120%, etc.)
  const [blueprintFullscreen, setBlueprintFullscreen] = useState<boolean>(false);

  // Note: Component state automatically resets when remounted via key prop (measurementSessionId)
  // No need for manual reset - React handles this when the key changes

  // Escape key handler to reset zoom and exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Exit fullscreen first if active
        if (blueprintFullscreen) {
          setBlueprintFullscreen(false);
        }
        // Reset zoom to normal
        if (blueprintZoom !== BLUEPRINT_VIEW.DEFAULT_ZOOM) {
          setBlueprintZoom(BLUEPRINT_VIEW.DEFAULT_ZOOM);
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [blueprintZoom, blueprintFullscreen]);
  const [highlightedDimension, _setHighlightedDimension] = useState<'width' | 'height' | null>(null); // Used in input focus handlers
  const [verificationConfirmed, setVerificationConfirmed] = useState<boolean | 'indeterminate'>(false);
  const [showLabel, setShowLabel] = useState(false);
  // Gold Tier: Standardized Type Loading
  const [customSystems, setCustomSystems] = useState<StoredSystemPack[]>(() => loadCustomSystems());
  const [showTuningStudio, setShowTuningStudio] = useState(false);
  const [tuningInitialSystem, setTuningInitialSystem] = useState<StoredSystemPack | null>(null);
  const [show3DPreview, setShow3DPreview] = useState(false);

  // Defined Steps
  const STEPS = [
    { id: 'system', title: t('smart_measuring.steps.system', 'System Configuration'), icon: Factory },
    { id: 'dimensions', title: t('smart_measuring.steps.dimensions', 'Dimensions & Layout'), icon: Ruler },
    { id: 'specs', title: t('smart_measuring.steps.specs', 'Glass & Specs'), icon: Box },
    { id: 'location', title: t('smart_measuring.steps.location', 'Location Context'), icon: CheckCircle2 },
    { id: 'verify', title: t('smart_measuring.steps.verify', 'Verification'), icon: ShieldCheck },
  ];

  // Generate preview window unit from measurements for 3D visualization
  const previewWindowUnit = useMemo<WindowUnit | null>(() => {
    const rawWidth = Number(measurements.width);
    const rawHeight = Number(measurements.height);
    const deduction = Number(measurements.wallDeduction || '0');
    const isHoleMode = measurements.measurementMode === 'hole';
    const width = isHoleMode ? Math.max(rawWidth - deduction, 0) : rawWidth;
    const height = isHoleMode ? Math.max(rawHeight - deduction, 0) : rawHeight;

    if (!measurements.width || !measurements.height || !measurements.windowType ||
      isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      return null;
    }

    return {
      id: 'preview-unit-id', // Fixed ID for preview
      orderNumber: 'ORD-2024-001', // Mock order number
      posNumber: measurements.windowIndex || 'W-01', // Mock pos
      type: measurements.windowType || 'sliding_window',
      components: [],
      overallWidth: width,
      overallHeight: height,
      color: measurements.color || 'Silver',
      glazing: {
        type: measurements.glazingType || 'double',
        thickness: DEFAULT_GLAZING_SPECS.DEFAULT_THICKNESS_MM,
        spacer: DEFAULT_GLAZING_SPECS.DEFAULT_SPACER_MM,
        gasFill: DEFAULT_GLAZING_SPECS.DEFAULT_GAS_FILL
      },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      systemPackId: selectedSystemPackId,
      // Attach Grid if in Grid Mode
      grid: isGridMode ? grid : undefined
    };
  }, [measurements, grid, isGridMode, selectedSystemPackId]);

  // Force blueprint to update when grid changes - include ALL grid properties for reactivity
  // Use JSON.stringify to ensure any grid change triggers update
  const blueprintKey = useMemo(() => {
    if (!grid) return `blueprint-no-grid-${isGridMode}`;
    // Include all grid properties to ensure reactivity
    const gridHash = JSON.stringify({
      cols: grid.cols,
      rows: grid.rows,
      cells: grid.cells.map(c => ({ id: c.id, row: c.row, col: c.col, type: c.type })),
      colWidths: grid.colWidths,
      rowHeights: grid.rowHeights
    });
    return `blueprint-${gridHash}-${isGridMode}`;
  }, [grid, isGridMode]);

  // ✅ PERFORMANCE: Memoize expensive blueprint calculations
  const blueprintCalculations = useMemo(() => {
    const width = Number(measurements.width) || 1200;
    const height = Number(measurements.height) || 1200;
    const aspectRatio = width / height;
    const maxWidth = 1080;
    const maxHeight = 720;
    let svgWidth = maxWidth;
    let svgHeight = maxHeight;

    if (aspectRatio > maxWidth / maxHeight) {
      svgHeight = maxWidth / aspectRatio;
    } else {
      svgWidth = maxHeight * aspectRatio;
    }

    const startX = (1200 - svgWidth) / 2;
    const startY = (800 - svgHeight) / 2;
    const area = (width * height) / 1_000_000;

    const currentGrid = grid;
    const showGrid = currentGrid && currentGrid.cols > 0 && currentGrid.rows > 0;
    const selectedPattern: EgyptianPattern | undefined = selectedPatternId
      ? EGYPTIAN_PATTERNS.find(p => p.id === selectedPatternId)
      : undefined;

    const colWeights = currentGrid.colWidths && currentGrid.colWidths.length === currentGrid.cols
      ? currentGrid.colWidths
      : Array(currentGrid.cols).fill(1);
    const rowWeights = currentGrid.rowHeights && currentGrid.rowHeights.length === currentGrid.rows
      ? currentGrid.rowHeights
      : Array(currentGrid.rows).fill(1);

    const totalColWeight = colWeights.reduce((a, b) => a + b, 0);
    const totalRowWeight = rowWeights.reduce((a, b) => a + b, 0);

    return {
      width,
      height,
      aspectRatio,
      svgWidth,
      svgHeight,
      startX,
      startY,
      area,
      currentGrid,
      showGrid,
      selectedPattern,
      colWeights,
      rowWeights,
      totalColWeight,
      totalRowWeight,
    };
  }, [measurements.width, measurements.height, grid, selectedPatternId]);

  // ✅ PERFORMANCE: Debounced input handler to reduce re-renders during rapid typing
  // Clear errors immediately for better UX, but debounce state updates
  const debouncedSetMeasurements = useDebouncedCallback(
    (field: string, value: string) => {
      setMeasurements(prev => ({ ...prev, [field]: value }));
    },
    200, // 200ms debounce delay - balances responsiveness and performance
    { maxWait: 1000 } // Ensure update happens even during continuous typing
  );

  const handleInputChange = (field: string, value: string) => {
    // Clear field error immediately when user starts typing (no debounce for UX)
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    // Debounce the state update to reduce re-renders
    debouncedSetMeasurements(field, value);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  // Animation variants for smooth slide transitions
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? ANIMATION_CONSTANTS.SLIDE_OFFSET_PX : -ANIMATION_CONSTANTS.SLIDE_OFFSET_PX,
      opacity: ANIMATION_CONSTANTS.HIDDEN_OPACITY
    }),
    center: {
      x: 0,
      opacity: ANIMATION_CONSTANTS.DEFAULT_OPACITY
    },
    exit: (direction: number) => ({
      x: direction < 0 ? ANIMATION_CONSTANTS.SLIDE_OFFSET_PX : -ANIMATION_CONSTANTS.SLIDE_OFFSET_PX,
      opacity: ANIMATION_CONSTANTS.HIDDEN_OPACITY
    })
  };

  const getFieldError = (field: string): string | undefined => {
    return fieldErrors[field];
  };

  const availableSystemPacks = useMemo(() => {
    // SYSTEM_PACKS already includes EGYPTIAN_UPVC_SYSTEMS, so deduplicate
    const systemsMap = new Map<string, any>();
    SYSTEM_PACKS.forEach(system => {
      systemsMap.set(system.meta.id, system);
    });
    customSystems.forEach(system => {
      systemsMap.set(system.meta.id, system);
    });
    const allPacks = Array.from(systemsMap.values());

    const base = region && region !== 'global'
      ? allPacks.filter(
        (p) => p.meta.regions.includes(region) || p.meta.regions.includes('global'),
      )
      : allPacks;

    return base as (SystemPack | StoredSystemPack)[];
  }, [region, customSystems]);

  const activeSystemPack = useMemo(
    () => availableSystemPacks.find((p) => p.meta.id === selectedSystemPackId) ?? availableSystemPacks[0] ?? SYSTEM_PACKS[0],
    [availableSystemPacks, selectedSystemPackId],
  );

  const availablePatterns = useMemo(() => {
    return getPatternsForSystem(selectedSystemPackId);
  }, [selectedSystemPackId]);

  const systemConstraints = useMemo(
    () => getConstraintsForSystemPack(selectedSystemPackId),
    [selectedSystemPackId],
  );

  // Gold Tier: Using Data-Driven Hook for Role Options
  const systemPackRoleOptions = useSystemRoleOptions(activeSystemPack);

  const handleSystemProfileChange = (roleId: keyof SystemProfileSelections, code: string) => {
    setSystemProfileSelections((prev) => ({
      ...prev,
      [roleId]: code,
    }));

    const fieldKey = `systemProfile.${roleId}`;
    if (fieldErrors[fieldKey]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  const handleSubmit = () => {
    const rawWidth = Number(measurements.width);
    const rawHeight = Number(measurements.height);
    const deduction = Number(measurements.wallDeduction || '0');
    const isHoleMode = measurements.measurementMode === 'hole';
    const manufacturingWidth = isHoleMode ? rawWidth - deduction : rawWidth;
    const manufacturingHeight = isHoleMode ? rawHeight - deduction : rawHeight;

    if (isHoleMode && (manufacturingWidth <= 0 || manufacturingHeight <= 0)) {
      setFieldErrors((prev) => ({
        ...prev,
        width: manufacturingWidth <= 0 ? 'Deduction makes width non-positive' : prev.width,
        height: manufacturingHeight <= 0 ? 'Deduction makes height non-positive' : prev.height,
      }));
      return;
    }

    const validation = validateMeasurements(
      {
        ...measurements,
        systemPackId: selectedSystemPackId,
        manufacturingWidth,
        manufacturingHeight
      } as MeasurementData,
      systemConstraints,
    );

    const fieldErrorMap: Record<string, string> = {};

    if (!validation.isValid) {
      validation.errors.forEach((error) => {
        fieldErrorMap[error.field] = error.message;
      });
    }

    // System-pack profile selections are OPTIONAL - allow bypass
    // Note: Profile selections help with accurate component generation but are not required
    // Users can skip these selections and proceed with default system pack profiles

    if (Object.keys(fieldErrorMap).length > 0) {
      setValidationErrors(validation.errors);
      setFieldErrors(fieldErrorMap);
      return;
    }

    // Clear errors on successful validation
    setValidationErrors([]);
    setFieldErrors({});

    // Log verification event if confirmed
    if (verificationConfirmed === true) {
      const cutLength = Number(measurements.width) - DEFAULT_MEASUREMENTS.DEFAULT_CUT_LENGTH_DEDUCTION_MM; // Simplified calculation for MVP
      calibrationAnalytics.recordVerificationEvent({
        userId: 'current-user', // Ideally from auth context
        systemPackId: selectedSystemPackId,
        measurements: {
          width: Number(measurements.width),
          height: Number(measurements.height),
          windowType: measurements.windowType,
        },
        calculations: {
          deduction: 6,
          cutLength: cutLength
        },
        durationSeconds: 0, // TODO: Track time
        timestamp: new Date()
      });
    }

    const payload: MeasurementData = {
      ...measurements,
      systemPackId: selectedSystemPackId,
      systemProfileSelections,
      // Rule 18: Include wall tolerance data for InterferenceEngine
      measurementMode: measurements.measurementMode as 'hole' | 'manufacturing',
      wallDeduction: measurements.wallDeduction,
      manufacturingWidth,
      manufacturingHeight,
      // Include rough opening if in hole mode
      roughOpeningWidth: isHoleMode ? rawWidth : undefined,
      roughOpeningHeight: isHoleMode ? rawHeight : undefined,
      // Preserve grid layout if set in measuring step
      grid: isGridMode ? grid : undefined,
      // Preserve preset pattern selection
      presetId: selectedPatternId || undefined,
    };

    // Call the callback
    if (onMeasurementComplete) {
      onMeasurementComplete(payload);
    } else {
      trackError('SmartMeasuringInterface', 'measurement_complete', 'onMeasurementComplete callback is missing');
    }
  };

  // Auto-collapse system pack section when system pack is selected
  useEffect(() => {
    if (selectedSystemPackId && !isSystemPackCollapsed) {
      // Auto-collapse after a short delay to allow user to see the selection
      const timer = setTimeout(() => {
        setIsSystemPackCollapsed(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedSystemPackId, isSystemPackCollapsed]);

  // const startARScan = () => { ... };

  return (
    <div className="flex flex-col h-full gap-2 sm:gap-4 overflow-y-auto p-1">
      {/* Label Modal */}
      {showLabel && previewWindowUnit && (
        <ProductionLabel
          windowUnit={previewWindowUnit}
          onClose={() => setShowLabel(false)}
        />
      )}

      {/* System Pack Section - Full Width at Top */}
      <div className="w-full card-glass-dark rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b-2 border-amber-600/30">
          <div className="flex items-center gap-3 flex-1">
            <Factory className="h-5 w-5 text-amber-500" />
            <h3 className="typography-h3 text-amber-200">System Configuration</h3>
            {activeSystemPack && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                {activeSystemPack.meta.name}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSystemPackCollapsed(!isSystemPackCollapsed)}
            className="text-amber-400 hover:text-amber-300"
          >
            {isSystemPackCollapsed ? (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Expand
              </>
            ) : (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Collapse
              </>
            )}
          </Button>
        </div>

        {!isSystemPackCollapsed ? (
          <div className="p-6 space-y-6">
            {/* Prestige System Pack Selector */}
            <div className="card-glass-dark p-6 relative z-10">
              <PrestigeSystemPackSelector
                selectedSystemId={selectedSystemPackId}
                onSelect={(value) => {
                  if (value === 'custom') {
                    const currentPack = availableSystemPacks.find((p) => p.meta.id === selectedSystemPackId);
                    setTuningInitialSystem(currentPack || null);
                    setShowTuningStudio(true);
                    return;
                  }
                  setSelectedSystemPackId(value);
                }}
                allowedSystemIds={availableSystemPacks.map(p => p.meta.id)}
                showPatternCount={true}
              />
            </div>

            {/* System Profile Selections */}
            {systemPackRoleOptions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {systemPackRoleOptions.map((role) => {
                  const fieldKey = `systemProfile.${role.id}`;
                  const error = getFieldError(fieldKey);
                  const value = (systemProfileSelections[role.id as keyof SystemProfileSelections] as string) || undefined;

                  return (
                    <div key={role.id} className="space-y-1.5">
                      <Label className="typography-label text-[11px]">{role.label}</Label>
                      <Select
                        value={value}
                        onValueChange={(code) =>
                          handleSystemProfileChange(role.id as keyof SystemProfileSelections, code)
                        }
                      >
                        <SelectTrigger
                          className={`bg-slate-800/50 border-slate-700/50 h-9 text-xs text-slate-100 focus:ring-amber-500/30 focus:border-amber-500/30 ${error ? 'border-red-500' : ''
                            }`}
                        >
                          <SelectValue placeholder={`Select ${role.label}`} />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50 text-slate-200">
                          {role.options.map((opt) => (
                            <SelectItem
                              key={opt.code}
                              value={opt.code}
                              className="text-xs focus:bg-slate-800/80 focus:text-amber-400"
                            >
                              {opt.label} ({opt.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {error && (
                        <p className="text-xs text-red-400">{error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Custom System Manager (if needed) */}
            {selectedSystemPackId && availableSystemPacks.find(p => p.meta.id === selectedSystemPackId)?.meta.id.startsWith('custom') && (
              <div className="bg-slate-800/40 border border-slate-700 /50 rounded-lg p-4 card-dark">
                <CustomSystemManager
                  systemId={selectedSystemPackId}
                  systemName={availableSystemPacks.find(p => p.meta.id === selectedSystemPackId)?.meta.name || 'Custom System'}
                  onDelete={refreshCustomSystems}
                  onArchive={refreshCustomSystems}
                  onDuplicate={refreshCustomSystems}
                  onEdit={() => {
                    const currentPack = availableSystemPacks.find(p => p.meta.id === selectedSystemPackId);
                    setTuningInitialSystem((currentPack as StoredSystemPack) || null);
                    setShowTuningStudio(true);
                  }}
                />
              </div>
            )}

            {region === 'egypt' && (
              <Alert className="bg-cyan-900/20 border-cyan-500/50 text-cyan-200">
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  {t('smart_measuring.system_config.ai_recommendation', 'AI Recommendation: Based on your region (Egypt), <strong>ROCK 60</strong> is the optimal choice.', { strong: (chunks: React.ReactNode) => <strong>{chunks}</strong> })}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Factory className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-amber-200">
                {activeSystemPack?.meta.name || 'No system selected'}
              </span>
              {systemPackRoleOptions.length > 0 && (
                <span className="text-xs text-amber-600/70">
                  ({Object.keys(systemProfileSelections).filter(k => systemProfileSelections[k as keyof SystemProfileSelections]).length}/{systemPackRoleOptions.length} profiles selected)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Smart Draw Card - Below System Pack */}
      {selectedSystemPackId && (
        <div className="w-full card-glass-dark rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="p-4 border-b-2 border-amber-600/30 flex-shrink-0">
            <h3 className="typography-h3 text-amber-200 flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-amber-500" />
              Smart Draw Canvas
            </h3>
          </div>
          <div className="flex-1 overflow-auto p-6">
            <SmartDrawCanvas
              width={Number(measurements.width) || 1000}
              height={Number(measurements.height) || 1000}
              grid={grid}
              onGridChange={setGrid}
              className="btn-secondary-dark"
              availablePatterns={availablePatterns}
              selectedPatternId={selectedPatternId}
              onPatternSelect={(val) => setSelectedPatternId(val || '')}
              systemPackId={selectedSystemPackId}
            />
            {/* Prediction Feedback */}
            {!isGridLocked && predictionReason && (
              <div className="absolute top-4 right-4 bg-amber-900/80 backdrop-blur text-amber-100 text-xs px-3 py-1.5 rounded-full border border-amber-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <Sparkles className="h-3 w-3 text-amber-400" />
                {predictionReason}
              </div>
            )}

            {/* Grid Lock Control */}
            <div className="absolute bottom-4 right-4">
              <Button
                size="sm"
                variant={isGridLocked ? "secondary" : "ghost"}
                className={`text-xs h-7 ${isGridLocked ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-black/40 text-slate-300 hover:bg-black/60'}`}
                onClick={() => setIsGridLocked(!isGridLocked)}
              >
                {isGridLocked ? <div className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Grid Locked</div> : "Auto-Layout Active"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Left Panel: The Guided Form */}
      <div className="w-full lg:w-[32%] xl:w-[28%] flex flex-col card-glass-dark rounded-lg overflow-hidden min-h-0 relative flex-shrink-0">
        {/* Classical texture overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(245, 158, 11, 0.1) 2px, rgba(245, 158, 11, 0.1) 4px)'
        }} />
        {/* Step Progress Indicator */}
        <div className="flex items-center p-4 border-b-2 border-amber-600/30 space-x-2 flex-shrink-0 relative z-10">
          {STEPS.map((step, idx) => (
            <div
              key={step.id}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${idx <= currentStep ? 'bg-amber-500 shadow-glow-strong' : 'bg-[#1a1a1a] border border-amber-600/20'
                }`}
            />
          ))}
        </div>
        <div className="p-4 flex-shrink-0 relative z-10">
          <h2 className="typography-h2 text-amber-200 flex items-center gap-2 text-shadow-glow-subtle">
            <span className="text-amber-400 font-bold text-shadow-glow-strong">0{currentStep + 1}.</span> {STEPS[currentStep].title}
          </h2>
        </div>

        {/* Form Content Container */}
        <div className="flex-1 overflow-y-auto p-4 relative min-h-0">
          <AnimatePresence mode='wait' custom={currentStep}>
            <motion.div
              key={currentStep}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-6"
            >
              {/* STEP 1: System - Now moved to top, show message here */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <Alert className="bg-amber-900/20 border-amber-500/50 text-amber-200">
                    <Factory className="h-4 w-4" />
                    <AlertDescription>
                      System configuration has been moved to the top of the page. Please select your system pack and profiles there.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* STEP 2: Dimensions & Layout */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  {/* Window Dimensions Display - Top of Card */}
                  <div className="card-dark p-4 border-2 border-amber-600/30 rounded-lg relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ruler className="h-4 w-4 text-amber-400" />
                        <span className="text-sm font-semibold text-amber-300 uppercase tracking-wide">Window Dimensions</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-xs text-amber-500/80 font-medium">Width</div>
                          <div className="font-mono text-xl font-bold text-amber-300 text-shadow-glow-subtle">{Number(measurements.width || 0).toFixed(0)} mm</div>
                        </div>
                        <div className="text-amber-600/50 text-2xl">×</div>
                        <div className="text-center">
                          <div className="text-xs text-amber-500/80 font-medium">Height</div>
                          <div className="font-mono text-xl font-bold text-amber-300 text-shadow-glow-subtle">{Number(measurements.height || 0).toFixed(0)} mm</div>
                        </div>
                        <div className="text-amber-600/30 text-xl">|</div>
                        <div className="text-center">
                          <div className="text-xs text-amber-500/80 font-medium">Area</div>
                          <div className="font-mono text-base font-semibold text-amber-400">
                            {((Number(measurements.width || 0) * Number(measurements.height || 0)) / 1_000_000).toFixed(2)} m²
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Prestige Egyptian Pattern Selector */}
                  <div className="card-glass-dark p-6 relative z-10">
                    {availablePatterns.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-400 mb-2">No patterns available for this system.</p>
                        <p className="text-sm text-slate-500">Select a different system to see patterns.</p>
                      </div>
                    ) : (
                      <EgyptianPatternSelector
                        selectedPatternId={selectedPatternId || undefined}
                        onSelect={(patternId, grid) => {
                          setSelectedPatternId(patternId);
                          const pattern = availablePatterns.find(p => p.id === patternId);
                          if (pattern) {
                            const midWidth = Math.round((pattern.typicalWidthMm[0] + pattern.typicalWidthMm[1]) / 2);
                            const midHeight = Math.round((pattern.typicalHeightMm[0] + pattern.typicalHeightMm[1]) / 2);
                            handleInputChange('width', String(midWidth));
                            handleInputChange('height', String(midHeight));
                            setGrid(grid);
                          }
                        }}
                        currentSystemId={selectedSystemPackId}
                        defaultShowDetails={false}
                      />
                    )}
                  </div>

                  {/* Enhanced Measurement Tools with Real-time Validation */}
                  <EnhancedMeasurementTools
                    width={measurements.width}
                    height={measurements.height}
                    windowType={measurements.windowType}
                    systemPackId={selectedSystemPackId}
                    measurementMode={measurements.measurementMode as 'hole' | 'manufacturing'}
                    wallDeduction={measurements.wallDeduction}
                    onWidthChange={(value) => handleInputChange('width', value)}
                    onHeightChange={(value) => handleInputChange('height', value)}
                    onCommonSizeSelect={() => {
                      // Optional: Add analytics or other side effects
                    }}
                    fieldErrors={fieldErrors}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t-2 border-amber-600/30 pt-4">
                    <div>
                      <Label className="typography-label text-[11px] uppercase tracking-wide text-slate-400">
                        Measurement Mode
                      </Label>
                      <Select
                        value={measurements.measurementMode}
                        onValueChange={(val) => handleInputChange('measurementMode', val)}
                      >
                        <SelectTrigger className="btn-secondary-dark">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0f0f0f]/95 backdrop-blur-xl /40 text-xs text-amber-200 card-premium">
                          <SelectItem value="hole" className="btn-secondary-dark">Hole Size (Rough Opening)</SelectItem>
                          <SelectItem value="manufacturing" className="btn-secondary-dark">Manufacturing Size</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="typography-label text-[11px] uppercase tracking-wide text-slate-400">
                        Wall Tolerance Deduction (mm)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={40}
                        value={measurements.wallDeduction}
                        onChange={(e) => handleInputChange('wallDeduction', e.target.value)}
                        className="btn-secondary-dark"
                      />
                    </div>

                    <div className="card-dark p-3 text-xs text-amber-200">
                      <div className="flex justify-between">
                        <span className="text-amber-500/80 font-semibold">Manufacturing Width</span>
                        <span className="font-mono text-amber-400 text-shadow-glow-subtle">
                          {Math.max(
                            Number(measurements.measurementMode === 'hole'
                              ? Number(measurements.width || 0) - Number(measurements.wallDeduction || 0)
                              : Number(measurements.width || 0)
                            ), 0
                          ).toFixed(0)} mm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-500/80 font-semibold">Manufacturing Height</span>
                        <span className="font-mono text-amber-400 text-shadow-glow-subtle">
                          {Math.max(
                            Number(measurements.measurementMode === 'hole'
                              ? Number(measurements.height || 0) - Number(measurements.wallDeduction || 0)
                              : Number(measurements.height || 0)
                            ), 0
                          ).toFixed(0)} mm
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t-2 border-amber-600/30 pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="typography-label flex items-center gap-2 cursor-pointer text-slate-200">
                        <Grid3X3 className="h-4 w-4 text-amber-400" />
                        <span>{t('smart_measuring.dimensions.grid_mode', 'Grid / Multi-Unit Mode')}</span>
                      </Label>
                      <Toggle
                        pressed={isGridMode}
                        onPressedChange={setIsGridMode}
                        className="btn-primary"
                        size="sm"
                      >
                        {isGridMode ? t('profile_import_tool.on', 'On') : t('profile_import_tool.off', 'Off')}
                      </Toggle>
                    </div>

                    {isGridMode ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <p className="text-xs text-amber-600/70">
                          {t('smart_measuring.dimensions.grid_description', 'Design complex multi-unit windows by defining rows and columns. The Smart Draw Canvas is now available in the dedicated section above.')}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="windowType" className="typography-label">{t('smart_measuring.dimensions.window_type', 'Window Type & Layout')}</Label>
                        <Select value={measurements.windowType} onValueChange={(value) => handleInputChange('windowType', value)}>
                          <SelectTrigger className={`bg-[#1a1a1a]/80 border-2 border-amber-600/30 text-amber-200 ${getFieldError('windowType') ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder={t('smart_measuring.dimensions.window_type_placeholder', 'Select window or door layout')} />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0f0f0f]/95 backdrop-blur-xl /40 text-amber-200 z-50 space-y-1 card-premium">
                            <div className="px-2 pt-1 text-xs uppercase tracking-[0.15em] text-amber-500/80 font-semibold">{t('smart_measuring.dimensions.sliding_windows', 'Sliding Windows')}</div>
                            <SelectItem value="sliding_window_2sash" className="btn-secondary-dark">
                              <div className="flex items-center gap-2">
                                <Crown className="w-5 h-5 text-amber-400 fill-amber-400/30" />
                                <span className="text-sm text-slate-100 font-semibold">2 Sash</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="sliding_window_4sash" className="btn-secondary">
                              {t('smart_measuring.dimensions.sliding_4sash', 'Sliding Window – 4 Sash')}
                            </SelectItem>
                            <SelectItem value="sliding_window_3sash_center_fixed" className="btn-secondary">
                              {t('smart_measuring.dimensions.sliding_3sash_center', 'Sliding Window – 3 Sash (Center Fixed)')}
                            </SelectItem>
                            <div className="px-2 pt-2 text-xs uppercase tracking-wide text-slate-400">{t('smart_measuring.dimensions.casement_tilt', 'Casement / Tilt & Turn')}</div>
                            <SelectItem value="casement" className="btn-secondary">
                              {t('smart_measuring.dimensions.casement_single', 'Casement – Single')}
                            </SelectItem>
                            <SelectItem value="casement_double" className="btn-secondary">
                              {t('smart_measuring.dimensions.casement_double', 'Casement – Double (Left / Right)')}
                            </SelectItem>
                            <SelectItem value="tilt_turn" className="btn-secondary">
                              {t('smart_measuring.dimensions.tilt_turn', 'Tilt & Turn')}
                            </SelectItem>
                            <div className="px-2 pt-2 text-xs uppercase tracking-wide text-slate-400">{t('smart_measuring.dimensions.doors', 'Doors')}</div>
                            <SelectItem value="sliding_door_2panel" className="btn-secondary">
                              {t('smart_measuring.dimensions.sliding_door_2panel', 'Sliding Door – 2 Panel')}
                            </SelectItem>
                            <SelectItem value="casement_door" className="btn-secondary">
                              {t('smart_measuring.dimensions.casement_door', 'Casement Door (Single / Double)')}
                            </SelectItem>
                            <div className="px-2 pt-2 text-xs uppercase tracking-wide text-slate-400">{t('smart_measuring.dimensions.fixed_combinations', 'Fixed & Combinations')}</div>
                            <SelectItem value="fixed_window" className="btn-secondary">
                              {t('smart_measuring.dimensions.fixed_window', 'Fixed Window')}
                            </SelectItem>
                            <SelectItem value="fixed_with_side_casements" className="btn-secondary">
                              {t('smart_measuring.dimensions.fixed_side_casements', 'Fixed + Side Casements')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {getFieldError('windowType') && (
                          <p className="text-sm text-red-400 mt-1">{getFieldError('windowType')}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Glass & Specs */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="glazingType" className="typography-label">{t('smart_measuring.specs.glazing_type', 'Glazing Type')}</Label>
                      <Select
                        value={measurements.glazingType}
                        onValueChange={(value) => handleInputChange('glazingType', value)}
                      >
                        <SelectTrigger
                          id="glazingType"
                          className={`bg-slate-800/50 border-slate-700/50 text-slate-100 ${getFieldError('glazingType') ? 'border-red-500' : ''
                            }`}
                        >
                          <SelectValue placeholder={t('smart_measuring.specs.glazing_type_placeholder', 'Select glazing type')} />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50 text-slate-200 z-50">
                          <SelectItem value="single" className="btn-secondary">
                            {t('smart_measuring.specs.single', 'Single')}
                          </SelectItem>
                          <SelectItem value="double" className="btn-secondary">
                            {t('smart_measuring.specs.double', 'Double')}
                          </SelectItem>
                          <SelectItem value="triple" className="btn-secondary">
                            {t('smart_measuring.specs.triple', 'Triple')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {getFieldError('glazingType') && (
                        <p className="text-sm text-red-400 mt-1">{getFieldError('glazingType')}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="glassColor" className="typography-label">{t('smart_measuring.specs.glass_color', 'Glass Color / Tint')}</Label>
                      <Select
                        value={measurements.glassColor || 'clear'}
                        onValueChange={(value) => handleInputChange('glassColor', value)}
                        defaultValue="clear"
                      >
                        <SelectTrigger
                          id="glassColor"
                          className={`bg-slate-800/50 border-slate-700/50 text-slate-100 ${getFieldError('glassColor') ? 'border-red-500' : ''
                            }`}
                        >
                          <SelectValue placeholder={t('smart_measuring.specs.glass_color_placeholder', 'Clear, Green, Bronze...')} />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50 text-slate-200 z-50">
                          <SelectItem value="clear" className="btn-secondary">
                            {t('smart_measuring.specs.clear', 'Clear')}
                          </SelectItem>
                          <SelectItem value="green" className="btn-secondary">
                            {t('smart_measuring.specs.green', 'Green')}
                          </SelectItem>
                          <SelectItem value="blue" className="btn-secondary">
                            {t('smart_measuring.specs.blue', 'Blue')}
                          </SelectItem>
                          <SelectItem value="bronze" className="btn-secondary">
                            {t('smart_measuring.specs.bronze', 'Bronze')}
                          </SelectItem>
                          <SelectItem value="grey" className="btn-secondary">
                            {t('smart_measuring.specs.grey', 'Grey')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {getFieldError('glassColor') && (
                        <p className="text-sm text-red-400 mt-1">{getFieldError('glassColor')}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="flyScreenType" className="typography-label">{t('smart_measuring.specs.fly_screen', 'Flyscreen Type')}</Label>
                    <Select
                      value={measurements.flyScreenType || undefined}
                      onValueChange={(value) => handleInputChange('flyScreenType', value)}
                    >
                      <SelectTrigger
                        id="flyScreenType"
                        className={`bg-slate-800/50 border-slate-700/50 text-slate-100 ${getFieldError('flyScreenType') ? 'border-red-500' : ''
                          }`}
                      >
                        <SelectValue placeholder={t('smart_measuring.specs.fly_screen_placeholder', 'Select flyscreen type')} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50 text-slate-200 z-50">
                        <SelectItem value="none" className="btn-secondary">
                          {t('smart_measuring.specs.none', 'None')}
                        </SelectItem>
                        <SelectItem value="plisee" className="btn-secondary">
                          {t('smart_measuring.specs.plisse', 'Plisse')}
                        </SelectItem>
                        <SelectItem value="fixed" className="btn-secondary">
                          {t('smart_measuring.specs.fixed', 'Fixed')}
                        </SelectItem>
                        <SelectItem value="sliding" className="btn-secondary">
                          {t('smart_measuring.specs.sliding', 'Sliding')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {getFieldError('flyScreenType') && (
                      <p className="text-sm text-red-400 mt-1">{getFieldError('flyScreenType')}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="color" className="typography-label">{t('smart_measuring.specs.color', 'Color')}</Label>
                    <Select value={measurements.color} onValueChange={(value) => handleInputChange('color', value)}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 /50 text-slate-100 card-dark">
                        <SelectValue placeholder={t('smart_measuring.specs.color_placeholder', 'Select color')} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50 text-slate-200 z-50">
                        <SelectItem value="Silver" className="btn-secondary">{t('smart_measuring.specs.silver', 'Silver')}</SelectItem>
                        <SelectItem value="White" className="btn-secondary">{t('smart_measuring.specs.white', 'White')}</SelectItem>
                        <SelectItem value="Black" className="btn-secondary">{t('smart_measuring.specs.black', 'Black')}</SelectItem>
                        <SelectItem value="Bronze" className="btn-secondary">{t('smart_measuring.specs.bronze_color', 'Bronze')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* STEP 4: Location Context */}
              {currentStep === 3 && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wide">
                    {t('smart_measuring.location.title', 'Location / Pose details (optional)')}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <Label className="typography-label text-[11px] text-slate-300">{t('smart_measuring.location.building_block', 'Building / Block')}</Label>
                      <Input
                        value={measurements.buildingBlock}
                        onChange={(e) => handleInputChange('buildingBlock', e.target.value)}
                        placeholder={t('smart_measuring.location.building_block_placeholder', 'Block A')}
                        className="h-8 bg-slate-800/50 border-slate-700 /50 text-slate-100 card-dark"
                      />
                    </div>
                    <div>
                      <Label className="typography-label text-[11px] text-slate-300">{t('smart_measuring.location.unit_apartment', 'Flat / Unit')}</Label>
                      <Input
                        value={measurements.unitOrApartment}
                        onChange={(e) => handleInputChange('unitOrApartment', e.target.value)}
                        placeholder={t('smart_measuring.location.unit_apartment_placeholder', 'Flat 12')}
                        className="h-8 bg-slate-800/50 border-slate-700 /50 text-slate-100 card-dark"
                      />
                    </div>
                    <div>
                      <Label className="typography-label text-[11px] text-slate-300">{t('smart_measuring.location.floor', 'Floor')}</Label>
                      <Input
                        value={measurements.floor}
                        onChange={(e) => handleInputChange('floor', e.target.value)}
                        placeholder={t('smart_measuring.location.floor_placeholder', '3')}
                        className="h-8 bg-slate-800/50 border-slate-700 /50 text-slate-100 card-dark"
                      />
                    </div>
                    <div>
                      <Label className="typography-label text-[11px] text-slate-300">{t('smart_measuring.location.room_zone', 'Room / Zone')}</Label>
                      <Input
                        value={measurements.roomOrZone}
                        onChange={(e) => handleInputChange('roomOrZone', e.target.value)}
                        placeholder={t('smart_measuring.location.room_zone_placeholder', 'Living, Bedroom...')}
                        className="h-8 bg-slate-800/50 border-slate-700 /50 text-slate-100 card-dark"
                      />
                    </div>
                    <div>
                      <Label className="typography-label text-[11px] text-slate-300">{t('smart_measuring.location.elevation', 'Elevation')}</Label>
                      <Input
                        value={measurements.elevation}
                        onChange={(e) => handleInputChange('elevation', e.target.value)}
                        placeholder={t('smart_measuring.location.elevation_placeholder', 'North, Street, Garden...')}
                        className="h-8 bg-slate-800/50 border-slate-700 /50 text-slate-100 card-dark"
                      />
                    </div>
                    <div>
                      <Label className="typography-label text-[11px] text-slate-300">{t('smart_measuring.location.window_index', 'Window Index')}</Label>
                      <Input
                        value={measurements.windowIndex}
                        onChange={(e) => handleInputChange('windowIndex', e.target.value)}
                        placeholder={t('smart_measuring.location.window_index_placeholder', 'W1, W2...')}
                        className="h-8 bg-slate-800/50 border-slate-700 /50 text-slate-100 card-dark"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="typography-label text-[11px] text-slate-300">{t('smart_measuring.location.remarks', 'Remarks')}</Label>
                      <Input
                        value={measurements.remarks}
                        onChange={(e) => handleInputChange('remarks', e.target.value)}
                        placeholder={t('smart_measuring.location.remarks_placeholder', 'Any special note for this pose')}
                        className="h-8 bg-slate-800/50 border-slate-700 /50 text-slate-100 card-dark"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Verification Gate */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="card-dark p-4 shadow-glow-strong">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="typography-h3 text-amber-400 flex items-center gap-2 text-shadow-glow">
                        <ShieldCheck className="h-5 w-5" /> {t('smart_measuring.verification.trust_verify', 'Trust but Verify')}
                      </h3>
                      <Badge variant="outline" className="btn-secondary-dark">
                        {t('smart_measuring.verification.calibration_accuracy', 'Calibration Accuracy: 98%')}
                      </Badge>
                    </div>
                    <p className="text-xs text-amber-300/90 mb-4">
                      {t('smart_measuring.verification.description', 'The system has calculated cut dimensions based on your inputs and profile calibration data. Please verify these critical dimensions against site conditions to prevent waste.')}
                    </p>

                    <div className="space-y-3 text-sm card-dark p-3 rounded">
                      {(() => {
                        const rawWidth = Number(measurements.width || 0);
                        const rawHeight = Number(measurements.height || 0);
                        const deduction = Number(measurements.wallDeduction || 0);
                        const isHoleMode = measurements.measurementMode === 'hole';
                        const manufacturingWidth = isHoleMode ? rawWidth - deduction : rawWidth;
                        const manufacturingHeight = isHoleMode ? rawHeight - deduction : rawHeight;
                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-amber-500/80 font-semibold">{t('smart_measuring.verification.overall_width', 'Overall Width Input:')}</span>
                              <span className="font-mono text-amber-200 text-base text-shadow-glow-subtle">{rawWidth} mm</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-amber-500/80 font-semibold">{t('smart_measuring.verification.overall_height', 'Overall Height Input:')}</span>
                              <span className="font-mono text-amber-200 text-base text-shadow-glow-subtle">{rawHeight} mm</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-amber-500/80 font-semibold">{t('smart_measuring.verification.deduction', 'Deduction (Wall Tolerance):')}</span>
                              <span className="font-mono text-red-400">- {isHoleMode ? deduction : 0} mm</span>
                            </div>
                            <div className="btn-primary" />
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-amber-400 text-shadow-glow">{t('smart_measuring.verification.calculated_cut', 'Calculated Cut Length:')}</span>
                              <span className="font-mono text-amber-300 text-lg text-shadow-glow-strong">{manufacturingWidth.toFixed(0)} × {manufacturingHeight.toFixed(0)} mm</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 card-dark rounded-lg">
                    <Checkbox
                      id="verify"
                      checked={verificationConfirmed as boolean}
                      onCheckedChange={setVerificationConfirmed}
                      className="btn-primary"
                    />
                    <Label htmlFor="verify" className="typography-label text-sm text-amber-200 cursor-pointer select-none font-semibold">
                      {t('smart_measuring.verification.confirm_text', 'I verify these dimensions match site requirements and accept responsibility for production.')}
                    </Label>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t-2 border-amber-600/30 flex flex-col sm:flex-row justify-between gap-2 -sm flex-shrink-0 relative z-10 card-glass-dark">
          <Button variant="ghost" disabled={currentStep === 0} onClick={prevStep} className="btn-secondary-dark">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('smart_measuring.actions.previous', 'Back')}
          </Button>

          {currentStep === STEPS.length - 1 ? (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Print Label Button - Enabled only after verification */}
              {verificationConfirmed && (
                <Button
                  variant="outline"
                  onClick={() => setShowLabel(true)}
                  className="btn-secondary-dark"
                >
                  <QrCode className="mr-2 h-4 w-4" /> {t('smart_measuring.actions.print_label', 'Print Label')}
                </Button>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!verificationConfirmed}
                className={`
                  transition-all duration-300 w-full sm:w-auto
                  ${verificationConfirmed
                    ? 'btn-primary-gradient'
                    : 'bg-[#1a1a1a] text-amber-600/50 cursor-not-allowed border-2 border-amber-600/20'}
                `}
              >
                {t('smart_measuring.actions.complete', 'Finalize Design')} <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={nextStep} className="btn-primary-gradient font-bold w-full sm:w-auto">
              {t('smart_measuring.actions.next', 'Next Step')} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Right Panel: Clean Blueprint Preview - Responsive */}
      <div className="flex-1 w-full lg:w-auto bg-white rounded-xl border border-gray-200 relative overflow-hidden shadow-sm min-h-0 min-w-0 flex flex-col">
        {/* Header with Zoom Controls */}
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium text-xs px-2 sm:px-3 py-1">
            <Ruler className="h-3 w-3 mr-1 sm:mr-1.5" />
            <span className="hidden sm:inline">Measurement Preview</span>
            <span className="sm:hidden">Preview</span>
          </Badge>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {activeSystemPack && (
              <div className="text-xs text-gray-600 bg-white/90 backdrop-blur px-3 py-1 rounded border border-gray-200">
                <span className="font-semibold">{activeSystemPack.meta.name}</span>
              </div>
            )}
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur rounded border border-gray-200 p-1 shadow-sm">
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={`p-1.5 rounded transition-colors ${highContrast ? 'bg-black text-yellow-400 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                title={highContrast ? "Disable High Contrast" : "Enable High Contrast"}
                aria-label={highContrast ? "Disable High Contrast" : "Enable High Contrast"}
                aria-pressed={highContrast}
              >
                <Contrast className="h-4 w-4" />
              </button>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button
                onClick={() => setBlueprintZoom(prev => Math.max(0.5, prev - 0.1))}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="Zoom Out (Ctrl + Scroll Down)"
                aria-label="Zoom Out"
              >
                <ZoomOut className="h-4 w-4 text-gray-600" />
              </button>
              <span
                className={`text-xs font-mono px-2 min-w-[3rem] text-center transition-colors ${blueprintZoom !== 1
                  ? 'text-amber-600 font-bold bg-amber-50 rounded px-2 py-0.5'
                  : 'text-slate-700'
                  }`}
                title={blueprintZoom !== 1 ? "Press Escape to reset to 100%" : "Zoom Level"}
              >
                {Math.round(blueprintZoom * 100)}%
              </span>

              {/* 3D Preview Button */}
              <button
                onClick={() => setShow3DPreview(true)}
                className="p-1.5 hover:bg-amber-100 text-amber-600 rounded transition-colors flex items-center gap-1 ml-1 border-l border-gray-200 pl-2"
                title="Open 3D Preview"
              >
                <Box className="h-4 w-4" />
                <span className="text-xs font-bold hidden sm:inline">3D</span>
              </button>

              <button
                onClick={() => setBlueprintZoom(prev => Math.min(2.0, prev + 0.1))}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="Zoom In (Ctrl + Scroll Up)"
                aria-label="Zoom In"
              >
                <ZoomIn className="h-4 w-4 text-gray-600" />
              </button>
              {/* Prominent Reset Button - Highlighted when zoom !== 1 */}
              <button
                onClick={() => {
                  setBlueprintZoom(1);
                  if (blueprintFullscreen) {
                    setBlueprintFullscreen(false);
                  }
                }}
                className={`p-1.5 rounded transition-all ${blueprintZoom !== 1
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md animate-pulse'
                  : 'hover:bg-slate-100 text-slate-600'
                  }`}
                title={blueprintZoom !== 1 ? "Reset to 100% (Escape)" : "Reset Zoom (currently at 100%)"}
                aria-label="Reset Zoom"
              >
                <RotateCcw className={`h-4 w-4 ${blueprintZoom !== 1 ? 'text-white' : 'text-gray-600'}`} />
              </button>
              {blueprintZoom !== 1 && (
                <span className="text-[10px] text-amber-600 font-medium px-1.5 py-0.5 bg-amber-50 rounded border border-amber-200">
                  ESC
                </span>
              )}
              <button
                onClick={() => setBlueprintFullscreen(!blueprintFullscreen)}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title={blueprintFullscreen ? "Exit Fullscreen (Escape)" : "Fullscreen Preview"}
                aria-label={blueprintFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}
              >
                {blueprintFullscreen ? (
                  <Minimize2 className="h-4 w-4 text-gray-600" />
                ) : (
                  <Maximize2 className="h-4 w-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* SR-Only Summary for Accessibility */}
        <div className="sr-only" aria-live="polite">
          {previewWindowUnit ? (
            `Window Preview: ${measurements.width}mm by ${measurements.height}mm. 
             ${grid.cols} columns by ${grid.rows} rows. 
             ${selectedPatternId ? 'Pattern selected.' : ''} 
             Use Zoom controls to inspect details.`
          ) : (
            'No window preview available. Enter dimensions to generate.'
          )}
        </div>

        {/* Dynamic Blueprint Canvas */}
        {previewWindowUnit && Number(measurements.width) > 0 && Number(measurements.height) > 0 ? (
          <>
            {/* Blueprint Canvas - Conditionally rendered in normal or fullscreen mode */}
            {blueprintFullscreen && typeof document !== 'undefined' ? (
              // Fullscreen Mode - Render via Portal
              createPortal(
                <div className="fixed inset-0 z-[9999] bg-white overflow-auto">
                  {/* Fullscreen Mode Top Reset Button */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <button
                      onClick={() => {
                        setBlueprintZoom(1);
                        setBlueprintFullscreen(false);
                      }}
                      className="btn-primary-gradient flex items-center gap-2 px-4 py-2 font-medium text-sm"
                      title="Reset Zoom & Exit Fullscreen (Escape)"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Reset to Normal View</span>
                      <span className="text-xs opacity-75">(ESC)</span>
                    </button>
                  </div>
                  {/* Fullscreen Blueprint Content */}
                  <div className="w-full h-full flex items-center justify-center p-6 md:p-8">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: blueprintZoom }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-full max-w-full"
                      style={{ transformOrigin: 'center' }}
                    >
                      {/* Render the same SVG content as normal view */}
                      <svg
                        key={`fullscreen-${blueprintKey}`}
                        viewBox="0 0 1200 900"
                        className="w-full h-full"
                        preserveAspectRatio="xMidYMid meet"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }}
                      >
                        {/* Background grid - more visible and dynamic */}
                        <defs>
                          <pattern id="blueprint-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#d1d5db" strokeWidth="0.8" opacity="0.6" />
                          </pattern>
                          {/* Highlight pattern for active dimension */}
                          <pattern id="highlight-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#blueprint-grid)" />
                        {highlightedDimension && (
                          <rect width="100%" height="100%" fill="url(#highlight-grid)" opacity="0.5" />
                        )}

                        {/* ✅ PERFORMANCE: Use memoized blueprint calculations */}
                        {(() => {
                          const {
                            width,
                            height,
                            svgWidth,
                            svgHeight,
                            startX,
                            startY,
                            area,
                            currentGrid,
                            showGrid,
                            selectedPattern,
                            colWeights,
                            rowWeights,
                            totalColWeight,
                            totalRowWeight,
                          } = blueprintCalculations;

                          return (
                            <g role="img" aria-labelledby="blueprint-title blueprint-desc">
                              <title id="blueprint-title">Window Blueprint Preview</title>
                              <desc id="blueprint-desc">
                                Technical drawing of the window unit.
                                Overall dimensions: {width}mm width by {height}mm height.
                                {currentGrid.cols} columns by {currentGrid.rows} rows.
                                {selectedPattern ? `Pattern: ${selectedPattern.name}` : ''}
                              </desc>

                              {/* Window Frame - with subtle animation on dimension change */}
                              <rect
                                x={startX}
                                y={startY}
                                width={svgWidth}
                                height={svgHeight}
                                fill="none"
                                stroke={highlightedDimension ? BLUEPRINT_THEME.stroke.highlight : BLUEPRINT_THEME.stroke.primary}
                                strokeWidth={highlightedDimension ? "4" : "3"}
                                className="transition-all duration-300"
                                style={{
                                  strokeDasharray: highlightedDimension ? "8 4" : "none",
                                  animation: highlightedDimension ? "pulse 2s ease-in-out infinite" : "none"
                                }}
                              />

                              {/* Grid Divisions - Vertical Mullions with Technical Annotations */}
                              {showGrid && currentGrid.cols > 1 && Array.from({ length: currentGrid.cols - 1 }, (_, i) => {
                                // Calculate mullion position using colWeights (accounts for proportional widths)
                                let xPos = startX;
                                for (let c = 0; c <= i; c++) {
                                  xPos += (colWeights[c] / totalColWeight) * svgWidth;
                                }

                                // Get mullion technical details from pattern if available
                                const mullionSpec = selectedPattern?.mullions?.find(m => m.position === i);
                                const mullionWidth = mullionSpec?.width || 50; // Default 50mm, or from pattern spec
                                const mullionType = mullionSpec?.type || 'standard';
                                const isStructural = mullionSpec?.reinforcement || mullionType === 'structural';

                                return (
                                  <g key={`mullion-v-${i}-${blueprintKey}`}>
                                    {/* Mullion line - thicker for structural */}
                                    <line
                                      x1={xPos}
                                      y1={startY}
                                      x2={xPos}
                                      y2={startY + svgHeight}
                                      stroke={isStructural ? BLUEPRINT_THEME.stroke.structural : BLUEPRINT_THEME.stroke.secondary}
                                      strokeWidth={isStructural ? "3" : "2.5"}
                                      strokeDasharray={isStructural ? "6 3" : "4 4"}
                                      opacity="0.7"
                                      className="transition-all duration-300"
                                    />
                                    {/* Mullion width annotation with technical details */}
                                    {svgHeight > 200 && (
                                      <>
                                        <text
                                          x={xPos}
                                          y={startY + svgHeight / 2}
                                          textAnchor="middle"
                                          dominantBaseline="middle"
                                          fill={isStructural ? BLUEPRINT_THEME.text.structural : BLUEPRINT_THEME.text.secondary}
                                          fontSize="10"
                                          fontWeight="600"
                                          transform={`rotate(-90 ${xPos} ${startY + svgHeight / 2})`}
                                          className="pointer-events-none select-none"
                                        >
                                          {mullionType.toUpperCase()} {mullionWidth}mm
                                          {isStructural && ' ⚙️'}
                                        </text>
                                        {/* Mullion Height Dimension - Show from height perspective */}
                                        <g>
                                          {/* Height dimension line along mullion - more spacing */}
                                          <line
                                            x1={xPos - 25}
                                            y1={startY}
                                            x2={xPos - 25}
                                            y2={startY + svgHeight}
                                            stroke={isStructural ? BLUEPRINT_THEME.stroke.structural : BLUEPRINT_THEME.stroke.secondary}
                                            strokeWidth="1.5"
                                            strokeDasharray="2 2"
                                            opacity="0.5"
                                          />
                                          {/* Height dimension markers */}
                                          <line
                                            x1={xPos - 30}
                                            y1={startY}
                                            x2={xPos - 20}
                                            y2={startY}
                                            stroke={isStructural ? BLUEPRINT_THEME.stroke.structural : BLUEPRINT_THEME.stroke.secondary}
                                            strokeWidth="2"
                                          />
                                          <line
                                            x1={xPos - 30}
                                            y1={startY + svgHeight}
                                            x2={xPos - 20}
                                            y2={startY + svgHeight}
                                            stroke={isStructural ? BLUEPRINT_THEME.stroke.structural : BLUEPRINT_THEME.stroke.secondary}
                                            strokeWidth="2"
                                          />
                                          {/* Height dimension text - more spacing */}
                                          <text
                                            x={xPos - 40}
                                            y={startY + svgHeight / 2}
                                            textAnchor="end"
                                            dominantBaseline="middle"
                                            fill={isStructural ? BLUEPRINT_THEME.text.structural : BLUEPRINT_THEME.text.secondary}
                                            fontSize="11"
                                            fontWeight="700"
                                            className="pointer-events-none select-none font-mono"
                                          >
                                            {Math.round(height)}mm
                                          </text>
                                          {/* Label - more spacing */}
                                          <text
                                            x={xPos - 40}
                                            y={startY + svgHeight / 2 - 20}
                                            textAnchor="end"
                                            dominantBaseline="middle"
                                            fill={isStructural ? BLUEPRINT_THEME.text.structural : typeof BLUEPRINT_THEME.text.secondary === 'string' ? '#9ca3af' : '#9ca3af'}
                                            fontSize="9"
                                            fontWeight="500"
                                            className="pointer-events-none select-none"
                                          >
                                            MULLION H
                                          </text>
                                        </g>
                                      </>
                                    )}
                                  </g>
                                );
                              })}

                              {/* Grid Divisions - Horizontal Transoms with Technical Annotations */}
                              {showGrid && currentGrid.rows > 1 && Array.from({ length: currentGrid.rows - 1 }, (_, i) => {
                                // Calculate transom position using rowWeights
                                let yPos = startY;
                                for (let r = 0; r <= i; r++) {
                                  yPos += (rowWeights[r] / totalRowWeight) * svgHeight;
                                }

                                // Get transom technical details from pattern if available
                                const transomSpec = selectedPattern?.transoms?.find(t => t.position === i);
                                const transomHeight = transomSpec?.height || 50; // Default 50mm, or from pattern spec
                                const transomType = transomSpec?.type || 'standard';
                                const isStructural = transomSpec?.reinforcement || transomType === 'structural';

                                return (
                                  <g key={`transom-h-${i}-${blueprintKey}`}>
                                    {/* Transom line */}
                                    <line
                                      x1={startX}
                                      y1={yPos}
                                      x2={startX + svgWidth}
                                      y2={yPos}
                                      stroke={BLUEPRINT_THEME.stroke.secondary}
                                      strokeWidth="2.5"
                                      strokeDasharray="4 4"
                                      opacity="0.7"
                                      className="transition-all duration-300"
                                    />
                                    {/* Transom height annotation with technical details */}
                                    {svgWidth > 300 && (
                                      <text
                                        x={startX + svgWidth / 2}
                                        y={yPos}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill={isStructural ? BLUEPRINT_THEME.text.structural : BLUEPRINT_THEME.text.secondary}
                                        fontSize="10"
                                        fontWeight="600"
                                        className="pointer-events-none select-none"
                                      >
                                        {transomType.toUpperCase()} {transomHeight}mm
                                        {isStructural && ' ⚙️'}
                                      </text>
                                    )}
                                  </g>
                                );
                              })}

                              {/* Grid Cells - Dynamically updates from SmartDrawCanvas grid changes with Technical Details */}
                              {showGrid && currentGrid.cells && currentGrid.cells.length > 0 && currentGrid.cells.map((cell) => {
                                // ✅ PERFORMANCE: Use memoized colWeights/rowWeights from blueprintCalculations

                                // Calculate cell position
                                let cellX = startX;
                                for (let c = 0; c < cell.col; c++) {
                                  cellX += (colWeights[c] / totalColWeight) * svgWidth;
                                }

                                let cellY = startY;
                                for (let r = 0; r < cell.row; r++) {
                                  cellY += (rowWeights[r] / totalRowWeight) * svgHeight;
                                }

                                const cellW = (colWeights[cell.col] / totalColWeight) * svgWidth;
                                const cellH = (rowWeights[cell.row] / totalRowWeight) * svgHeight;

                                // Calculate actual cell dimensions in mm
                                const cellWidthMm = (cellW / svgWidth) * width;
                                const cellHeightMm = (cellH / svgHeight) * height;
                                const cellAreaM2 = (cellWidthMm * cellHeightMm) / 1_000_000;

                                // Cell type colors
                                const cellFill = {
                                  'fixed': BLUEPRINT_THEME.fill.fixed,
                                  'sash': BLUEPRINT_THEME.fill.sash,
                                  'sliding': BLUEPRINT_THEME.fill.sliding,
                                  'panel': BLUEPRINT_THEME.fill.panel,
                                  'empty': BLUEPRINT_THEME.fill.empty,
                                }[cell.type] || 'transparent';

                                const cellStroke = {
                                  'fixed': BLUEPRINT_THEME.stroke.highlight,
                                  'sash': '#22c55e', // Keep specific indicators distinct if needed, or map to theme
                                  'sliding': '#eab308',
                                  'panel': '#6b7280',
                                  'empty': '#ef4444',
                                }[cell.type] || BLUEPRINT_THEME.stroke.secondary;

                                // Opening direction indicator
                                const openingArrow = cell.openingDirection === 'left' ? '←'
                                  : cell.openingDirection === 'right' ? '→'
                                    : cell.openingDirection === 'top' ? '↑'
                                      : cell.openingDirection === 'bottom' ? '↓'
                                        : '';

                                return (
                                  <g key={`${cell.id}-${currentGrid.cols}-${currentGrid.rows}-${blueprintKey}`}>
                                    {/* Cell background */}
                                    <rect
                                      x={cellX}
                                      y={cellY}
                                      width={cellW}
                                      height={cellH}
                                      fill={cellFill}
                                      stroke={cellStroke}
                                      strokeWidth="1.5"
                                      opacity="0.6"
                                      className="transition-all duration-300"
                                    />

                                    {/* Cell type label with opening direction - more spacing */}
                                    {cellW > 80 && cellH > 50 && (
                                      <>
                                        <text
                                          x={cellX + cellW / 2}
                                          y={cellY + cellH / 2 - 15}
                                          textAnchor="middle"
                                          dominantBaseline="middle"
                                          fill={cellStroke}
                                          fontSize={Math.max(11, Math.min(cellW, cellH) * 0.12)}
                                          fontWeight="bold"
                                          opacity="0.9"
                                          className="pointer-events-none select-none"
                                        >
                                          {cell.type === 'sash' ? 'SASH' : cell.type.toUpperCase()}
                                          {openingArrow && ` ${openingArrow}`}
                                        </text>

                                        {/* Cell dimensions annotation - more spacing */}
                                        {cellW > 120 && cellH > 80 && (
                                          <text
                                            x={cellX + cellW / 2}
                                            y={cellY + cellH / 2 + 18}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill="#6b7280"
                                            fontSize={Math.max(9, Math.min(cellW, cellH) * 0.08)}
                                            fontWeight="500"
                                            opacity="0.7"
                                            className="pointer-events-none select-none font-mono"
                                          >
                                            {Math.round(cellWidthMm)}×{Math.round(cellHeightMm)}mm
                                          </text>
                                        )}

                                        {/* Cell area annotation (for larger cells) - more spacing */}
                                        {cellW > 150 && cellH > 100 && cellAreaM2 > 0.5 && (
                                          <text
                                            x={cellX + cellW / 2}
                                            y={cellY + cellH / 2 + 35}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill="#9ca3af"
                                            fontSize={Math.max(8, Math.min(cellW, cellH) * 0.07)}
                                            fontWeight="400"
                                            opacity="0.6"
                                            className="pointer-events-none select-none"
                                          >
                                            {cellAreaM2.toFixed(2)} m²
                                          </text>
                                        )}
                                      </>
                                    )}
                                  </g>
                                );
                              })}

                              {/* Corner markers for precision */}
                              {[0, 1, 2, 3].map((corner) => {
                                const corners = [
                                  { x: startX, y: startY },
                                  { x: startX + svgWidth, y: startY },
                                  { x: startX + svgWidth, y: startY + svgHeight },
                                  { x: startX, y: startY + svgHeight }
                                ];
                                const c = corners[corner];
                                return (
                                  <circle
                                    key={corner}
                                    cx={c.x}
                                    cy={c.y}
                                    r="4"
                                    fill="#1f2937"
                                    stroke="white"
                                    strokeWidth="1.5"
                                  />
                                );
                              })}

                              {/* Width Dimension Line (Top) - animated with more spacing */}
                              <g className="transition-all duration-300">
                                <line
                                  x1={startX}
                                  y1={startY - 70}
                                  x2={startX + svgWidth}
                                  y2={startY - 70}
                                  stroke={highlightedDimension === 'width' ? "#2563eb" : "#3b82f6"}
                                  strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                                  className="transition-all duration-300"
                                />
                                <line
                                  x1={startX}
                                  y1={startY - 75}
                                  x2={startX}
                                  y2={startY - 65}
                                  stroke={highlightedDimension === 'width' ? "#2563eb" : "#3b82f6"}
                                  strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                                />
                                <line
                                  x1={startX + svgWidth}
                                  y1={startY - 75}
                                  x2={startX + svgWidth}
                                  y2={startY - 65}
                                  stroke={highlightedDimension === 'width' ? "#2563eb" : "#3b82f6"}
                                  strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                                />
                                <text
                                  x={startX + svgWidth / 2}
                                  y={startY - 85}
                                  textAnchor="middle"
                                  fill={highlightedDimension === 'width' ? "#1e40af" : "#2563eb"}
                                  fontSize="32"
                                  fontWeight="700"
                                  className="font-mono transition-all duration-300"
                                >
                                  {width.toLocaleString()} mm
                                </text>
                                <text
                                  x={startX + svgWidth / 2}
                                  y={startY - 110}
                                  textAnchor="middle"
                                  fill={highlightedDimension === 'width' ? "#1e40af" : "#6b7280"}
                                  fontSize="12"
                                  fontWeight="700"
                                  letterSpacing="0.1em"
                                  className="transition-all duration-300"
                                >
                                  WIDTH
                                </text>
                              </g>

                              {/* Height Dimension Line (Left) - animated with more spacing */}
                              <g className="transition-all duration-300">
                                <line
                                  x1={startX - 70}
                                  y1={startY}
                                  x2={startX - 70}
                                  y2={startY + svgHeight}
                                  stroke={highlightedDimension === 'height' ? "#2563eb" : "#3b82f6"}
                                  strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                                />
                                <line
                                  x1={startX - 75}
                                  y1={startY}
                                  x2={startX - 65}
                                  y2={startY}
                                  stroke={highlightedDimension === 'height' ? "#2563eb" : "#3b82f6"}
                                  strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                                />
                                <line
                                  x1={startX - 75}
                                  y1={startY + svgHeight}
                                  x2={startX - 65}
                                  y2={startY + svgHeight}
                                  stroke={highlightedDimension === 'height' ? "#2563eb" : "#3b82f6"}
                                  strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                                />
                                <text
                                  x={startX - 85}
                                  y={startY + svgHeight / 2}
                                  textAnchor="middle"
                                  fill={highlightedDimension === 'height' ? "#1e40af" : "#2563eb"}
                                  fontSize="32"
                                  fontWeight="700"
                                  className="font-mono transition-all duration-300"
                                  transform={`rotate(-90 ${startX - 85} ${startY + svgHeight / 2})`}
                                >
                                  {height.toLocaleString()} mm
                                </text>
                                <text
                                  x={startX - 110}
                                  y={startY + svgHeight / 2}
                                  textAnchor="middle"
                                  fill={highlightedDimension === 'height' ? "#1e40af" : "#6b7280"}
                                  fontSize="12"
                                  fontWeight="700"
                                  letterSpacing="0.1em"
                                  className="transition-all duration-300"
                                  transform={`rotate(-90 ${startX - 110} ${startY + svgHeight / 2})`}
                                >
                                  HEIGHT
                                </text>
                              </g>

                              {/* Area Display - dynamic with more spacing */}
                              <g className="transition-opacity duration-300">
                                <rect
                                  x={startX + svgWidth - 200}
                                  y={startY + svgHeight + 45}
                                  width="190"
                                  height="60"
                                  fill="white"
                                  stroke="#1f2937"
                                  strokeWidth="2"
                                  rx="6"
                                  className="shadow-sm"
                                />
                                <text
                                  x={startX + svgWidth - 195}
                                  y={startY + svgHeight + 65}
                                  fill="#374151"
                                  fontSize="11"
                                  fontWeight="600"
                                  letterSpacing="0.05em"
                                >
                                  AREA
                                </text>
                                <text
                                  x={startX + svgWidth - 195}
                                  y={startY + svgHeight + 88}
                                  fill="#1f2937"
                                  fontSize="20"
                                  fontWeight="700"
                                  className="font-mono"
                                >
                                  {area.toFixed(2)} m²
                                </text>
                              </g>

                              {/* Scale indicator */}
                              <g>
                                <line
                                  x1={startX + 20}
                                  y1={startY + svgHeight + 30}
                                  x2={startX + 120}
                                  y2={startY + svgHeight + 30}
                                  stroke="#6b7280"
                                  strokeWidth="2"
                                />
                                <line
                                  x1={startX + 20}
                                  y1={startY + svgHeight + 25}
                                  x2={startX + 20}
                                  y2={startY + svgHeight + 35}
                                  stroke="#6b7280"
                                  strokeWidth="2"
                                />
                                <line
                                  x1={startX + 120}
                                  y1={startY + svgHeight + 25}
                                  x2={startX + 120}
                                  y2={startY + svgHeight + 35}
                                  stroke="#6b7280"
                                  strokeWidth="2"
                                />
                                <text
                                  x={startX + 70}
                                  y={startY + svgHeight + 50}
                                  textAnchor="middle"
                                  fill="#6b7280"
                                  fontSize="10"
                                  fontWeight="500"
                                >
                                  100mm scale
                                </text>
                              </g>
                            </g>
                          );
                        })()}
                      </svg>
                    </motion.div>
                  </div>
                </div>,
                document.body
              )
            ) : (
              // Normal View Mode
              <div
                className="w-full h-full flex items-center justify-center p-6 md:p-8 transition-all duration-300 relative"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: blueprintZoom }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full max-w-4xl"
                  style={{ transformOrigin: 'center' }}
                >
                  {/* Normal view SVG - same content as fullscreen */}
                  <svg
                    key={blueprintKey}
                    viewBox="0 0 1200 900"
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }}
                  >
                    {/* Background grid */}
                    <defs>
                      <pattern id="blueprint-grid-normal" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#d1d5db" strokeWidth="0.8" opacity="0.6" />
                      </pattern>
                      <pattern id="highlight-grid-normal" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.3" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#blueprint-grid-normal)" />
                    {highlightedDimension && (
                      <rect width="100%" height="100%" fill="url(#highlight-grid-normal)" opacity="0.5" />
                    )}

                    {/* ✅ PERFORMANCE: Use memoized blueprint calculations */}
                    {(() => {
                      const {
                        width,
                        height,
                        svgWidth,
                        svgHeight,
                        startX,
                        startY,
                        area,
                        currentGrid,
                        showGrid,
                        selectedPattern,
                        colWeights,
                        rowWeights,
                        totalColWeight,
                        totalRowWeight,
                      } = blueprintCalculations;

                      return (
                        <g>
                          {/* Window Frame */}
                          <rect
                            x={startX}
                            y={startY}
                            width={svgWidth}
                            height={svgHeight}
                            fill="none"
                            stroke={highlightedDimension ? "#2563eb" : "#1f2937"}
                            strokeWidth={highlightedDimension ? "4" : "3"}
                            className="transition-all duration-300"
                            style={{
                              strokeDasharray: highlightedDimension ? "8 4" : "none",
                              animation: highlightedDimension ? "pulse 2s ease-in-out infinite" : "none"
                            }}
                          />

                          {/* Vertical Mullions */}
                          {showGrid && currentGrid.cols > 1 && Array.from({ length: currentGrid.cols - 1 }, (_, i) => {
                            let xPos = startX;
                            for (let c = 0; c <= i; c++) {
                              xPos += (colWeights[c] / totalColWeight) * svgWidth;
                            }

                            const mullionSpec = selectedPattern?.mullions?.find(m => m.position === i);
                            const mullionWidth = mullionSpec?.width || 50;
                            const mullionType = mullionSpec?.type || 'standard';
                            const isStructural = mullionSpec?.reinforcement || mullionType === 'structural';

                            return (
                              <g key={`mullion-v-${i}-${blueprintKey}`}>
                                <line
                                  x1={xPos}
                                  y1={startY}
                                  x2={xPos}
                                  y2={startY + svgHeight}
                                  stroke={isStructural ? "#dc2626" : "#4b5563"}
                                  strokeWidth={isStructural ? "3" : "2.5"}
                                  strokeDasharray={isStructural ? "6 3" : "4 4"}
                                  opacity="0.7"
                                  className="transition-all duration-300"
                                />
                                {svgHeight > 200 && (
                                  <>
                                    <text
                                      x={xPos}
                                      y={startY + svgHeight / 2}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      fill={isStructural ? "#dc2626" : "#6b7280"}
                                      fontSize="10"
                                      fontWeight="600"
                                      transform={`rotate(-90 ${xPos} ${startY + svgHeight / 2})`}
                                      className="pointer-events-none select-none"
                                    >
                                      {mullionType.toUpperCase()} {mullionWidth}mm
                                      {isStructural && ' ⚙️'}
                                    </text>
                                    <g>
                                      <line
                                        x1={xPos - 25}
                                        y1={startY}
                                        x2={xPos - 25}
                                        y2={startY + svgHeight}
                                        stroke={isStructural ? "#dc2626" : "#6b7280"}
                                        strokeWidth="1.5"
                                        strokeDasharray="2 2"
                                        opacity="0.5"
                                      />
                                      <line
                                        x1={xPos - 30}
                                        y1={startY}
                                        x2={xPos - 20}
                                        y2={startY}
                                        stroke={isStructural ? "#dc2626" : "#6b7280"}
                                        strokeWidth="2"
                                      />
                                      <line
                                        x1={xPos - 30}
                                        y1={startY + svgHeight}
                                        x2={xPos - 20}
                                        y2={startY + svgHeight}
                                        stroke={isStructural ? "#dc2626" : "#6b7280"}
                                        strokeWidth="2"
                                      />
                                      <text
                                        x={xPos - 40}
                                        y={startY + svgHeight / 2}
                                        textAnchor="end"
                                        dominantBaseline="middle"
                                        fill={isStructural ? "#dc2626" : "#6b7280"}
                                        fontSize="11"
                                        fontWeight="700"
                                        className="pointer-events-none select-none font-mono"
                                      >
                                        {Math.round(height)}mm
                                      </text>
                                      <text
                                        x={xPos - 40}
                                        y={startY + svgHeight / 2 - 20}
                                        textAnchor="end"
                                        dominantBaseline="middle"
                                        fill={isStructural ? "#dc2626" : "#9ca3af"}
                                        fontSize="9"
                                        fontWeight="500"
                                        className="pointer-events-none select-none"
                                      >
                                        MULLION H
                                      </text>
                                    </g>
                                  </>
                                )}
                              </g>
                            );
                          })}

                          {/* Horizontal Transoms */}
                          {showGrid && currentGrid.rows > 1 && Array.from({ length: currentGrid.rows - 1 }, (_, i) => {
                            let yPos = startY;
                            for (let r = 0; r <= i; r++) {
                              yPos += (rowWeights[r] / totalRowWeight) * svgHeight;
                            }

                            const transomSpec = selectedPattern?.transoms?.find(t => t.position === i);
                            const transomHeight = transomSpec?.height || 50;
                            const transomType = transomSpec?.type || 'standard';
                            const isStructural = transomSpec?.reinforcement || transomType === 'structural';

                            return (
                              <g key={`transom-h-${i}-${blueprintKey}`}>
                                <line
                                  x1={startX}
                                  y1={yPos}
                                  x2={startX + svgWidth}
                                  y2={yPos}
                                  stroke={isStructural ? "#dc2626" : "#4b5563"}
                                  strokeWidth={isStructural ? "3" : "2.5"}
                                  strokeDasharray={isStructural ? "6 3" : "4 4"}
                                  opacity="0.7"
                                  className="transition-all duration-300"
                                />
                                {svgWidth > 300 && (
                                  <text
                                    x={startX + svgWidth / 2}
                                    y={yPos}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill={isStructural ? "#dc2626" : "#6b7280"}
                                    fontSize="10"
                                    fontWeight="600"
                                    className="pointer-events-none select-none"
                                  >
                                    {transomType.toUpperCase()} {transomHeight}mm
                                    {isStructural && ' ⚙️'}
                                  </text>
                                )}
                              </g>
                            );
                          })}

                          {/* Grid Cells */}
                          {showGrid && currentGrid.cells && currentGrid.cells.length > 0 && currentGrid.cells.map((cell) => {
                            const colWeights = currentGrid.colWidths && currentGrid.colWidths.length === currentGrid.cols
                              ? currentGrid.colWidths
                              : Array(currentGrid.cols).fill(1);
                            const rowWeights = currentGrid.rowHeights && currentGrid.rowHeights.length === currentGrid.rows
                              ? currentGrid.rowHeights
                              : Array(currentGrid.rows).fill(1);

                            const totalColWeight = colWeights.reduce((a, b) => a + b, 0);
                            const totalRowWeight = rowWeights.reduce((a, b) => a + b, 0);

                            let cellX = startX;
                            for (let c = 0; c < cell.col; c++) {
                              cellX += (colWeights[c] / totalColWeight) * svgWidth;
                            }

                            let cellY = startY;
                            for (let r = 0; r < cell.row; r++) {
                              cellY += (rowWeights[r] / totalRowWeight) * svgHeight;
                            }

                            const cellW = (colWeights[cell.col] / totalColWeight) * svgWidth;
                            const cellH = (rowWeights[cell.row] / totalRowWeight) * svgHeight;

                            const cellWidthMm = (cellW / svgWidth) * width;
                            const cellHeightMm = (cellH / svgHeight) * height;
                            const cellAreaM2 = (cellWidthMm * cellHeightMm) / 1_000_000;

                            const cellFill = {
                              'fixed': 'rgba(59, 130, 246, 0.1)',
                              'sash': 'rgba(34, 197, 94, 0.1)',
                              'sliding': 'rgba(234, 179, 8, 0.1)',
                              'panel': 'rgba(107, 114, 128, 0.1)',
                              'empty': 'rgba(239, 68, 68, 0.05)',
                            }[cell.type] || 'transparent';

                            const cellStroke = {
                              'fixed': '#3b82f6',
                              'sash': '#22c55e',
                              'sliding': '#eab308',
                              'panel': '#6b7280',
                              'empty': '#ef4444',
                            }[cell.type] || '#4b5563';

                            const openingArrow = cell.openingDirection === 'left' ? '←'
                              : cell.openingDirection === 'right' ? '→'
                                : cell.openingDirection === 'top' ? '↑'
                                  : cell.openingDirection === 'bottom' ? '↓'
                                    : '';

                            return (
                              <g key={`${cell.id}-${currentGrid.cols}-${currentGrid.rows}-${blueprintKey}`}>
                                <rect
                                  x={cellX}
                                  y={cellY}
                                  width={cellW}
                                  height={cellH}
                                  fill={cellFill}
                                  stroke={cellStroke}
                                  strokeWidth="1.5"
                                  opacity="0.6"
                                  className="transition-all duration-300"
                                />

                                {cellW > 80 && cellH > 50 && (
                                  <>
                                    <text
                                      x={cellX + cellW / 2}
                                      y={cellY + cellH / 2 - 15}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      fill={cellStroke}
                                      fontSize={Math.max(11, Math.min(cellW, cellH) * 0.12)}
                                      fontWeight="bold"
                                      opacity="0.9"
                                      className="pointer-events-none select-none"
                                    >
                                      {cell.type === 'sash' ? 'SASH' : cell.type.toUpperCase()}
                                      {openingArrow && ` ${openingArrow}`}
                                    </text>

                                    {cellW > 120 && cellH > 80 && (
                                      <text
                                        x={cellX + cellW / 2}
                                        y={cellY + cellH / 2 + 18}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="#6b7280"
                                        fontSize={Math.max(9, Math.min(cellW, cellH) * 0.08)}
                                        fontWeight="500"
                                        opacity="0.7"
                                        className="pointer-events-none select-none font-mono"
                                      >
                                        {Math.round(cellWidthMm)}×{Math.round(cellHeightMm)}mm
                                      </text>
                                    )}

                                    {cellW > 150 && cellH > 100 && cellAreaM2 > 0.5 && (
                                      <text
                                        x={cellX + cellW / 2}
                                        y={cellY + cellH / 2 + 35}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="#9ca3af"
                                        fontSize={Math.max(8, Math.min(cellW, cellH) * 0.07)}
                                        fontWeight="400"
                                        opacity="0.6"
                                        className="pointer-events-none select-none"
                                      >
                                        {cellAreaM2.toFixed(2)} m²
                                      </text>
                                    )}
                                  </>
                                )}
                              </g>
                            );
                          })}

                          {/* Corner markers */}
                          {[0, 1, 2, 3].map((corner) => {
                            const corners = [
                              { x: startX, y: startY },
                              { x: startX + svgWidth, y: startY },
                              { x: startX + svgWidth, y: startY + svgHeight },
                              { x: startX, y: startY + svgHeight }
                            ];
                            const c = corners[corner];
                            return (
                              <circle
                                key={corner}
                                cx={c.x}
                                cy={c.y}
                                r="4"
                                fill="#1f2937"
                                stroke="white"
                                strokeWidth="1.5"
                              />
                            );
                          })}

                          {/* Width Dimension Line */}
                          <g className="transition-all duration-300">
                            <line
                              x1={startX}
                              y1={startY - 70}
                              x2={startX + svgWidth}
                              y2={startY - 70}
                              stroke={highlightedDimension === 'width' ? "#2563eb" : "#3b82f6"}
                              strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                              className="transition-all duration-300"
                            />
                            <line
                              x1={startX}
                              y1={startY - 75}
                              x2={startX}
                              y2={startY - 65}
                              stroke={highlightedDimension === 'width' ? "#2563eb" : "#3b82f6"}
                              strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                            />
                            <line
                              x1={startX + svgWidth}
                              y1={startY - 75}
                              x2={startX + svgWidth}
                              y2={startY - 65}
                              stroke={highlightedDimension === 'width' ? "#2563eb" : "#3b82f6"}
                              strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                            />
                            <text
                              x={startX + svgWidth / 2}
                              y={startY - 85}
                              textAnchor="middle"
                              fill={highlightedDimension === 'width' ? "#1e40af" : "#2563eb"}
                              fontSize="32"
                              fontWeight="700"
                              className="font-mono transition-all duration-300"
                            >
                              {width.toLocaleString()} mm
                            </text>
                            <text
                              x={startX + svgWidth / 2}
                              y={startY - 110}
                              textAnchor="middle"
                              fill={highlightedDimension === 'width' ? "#1e40af" : "#6b7280"}
                              fontSize="12"
                              fontWeight="700"
                              letterSpacing="0.1em"
                              className="transition-all duration-300"
                            >
                              WIDTH
                            </text>
                          </g>

                          {/* Height Dimension Line */}
                          <g className="transition-all duration-300">
                            <line
                              x1={startX - 70}
                              y1={startY}
                              x2={startX - 70}
                              y2={startY + svgHeight}
                              stroke={highlightedDimension === 'height' ? "#2563eb" : "#3b82f6"}
                              strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                            />
                            <line
                              x1={startX - 75}
                              y1={startY}
                              x2={startX - 65}
                              y2={startY}
                              stroke={highlightedDimension === 'height' ? "#2563eb" : "#3b82f6"}
                              strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                            />
                            <line
                              x1={startX - 75}
                              y1={startY + svgHeight}
                              x2={startX - 65}
                              y2={startY + svgHeight}
                              stroke={highlightedDimension === 'height' ? "#2563eb" : "#3b82f6"}
                              strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                            />
                            <text
                              x={startX - 85}
                              y={startY + svgHeight / 2}
                              textAnchor="middle"
                              fill={highlightedDimension === 'height' ? "#1e40af" : "#2563eb"}
                              fontSize="32"
                              fontWeight="700"
                              className="font-mono transition-all duration-300"
                              transform={`rotate(-90 ${startX - 85} ${startY + svgHeight / 2})`}
                            >
                              {height.toLocaleString()} mm
                            </text>
                            <text
                              x={startX - 110}
                              y={startY + svgHeight / 2}
                              textAnchor="middle"
                              fill={highlightedDimension === 'height' ? "#1e40af" : "#6b7280"}
                              fontSize="12"
                              fontWeight="700"
                              letterSpacing="0.1em"
                              className="transition-all duration-300"
                              transform={`rotate(-90 ${startX - 110} ${startY + svgHeight / 2})`}
                            >
                              HEIGHT
                            </text>
                          </g>

                          {/* Area Display */}
                          <g className="transition-opacity duration-300">
                            <rect
                              x={startX + svgWidth - 200}
                              y={startY + svgHeight + 45}
                              width="190"
                              height="60"
                              fill="white"
                              stroke="#1f2937"
                              strokeWidth="2"
                              rx="6"
                              className="shadow-sm"
                            />
                            <text
                              x={startX + svgWidth - 195}
                              y={startY + svgHeight + 65}
                              fill="#374151"
                              fontSize="11"
                              fontWeight="600"
                              letterSpacing="0.05em"
                            >
                              AREA
                            </text>
                            <text
                              x={startX + svgWidth - 195}
                              y={startY + svgHeight + 88}
                              fill="#1f2937"
                              fontSize="20"
                              fontWeight="700"
                              className="font-mono"
                            >
                              {area.toFixed(2)} m²
                            </text>
                          </g>

                          {/* Scale indicator */}
                          <g>
                            <line
                              x1={startX + 20}
                              y1={startY + svgHeight + 30}
                              x2={startX + 120}
                              y2={startY + svgHeight + 30}
                              stroke="#6b7280"
                              strokeWidth="2"
                            />
                            <line
                              x1={startX + 20}
                              y1={startY + svgHeight + 25}
                              x2={startX + 20}
                              y2={startY + svgHeight + 35}
                              stroke="#6b7280"
                              strokeWidth="2"
                            />
                            <line
                              x1={startX + 120}
                              y1={startY + svgHeight + 25}
                              x2={startX + 120}
                              y2={startY + svgHeight + 35}
                              stroke="#6b7280"
                              strokeWidth="2"
                            />
                            <text
                              x={startX + 70}
                              y={startY + svgHeight + 50}
                              textAnchor="middle"
                              fill="#6b7280"
                              fontSize="10"
                              fontWeight="500"
                            >
                              100mm scale
                            </text>
                          </g>
                        </g>
                      );
                    })()}
                  </svg>
                </motion.div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-4"
            >
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border-2 border-blue-200">
                <Ruler className="h-10 w-10 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Enter dimensions to preview</p>
                <p className="text-xs text-gray-500">Width and height will appear here in real-time</p>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <SystemTuningStudio
        open={showTuningStudio}
        onClose={() => setShowTuningStudio(false)}
        initialSystem={tuningInitialSystem}
        onSave={(customPack) => {
          const updated = addCustomSystem(customPack);
          setCustomSystems(updated);
          setSelectedSystemPackId(customPack.meta?.id);
          setShowTuningStudio(false);
        }}
      />

      {/* 3D Preview Modal */}
      <Dialog open={show3DPreview} onOpenChange={setShow3DPreview}>
        <DialogContent className="max-w-[95vw] h-[90vh] bg-slate-950/95 backdrop-blur-xl border-amber-500/20 p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 border-b border-white/10 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Box className="w-5 h-5" />
              <span>Standard Cairo 3D Preview</span>
              {previewWindowUnit && (
                <span className="ml-auto text-xs font-mono text-slate-400">
                  {previewWindowUnit.overallWidth}x{previewWindowUnit.overallHeight}mm
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="hidden">
              3D Visualization of the window unit.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full h-full relative bg-black/50">
            {previewWindowUnit ? (
              <Enhanced3DPreview windowUnit={previewWindowUnit} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                <Ruler className="w-12 h-12 text-slate-600" />
                <p>Please enter dimensions to generate 3D preview</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

