import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Toggle } from '@/shared/ui/ui/toggle';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import { Badge } from '@/shared/ui/ui/badge';
import { Ruler, Box, CheckCircle2, ArrowRight, ArrowLeft, Factory, ShieldCheck, Grid3X3, QrCode, Sparkles } from 'lucide-react';
import { MeasurementData, SystemProfileSelections, WindowUnit, WindowGrid } from '@/types/fabricator';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { validateMeasurements, ValidationError, getConstraintsForSystemPack } from '@/lib/fabricatorValidation';
import { SmartDrawCanvas } from './SmartDrawCanvas';
import { calibrationAnalytics } from '@/lib/analytics/CalibrationAnalytics';
import { getPatternsForSystem } from '@/data/egyptian-window-patterns';
import { SystemTuningStudio } from './SystemTuningStudio';
import { loadCustomSystems, addCustomSystem } from '@/lib/fabricator/customSystemStorage';
import { ProductionLabel } from './ProductionLabel';
import { useTranslation } from 'react-i18next';
import { CustomSystemManager } from './CustomSystemManager';

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
  const [measurements, setMeasurements] = useState({
    // Default professional stub dimensions – can be refined per system later.
    width: '1200',
    height: '1200',
    measurementMode: 'hole', // 'hole' (rough opening) or 'manufacturing'
    wallDeduction: '15', // mm deduction for wall tolerance
    windowType: 'sliding_window', // Default to sliding
    color: '',
    glazingType: '',
    glassColor: '',
    flyScreenType: '',
    flatNumber: '',
    buildingBlock: '',
    floor: '',
    unitOrApartment: '',
    elevation: '',
    roomOrZone: '',
    windowIndex: '',
    remarks: '',
  });

  // Grid State for Phase 4
  const [grid, setGrid] = useState<WindowGrid>({
    rows: 1,
    cols: 1,
    cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }]
  });
  
  const [isGridMode, setIsGridMode] = useState(false);

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
  const [highlightedDimension, setHighlightedDimension] = useState<'width' | 'height' | null>(null); // Used in input focus handlers
  const [verificationConfirmed, setVerificationConfirmed] = useState<boolean | 'indeterminate'>(false);
  const [showLabel, setShowLabel] = useState(false);
  const [customSystems, setCustomSystems] = useState<any[]>(() => loadCustomSystems());
  const [showTuningStudio, setShowTuningStudio] = useState(false);
  const [tuningInitialSystem, setTuningInitialSystem] = useState<any | null>(null);

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
        thickness: 24,
        spacer: 12,
        gasFill: 'argon'
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

  const handleInputChange = (field: string, value: string) => {
    setMeasurements(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
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
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  const getFieldError = (field: string): string | undefined => {
    return fieldErrors[field];
  };

  const availableSystemPacks = useMemo(() => {
    const base = region && region !== 'global'
      ? SYSTEM_PACKS.filter(
          (p) => p.meta.regions.includes(region) || p.meta.regions.includes('global'),
        )
      : SYSTEM_PACKS;
    return [...base, ...customSystems];
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

  /**
   * Lightweight, UI-focused mapping of system-pack items to roles for
   * Smart Measuring. This does not try to model the full catalog – it
   * simply exposes the most common choices operators expect to pick
   * before entering dimensions.
   */
  const systemPackRoleOptions: {
    id: string;
    label: string;
    description: string;
    options: { code: string; label: string }[];
  }[] = useMemo(() => {
    if (!activeSystemPack) return [];

    if (activeSystemPack.meta.id === 'rock60') {
      return [
        {
          id: 'frameProfileCode',
          label: 'Frame profile',
          description: 'Select the frame profile code you will use for this unit.',
          options: [
            { code: 'RC 6111-8', label: 'RC 6111-8 – Main frame (catalog default)' },
          ],
        },
        {
          id: 'sashProfileCode',
          label: 'Sash profile',
          description: 'Select the sash profile code for operable leaves.',
          options: [{ code: 'RC 6122', label: 'RC 6122 – Main sash' }],
        },
        {
          id: 'beadProfileCode',
          label: 'Glazing bead',
          description: 'Select the glazing bead profile used for this opening.',
          options: [{ code: 'RC 6166', label: 'RC 6166 – Standard bead' }],
        },
      ];
    }

    if (activeSystemPack.meta.id === 'jumbo100') {
      return [
        {
          id: 'frameProfileCode',
          label: 'Outer frame profile',
          description: 'Main perimeter frame profile for JUMBO100 sliding.',
          options: [
            { code: '2 100 1020', label: '2 100 1020 – Sliding frame (narrow)' },
            { code: '2 100 1120', label: '2 100 1120 – Sliding frame (wide)' },
          ],
        },
        {
          id: 'sashProfileCode',
          label: 'Sash / leaf profile',
          description: 'Active sliding leaf profile code.',
          options: [
            { code: '2 100 1130', label: '2 100 1130 – Sliding sash A' },
            { code: '2 100 1150', label: '2 100 1150 – Sliding sash B' },
          ],
        },
        {
          id: 'beadProfileCode',
          label: 'Small / glazing profile',
          description: 'Typical small profile used for beads or adapters.',
          options: [
            { code: '2 100 6120', label: '2 100 6120 – Small profile' },
            { code: '2 100 6180', label: '2 100 6180 – Small profile' },
          ],
        },
      ];
    }

    // Fallback: no specialised mapping – nothing to select.
    return [];
  }, [activeSystemPack]);

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
      { ...measurements, systemPackId: selectedSystemPackId, manufacturingWidth, manufacturingHeight } as any,
      systemConstraints,
    );

    const fieldErrorMap: Record<string, string> = {};

    if (!validation.isValid) {
      validation.errors.forEach((error) => {
        fieldErrorMap[error.field] = error.message;
      });
    }

    // Require system-pack profile selections when options are defined for the active pack.
    if (systemPackRoleOptions.length > 0) {
      systemPackRoleOptions.forEach((role) => {
        const value = (systemProfileSelections as any)[role.id];
        if (!value) {
          fieldErrorMap[`systemProfile.${role.id}`] = `Please select a profile code for "${role.label}".`;
        }
      });
    }

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
      const cutLength = Number(measurements.width) - 6; // Simplified calculation for MVP
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
    };

    // Call the callback
    if (onMeasurementComplete) {
        onMeasurementComplete(payload);
    } else {
        console.error("onMeasurementComplete callback is missing in SmartMeasuringInterface");
    }
  };

  // AR scan function reserved for future enhancement
  // const startARScan = () => { ... };

  return (
    <div className="flex flex-col lg:flex-row h-[80vh] gap-6">
      {/* Label Modal */}
      {showLabel && previewWindowUnit && (
        <ProductionLabel 
          windowUnit={previewWindowUnit} 
          onClose={() => setShowLabel(false)} 
        />
      )}

      {/* Left Panel: The Guided Form */}
      <div className="w-full lg:w-1/3 flex flex-col bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-xl overflow-hidden">
        {/* Step Progress Indicator */}
        <div className="flex items-center p-4 border-b border-gray-800 space-x-2">
          {STEPS.map((step, idx) => (
            <div 
              key={step.id} 
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                idx <= currentStep ? 'bg-orange-500' : 'bg-gray-700'
              }`} 
            />
          ))}
        </div>
        <div className="p-4">
          <h2 className="text-xl font-light text-white flex items-center gap-2">
            <span className="text-orange-500 font-bold">0{currentStep + 1}.</span> {STEPS[currentStep].title}
          </h2>
        </div>

        {/* Form Content Container */}
        <div className="flex-1 overflow-y-auto p-4 relative">
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
              {/* STEP 1: System */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <Label className="text-[11px]">{t('smart_measuring.system_config.title', 'System Pack')}</Label>
                      <Select
                        value={selectedSystemPackId}
                        onValueChange={(value) => {
                          if (value === 'custom') {
                            const currentPack = availableSystemPacks.find((p) => p.meta.id === selectedSystemPackId);
                            setTuningInitialSystem(currentPack || null);
                            setShowTuningStudio(true);
                            return;
                          }
                          setSelectedSystemPackId(value);
                        }}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-xs max-h-60">
                          {availableSystemPacks.map((pack) => (
                            <SelectItem key={pack.meta.id} value={pack.meta.id} className="group">
                              <div className="flex items-start justify-between gap-3 min-w-[220px]">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-gray-100 flex items-center gap-2">
                                    {pack.meta.name}
                                    {pack.meta.id.startsWith('custom') && (
                                      <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                                        Custom
                                      </Badge>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-gray-500">
                                    {pack.meta.brands.join(', ')} · {pack.meta.regions.join('/')}
                                  </span>
                                </div>
                                {pack.meta.id.startsWith('custom') && (
                                  <div
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                  >
                                    <CustomSystemManager
                                      systemId={pack.meta.id}
                                      systemName={pack.meta.name}
                                      onDelete={refreshCustomSystems}
                                      onArchive={refreshCustomSystems}
                                      onDuplicate={refreshCustomSystems}
                                      onEdit={() => {
                                        setTuningInitialSystem(pack as any);
                                        setShowTuningStudio(true);
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">
                            <div className="flex items-center gap-2">
                              <Factory className="h-3.5 w-3.5 text-orange-400" />
                              <div className="flex flex-col gap-0.5">
                                <span className="text-gray-100">Custom System (Tune...)</span>
                                <span className="text-[10px] text-gray-500">Import DXF, tag roles, link hardware</span>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      {systemPackRoleOptions.length === 0 ? (
                        <p className="text-[11px] text-gray-400">
                          {t('smart_measuring.system_config.no_roles', 'This system does not yet expose detailed profile roles.')}
                        </p>
                      ) : (
                        systemPackRoleOptions.map((role) => {
                          const fieldKey = `systemProfile.${role.id}`;
                          const error = getFieldError(fieldKey);
                          const value = (systemProfileSelections as any)[role.id] || '';

                          return (
                            <div key={role.id} className="space-y-1.5">
                              <Label className="text-[11px]">{role.label}</Label>
                              <Select
                                value={value}
                                onValueChange={(code) =>
                                  handleSystemProfileChange(role.id as keyof SystemProfileSelections, code)
                                }
                              >
                                <SelectTrigger
                                  className={`bg-gray-800 border-gray-700 h-8 text-xs ${
                                    error ? 'border-red-500' : ''
                                  }`}
                                >
                                  <SelectValue placeholder="Select profile code" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700 text-xs max-h-56">
                                  {role.options.map((opt) => (
                                    <SelectItem key={opt.code} value={opt.code}>
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-gray-100">{opt.code}</span>
                                        <span className="text-[10px] text-gray-500">{opt.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {error && <p className="text-[10px] text-red-400">{error}</p>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  {region === 'egypt' && (
                    <Alert className="bg-blue-900/20 border-blue-500 text-blue-200">
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription>
                        {t('smart_measuring.system_config.ai_recommendation', 'AI Recommendation: Based on your region (Egypt), <strong>ROCK 60</strong> is the optimal choice.', { strong: (chunks) => <strong>{chunks}</strong> })}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* STEP 2: Dimensions & Layout */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-500">Pattern Preset</Label>
                    {availablePatterns.length === 0 ? (
                      <p className="text-[11px] text-gray-400 mt-1">No presets for this system. Select a different system to see patterns.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {availablePatterns.map((pat) => (
                          <button
                            key={pat.id}
                            onClick={() => {
                              const midWidth = Math.round((pat.typicalWidthMm[0] + pat.typicalWidthMm[1]) / 2);
                              const midHeight = Math.round((pat.typicalHeightMm[0] + pat.typicalHeightMm[1]) / 2);
                              handleInputChange('width', String(midWidth));
                              handleInputChange('height', String(midHeight));
                            }}
                            className="text-left bg-gray-900/40 border border-gray-700 hover:border-orange-500 rounded-lg p-3 transition-colors"
                          >
                            <div className="text-sm text-white font-semibold">{pat.name}</div>
                            <div className="text-[11px] text-gray-400">{pat.layout}</div>
                            <div className="text-[11px] text-gray-400 mt-1">
                              {pat.typicalWidthMm[0]}–{pat.typicalWidthMm[1]} mm · {pat.typicalHeightMm[0]}–{pat.typicalHeightMm[1]} mm
                            </div>
                            {pat.notes && (
                              <div className="text-[11px] text-orange-300 mt-1">{pat.notes}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="group">
                    <Label className="text-xs uppercase tracking-widest text-gray-500 group-focus-within:text-orange-400 transition-colors">
                      {t('smart_measuring.dimensions.width', 'Total Width (mm)')}
                    </Label>
                    <div className="relative mt-2">
                      <Input 
                        value={measurements.width}
                        onChange={(e) => handleInputChange('width', e.target.value)}
                        onFocus={() => setHighlightedDimension('width')}
                        onBlur={() => setHighlightedDimension(null)}
                        className="bg-gray-800/50 border-gray-700 text-2xl font-mono h-12 focus:border-orange-500 transition-all"
                        placeholder="1200"
                        min={systemConstraints?.minWidthMm ?? 300}
                        max={systemConstraints?.maxWidthMm ?? 5000}
                      />
                      <span className="absolute right-4 top-3 text-gray-500">mm</span>
                    </div>
                    {getFieldError('width') && (
                      <p className="text-sm text-red-400 mt-1">{getFieldError('width')}</p>
                    )}
                  </div>
                  
                  <div className="group">
                    <Label className="text-xs uppercase tracking-widest text-gray-500 group-focus-within:text-orange-400 transition-colors">
                      {t('smart_measuring.dimensions.height', 'Total Height (mm)')}
                    </Label>
                    <div className="relative mt-2">
                      <Input 
                        value={measurements.height}
                        onChange={(e) => handleInputChange('height', e.target.value)}
                        onFocus={() => setHighlightedDimension('height')}
                        onBlur={() => setHighlightedDimension(null)}
                        className="bg-gray-800/50 border-gray-700 text-2xl font-mono h-12 focus:border-orange-500 transition-all"
                        placeholder="1500"
                        min={systemConstraints?.minHeightMm ?? 300}
                        max={systemConstraints?.maxHeightMm ?? 5000}
                      />
                      <span className="absolute right-4 top-3 text-gray-500">mm</span>
                    </div>
                    {getFieldError('height') && (
                      <p className="text-sm text-red-400 mt-1">{getFieldError('height')}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-gray-800 pt-4">
                    <div>
                      <Label className="text-[11px] uppercase tracking-wide text-gray-500">
                        Measurement Mode
                      </Label>
                      <Select
                        value={measurements.measurementMode}
                        onValueChange={(val) => handleInputChange('measurementMode', val)}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                          <SelectItem value="hole">Hole Size (Rough Opening)</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing Size</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] uppercase tracking-wide text-gray-500">
                        Wall Tolerance Deduction (mm)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={40}
                        value={measurements.wallDeduction}
                        onChange={(e) => handleInputChange('wallDeduction', e.target.value)}
                        className="bg-gray-800/50 border-gray-700 h-9 text-xs"
                      />
                    </div>

                    <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3 text-xs text-gray-200">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Manufacturing Width</span>
                        <span className="font-mono text-orange-300">
                          {Math.max(
                            Number(measurements.measurementMode === 'hole'
                              ? Number(measurements.width || 0) - Number(measurements.wallDeduction || 0)
                              : Number(measurements.width || 0)
                            ), 0
                          ).toFixed(0)} mm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Manufacturing Height</span>
                        <span className="font-mono text-orange-300">
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

                  <div className="space-y-3 border-t border-gray-800 pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 cursor-pointer">
                        <Grid3X3 className="h-4 w-4 text-orange-400" />
                        <span>{t('smart_measuring.dimensions.grid_mode', 'Grid / Multi-Unit Mode')}</span>
                      </Label>
                      <Toggle 
                        pressed={isGridMode} 
                        onPressedChange={setIsGridMode}
                        className="data-[state=on]:bg-orange-600"
                        size="sm"
                      >
                        {isGridMode ? t('profile_import_tool.on', 'On') : t('profile_import_tool.off', 'Off')}
                      </Toggle>
                    </div>

                    {isGridMode ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                         <p className="text-xs text-gray-400">
                           {t('smart_measuring.dimensions.grid_description', 'Design complex multi-unit windows by defining rows and columns. Click cells on the grid below to change their type.')}
                         </p>
                         <SmartDrawCanvas 
                            width={Number(measurements.width) || 1000}
                            height={Number(measurements.height) || 1000}
                            grid={grid}
                            onGridChange={setGrid}
                            className="border border-orange-500/20 rounded-lg p-2 bg-orange-500/5"
                         />
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="windowType">{t('smart_measuring.dimensions.window_type', 'Window Type & Layout')}</Label>
                        <Select value={measurements.windowType} onValueChange={(value) => handleInputChange('windowType', value)}>
                          <SelectTrigger className={`bg-gray-800 border-gray-600 ${getFieldError('windowType') ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder={t('smart_measuring.dimensions.window_type_placeholder', 'Select window or door layout')} />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600 text-white z-50 space-y-1">
                            <div className="px-2 pt-1 text-xs uppercase tracking-wide text-gray-400">{t('smart_measuring.dimensions.sliding_windows', 'Sliding Windows')}</div>
                            <SelectItem value="sliding_window_2sash" className="bg-gray-800 hover:bg-gray-700 text-white">
                              {t('smart_measuring.dimensions.sliding_2sash', 'Sliding Window – 2 Sash')}
                            </SelectItem>
                            <SelectItem value="sliding_window_4sash" className="bg-gray-800 hover:bg-gray-700 text-white">
                              {t('smart_measuring.dimensions.sliding_4sash', 'Sliding Window – 4 Sash')}
                            </SelectItem>
                            <SelectItem value="sliding_window_3sash_center_fixed" className="bg-gray-800 hover:bg-gray-700 text-white">
                              {t('smart_measuring.dimensions.sliding_3sash_center', 'Sliding Window – 3 Sash (Center Fixed)')}
                            </SelectItem>
                            <div className="px-2 pt-2 text-xs uppercase tracking-wide text-gray-400">{t('smart_measuring.dimensions.casement_tilt', 'Casement / Tilt & Turn')}</div>
                            <SelectItem value="casement" className="bg-gray-800 hover:bg-gray-700 text-white">
                              {t('smart_measuring.dimensions.casement_single', 'Casement – Single')}
                            </SelectItem>
                            <SelectItem value="casement_double" className="bg-gray-800 hover:bg-gray-700 text-white">
                              {t('smart_measuring.dimensions.casement_double', 'Casement – Double (Left / Right)')}
                            </SelectItem>
                            <SelectItem value="tilt_turn" className="bg-gray-800 hover:bg-gray-700 text-white">
                              {t('smart_measuring.dimensions.tilt_turn', 'Tilt & Turn')}
                            </SelectItem>
                            <div className="px-2 pt-2 text-xs uppercase tracking-wide text-gray-400">{t('smart_measuring.dimensions.doors', 'Doors')}</div>
                            <SelectItem value="sliding_door_2panel" className="bg-gray-800 hover:bg-gray-700 text-white">
                              {t('smart_measuring.dimensions.sliding_door_2panel', 'Sliding Door – 2 Panel')}
                            </SelectItem>
                            <SelectItem value="casement_door" className="bg-gray-800 hover:bg-gray-700 text-white">
                              {t('smart_measuring.dimensions.casement_door', 'Casement Door (Single / Double)')}
                            </SelectItem>
                            <div className="px-2 pt-2 text-xs uppercase tracking-wide text-gray-400">{t('smart_measuring.dimensions.fixed_combinations', 'Fixed & Combinations')}</div>
                            <SelectItem value="fixed_window" className="bg-gray-800 hover:bg-gray-700 text-white">
                              {t('smart_measuring.dimensions.fixed_window', 'Fixed Window')}
                            </SelectItem>
                            <SelectItem value="fixed_with_side_casements" className="bg-gray-800 hover:bg-gray-700 text-white">
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
                      <Label htmlFor="glazingType">{t('smart_measuring.specs.glazing_type', 'Glazing Type')}</Label>
                      <Select
                        value={measurements.glazingType}
                        onValueChange={(value) => handleInputChange('glazingType', value)}
                      >
                        <SelectTrigger
                          id="glazingType"
                          className={`bg-gray-800 border-gray-600 ${
                            getFieldError('glazingType') ? 'border-red-500' : ''
                          }`}
                        >
                          <SelectValue placeholder={t('smart_measuring.specs.glazing_type_placeholder', 'Select glazing type')} />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600 text-white z-50">
                          <SelectItem value="single" className="bg-gray-800 hover:bg-gray-700 text-white">
                            {t('smart_measuring.specs.single', 'Single')}
                          </SelectItem>
                          <SelectItem value="double" className="bg-gray-800 hover:bg-gray-700 text-white">
                            {t('smart_measuring.specs.double', 'Double')}
                          </SelectItem>
                          <SelectItem value="triple" className="bg-gray-800 hover:bg-gray-700 text-white">
                            {t('smart_measuring.specs.triple', 'Triple')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {getFieldError('glazingType') && (
                        <p className="text-sm text-red-400 mt-1">{getFieldError('glazingType')}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="glassColor">{t('smart_measuring.specs.glass_color', 'Glass Color / Tint')}</Label>
                      <Select
                        value={measurements.glassColor}
                        onValueChange={(value) => handleInputChange('glassColor', value)}
                      >
                        <SelectTrigger
                          id="glassColor"
                          className={`bg-gray-800 border-gray-600 ${
                            getFieldError('glassColor') ? 'border-red-500' : ''
                          }`}
                        >
                          <SelectValue placeholder={t('smart_measuring.specs.glass_color_placeholder', 'Clear, Green, Bronze...')} />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600 text-white z-50">
                          <SelectItem value="clear" className="bg-gray-800 hover:bg-gray-700 text-white">
                            {t('smart_measuring.specs.clear', 'Clear')}
                          </SelectItem>
                          <SelectItem value="green" className="bg-gray-800 hover:bg-gray-700 text-white">
                            {t('smart_measuring.specs.green', 'Green')}
                          </SelectItem>
                          <SelectItem value="blue" className="bg-gray-800 hover:bg-gray-700 text-white">
                            {t('smart_measuring.specs.blue', 'Blue')}
                          </SelectItem>
                          <SelectItem value="bronze" className="bg-gray-800 hover:bg-gray-700 text-white">
                            {t('smart_measuring.specs.bronze', 'Bronze')}
                          </SelectItem>
                          <SelectItem value="grey" className="bg-gray-800 hover:bg-gray-700 text-white">
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
                    <Label htmlFor="flyScreenType">{t('smart_measuring.specs.fly_screen', 'Flyscreen Type')}</Label>
                    <Select
                      value={measurements.flyScreenType}
                      onValueChange={(value) => handleInputChange('flyScreenType', value)}
                    >
                      <SelectTrigger
                        id="flyScreenType"
                        className={`bg-gray-800 border-gray-600 ${
                          getFieldError('flyScreenType') ? 'border-red-500' : ''
                        }`}
                      >
                        <SelectValue placeholder={t('smart_measuring.specs.fly_screen_placeholder', 'Select flyscreen type')} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600 text-white z-50">
                        <SelectItem value="none" className="bg-gray-800 hover:bg-gray-700 text-white">
                          {t('smart_measuring.specs.none', 'None')}
                        </SelectItem>
                        <SelectItem value="plisee" className="bg-gray-800 hover:bg-gray-700 text-white">
                          {t('smart_measuring.specs.plisse', 'Plisse')}
                        </SelectItem>
                        <SelectItem value="fixed" className="bg-gray-800 hover:bg-gray-700 text-white">
                          {t('smart_measuring.specs.fixed', 'Fixed')}
                        </SelectItem>
                        <SelectItem value="sliding" className="bg-gray-800 hover:bg-gray-700 text-white">
                          {t('smart_measuring.specs.sliding', 'Sliding')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {getFieldError('flyScreenType') && (
                      <p className="text-sm text-red-400 mt-1">{getFieldError('flyScreenType')}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="color">{t('smart_measuring.specs.color', 'Color')}</Label>
                    <Select value={measurements.color} onValueChange={(value) => handleInputChange('color', value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-600">
                        <SelectValue placeholder={t('smart_measuring.specs.color_placeholder', 'Select color')} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600 text-white z-50">
                        <SelectItem value="Silver" className="bg-gray-800 hover:bg-gray-700 text-white">{t('smart_measuring.specs.silver', 'Silver')}</SelectItem>
                        <SelectItem value="White" className="bg-gray-800 hover:bg-gray-700 text-white">{t('smart_measuring.specs.white', 'White')}</SelectItem>
                        <SelectItem value="Black" className="bg-gray-800 hover:bg-gray-700 text-white">{t('smart_measuring.specs.black', 'Black')}</SelectItem>
                        <SelectItem value="Bronze" className="bg-gray-800 hover:bg-gray-700 text-white">{t('smart_measuring.specs.bronze_color', 'Bronze')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* STEP 4: Location Context */}
              {currentStep === 3 && (
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                    {t('smart_measuring.location.title', 'Location / Pose details (optional)')}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px]">{t('smart_measuring.location.building_block', 'Building / Block')}</Label>
                      <Input
                        value={measurements.buildingBlock}
                        onChange={(e) => handleInputChange('buildingBlock', e.target.value)}
                        placeholder={t('smart_measuring.location.building_block_placeholder', 'Block A')}
                        className="h-8 bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">{t('smart_measuring.location.unit_apartment', 'Flat / Unit')}</Label>
                      <Input
                        value={measurements.unitOrApartment}
                        onChange={(e) => handleInputChange('unitOrApartment', e.target.value)}
                        placeholder={t('smart_measuring.location.unit_apartment_placeholder', 'Flat 12')}
                        className="h-8 bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">{t('smart_measuring.location.floor', 'Floor')}</Label>
                      <Input
                        value={measurements.floor}
                        onChange={(e) => handleInputChange('floor', e.target.value)}
                        placeholder={t('smart_measuring.location.floor_placeholder', '3')}
                        className="h-8 bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">{t('smart_measuring.location.room_zone', 'Room / Zone')}</Label>
                      <Input
                        value={measurements.roomOrZone}
                        onChange={(e) => handleInputChange('roomOrZone', e.target.value)}
                        placeholder={t('smart_measuring.location.room_zone_placeholder', 'Living, Bedroom...')}
                        className="h-8 bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">{t('smart_measuring.location.elevation', 'Elevation')}</Label>
                      <Input
                        value={measurements.elevation}
                        onChange={(e) => handleInputChange('elevation', e.target.value)}
                        placeholder={t('smart_measuring.location.elevation_placeholder', 'North, Street, Garden...')}
                        className="h-8 bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">{t('smart_measuring.location.window_index', 'Window Index')}</Label>
                      <Input
                        value={measurements.windowIndex}
                        onChange={(e) => handleInputChange('windowIndex', e.target.value)}
                        placeholder={t('smart_measuring.location.window_index_placeholder', 'W1, W2...')}
                        className="h-8 bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-[11px]">{t('smart_measuring.location.remarks', 'Remarks')}</Label>
                      <Input
                        value={measurements.remarks}
                        onChange={(e) => handleInputChange('remarks', e.target.value)}
                        placeholder={t('smart_measuring.location.remarks_placeholder', 'Any special note for this pose')}
                        className="h-8 bg-gray-800 border-gray-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Verification Gate */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-orange-400 font-semibold flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" /> {t('smart_measuring.verification.trust_verify', 'Trust but Verify')}
                      </h3>
                      <Badge variant="outline" className="bg-green-900/30 text-green-400 border-green-800">
                        {t('smart_measuring.verification.calibration_accuracy', 'Calibration Accuracy: 98%')}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-300 mb-4">
                      {t('smart_measuring.verification.description', 'The system has calculated cut dimensions based on your inputs and profile calibration data. Please verify these critical dimensions against site conditions to prevent waste.')}
                    </p>
                    
                    <div className="space-y-3 text-sm bg-black/20 p-3 rounded border border-gray-800">
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
                               <span className="text-gray-400">{t('smart_measuring.verification.overall_width', 'Overall Width Input:')}</span>
                               <span className="font-mono text-white text-base">{rawWidth} mm</span>
                             </div>
                             <div className="flex justify-between items-center">
                               <span className="text-gray-400">{t('smart_measuring.verification.overall_height', 'Overall Height Input:')}</span>
                               <span className="font-mono text-white text-base">{rawHeight} mm</span>
                             </div>
                             <div className="flex justify-between items-center">
                               <span className="text-gray-400">{t('smart_measuring.verification.deduction', 'Deduction (Wall Tolerance):')}</span>
                               <span className="font-mono text-red-400">- {isHoleMode ? deduction : 0} mm</span> 
                             </div>
                             <div className="h-px bg-gray-700 my-1" />
                             <div className="flex justify-between items-center font-bold">
                               <span className="text-orange-400">{t('smart_measuring.verification.calculated_cut', 'Calculated Cut Length:')}</span>
                               <span className="font-mono text-green-400 text-lg">{manufacturingWidth.toFixed(0)} × {manufacturingHeight.toFixed(0)} mm</span>
                             </div>
                           </>
                         );
                       })()}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <Checkbox 
                      id="verify" 
                      checked={verificationConfirmed as boolean} 
                      onCheckedChange={setVerificationConfirmed}
                      className="border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-black"
                    />
                    <label htmlFor="verify" className="text-sm text-gray-200 cursor-pointer select-none font-medium">
                      {t('smart_measuring.verification.confirm_text', 'I verify these dimensions match site requirements and accept responsibility for production.')}
                    </label>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-gray-800 flex justify-between bg-gray-900">
          <Button variant="ghost" disabled={currentStep === 0} onClick={prevStep}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('smart_measuring.actions.previous', 'Back')}
          </Button>
          
          {currentStep === STEPS.length - 1 ? (
            <div className="flex gap-2">
              {/* Print Label Button - Enabled only after verification */}
              {verificationConfirmed && (
                <Button
                  variant="outline"
                  onClick={() => setShowLabel(true)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  <QrCode className="mr-2 h-4 w-4" /> {t('smart_measuring.actions.print_label', 'Print Label')}
                </Button>
              )}

              <Button 
                onClick={handleSubmit} 
                disabled={!verificationConfirmed}
                className={`
                  transition-all duration-300
                  ${verificationConfirmed 
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.4)]' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'}
                `}
              >
                {t('smart_measuring.actions.complete', 'Finalize Design')} <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={nextStep} className="bg-orange-600 hover:bg-orange-500 text-white">
              {t('smart_measuring.actions.next', 'Next Step')} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Right Panel: Clean Blueprint Preview */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 relative overflow-hidden shadow-sm">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium text-xs px-3 py-1">
            <Ruler className="h-3 w-3 mr-1.5" />
            Measurement Preview
          </Badge>
          {activeSystemPack && (
            <div className="text-xs text-gray-600 bg-white/90 backdrop-blur px-3 py-1 rounded border border-gray-200">
              <span className="font-semibold">{activeSystemPack.meta.name}</span>
            </div>
          )}
        </div>

        {/* Dynamic Blueprint Canvas */}
        {previewWindowUnit && Number(measurements.width) > 0 && Number(measurements.height) > 0 ? (
          <div className="w-full h-full flex items-center justify-center p-6 md:p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full max-w-4xl"
            >
              <svg
                viewBox="0 0 1200 800"
                className="w-full h-full"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))' }}
              >
                {/* Background grid - more visible and dynamic */}
                <defs>
                  <pattern id="blueprint-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#d1d5db" strokeWidth="0.8" opacity="0.6"/>
                  </pattern>
                  {/* Highlight pattern for active dimension */}
                  <pattern id="highlight-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.3"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#blueprint-grid)" />
                {highlightedDimension && (
                  <rect width="100%" height="100%" fill="url(#highlight-grid)" opacity="0.5" />
                )}

                {/* Calculate dimensions with smooth transitions */}
                {(() => {
                  const width = Number(measurements.width) || 1200;
                  const height = Number(measurements.height) || 1200;
                  const aspectRatio = width / height;
                  const maxWidth = 900;
                  const maxHeight = 600;
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
                  
                  return (
                    <g>
                      {/* Window Frame - with subtle animation on dimension change */}
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

                      {/* Width Dimension Line (Top) - animated */}
                      <g className="transition-all duration-300">
                        <line 
                          x1={startX} 
                          y1={startY - 50} 
                          x2={startX + svgWidth} 
                          y2={startY - 50} 
                          stroke={highlightedDimension === 'width' ? "#2563eb" : "#3b82f6"} 
                          strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                          className="transition-all duration-300"
                        />
                        <line 
                          x1={startX} 
                          y1={startY - 55} 
                          x2={startX} 
                          y2={startY - 45} 
                          stroke={highlightedDimension === 'width' ? "#2563eb" : "#3b82f6"} 
                          strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                        />
                        <line 
                          x1={startX + svgWidth} 
                          y1={startY - 55} 
                          x2={startX + svgWidth} 
                          y2={startY - 45} 
                          stroke={highlightedDimension === 'width' ? "#2563eb" : "#3b82f6"} 
                          strokeWidth={highlightedDimension === 'width' ? "3" : "2"}
                        />
                        <text
                          x={startX + svgWidth / 2}
                          y={startY - 60}
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
                          y={startY - 85}
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

                      {/* Height Dimension Line (Left) - animated */}
                      <g className="transition-all duration-300">
                        <line 
                          x1={startX - 50} 
                          y1={startY} 
                          x2={startX - 50} 
                          y2={startY + svgHeight} 
                          stroke={highlightedDimension === 'height' ? "#2563eb" : "#3b82f6"} 
                          strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                        />
                        <line 
                          x1={startX - 55} 
                          y1={startY} 
                          x2={startX - 45} 
                          y2={startY} 
                          stroke={highlightedDimension === 'height' ? "#2563eb" : "#3b82f6"} 
                          strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                        />
                        <line 
                          x1={startX - 55} 
                          y1={startY + svgHeight} 
                          x2={startX - 45} 
                          y2={startY + svgHeight} 
                          stroke={highlightedDimension === 'height' ? "#2563eb" : "#3b82f6"} 
                          strokeWidth={highlightedDimension === 'height' ? "3" : "2"}
                        />
                        <text
                          x={startX - 60}
                          y={startY + svgHeight / 2}
                          textAnchor="middle"
                          fill={highlightedDimension === 'height' ? "#1e40af" : "#2563eb"}
                          fontSize="32"
                          fontWeight="700"
                          className="font-mono transition-all duration-300"
                          transform={`rotate(-90 ${startX - 60} ${startY + svgHeight / 2})`}
                        >
                          {height.toLocaleString()} mm
                        </text>
                        <text
                          x={startX - 85}
                          y={startY + svgHeight / 2}
                          textAnchor="middle"
                          fill={highlightedDimension === 'height' ? "#1e40af" : "#6b7280"}
                          fontSize="12"
                          fontWeight="700"
                          letterSpacing="0.1em"
                          className="transition-all duration-300"
                          transform={`rotate(-90 ${startX - 85} ${startY + svgHeight / 2})`}
                        >
                          HEIGHT
                        </text>
                      </g>

                      {/* Area Display - dynamic */}
                      <g className="transition-opacity duration-300">
                        <rect 
                          x={startX + svgWidth - 200} 
                          y={startY + svgHeight + 25} 
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
                          y={startY + svgHeight + 45} 
                          fill="#374151" 
                          fontSize="11" 
                          fontWeight="600"
                          letterSpacing="0.05em"
                        >
                          AREA
                        </text>
                        <text 
                          x={startX + svgWidth - 195} 
                          y={startY + svgHeight + 68} 
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
    </div>
  );
};

