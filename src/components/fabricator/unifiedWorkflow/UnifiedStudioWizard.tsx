/**
 * Unified Studio Wizard Component
 * 
 * Consolidates Profile Studio, System Pack Studio, and Tuning Studio
 * into a single unified wizard flow with 4 steps:
 * 1. Import DXF
 * 2. Tune Profile/System Pack
 * 3. Calibrate
 * 4. Verify & Save
 * 
 * Reuses patterns from OnboardingWizard and QuoteRequestStepper.
 * 
 * Constitutional: Deterministic wizard flow, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { addCustomSystemAsync } from '@/lib/fabricator/customSystemStorage';
import { buildCustomSystemPack } from '@/lib/fabricator/systemPackBuilder';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/ui/dialog';
import { Progress } from '@/shared/ui/ui/progress';
import {
    CheckCircle2,
    ChevronLeft, ChevronRight,
    FileUp,
    Loader2,
    Ruler,
    Settings,
    X
} from 'lucide-react';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export type StudioType = 'profile' | 'system-pack' | 'tuning';

interface UnifiedStudioWizardProps {
  /** Type of studio (profile, system-pack, or tuning) */
  studioType: StudioType;
  /** Whether the wizard is open */
  open: boolean;
  /** Callback when wizard closes */
  onOpenChange: (open: boolean) => void;
  /** Callback when wizard completes */
  onComplete?: (data: StudioWizardData) => void;
  /** Initial data (for editing existing items) */
  initialData?: Partial<StudioWizardData>;
}

export interface StudioWizardData {
  studioType: StudioType;
  // Step 1: Import
  dxfFile?: File;
  dxfData?: any;
  importMethod?: 'dxf' | 'smartscan' | 'manual';
  // Step 2: Tune
  profileData?: any;
  systemPackData?: any;
  tuningParams?: any;
  // Step 3: Calibrate
  calibrationData?: any;
  micronConfig?: any;
  // Step 4: Verify
  validationResults?: any;
  verified: boolean;
}

const STUDIO_STEPS = [
  { id: 'import', title: 'Import DXF', icon: FileUp, description: 'Import profile or system pack from DXF file' },
  { id: 'tune', title: 'Tune', icon: Settings, description: 'Configure profiles and system pack parameters' },
  { id: 'calibrate', title: 'Calibrate', icon: Ruler, description: 'Calibrate machining zones and micron settings' },
  { id: 'verify', title: 'Verify & Save', icon: CheckCircle2, description: 'Validate and save to library' },
];

export const UnifiedStudioWizard: React.FC<UnifiedStudioWizardProps> = ({
  studioType,
  open,
  onOpenChange,
  onComplete,
  initialData,
}) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<StudioWizardData>({
    studioType,
    verified: false,
    ...initialData,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const progressPercent = ((currentStep + 1) / STUDIO_STEPS.length) * 100;
  const currentStepData = STUDIO_STEPS[currentStep];

  const updateData = useCallback((stepData: Partial<StudioWizardData>) => {
    setWizardData(prev => ({ ...prev, ...stepData }));
  }, []);

  const handleComplete = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Mark as verified
      const finalData = { ...wizardData, verified: true };
      
      // Save based on studio type
      if (studioType === 'system-pack' && finalData.systemPackData && userId) {
        // Build system pack from wizard data
        const systemPack = buildCustomSystemPack({
          name: finalData.systemPackData.name || 'Custom System Pack',
          profiles: finalData.dxfData?.profiles.map((p: any) => ({
            ...p,
            role: finalData.systemPackData.profiles?.find((sp: any) => sp.id === p.id)?.role || p.role,
          })) || [],
          hardware: finalData.systemPackData.hardware || [],
          machiningZones: finalData.micronConfig?.machiningZones || [],
        });
        
        // Save to Supabase - cast to SystemPack type expected by addCustomSystemAsync
        await addCustomSystemAsync(systemPack as any, userId);
      } else if (studioType === 'profile' && finalData.profileData && userId) {
        // Save profile to Supabase (via ProfileDefinitionManager or similar)
        // This would be handled by ProfileTuningStudio's save logic
        console.log('Profile data ready for save:', finalData.profileData);
      }
      
      await onComplete?.(finalData);
      
      // Navigate to appropriate studio page
      if (studioType === 'profile') {
        navigate('/fabricator/profile-studio');
      } else if (studioType === 'system-pack') {
        navigate('/fabricator/system-packs');
      } else {
        navigate('/fabricator/tuning-studio');
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error completing studio wizard:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [wizardData, studioType, navigate, onComplete, onOpenChange, userId]);

  const handleNext = useCallback(() => {
    if (currentStep < STUDIO_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, handleComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  }, [isSubmitting, onOpenChange]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: // Import
        return wizardData.dxfFile || wizardData.dxfData || wizardData.importMethod === 'manual';
      case 1: // Tune
        return wizardData.profileData || wizardData.systemPackData || wizardData.tuningParams;
      case 2: // Calibrate
        return wizardData.calibrationData || wizardData.micronConfig;
      case 3: // Verify
        return wizardData.verified;
      default:
        return false;
    }
  }, [currentStep, wizardData]);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    if (open) {
      getUserId();
    }
  }, [open]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <ImportStep data={wizardData} onUpdate={updateData} studioType={studioType} userId={userId} />;
      case 1:
        return <TuneStep data={wizardData} onUpdate={updateData} studioType={studioType} userId={userId} />;
      case 2:
        return <CalibrateStep data={wizardData} onUpdate={updateData} studioType={studioType} userId={userId} />;
      case 3:
        return <VerifyStep data={wizardData} onUpdate={updateData} studioType={studioType} userId={userId} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-amber-600/30 sticky top-0 bg-slate-950/95 backdrop-blur z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-semibold text-amber-200">
                {studioType === 'profile' ? 'Profile Studio' : 
                 studioType === 'system-pack' ? 'System Pack Studio' : 
                 'Tuning Studio'}
              </DialogTitle>
              <DialogDescription className="text-sm text-amber-600/70 mt-1">
                {currentStepData.description}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-amber-600/70 hover:text-amber-400"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress Stepper - Reusing QuoteRequestStepper pattern */}
          <div className="mt-4">
            <div className="flex gap-2 flex-wrap overflow-x-auto sm:overflow-visible" role="tablist" aria-label="Studio steps">
              {STUDIO_STEPS.map((step, index) => {
                const active = index === currentStep;
                const complete = index < currentStep;
                const Icon = step.icon;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => !isSubmitting && setCurrentStep(index)}
                    aria-current={active ? 'step' : undefined}
                    aria-disabled={isSubmitting}
                    className={`group flex items-center flex-shrink-0 rounded-full border transition px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/70
                      ${active ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-inner' : complete ? 'bg-slate-800/70 border-amber-800 text-amber-500' : 'bg-slate-900/40 border-amber-600/10 text-slate-400'}
                      ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:border-amber-500/70 hover:text-amber-300'}
                    `}
                  >
                    <span
                      className={`mr-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition
                        ${active ? 'bg-amber-600 text-white' : complete ? 'bg-amber-700/70 text-white' : 'bg-slate-800 text-slate-400'}
                      `}
                    >
                      {complete ? '✓' : <Icon className="h-3 w-3" />}
                    </span>
                    <span className="whitespace-nowrap select-none">
                      {step.title}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 h-1 hidden md:flex w-full bg-gradient-to-r from-amber-700/40 via-amber-500/40 to-transparent rounded" />
            <Progress value={progressPercent} className="mt-2 h-2 bg-slate-800" />
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-6 px-6">
          {renderStepContent()}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-amber-600/30 flex items-center justify-between bg-slate-950/95 backdrop-blur">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 0 || isSubmitting}
            className="text-amber-600/70 hover:text-amber-400"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-600/30 text-amber-500">
              Step {currentStep + 1} of {STUDIO_STEPS.length}
            </Badge>
          </div>

          <Button
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : currentStep === STUDIO_STEPS.length - 1 ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save & Complete
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Step Components - Connected to actual studio components

interface StepProps {
  data: StudioWizardData;
  onUpdate: (data: Partial<StudioWizardData>) => void;
  studioType: StudioType;
  userId?: string | null;
}

const ImportStep: React.FC<StepProps> = ({ data, onUpdate, studioType, userId }) => {
  const [_importedProfiles, setImportedProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  // Dynamic import to avoid circular dependencies
  const DXFProfileImporter = React.lazy(() => 
    import('@/components/fabricator/smartscan/DXFProfileImporter').then(m => ({ default: m.DXFProfileImporter }))
  );

  const handleImported = (profiles: any[]) => {
    setImportedProfiles(profiles);
    if (profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
      onUpdate({ 
        dxfData: { profiles, selectedProfileId: profiles[0].id },
        profileData: studioType === 'profile' ? profiles[0] : undefined,
        systemPackData: studioType === 'system-pack' ? { profiles } : undefined
      });
    }
  };

  return (
    <Card className="bg-slate-900/90 border-amber-600/30">
      <CardHeader>
        <CardTitle className="text-amber-200">Import {studioType === 'profile' ? 'Profile' : 'System Pack'}</CardTitle>
        <CardDescription>Upload a DXF file or use SmartScan to import</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Suspense fallback={<div className="text-slate-400">Loading DXF importer...</div>}>
          <DXFProfileImporter
            onImported={handleImported}
            selectedProfileId={selectedProfileId}
            onSelectProfile={setSelectedProfileId}
            userId={userId || undefined}
            onProfileSaved={(profileId) => {
              console.log('Profile saved:', profileId);
            }}
            extractMultipleProfiles={studioType === 'system-pack'}
          />
        </Suspense>
        {data.dxfFile && (
          <p className="mt-4 text-sm text-amber-500">
            Selected: {data.dxfFile.name}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const TuneStep: React.FC<StepProps> = ({ data, onUpdate, studioType, userId: _userId }) => {
  const [roles, setRoles] = useState<Record<string, any>>({});
  const [_linkedHardware, setLinkedHardware] = useState<any[]>([]);
  
  // Dynamic imports
  const RoleTagger = React.lazy(() => 
    import('@/components/fabricator/smartscan/RoleTagger').then(m => ({ default: m.RoleTagger }))
  );
  const HardwareLinker = React.lazy(() => 
    import('@/components/fabricator/smartscan/HardwareLinker').then(m => ({ default: m.HardwareLinker }))
  );

  const profiles = data.dxfData?.profiles || [];
  const selectedProfileId = data.dxfData?.selectedProfileId || profiles[0]?.id;

  const handleRoleChange = (id: string, role: any) => {
    const newRoles = { ...roles, [id]: role };
    setRoles(newRoles);
    onUpdate({ 
      profileData: studioType === 'profile' ? { ...data.profileData, role } : data.profileData,
      systemPackData: studioType === 'system-pack' ? { 
        ...data.systemPackData, 
        profiles: profiles.map(p => p.id === id ? { ...p, role } : p)
      } : data.systemPackData
    });
  };

  const handleHardwareLinked = (hardware: any[]) => {
    setLinkedHardware(hardware);
    onUpdate({ 
      profileData: studioType === 'profile' ? { ...data.profileData, hardware } : data.profileData,
      systemPackData: studioType === 'system-pack' ? { 
        ...data.systemPackData, 
        hardware 
      } : data.systemPackData
    });
  };

  if (profiles.length === 0) {
    return (
      <Card className="bg-slate-900/90 border-amber-600/30">
        <CardHeader>
          <CardTitle className="text-amber-200">Tune Configuration</CardTitle>
          <CardDescription>Import profiles first to configure them</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Please complete the Import step first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/90 border-amber-600/30">
      <CardHeader>
        <CardTitle className="text-amber-200">Tune Configuration</CardTitle>
        <CardDescription>Configure {studioType === 'profile' ? 'profile' : 'system pack'} parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Role Tagging */}
        <div>
          <h4 className="text-amber-300 mb-3">Tag Profile Roles</h4>
          <Suspense fallback={<div className="text-slate-400">Loading role tagger...</div>}>
            <RoleTagger
              profiles={profiles}
              roles={roles}
              onChangeRole={handleRoleChange}
            />
          </Suspense>
        </div>

        {/* Hardware Linking */}
        {studioType === 'system-pack' && (
          <div>
            <h4 className="text-amber-300 mb-3">Link Hardware</h4>
            <Suspense fallback={<div className="text-slate-400">Loading hardware linker...</div>}>
              <HardwareLinker
                profiles={profiles}
                selectedProfileId={selectedProfileId}
                onHardwareLinked={handleHardwareLinked}
              />
            </Suspense>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CalibrateStep: React.FC<StepProps> = ({ data, onUpdate, studioType, userId }) => {
  // Dynamic import
  const CalibrationWizard = React.lazy(() => 
    import('@/components/fabricator/CalibrationWizard').then(m => ({ default: m.CalibrationWizard }))
  );
  const MachiningZoneEditor = React.lazy(() => 
    import('@/components/fabricator/smartscan/MachiningZoneEditor').then(m => ({ default: m.MachiningZoneEditor }))
  );

  const profiles = data.dxfData?.profiles || [];
  const selectedProfile = profiles.find(p => p.id === data.dxfData?.selectedProfileId) || profiles[0];
  const linkedHardware = data.systemPackData?.hardware || [];

  if (!selectedProfile) {
    return (
      <Card className="bg-slate-900/90 border-amber-600/30">
        <CardHeader>
          <CardTitle className="text-amber-200">Calibrate</CardTitle>
          <CardDescription>Import and configure profiles first</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Please complete the Import and Tune steps first.</p>
        </CardContent>
      </Card>
    );
  }

  // Convert ImportedProfile to Profile format for CalibrationWizard
  const profileForCalibration: any = {
    id: selectedProfile.id,
    name: selectedProfile.name || selectedProfile.fileName,
    width: selectedProfile.widthMm || 60,
    height: selectedProfile.heightMm || 40,
    material: 'aluminum',
    color: 'default',
    costPerMeter: 0,
    cuttingAllowance: 0,
    stockQuantity: 0,
    minStockLevel: 0,
    supplier: '',
    userId: userId || undefined,
  };

  const handleCalibrationComplete = (calibration: any) => {
    onUpdate({ 
      calibrationData: calibration,
      profileData: studioType === 'profile' ? { 
        ...data.profileData, 
        calibration 
      } : data.profileData
    });
  };

  const handleZonesChange = (zones: any[]) => {
    onUpdate({ 
      micronConfig: { machiningZones: zones },
      profileData: studioType === 'profile' ? { 
        ...data.profileData, 
        machiningZones: zones 
      } : data.profileData
    });
  };

  return (
    <Card className="bg-slate-900/90 border-amber-600/30">
      <CardHeader>
        <CardTitle className="text-amber-200">Calibrate</CardTitle>
        <CardDescription>Calibrate machining zones and micron settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calibration Wizard */}
        <div>
          <h4 className="text-amber-300 mb-3">K-Factor & Cutting Calibration</h4>
          <Suspense fallback={<div className="text-slate-400">Loading calibration wizard...</div>}>
            <CalibrationWizard
              profile={profileForCalibration}
              systemPackId={data.systemPackData?.systemPackId || 'custom'}
              onCalibrationComplete={handleCalibrationComplete}
              userId={userId || undefined}
            />
          </Suspense>
        </div>

        {/* Machining Zones */}
        {studioType === 'system-pack' && (
          <div>
            <h4 className="text-amber-300 mb-3">Machining Zones</h4>
            <Suspense fallback={<div className="text-slate-400">Loading machining zone editor...</div>}>
              <MachiningZoneEditor
                profiles={profiles}
                selectedProfileId={selectedProfile.id}
                linkedHardware={linkedHardware}
                onZonesChange={handleZonesChange}
              />
            </Suspense>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const VerifyStep: React.FC<StepProps> = ({ data, onUpdate, studioType }) => {
  const handleVerify = () => {
    onUpdate({ verified: true });
  };

  const validationItems = [
    {
      label: 'DXF imported successfully',
      status: data.dxfData?.profiles && data.dxfData.profiles.length > 0 ? 'valid' : 'error',
    },
    {
      label: 'Roles tagged',
      status: studioType === 'system-pack' 
        ? (data.systemPackData?.profiles?.every((p: any) => p.role) ? 'valid' : 'warning')
        : (data.profileData?.role ? 'valid' : 'warning'),
    },
    {
      label: 'Calibration complete',
      status: data.calibrationData ? 'valid' : 'warning',
    },
    {
      label: 'Machining zones defined',
      status: data.micronConfig?.machiningZones && data.micronConfig.machiningZones.length > 0 ? 'valid' : 'warning',
    },
  ];

  const allValid = validationItems.every(item => item.status === 'valid');

  return (
    <Card className="bg-slate-900/90 border-amber-600/30">
      <CardHeader>
        <CardTitle className="text-amber-200">Verify & Save</CardTitle>
        <CardDescription>Review and save to library</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-slate-800/50 rounded-lg border border-amber-600/20">
          <h4 className="text-amber-300 mb-2">Validation Summary</h4>
          <ul className="space-y-2 text-sm">
            {validationItems.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                {item.status === 'valid' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : item.status === 'warning' ? (
                  <CheckCircle2 className="h-4 w-4 text-amber-400" />
                ) : (
                  <X className="h-4 w-4 text-red-400" />
                )}
                <span className={item.status === 'valid' ? 'text-emerald-400' : item.status === 'warning' ? 'text-amber-400' : 'text-red-400'}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
        
        {studioType === 'system-pack' && data.systemPackData && (
          <div className="p-4 bg-slate-800/50 rounded-lg border border-amber-600/20">
            <h4 className="text-amber-300 mb-2">System Pack Summary</h4>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>Profiles: {data.dxfData?.profiles?.length || 0}</li>
              <li>Hardware items: {data.systemPackData.hardware?.length || 0}</li>
              <li>Machining zones: {data.micronConfig?.machiningZones?.length || 0}</li>
            </ul>
          </div>
        )}
        
        <Button
          onClick={handleVerify}
          disabled={!allValid}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Verify & Save to Library
        </Button>
      </CardContent>
    </Card>
  );
};

export default UnifiedStudioWizard;

