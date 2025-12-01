import React, { useState, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Toggle } from '@/shared/ui/ui/toggle';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import { Badge } from '@/shared/ui/ui/badge';
import { Ruler, Camera, Scan, Smartphone, AlertCircle, Box, CheckCircle2, ArrowRight, ArrowLeft, Factory, Sparkles, Layers, ShieldCheck, Grid3X3, QrCode } from 'lucide-react';
import { MeasurementData, SystemProfileSelections, WindowUnit, WindowGrid } from '@/types/fabricator';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { validateMeasurements, ValidationError, getConstraintsForSystemPack } from '@/lib/fabricatorValidation';
// import { Window3DGenerator, WindowMeasurementOverlay } from './Window3DGenerator';
import { SmartDrawCanvas } from './SmartDrawCanvas';
import { calibrationAnalytics } from '@/lib/analytics/CalibrationAnalytics';
import { ProductionLabel } from './ProductionLabel';

// Lazy load Window3DGenerator to improve initial load performance
const Window3DGenerator = React.lazy(() => import('./Window3DGenerator').then(module => ({ default: module.Window3DGenerator })));

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
  const [measurements, setMeasurements] = useState({
    // Default professional stub dimensions – can be refined per system later.
    width: '1200',
    height: '1200',
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

  const [isScanning, setIsScanning] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [show3DPreview, setShow3DPreview] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedDimension, setHighlightedDimension] = useState<'width' | 'height' | null>(null);
  const [explodedView, setExplodedView] = useState(false);
  const [verificationConfirmed, setVerificationConfirmed] = useState<boolean | 'indeterminate'>(false);
  const [showLabel, setShowLabel] = useState(false);

  // Defined Steps
  const STEPS = [
    { id: 'system', title: 'System Configuration', icon: Factory },
    { id: 'dimensions', title: 'Dimensions & Layout', icon: Ruler },
    { id: 'specs', title: 'Glass & Specs', icon: Box },
    { id: 'location', title: 'Location Context', icon: CheckCircle2 },
    { id: 'verify', title: 'Verification', icon: ShieldCheck },
  ];

  // Generate preview window unit from measurements for 3D visualization
  const previewWindowUnit = useMemo<WindowUnit | null>(() => {
    const width = Number(measurements.width);
    const height = Number(measurements.height);
    
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
    if (region && region !== 'global') {
      return SYSTEM_PACKS.filter(
        (p) => p.meta.regions.includes(region) || p.meta.regions.includes('global'),
      );
    }
    return SYSTEM_PACKS;
  }, [region]);

  const activeSystemPack = useMemo(
    () => availableSystemPacks.find((p) => p.meta.id === selectedSystemPackId) ?? availableSystemPacks[0] ?? SYSTEM_PACKS[0],
    [availableSystemPacks, selectedSystemPackId],
  );

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
    const validation = validateMeasurements(
      { ...measurements, systemPackId: selectedSystemPackId } as any,
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

  const startARScan = () => {
    setIsScanning(true);
    // Simulate AR scanning
    setTimeout(() => {
      setMeasurements(prev => ({
        ...prev,
        width: '1200',
        height: '1200',
        windowType: 'sliding_window'
      }));
      setIsScanning(false);
    }, 3000);
  };

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
                      <Label className="text-[11px]">System Pack</Label>
                      <Select
                        value={selectedSystemPackId}
                        onValueChange={(value) => setSelectedSystemPackId(value)}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-xs max-h-60">
                          {availableSystemPacks.map((pack) => (
                            <SelectItem key={pack.meta.id} value={pack.meta.id}>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-gray-100">{pack.meta.name}</span>
                                <span className="text-[10px] text-gray-500">
                                  {pack.meta.brands.join(', ')} · {pack.meta.regions.join('/')}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      {systemPackRoleOptions.length === 0 ? (
                        <p className="text-[11px] text-gray-400">
                          This system does not yet expose detailed profile roles.
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
                        AI Recommendation: Based on your region (Egypt), <strong>ROCK 60</strong> is the optimal choice.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* STEP 2: Dimensions & Layout */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="group">
                    <Label className="text-xs uppercase tracking-widest text-gray-500 group-focus-within:text-orange-400 transition-colors">
                      Total Width (mm)
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
                      Total Height (mm)
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

                  <div className="space-y-3 border-t border-gray-800 pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 cursor-pointer">
                        <Grid3X3 className="h-4 w-4 text-orange-400" />
                        <span>Grid / Multi-Unit Mode</span>
                      </Label>
                      <Toggle 
                        pressed={isGridMode} 
                        onPressedChange={setIsGridMode}
                        className="data-[state=on]:bg-orange-600"
                        size="sm"
                      >
                        {isGridMode ? 'On' : 'Off'}
                      </Toggle>
                    </div>

                    {isGridMode ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                         <p className="text-xs text-gray-400">
                           Design complex multi-unit windows by defining rows and columns. Click cells on the grid below to change their type.
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
                        <Label htmlFor="windowType">Window Type & Layout</Label>
                        <Select value={measurements.windowType} onValueChange={(value) => handleInputChange('windowType', value)}>
                          <SelectTrigger className={`bg-gray-800 border-gray-600 ${getFieldError('windowType') ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Select window or door layout" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600 text-white z-50 space-y-1">
                            <div className="px-2 pt-1 text-xs uppercase tracking-wide text-gray-400">Sliding Windows</div>
                            <SelectItem value="sliding_window_2sash" className="bg-gray-800 hover:bg-gray-700 text-white">
                              Sliding Window – 2 Sash
                            </SelectItem>
                            <SelectItem value="sliding_window_4sash" className="bg-gray-800 hover:bg-gray-700 text-white">
                              Sliding Window – 4 Sash
                            </SelectItem>
                            <SelectItem value="sliding_window_3sash_center_fixed" className="bg-gray-800 hover:bg-gray-700 text-white">
                              Sliding Window – 3 Sash (Center Fixed)
                            </SelectItem>
                            <div className="px-2 pt-2 text-xs uppercase tracking-wide text-gray-400">Casement / Tilt & Turn</div>
                            <SelectItem value="casement" className="bg-gray-800 hover:bg-gray-700 text-white">
                              Casement – Single
                            </SelectItem>
                            <SelectItem value="casement_double" className="bg-gray-800 hover:bg-gray-700 text-white">
                              Casement – Double (Left / Right)
                            </SelectItem>
                            <SelectItem value="tilt_turn" className="bg-gray-800 hover:bg-gray-700 text-white">
                              Tilt &amp; Turn
                            </SelectItem>
                            <div className="px-2 pt-2 text-xs uppercase tracking-wide text-gray-400">Doors</div>
                            <SelectItem value="sliding_door_2panel" className="bg-gray-800 hover:bg-gray-700 text-white">
                              Sliding Door – 2 Panel
                            </SelectItem>
                            <SelectItem value="casement_door" className="bg-gray-800 hover:bg-gray-700 text-white">
                              Casement Door (Single / Double)
                            </SelectItem>
                            <div className="px-2 pt-2 text-xs uppercase tracking-wide text-gray-400">Fixed & Combinations</div>
                            <SelectItem value="fixed_window" className="bg-gray-800 hover:bg-gray-700 text-white">
                              Fixed Window
                            </SelectItem>
                            <SelectItem value="fixed_with_side_casements" className="bg-gray-800 hover:bg-gray-700 text-white">
                              Fixed + Side Casements
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
                      <Label htmlFor="glazingType">Glazing Type</Label>
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
                          <SelectValue placeholder="Select glazing type" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600 text-white z-50">
                          <SelectItem value="single" className="bg-gray-800 hover:bg-gray-700 text-white">
                            Single
                          </SelectItem>
                          <SelectItem value="double" className="bg-gray-800 hover:bg-gray-700 text-white">
                            Double
                          </SelectItem>
                          <SelectItem value="triple" className="bg-gray-800 hover:bg-gray-700 text-white">
                            Triple
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {getFieldError('glazingType') && (
                        <p className="text-sm text-red-400 mt-1">{getFieldError('glazingType')}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="glassColor">Glass Color / Tint</Label>
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
                          <SelectValue placeholder="Clear, Green, Bronze..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600 text-white z-50">
                          <SelectItem value="clear" className="bg-gray-800 hover:bg-gray-700 text-white">
                            Clear
                          </SelectItem>
                          <SelectItem value="green" className="bg-gray-800 hover:bg-gray-700 text-white">
                            Green
                          </SelectItem>
                          <SelectItem value="blue" className="bg-gray-800 hover:bg-gray-700 text-white">
                            Blue
                          </SelectItem>
                          <SelectItem value="bronze" className="bg-gray-800 hover:bg-gray-700 text-white">
                            Bronze
                          </SelectItem>
                          <SelectItem value="grey" className="bg-gray-800 hover:bg-gray-700 text-white">
                            Grey
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {getFieldError('glassColor') && (
                        <p className="text-sm text-red-400 mt-1">{getFieldError('glassColor')}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="flyScreenType">Flyscreen Type</Label>
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
                        <SelectValue placeholder="Select flyscreen type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600 text-white z-50">
                        <SelectItem value="none" className="bg-gray-800 hover:bg-gray-700 text-white">
                          None
                        </SelectItem>
                        <SelectItem value="plisee" className="bg-gray-800 hover:bg-gray-700 text-white">
                          Plisse
                        </SelectItem>
                        <SelectItem value="fixed" className="bg-gray-800 hover:bg-gray-700 text-white">
                          Fixed
                        </SelectItem>
                        <SelectItem value="sliding" className="bg-gray-800 hover:bg-gray-700 text-white">
                          Sliding
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {getFieldError('flyScreenType') && (
                      <p className="text-sm text-red-400 mt-1">{getFieldError('flyScreenType')}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Select value={measurements.color} onValueChange={(value) => handleInputChange('color', value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-600">
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600 text-white z-50">
                        <SelectItem value="Silver" className="bg-gray-800 hover:bg-gray-700 text-white">Silver</SelectItem>
                        <SelectItem value="White" className="bg-gray-800 hover:bg-gray-700 text-white">White</SelectItem>
                        <SelectItem value="Black" className="bg-gray-800 hover:bg-gray-700 text-white">Black</SelectItem>
                        <SelectItem value="Bronze" className="bg-gray-800 hover:bg-gray-700 text-white">Bronze</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* STEP 4: Location Context */}
              {currentStep === 3 && (
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                    Location / Pose details (optional)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px]">Building / Block</Label>
                      <Input
                        value={measurements.buildingBlock}
                        onChange={(e) => handleInputChange('buildingBlock', e.target.value)}
                        placeholder="Block A"
                        className="h-8 bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Flat / Unit</Label>
                      <Input
                        value={measurements.unitOrApartment}
                        onChange={(e) => handleInputChange('unitOrApartment', e.target.value)}
                        placeholder="Flat 12"
                        className="h-8 bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Floor</Label>
                      <Input
                        value={measurements.floor}
                        onChange={(e) => handleInputChange('floor', e.target.value)}
                        placeholder="3"
                        className="h-8 bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Room / Zone</Label>
                      <Input
                        value={measurements.roomOrZone}
                        onChange={(e) => handleInputChange('roomOrZone', e.target.value)}
                        placeholder="Living, Bedroom..."
                        className="h-8 bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Elevation</Label>
                      <Input
                        value={measurements.elevation}
                        onChange={(e) => handleInputChange('elevation', e.target.value)}
                        placeholder="North, Street, Garden..."
                        className="h-8 bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Window Index</Label>
                      <Input
                        value={measurements.windowIndex}
                        onChange={(e) => handleInputChange('windowIndex', e.target.value)}
                        placeholder="W1, W2..."
                        className="h-8 bg-gray-800 border-gray-600"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-[11px]">Remarks</Label>
                      <Input
                        value={measurements.remarks}
                        onChange={(e) => handleInputChange('remarks', e.target.value)}
                        placeholder="Any special note for this pose"
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
                        <ShieldCheck className="h-5 w-5" /> Trust but Verify
                      </h3>
                      <Badge variant="outline" className="bg-green-900/30 text-green-400 border-green-800">
                        Calibration Accuracy: 98%
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-300 mb-4">
                      The system has calculated cut dimensions based on your inputs and profile calibration data.
                      Please verify these critical dimensions against site conditions to prevent waste.
                    </p>
                    
                    <div className="space-y-3 text-sm bg-black/20 p-3 rounded border border-gray-800">
                       <div className="flex justify-between items-center">
                         <span className="text-gray-400">Overall Width Input:</span>
                         <span className="font-mono text-white text-base">{measurements.width} mm</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-gray-400">Deduction (K-Factor):</span>
                         <span className="font-mono text-red-400">- 6 mm</span> 
                       </div>
                       <div className="h-px bg-gray-700 my-1" />
                       <div className="flex justify-between items-center font-bold">
                         <span className="text-orange-400">Calculated Cut Length:</span>
                         <span className="font-mono text-green-400 text-lg">{Number(measurements.width) - 6} mm</span>
                       </div>
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
                      I verify these dimensions match site requirements and accept responsibility for production.
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
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
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
                  <QrCode className="mr-2 h-4 w-4" /> Print Label
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
                Finalize Design <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={nextStep} className="bg-orange-600 hover:bg-orange-500 text-white">
              Next Step <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Right Panel: The 3D Stage */}
      <div className="flex-1 bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800 relative overflow-hidden shadow-2xl">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {/* New "Exploded View" Toggle */}
          <Toggle 
            pressed={explodedView} 
            onPressedChange={setExplodedView}
            className="bg-black/50 backdrop-blur text-white data-[state=on]:bg-orange-600"
          >
            <Layers className="h-4 w-4 mr-2" /> Explode
          </Toggle>
        </div>

        {/* Pass the highlightedDimension to the generator to illuminate the arrow */}
        {previewWindowUnit && (
          <Suspense fallback={
            <div className="w-full h-full min-h-[500px] flex items-center justify-center text-gray-500">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Loading 3D Engine...</span>
              </div>
            </div>
          }>
            <Window3DGenerator 
              key={isGridMode ? `grid-${grid.rows}-${grid.cols}-${grid.cells.length}-${previewWindowUnit?.type}` : `standard-view-${previewWindowUnit?.type}`}
              windowUnit={previewWindowUnit}
              showControls={true}
              presentationMode={false}
              highlightDimension={highlightedDimension}
              explodedView={explodedView}
              setExplodedView={setExplodedView}
              quality="high"
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

/**
 * Small inline icon component for the system pack header so we don't
 * pull additional imports into the top of the file.
 */
const FactoryIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className="h-4 w-4 text-orange-400"
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M4 3a1 1 0 0 1 1 1v6.382l4-2.309l.008-.004A1 1 0 0 1 10 8a1 1 0 0 1 .553.169L15 11.382V8a1 1 0 1 1 2 0v4.618l.553-.32l.008-.004L21 11.382V8a1 1 0 1 1 2 0v12a1 1 0 0 1-1 1H2.999A1 1 0 0 1 2 20.999V4a1 1 0 0 1 1-1Zm0 10v7h18v-6.382l-4 2.309l-.008.004A1 1 0 0 1 17 16a1 1 0 0 1-.553-.169L11 12.618l-4 2.309l-.008.004A1 1 0 0 1 6 15a1 1 0 0 1-.553-.169Zm3 3h2v3H7Zm4 0h2v3h-2Zm4 0h2v3h-2Z"
    />
  </svg>
);
