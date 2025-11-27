import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Ruler, Camera, Scan, Smartphone, AlertCircle, Box } from 'lucide-react';
import { MeasurementData, SystemProfileSelections, WindowUnit } from '@/types/fabricator';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { validateMeasurements, ValidationError } from '@/lib/fabricatorValidation';
import { Window3DGenerator, WindowMeasurementOverlay } from './Window3DGenerator';

interface SmartMeasuringInterfaceProps {
  onMeasurementComplete: (data: MeasurementData) => void;
  /** Optional preselected system pack ID, typically from NewProjectWizard */
  systemPackId?: string;
}

export const SmartMeasuringInterface: React.FC<SmartMeasuringInterfaceProps> = ({
  onMeasurementComplete,
  systemPackId,
}) => {
  const [measurements, setMeasurements] = useState({
    // Default professional stub dimensions – can be refined per system later.
    width: '1200',
    height: '1200',
    windowType: '',
    color: '',
    glazingType: '',
  });

  const [selectedSystemPackId, setSelectedSystemPackId] = useState<string>(() => {
    if (systemPackId) return systemPackId;
    // Default to first configured system pack (typically regional)
    return SYSTEM_PACKS[0]?.meta.id || 'rock60';
  });

  const [systemProfileSelections, setSystemProfileSelections] = useState<SystemProfileSelections>(
    {},
  );

  const [isScanning, setIsScanning] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [show3DPreview, setShow3DPreview] = useState(true);

  // Generate preview window unit from measurements for 3D visualization
  const previewWindowUnit = useMemo<WindowUnit | null>(() => {
    const width = Number(measurements.width);
    const height = Number(measurements.height);
    
    if (!measurements.width || !measurements.height || !measurements.windowType || 
        isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      return null;
    }

    return {
      id: 'preview',
      orderNumber: 'PREVIEW',
      posNumber: 'PREVIEW',
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
      updatedAt: new Date()
    };
  }, [measurements]);

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

  const getFieldError = (field: string): string | undefined => {
    return fieldErrors[field];
  };

  const activeSystemPack = useMemo(
    () => SYSTEM_PACKS.find((p) => p.meta.id === selectedSystemPackId) ?? SYSTEM_PACKS[0],
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
    const validation = validateMeasurements(measurements);

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

    const payload: MeasurementData = {
      ...measurements,
      systemPackId: selectedSystemPackId,
      systemProfileSelections,
    };

    onMeasurementComplete(payload);
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
    <div className="space-y-6">
      {/* System pack + profile selection */}
      <Card className="bg-gray-800/60 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <FactoryIcon />
              <span>System Pack & Profiles</span>
            </div>
            {activeSystemPack && (
              <span className="text-[11px] text-gray-300">
                {activeSystemPack.meta.name}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <Label className="text-[11px]">System Pack</Label>
              <Select
                value={selectedSystemPackId}
                onValueChange={(value) => setSelectedSystemPackId(value)}
              >
                <SelectTrigger className="bg-gray-900 border-gray-700 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-xs max-h-60">
                  {SYSTEM_PACKS.map((pack) => (
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
              <p className="mt-1 text-[10px] text-gray-500">
                Controls which pack rules and profile codes apply to this unit (e.g. ROCK 60 vs
                JUMBO100).
              </p>
            </div>

            <div className="md:col-span-2 space-y-3">
              {systemPackRoleOptions.length === 0 ? (
                <p className="text-[11px] text-gray-400">
                  This system does not yet expose detailed profile roles. You can still continue
                  measuring and design as normal.
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
                          className={`bg-gray-900 border-gray-700 h-8 text-xs ${
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
                      <p className="text-[10px] text-gray-500">{role.description}</p>
                      {error && <p className="text-[10px] text-red-400">{error}</p>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Input */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-orange-400" />
            Manual Measurements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {validationErrors.length > 0 && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-500">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="text-sm">{error.message}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="width">Width (mm)</Label>
              <Input
                id="width"
                type="number"
                value={measurements.width}
                onChange={(e) => handleInputChange('width', e.target.value)}
                placeholder="1200"
                min="300"
                max="5000"
                className={`bg-gray-800 border-gray-600 ${getFieldError('width') ? 'border-red-500' : ''}`}
              />
              {getFieldError('width') && (
                <p className="text-sm text-red-400 mt-1">{getFieldError('width')}</p>
              )}
            </div>
            <div>
              <Label htmlFor="height">Height (mm)</Label>
              <Input
                id="height"
                type="number"
                value={measurements.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                placeholder="1500"
                min="300"
                max="5000"
                className={`bg-gray-800 border-gray-600 ${getFieldError('height') ? 'border-red-500' : ''}`}
              />
              {getFieldError('height') && (
                <p className="text-sm text-red-400 mt-1">{getFieldError('height')}</p>
              )}
            </div>
          </div>
          
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
        </CardContent>
      </Card>

      {/* AR Scanning */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-orange-400" />
            AR Measurement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="p-8 border-2 border-dashed border-gray-600 rounded-lg">
              <Scan className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-400 mb-4">
                {isScanning ? 'Scanning in progress...' : 'Point your device camera at the window opening'}
              </p>
              {isScanning && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                </div>
              )}
            </div>
            <Button 
              onClick={startARScan}
              disabled={isScanning}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Start AR Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3D Preview with AR Measurement Visualization */}
      {show3DPreview && previewWindowUnit && (
        <Card className="bg-gray-700/50 border-gray-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5 text-orange-400" />
                3D Model Preview
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShow3DPreview(false)}
              >
                Hide Preview
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-600 relative">
              <Window3DGenerator 
                windowUnit={previewWindowUnit}
                showControls={true}
                presentationMode={false}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2 text-center">
              Real-time 3D visualization with measurement overlays. The model updates as you enter dimensions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Show 3D Preview Button if hidden */}
      {!show3DPreview && previewWindowUnit && (
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4">
            <Button
              variant="outline"
              onClick={() => setShow3DPreview(true)}
              className="w-full"
            >
              <Box className="h-4 w-4 mr-2" />
              Show 3D Preview
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit}
          disabled={
            !measurements.width || !measurements.height || !measurements.windowType || isScanning
          }
          className="bg-orange-500 hover:bg-orange-600"
        >
          Continue to Design
        </Button>
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

