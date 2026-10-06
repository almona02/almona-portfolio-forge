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
import { cn } from '@/lib/utils';
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

// Workshop dark-amber blueprint theme (matches Fabricator shell)
const DEFAULT_THEME = {
  stroke: {
    primary: 'var(--blueprint-stroke-primary, #fbbf24)',
    secondary: 'var(--blueprint-stroke-secondary, #d97706)',
    highlight: 'var(--blueprint-stroke-highlight, #fcd34d)',
    highlightActive: 'var(--blueprint-stroke-highlight-active, #f59e0b)',
    structural: 'var(--blueprint-stroke-structural, #f87171)',
    grid: 'var(--blueprint-stroke-grid, rgba(245, 158, 11, 0.18))',
    marker: 'var(--blueprint-stroke-marker, #0a0a0a)',
  },
  fill: {
    fixed: 'var(--blueprint-fill-fixed, rgba(59, 130, 246, 0.22))',
    sash: 'var(--blueprint-fill-sash, rgba(34, 197, 94, 0.22))',
    sliding: 'var(--blueprint-fill-sliding, rgba(245, 158, 11, 0.28))',
    panel: 'var(--blueprint-fill-panel, rgba(148, 163, 184, 0.18))',
    empty: 'var(--blueprint-fill-empty, rgba(239, 68, 68, 0.12))',
    highlight: 'var(--blueprint-fill-highlight, rgba(251, 191, 36, 0.12))',
  },
  text: {
    primary: 'var(--blueprint-text-primary, #fef3c7)',
    secondary: 'var(--blueprint-text-secondary, #a8a29e)',
    highlight: 'var(--blueprint-text-highlight, #fbbf24)',
    structural: 'var(--blueprint-text-structural, #fca5a5)',
  },
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
  /** Save current pose measures then start the next pose in this project. */
  onSaveAndNextPose?: (data: MeasurementData) => void;
  /** Seed width/height and location fields from a stored pose. */
  initialData?: Partial<MeasurementData> | null;
  /** Optional preselected system pack ID, typically from NewProjectWizard */
  systemPackId?: string;
  /** Optional region hint from project header to filter system packs (e.g. 'egypt') */
  region?: 'egypt' | 'turkey' | 'mena' | 'gulf' | 'global';
  poseLabel?: string;
}

export const SmartMeasuringInterface: React.FC<SmartMeasuringInterfaceProps> = ({
  onMeasurementComplete,
  onSaveAndNextPose,
  initialData,
  systemPackId,
  region,
  poseLabel,
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
    width: String(initialData?.width ?? DEFAULT_MEASUREMENTS.DEFAULT_WIDTH_MM),
    height: String(initialData?.height ?? DEFAULT_MEASUREMENTS.DEFAULT_HEIGHT_MM),
    measurementMode: initialData?.measurementMode ?? 'hole', // 'hole' (rough opening) or 'manufacturing'
    wallDeduction: String(initialData?.wallDeduction ?? DEFAULT_MEASUREMENTS.DEFAULT_WALL_DEDUCTION_MM), // mm deduction for wall tolerance
    windowType: !initialData?.windowType || initialData.windowType === 'window' ? 'sliding_window_2sash' : initialData.windowType, // Default to 2-sash sliding window (matches SelectItem value)
    color: initialData?.color || egyptianDefaults.color,
    glazingType: initialData?.glazingType || egyptianDefaults.glazingType || 'double', // Ensure glazingType has a default value
    glassColor: initialData?.glassColor || egyptianDefaults.glassColor || 'clear', // Default to 'clear' (first option) - selected by default
    flyScreenType: initialData?.flyScreenType || 'none', // Default to 'none' to avoid empty string in Select
    flatNumber: initialData?.flatNumber || '', // Text input - OK
    buildingBlock: initialData?.buildingBlock || '', // Text input - OK
    floor: initialData?.floor || '', // Text input - OK
    unitOrApartment: initialData?.unitOrApartment || '', // Text input - OK
    elevation: initialData?.elevation || '', // Text input - OK
    roomOrZone: initialData?.roomOrZone || '', // Text input - OK
    windowIndex: initialData?.windowIndex || '', // Text input - OK
    remarks: initialData?.remarks || '', // Text input - OK
  });

  // Grid State for Phase 4 — empty `{}` from savePose must not count as authoritative
  const seededGrid = initialData?.grid;
  const hasAuthoritativeGrid = Boolean(
    seededGrid
    && Number(seededGrid.cols) > 0
    && Number(seededGrid.rows) > 0
    && Array.isArray(seededGrid.cells),
  );
  const [grid, setGrid] = useState<WindowGrid>(() => (
    hasAuthoritativeGrid && seededGrid
      ? {
          ...seededGrid,
          cells: seededGrid.cells ?? [],
          colWidths: seededGrid.colWidths,
          rowHeights: seededGrid.rowHeights,
        }
      : {
          rows: DEFAULT_GRID.DEFAULT_ROWS,
          cols: DEFAULT_GRID.DEFAULT_COLS,
          cells: [{ id: DEFAULT_GRID.DEFAULT_CELL_ID, row: 0, col: 0, type: 'fixed' as const }],
        }
  ));

  const [isGridLocked, setIsGridLocked] = useState(hasAuthoritativeGrid);

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

  const [isGridMode, setIsGridMode] = useState(hasAuthoritativeGrid);
  const [isSystemPackCollapsed, setIsSystemPackCollapsed] = useState(false);
  /** When true, user opened the panel — stay open until they hide it (no auto-collapse). */
  const [systemPackPinnedOpen, setSystemPackPinnedOpen] = useState(false);
  /** Opening layout panel — open on desktop, compact closed bar on small screens. */
  const [layoutPanelOpen, setLayoutPanelOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );

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
  /** Skip system step when pack already chosen (typical after project create). */
  const [currentStep, setCurrentStep] = useState(() => (systemPackId ? 1 : 0));
  const [selectedPatternId, setSelectedPatternId] = useState<string>(initialData?.presetId ?? ''); // Empty string is OK here - not used in Select value
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

  // Workshop steps — short labels for daily measuring
  const STEPS = [
    { id: 'system', title: t('smart_measuring.steps.system', 'System'), short: 'System', icon: Factory },
    { id: 'dimensions', title: t('smart_measuring.steps.dimensions', 'Size'), short: 'Size', icon: Ruler },
    { id: 'specs', title: t('smart_measuring.steps.specs', 'Glass'), short: 'Glass', icon: Box },
    { id: 'location', title: t('smart_measuring.steps.location', 'Location'), short: 'Place', icon: CheckCircle2 },
    { id: 'verify', title: t('smart_measuring.steps.verify', 'Confirm'), short: 'Confirm', icon: ShieldCheck },
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
    if (!grid || !(Number(grid.cols) > 0) || !(Number(grid.rows) > 0)) {
      return `blueprint-no-grid-${isGridMode}`;
    }
    // Include all grid properties to ensure reactivity
    const gridHash = JSON.stringify({
      cols: grid.cols,
      rows: grid.rows,
      cells: (grid.cells ?? []).map(c => ({ id: c.id, row: c.row, col: c.col, type: c.type })),
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
    const showGrid = Boolean(currentGrid && currentGrid.cols > 0 && currentGrid.rows > 0);
    const selectedPattern: EgyptianPattern | undefined = selectedPatternId
      ? EGYPTIAN_PATTERNS.find(p => p.id === selectedPatternId)
      : undefined;

    const safeCols = showGrid ? currentGrid.cols : 1;
    const safeRows = showGrid ? currentGrid.rows : 1;
    const colWeights = showGrid && currentGrid.colWidths && currentGrid.colWidths.length === currentGrid.cols
      ? currentGrid.colWidths
      : Array(safeCols).fill(1);
    const rowWeights = showGrid && currentGrid.rowHeights && currentGrid.rowHeights.length === currentGrid.rows
      ? currentGrid.rowHeights
      : Array(safeRows).fill(1);

    const totalColWeight = colWeights.reduce((a, b) => a + b, 0) || 1;
    const totalRowWeight = rowWeights.reduce((a, b) => a + b, 0) || 1;

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

  const handleInputChange = (field: string, value: string) => {
    // These selects have no empty option. Ignore transient native-select reset
    // events during animated step unmounts so saved choices remain intact.
    if (value === '' && ['windowType', 'glazingType', 'glassColor', 'color', 'flyScreenType', 'measurementMode'].includes(field)) return;
    // Clear field error immediately when user starts typing (no debounce for UX)
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    setMeasurements(prev => ({ ...prev, [field]: value }));
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

  const selectedProfileCount = useMemo(
    () =>
      systemPackRoleOptions.filter(
        (role) => Boolean(systemProfileSelections[role.id as keyof SystemProfileSelections]),
      ).length,
    [systemPackRoleOptions, systemProfileSelections],
  );

  const profilesComplete =
    systemPackRoleOptions.length === 0 || selectedProfileCount === systemPackRoleOptions.length;

  // Catalog defaults: when a role has a single option, select it (ROCK 60).
  useEffect(() => {
    if (systemPackRoleOptions.length === 0) return;
    setSystemProfileSelections((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const role of systemPackRoleOptions) {
        const key = role.id as keyof SystemProfileSelections;
        if (!next[key] && role.options.length === 1) {
          next[key] = role.options[0].code;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [systemPackRoleOptions, selectedSystemPackId]);

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

  const handleSubmit = (nextPose = false) => {
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
      setCurrentStep(1);
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
    if (nextPose && onSaveAndNextPose) {
      onSaveAndNextPose(payload);
    } else if (onMeasurementComplete) {
      onMeasurementComplete(payload);
    } else {
      trackError('SmartMeasuringInterface', 'measurement_complete', 'onMeasurementComplete callback is missing');
    }
  };

  // Initial peek: auto-hide after 1s. Manual open stays until user clicks Hide.
  useEffect(() => {
    if (!selectedSystemPackId || isSystemPackCollapsed || systemPackPinnedOpen) return;
    const timer = setTimeout(() => {
      setIsSystemPackCollapsed(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [selectedSystemPackId, isSystemPackCollapsed, systemPackPinnedOpen]);

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

      {/* System pack — capped height + internal scroll so measuring stays usable on all screens */}
      <div
        className={cn(
          'w-full rounded-lg border border-amber-600/25 bg-slate-950/80 overflow-hidden flex flex-col shrink-0',
          !isSystemPackCollapsed && 'max-h-[min(70vh,520px)]',
        )}
      >
        {!isSystemPackCollapsed && (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2 border-b border-amber-600/25 bg-slate-950/95 backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Factory className="h-4 w-4 text-amber-500 shrink-0" />
              <h3 className="text-sm font-semibold text-amber-200 truncate">Change system</h3>
              {activeSystemPack && (
                <Badge className="bg-amber-500/15 text-amber-200 border-amber-500/35 shrink-0 text-[10px] max-w-[40%] truncate">
                  {activeSystemPack.meta.name}
                </Badge>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSystemPackPinnedOpen(false);
                setIsSystemPackCollapsed(true);
              }}
              className="h-8 text-amber-400 hover:text-amber-300 shrink-0 px-2"
              aria-label="Hide system picker"
            >
              <ChevronUp className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Hide</span>
            </Button>
          </div>
        )}

        {!isSystemPackCollapsed ? (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                Packs — swipe on phone, scroll on desktop
              </p>
              <PrestigeSystemPackSelector
                selectedSystemId={selectedSystemPackId}
                packs={availableSystemPacks}
                onSelect={(value) => {
                  if (value === 'custom') {
                    const currentPack = availableSystemPacks.find((p) => p.meta.id === selectedSystemPackId);
                    setTuningInitialSystem(currentPack || null);
                    setShowTuningStudio(true);
                    return;
                  }
                  setSelectedSystemPackId(value);
                }}
                allowedSystemIds={availableSystemPacks.map((p) => p.meta.id)}
                showPatternCount
              />
            </div>

            {systemPackRoleOptions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {systemPackRoleOptions.map((role) => {
                  const fieldKey = `systemProfile.${role.id}`;
                  const error = getFieldError(fieldKey);
                  const value = (systemProfileSelections[role.id as keyof SystemProfileSelections] as string) || undefined;

                  return (
                    <div key={role.id} className="space-y-1 min-w-0">
                      <Label className="text-[11px] text-slate-400">{role.label}</Label>
                      <Select
                        value={value}
                        onValueChange={(code) =>
                          handleSystemProfileChange(role.id as keyof SystemProfileSelections, code)
                        }
                      >
                        <SelectTrigger
                          className={`bg-slate-900/80 border-slate-700/60 h-9 text-xs text-slate-100 ${
                            error ? 'border-red-500' : ''
                          }`}
                        >
                          <SelectValue placeholder={`Select ${role.label}`} />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 max-h-[40vh]">
                          {role.options.map((opt) => (
                            <SelectItem
                              key={opt.code}
                              value={opt.code}
                              className="text-xs focus:bg-slate-800 focus:text-amber-300"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {error && <p className="text-xs text-red-400">{error}</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedSystemPackId?.startsWith('custom') && (
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-3">
                <CustomSystemManager
                  systemId={selectedSystemPackId}
                  systemName={availableSystemPacks.find((p) => p.meta.id === selectedSystemPackId)?.meta.name || 'Custom System'}
                  onDelete={refreshCustomSystems}
                  onArchive={refreshCustomSystems}
                  onDuplicate={refreshCustomSystems}
                  onEdit={() => {
                    const currentPack = availableSystemPacks.find((p) => p.meta.id === selectedSystemPackId);
                    setTuningInitialSystem((currentPack as StoredSystemPack) || null);
                    setShowTuningStudio(true);
                  }}
                />
              </div>
            )}

            {!profilesComplete && systemPackRoleOptions.length > 0 && (
              <p className="text-xs text-amber-300/90">
                Profiles {selectedProfileCount}/{systemPackRoleOptions.length} — finish before production.
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSystemPackPinnedOpen(true);
              setIsSystemPackCollapsed(false);
            }}
            className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-amber-500/5"
            aria-label="Show system picker"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Factory className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm text-amber-200 truncate">
                {activeSystemPack?.meta.name || 'No system selected'}
              </span>
              {systemPackRoleOptions.length > 0 && (
                <span
                  className={`text-xs shrink-0 ${
                    profilesComplete ? 'text-emerald-400/80' : 'text-amber-400'
                  }`}
                >
                  ({selectedProfileCount}/{systemPackRoleOptions.length})
                </span>
              )}
            </div>
            <span className="flex items-center gap-1 text-xs text-amber-400 shrink-0 ml-2">
              Change
              <ChevronDown className="h-3.5 w-3.5" />
            </span>
          </button>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:grid-rows-[minmax(280px,auto)_minmax(0,1fr)]">
      {/* Opening layout — daily workshop preview + edit (alongside guided form) */}
      {selectedSystemPackId && (() => {
        const layoutW = Math.max(1, Number(measurements.width) || 1000);
        const layoutH = Math.max(1, Number(measurements.height) || 1000);
        const layoutCols = Number(grid?.cols) > 0 ? Number(grid.cols) : 1;
        const layoutRows = Number(grid?.rows) > 0 ? Number(grid.rows) : 1;
        const cellCount = Array.isArray(grid?.cells) ? grid.cells.length : 0;
        return (
        <div className={`order-2 w-full card-glass-dark rounded-lg overflow-hidden flex flex-col lg:col-start-2 lg:row-start-1 ${layoutPanelOpen ? 'min-h-[280px] lg:min-h-[360px]' : ''}`}>
          <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 border-b-2 border-amber-600/30 flex-shrink-0">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left rounded-md hover:bg-amber-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
              onClick={() => setLayoutPanelOpen((open) => !open)}
              aria-expanded={layoutPanelOpen}
              aria-label={layoutPanelOpen ? 'Hide opening layout' : 'Show opening layout'}
            >
              <Grid3X3 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-amber-200 truncate">
                  Opening layout
                </h3>
                <p className="truncate font-mono text-[11px] text-slate-500">
                  {Math.round(layoutW)} × {Math.round(layoutH)} mm · {layoutCols}×{layoutRows}
                  {cellCount > 0 ? ` · ${cellCount} pane${cellCount === 1 ? '' : 's'}` : ''}
                  {isGridLocked ? ' · locked' : ' · auto'}
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-amber-500/80 transition-transform lg:hidden ${layoutPanelOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            <Button
              type="button"
              size="sm"
              variant={isGridLocked ? 'secondary' : 'outline'}
              className={`h-8 shrink-0 text-xs ${
                isGridLocked
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border-transparent'
                  : 'border-amber-600/40 text-amber-100 hover:bg-amber-500/10'
              }`}
              onClick={() => setIsGridLocked((locked) => !locked)}
              title={
                isGridLocked
                  ? 'Layout is locked — size changes will not rewrite panes'
                  : 'Auto layout may update panes when width/height change'
              }
            >
              {isGridLocked ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  Locked
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Auto
                </>
              )}
            </Button>
          </div>

          {layoutPanelOpen && (
            <div className="relative flex-1 min-h-0 flex flex-col">
              {!isGridLocked && predictionReason && (
                <div className="px-3 py-1.5 border-b border-amber-600/20 bg-amber-950/40 text-[11px] text-amber-100/90 flex items-start gap-2">
                  <Sparkles className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                  <span className="min-w-0 leading-snug">{predictionReason}</span>
                  <button
                    type="button"
                    className="shrink-0 text-amber-300/80 hover:text-amber-200 underline-offset-2 hover:underline"
                    onClick={() => setIsGridLocked(true)}
                  >
                    Keep this
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-auto p-2 sm:p-3 min-h-[220px]">
                <SmartDrawCanvas
                  width={layoutW}
                  height={layoutH}
                  grid={grid}
                  onGridChange={(next) => {
                    setGrid(next);
                    setIsGridMode(true);
                  }}
                  className="btn-secondary-dark w-full"
                  availablePatterns={availablePatterns}
                  selectedPatternId={selectedPatternId}
                  onPatternSelect={(val) => {
                    setSelectedPatternId(val || '');
                    setIsGridMode(true);
                    if (val) setIsGridLocked(true);
                  }}
                  systemPackId={selectedSystemPackId}
                />
              </div>
              <p className="px-3 py-1.5 text-[10px] text-slate-500 border-t border-amber-600/15 shrink-0">
                Tap a pane to set fixed / sash / sliding. Use Locked so size edits do not rewrite your layout.
              </p>
            </div>
          )}
        </div>
        );
      })()}

      {/* Left Panel: Guided measuring form */}
      <div className="order-1 w-full flex flex-col card-glass-dark rounded-lg overflow-hidden min-h-0 bg-slate-950/80 lg:col-start-1 lg:row-start-1 lg:row-span-2">
        <div className="flex-shrink-0 border-b border-amber-600/25 px-2 pt-2 pb-2 sm:px-3">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <h2 className="text-sm font-semibold text-amber-200 truncate">
              {STEPS[currentStep].title}
              {poseLabel ? (
                <span className="ml-2 font-normal text-slate-500">{poseLabel}</span>
              ) : null}
            </h2>
            <span className="shrink-0 font-mono text-[11px] text-amber-300/90 tabular-nums">
              {Math.round(Number(measurements.width) || 0)} × {Math.round(Number(measurements.height) || 0)} mm
            </span>
          </div>
          <nav aria-label="Measuring steps" className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
            {STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const active = idx === currentStep;
              const done = idx < currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`flex items-center gap-1 shrink-0 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-amber-500/20 text-amber-100 border border-amber-500/50'
                      : done
                        ? 'text-emerald-300/90 border border-transparent hover:bg-amber-500/10'
                        : 'text-slate-500 border border-transparent hover:bg-slate-800/80 hover:text-slate-300'
                  }`}
                  aria-current={active ? 'step' : undefined}
                >
                  {done && !active ? (
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                  ) : (
                    <StepIcon className="h-3 w-3" aria-hidden />
                  )}
                  <span>{step.short}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Form Content Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 relative min-h-0">
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
              {/* STEP 1: System checklist (pack selector lives in top bar) */}
              {currentStep === 0 && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-amber-600/30 bg-slate-950/60 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-amber-200">System check</span>
                      <Badge
                        className={
                          profilesComplete
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                        }
                      >
                        {profilesComplete ? 'Ready' : 'Needs profiles'}
                      </Badge>
                    </div>
                    <ul className="space-y-1.5 text-sm text-slate-300">
                      <li className="flex items-center gap-2">
                        {selectedSystemPackId ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Factory className="h-4 w-4 text-amber-400 shrink-0" />
                        )}
                        <span className="truncate">{activeSystemPack?.meta.name || 'No pack selected'}</span>
                      </li>
                      {systemPackRoleOptions.map((role) => {
                        const code = systemProfileSelections[role.id as keyof SystemProfileSelections];
                        return (
                          <li key={role.id} className="flex items-center gap-2">
                            {code ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Box className="h-4 w-4 text-amber-400 shrink-0" />
                            )}
                            <span className="truncate">{role.label}: {code || '—'}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full border-amber-500/50 text-amber-100"
                      onClick={() => {
                        setSystemPackPinnedOpen(true);
                        setIsSystemPackCollapsed(false);
                      }}
                    >
                      {profilesComplete ? 'Change system' : 'Choose profiles'}
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: Dimensions & Layout */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-600/30 bg-slate-950/50 px-3 py-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Cut size</span>
                    <span className="font-mono text-lg font-semibold text-amber-200 tabular-nums">
                      {Math.round(Number(measurements.width) || 0)} × {Math.round(Number(measurements.height) || 0)} mm
                    </span>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      {((Number(measurements.width || 0) * Number(measurements.height || 0)) / 1_000_000).toFixed(2)} m²
                    </span>
                  </div>

                  {availablePatterns.length > 0 && (
                    <div className="rounded-lg border border-amber-600/25 bg-slate-950/50 p-2.5 sm:p-3">
                      <EgyptianPatternSelector
                        selectedPatternId={selectedPatternId || undefined}
                        onSelect={(patternId, nextGrid) => {
                          setSelectedPatternId(patternId);
                          setGrid(nextGrid);
                          setIsGridMode(true);
                          setIsGridLocked(true);
                        }}
                        onClear={() => {
                          setSelectedPatternId('');
                        }}
                        currentSystemId={selectedSystemPackId}
                      />
                    </div>
                  )}

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
                        <span>{t('smart_measuring.dimensions.grid_mode', 'Multi-pane layout')}</span>
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
                          {t('smart_measuring.dimensions.grid_description', 'Define rows and columns for multi-pane openings. Edit panes in Opening layout (tap panes: fixed / sash / sliding).')}
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
                          <SelectItem value="blue_reflective" className="btn-secondary">Blue reflective</SelectItem>
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
                        <SelectItem value="Anthracite Grey" className="btn-secondary">Anthracite Grey</SelectItem>
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

              {/* STEP 5: Confirm cut size before save */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-600/30 bg-slate-950/60 p-3 space-y-3">
                    <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-500" />
                      Check cut size
                    </h3>
                    <p className="text-xs text-slate-400">
                      Confirm these millimetres match the site or shop drawing before saving.
                    </p>
                    <div className="space-y-2 text-sm">
                      {(() => {
                        const rawWidth = Number(measurements.width || 0);
                        const rawHeight = Number(measurements.height || 0);
                        const deduction = Number(measurements.wallDeduction || 0);
                        const isHoleMode = measurements.measurementMode === 'hole';
                        const manufacturingWidth = isHoleMode ? rawWidth - deduction : rawWidth;
                        const manufacturingHeight = isHoleMode ? rawHeight - deduction : rawHeight;
                        return (
                          <>
                            <div className="flex justify-between gap-2">
                              <span className="text-slate-500">Entered</span>
                              <span className="font-mono text-amber-100 tabular-nums">{rawWidth} × {rawHeight} mm</span>
                            </div>
                            <div className="flex justify-between gap-2">
                              <span className="text-slate-500">Mode</span>
                              <span className="text-slate-300">{isHoleMode ? `Hole (−${deduction} mm)` : 'Manufacturing'}</span>
                            </div>
                            <div className="flex justify-between gap-2 border-t border-amber-600/20 pt-2 font-semibold">
                              <span className="text-amber-200">Cut size</span>
                              <span className="font-mono text-amber-100 tabular-nums text-base">
                                {Math.max(0, manufacturingWidth).toFixed(0)} × {Math.max(0, manufacturingHeight).toFixed(0)} mm
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-lg border border-amber-600/25 bg-slate-950/40 p-3 cursor-pointer">
                    <Checkbox
                      id="verify"
                      checked={verificationConfirmed as boolean}
                      onCheckedChange={setVerificationConfirmed}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-amber-100/90 leading-snug">
                      I checked the cut size against the opening / drawing.
                    </span>
                  </label>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="p-2.5 sm:p-3 border-t border-amber-600/25 flex flex-col sm:flex-row justify-between gap-2 flex-shrink-0 bg-slate-950/90">
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
                onClick={() => handleSubmit(false)}
                disabled={!verificationConfirmed}
                className={`
                  transition-all duration-300 w-full sm:w-auto
                  ${verificationConfirmed
                    ? 'btn-primary-gradient'
                    : 'bg-[#1a1a1a] text-amber-600/50 cursor-not-allowed border-2 border-amber-600/20'}
                `}
              >
                {t('smart_measuring.actions.complete', 'Save Pose & Design')} <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
              {onSaveAndNextPose && (
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={!verificationConfirmed}
                  variant="secondary"
                  className="bg-cyan-500 text-slate-900 hover:bg-cyan-400 font-semibold w-full sm:w-auto"
                >
                  {t('engineering_bay.save_and_next', 'Save & Next Pose')}
                </Button>
              )}
            </div>
          ) : (
            <Button onClick={nextStep} className="btn-primary-gradient font-bold w-full sm:w-auto">
              {t('smart_measuring.actions.next', 'Next')} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Right Panel: Measurement blueprint (dark amber, matches studio) */}
      <div className="order-3 w-full rounded-lg border border-amber-600/30 bg-slate-950 relative overflow-hidden min-h-[280px] sm:min-h-[360px] lg:min-h-[420px] min-w-0 flex flex-col lg:col-start-2 lg:row-start-2">
        {/* Header with Zoom Controls */}
        <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <Badge className="bg-amber-500/15 text-amber-200 border-amber-500/40 font-medium text-xs px-2 sm:px-2.5 py-1 w-fit">
            <Ruler className="h-3 w-3 mr-1 sm:mr-1.5" />
            <span className="hidden sm:inline">Cut preview</span>
            <span className="sm:hidden">Preview</span>
          </Badge>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {activeSystemPack && (
              <div className="text-[11px] text-amber-100/90 bg-slate-900/90 backdrop-blur px-2 py-1 rounded-md border border-amber-600/30 max-w-[9rem] truncate">
                <span className="font-medium">{activeSystemPack.meta.name}</span>
              </div>
            )}
            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 bg-slate-900/90 backdrop-blur rounded-md border border-amber-600/30 p-0.5 sm:p-1">
              <button
                type="button"
                onClick={() => setHighContrast(!highContrast)}
                className={`p-1.5 rounded transition-colors ${highContrast ? 'bg-amber-500 text-slate-950' : 'hover:bg-amber-500/15 text-slate-400'}`}
                title={highContrast ? 'Disable High Contrast' : 'Enable High Contrast'}
                aria-label={highContrast ? 'Disable High Contrast' : 'Enable High Contrast'}
                aria-pressed={highContrast}
              >
                <Contrast className="h-4 w-4" />
              </button>
              <div className="w-px h-4 bg-amber-600/30 mx-0.5" />
              <button
                type="button"
                onClick={() => setBlueprintZoom(prev => Math.max(0.5, prev - 0.1))}
                className="p-1.5 hover:bg-amber-500/15 rounded transition-colors text-slate-300"
                title="Zoom Out (Ctrl + Scroll Down)"
                aria-label="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span
                className={`text-xs font-mono min-w-[2.75rem] text-center tabular-nums ${
                  blueprintZoom !== 1
                    ? 'text-amber-300 font-semibold bg-amber-500/15 rounded px-1.5 py-0.5'
                    : 'text-slate-400'
                }`}
                title={blueprintZoom !== 1 ? 'Press Escape to reset to 100%' : 'Zoom Level'}
              >
                {Math.round(blueprintZoom * 100)}%
              </span>

              <button
                type="button"
                onClick={() => setBlueprintZoom(prev => Math.min(2.0, prev + 0.1))}
                className="p-1.5 hover:bg-amber-500/15 rounded transition-colors text-slate-300"
                title="Zoom In (Ctrl + Scroll Up)"
                aria-label="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setBlueprintZoom(1);
                  if (blueprintFullscreen) {
                    setBlueprintFullscreen(false);
                  }
                }}
                className={`p-1.5 rounded transition-colors ${
                  blueprintZoom !== 1
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'hover:bg-amber-500/15 text-slate-400'
                }`}
                title={blueprintZoom !== 1 ? 'Reset to 100% (Escape)' : 'Reset Zoom (currently at 100%)'}
                aria-label="Reset Zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              {blueprintZoom !== 1 && (
                <span className="text-[10px] text-amber-300/90 font-medium px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/30">
                  ESC
                </span>
              )}
              <div className="w-px h-4 bg-amber-600/30 mx-0.5" />
              <button
                type="button"
                onClick={() => setShow3DPreview(true)}
                className="p-1.5 hover:bg-amber-500/20 text-amber-300 rounded transition-colors flex items-center gap-1"
                title="Open 3D Preview"
              >
                <Box className="h-4 w-4" />
                <span className="text-xs font-semibold hidden sm:inline">3D</span>
              </button>
              <button
                type="button"
                onClick={() => setBlueprintFullscreen(!blueprintFullscreen)}
                className="p-1.5 hover:bg-amber-500/15 rounded transition-colors text-slate-300"
                title={blueprintFullscreen ? 'Exit Fullscreen (Escape)' : 'Fullscreen Preview'}
                aria-label={blueprintFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
              >
                {blueprintFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
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
                <div className="fixed inset-0 z-[9999] bg-slate-950 overflow-auto">
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
                  <div className="w-full h-full flex items-center justify-center p-4 pt-16 md:p-6 md:pt-16">
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
                      >
                        {/* Background grid - more visible and dynamic */}
                        <defs>
                          <pattern id="blueprint-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(245,158,11,0.18)" strokeWidth="0.8" />
                          </pattern>
                          {/* Highlight pattern for active dimension */}
                          <pattern id="highlight-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.35" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="#0a0a0a" />
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
                                            fill={isStructural ? BLUEPRINT_THEME.text.structural : typeof BLUEPRINT_THEME.text.secondary === 'string' ? '#a8a29e' : '#a8a29e'}
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
                                          y={cellY + cellH / 2 - 28}
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
                                            y={cellY + cellH / 2 + 24}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill="#a8a29e"
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
                                            y={cellY + cellH / 2 + 56}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill="#78716c"
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
                                    fill="#fef3c7"
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
                                  stroke={highlightedDimension === 'width' ? "#fbbf24" : "#f59e0b"}
                                  strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                                  className="transition-all duration-300"
                                />
                                <line
                                  x1={startX}
                                  y1={startY - 75}
                                  x2={startX}
                                  y2={startY - 65}
                                  stroke={highlightedDimension === 'width' ? "#fbbf24" : "#f59e0b"}
                                  strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                                />
                                <line
                                  x1={startX + svgWidth}
                                  y1={startY - 75}
                                  x2={startX + svgWidth}
                                  y2={startY - 65}
                                  stroke={highlightedDimension === 'width' ? "#fbbf24" : "#f59e0b"}
                                  strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                                />
                                <text
                                  x={startX + svgWidth / 2}
                                  y={startY - 85}
                                  textAnchor="middle"
                                  fill={highlightedDimension === 'width' ? "#fcd34d" : "#fbbf24"}
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
                                  fill={highlightedDimension === 'width' ? "#fcd34d" : "#a8a29e"}
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
                                  stroke={highlightedDimension === 'height' ? "#fbbf24" : "#f59e0b"}
                                  strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                                />
                                <line
                                  x1={startX - 75}
                                  y1={startY}
                                  x2={startX - 65}
                                  y2={startY}
                                  stroke={highlightedDimension === 'height' ? "#fbbf24" : "#f59e0b"}
                                  strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                                />
                                <line
                                  x1={startX - 75}
                                  y1={startY + svgHeight}
                                  x2={startX - 65}
                                  y2={startY + svgHeight}
                                  stroke={highlightedDimension === 'height' ? "#fbbf24" : "#f59e0b"}
                                  strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                                />
                                <text
                                  x={startX - 85}
                                  y={startY + svgHeight / 2}
                                  textAnchor="middle"
                                  fill={highlightedDimension === 'height' ? "#fcd34d" : "#fbbf24"}
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
                                  fill={highlightedDimension === 'height' ? "#fcd34d" : "#a8a29e"}
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
                                  x={startX + svgWidth - 250}
                                  y={startY + svgHeight + 42}
                                  width="240"
                                  height="86"
                                  fill="#111827"
                                  stroke="#fbbf24"
                                  strokeWidth="2"
                                  rx="8"
                                  className="shadow-sm"
                                />
                                <text
                                  x={startX + svgWidth - 238}
                                  y={startY + svgHeight + 68}
                                  fill="#d6d3d1"
                                  fontSize="13"
                                  fontWeight="600"
                                  letterSpacing="0.08em"
                                >
                                  AREA
                                </text>
                                <text
                                  x={startX + svgWidth - 238}
                                  y={startY + svgHeight + 104}
                                  fill="#fef3c7"
                                  fontSize="26"
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
                                  stroke="#a8a29e"
                                  strokeWidth="2"
                                />
                                <line
                                  x1={startX + 20}
                                  y1={startY + svgHeight + 25}
                                  x2={startX + 20}
                                  y2={startY + svgHeight + 35}
                                  stroke="#a8a29e"
                                  strokeWidth="2"
                                />
                                <line
                                  x1={startX + 120}
                                  y1={startY + svgHeight + 25}
                                  x2={startX + 120}
                                  y2={startY + svgHeight + 35}
                                  stroke="#a8a29e"
                                  strokeWidth="2"
                                />
                                <text
                                  x={startX + 70}
                                  y={startY + svgHeight + 50}
                                  textAnchor="middle"
                                  fill="#a8a29e"
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
                className="w-full h-full flex items-center justify-center p-3 pt-14 sm:p-4 sm:pt-14 transition-all duration-300 relative"
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
                  >
                    {/* Background grid */}
                    <defs>
                      <pattern id="blueprint-grid-normal" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(245,158,11,0.18)" strokeWidth="0.8" />
                      </pattern>
                      <pattern id="highlight-grid-normal" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.35" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="#0a0a0a" />
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
                            stroke={highlightedDimension ? "#fbbf24" : "#f59e0b"}
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
                                  stroke={isStructural ? "#f87171" : "#d97706"}
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
                                      fill={isStructural ? "#f87171" : "#a8a29e"}
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
                                        stroke={isStructural ? "#f87171" : "#a8a29e"}
                                        strokeWidth="1.5"
                                        strokeDasharray="2 2"
                                        opacity="0.5"
                                      />
                                      <line
                                        x1={xPos - 30}
                                        y1={startY}
                                        x2={xPos - 20}
                                        y2={startY}
                                        stroke={isStructural ? "#f87171" : "#a8a29e"}
                                        strokeWidth="2"
                                      />
                                      <line
                                        x1={xPos - 30}
                                        y1={startY + svgHeight}
                                        x2={xPos - 20}
                                        y2={startY + svgHeight}
                                        stroke={isStructural ? "#f87171" : "#a8a29e"}
                                        strokeWidth="2"
                                      />
                                      <text
                                        x={xPos - 40}
                                        y={startY + svgHeight / 2}
                                        textAnchor="end"
                                        dominantBaseline="middle"
                                        fill={isStructural ? "#f87171" : "#a8a29e"}
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
                                        fill={isStructural ? "#f87171" : "#78716c"}
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
                                  stroke={isStructural ? "#f87171" : "#d97706"}
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
                                    fill={isStructural ? "#f87171" : "#a8a29e"}
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
                              'fixed': '#60a5fa',
                              'sash': '#22c55e',
                              'sliding': '#eab308',
                              'panel': '#6b7280',
                              'empty': '#ef4444',
                            }[cell.type] || '#d97706';

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
                                      y={cellY + cellH / 2 - 28}
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
                                        y={cellY + cellH / 2 + 24}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="#a8a29e"
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
                                        y={cellY + cellH / 2 + 56}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="#78716c"
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
                                fill="#fef3c7"
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
                              stroke={highlightedDimension === 'width' ? "#fbbf24" : "#f59e0b"}
                              strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                              className="transition-all duration-300"
                            />
                            <line
                              x1={startX}
                              y1={startY - 75}
                              x2={startX}
                              y2={startY - 65}
                              stroke={highlightedDimension === 'width' ? "#fbbf24" : "#f59e0b"}
                              strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                            />
                            <line
                              x1={startX + svgWidth}
                              y1={startY - 75}
                              x2={startX + svgWidth}
                              y2={startY - 65}
                              stroke={highlightedDimension === 'width' ? "#fbbf24" : "#f59e0b"}
                              strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                            />
                            <text
                              x={startX + svgWidth / 2}
                              y={startY - 85}
                              textAnchor="middle"
                              fill={highlightedDimension === 'width' ? "#fcd34d" : "#fbbf24"}
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
                              fill={highlightedDimension === 'width' ? "#fcd34d" : "#a8a29e"}
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
                              stroke={highlightedDimension === 'height' ? "#fbbf24" : "#f59e0b"}
                              strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                            />
                            <line
                              x1={startX - 75}
                              y1={startY}
                              x2={startX - 65}
                              y2={startY}
                              stroke={highlightedDimension === 'height' ? "#fbbf24" : "#f59e0b"}
                              strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                            />
                            <line
                              x1={startX - 75}
                              y1={startY + svgHeight}
                              x2={startX - 65}
                              y2={startY + svgHeight}
                              stroke={highlightedDimension === 'height' ? "#fbbf24" : "#f59e0b"}
                              strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                            />
                            <text
                              x={startX - 85}
                              y={startY + svgHeight / 2}
                              textAnchor="middle"
                              fill={highlightedDimension === 'height' ? "#fcd34d" : "#fbbf24"}
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
                              fill={highlightedDimension === 'height' ? "#fcd34d" : "#a8a29e"}
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
                              x={startX + svgWidth - 250}
                              y={startY + svgHeight + 42}
                              width="240"
                              height="86"
                              fill="#111827"
                              stroke="#fbbf24"
                              strokeWidth="2"
                              rx="8"
                              className="shadow-sm"
                            />
                            <text
                              x={startX + svgWidth - 238}
                              y={startY + svgHeight + 68}
                              fill="#d6d3d1"
                              fontSize="13"
                              fontWeight="600"
                              letterSpacing="0.08em"
                            >
                              AREA
                            </text>
                            <text
                              x={startX + svgWidth - 238}
                              y={startY + svgHeight + 104}
                              fill="#fef3c7"
                              fontSize="26"
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
                              stroke="#a8a29e"
                              strokeWidth="2"
                            />
                            <line
                              x1={startX + 20}
                              y1={startY + svgHeight + 25}
                              x2={startX + 20}
                              y2={startY + svgHeight + 35}
                              stroke="#a8a29e"
                              strokeWidth="2"
                            />
                            <line
                              x1={startX + 120}
                              y1={startY + svgHeight + 25}
                              x2={startX + 120}
                              y2={startY + svgHeight + 35}
                              stroke="#a8a29e"
                              strokeWidth="2"
                            />
                            <text
                              x={startX + 70}
                              y={startY + svgHeight + 50}
                              textAnchor="middle"
                              fill="#a8a29e"
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
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
                <Ruler className="h-8 w-8 text-amber-400/80" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-200/90 mb-1">Enter dimensions to preview</p>
                <p className="text-xs text-slate-500">Width and height will appear here in real-time</p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
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

