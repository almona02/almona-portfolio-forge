import { SYSTEM_PACKS } from '@/data/systemPacks';
import { EGYPTIAN_UPVC_SYSTEMS } from '@/data/upvc-systems';
import { addCustomSystem, loadCustomSystems } from '@/lib/fabricator/customSystemStorage';
import { getSystemPackTuningStatus, saveReturnUrl } from '@/lib/fabricator/systemTuningUtils';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Progress } from '@/shared/ui/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { AlertCircle, ArrowRight, BoxSelect, Check, CheckCircle2, Factory, Layers, MapPin, Ruler, Settings } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomSystemManager } from './CustomSystemManager';
import type { ProjectHeaderMeta } from './NewProjectWizard';
import { SystemTuningStudio } from './SystemTuningStudio';

type WindZone = 'inland' | 'coastal' | 'high_wind';
type Exposure = 'street' | 'backyard' | 'open_field';
type UsageType = 'residential' | 'commercial' | 'hotel' | 'hospital';
type OpeningType = 'sliding' | 'casement' | 'tilt_turn' | 'door';
type BaseShape = 'single' | 'two_sash' | 'three_sash' | 'balcony';

interface EgyptianProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (meta: ProjectHeaderMeta & {
    governorate?: string;
    windZone?: WindZone;
    exposure?: Exposure;
    floorLevel?: number;
    usageType?: UsageType;
    baseShape?: BaseShape;
    openingType?: OpeningType;
    recommendedSystemIds?: string[];
  }) => void;
  onFallback?: () => void;
  initialMeta?: Partial<ProjectHeaderMeta>;
}

const GOVERNORATES: { name: string; windZone: WindZone }[] = [
  { name: 'Cairo', windZone: 'inland' },
  { name: 'Giza', windZone: 'inland' },
  { name: 'Alexandria', windZone: 'coastal' },
  { name: 'Port Said', windZone: 'coastal' },
  { name: 'North Coast', windZone: 'high_wind' },
  { name: 'Delta', windZone: 'inland' },
];

const _defaultSystems = ['panda-50', 'rock60'];

export const EgyptianProjectWizard: React.FC<EgyptianProjectWizardProps> = ({
  open,
  onOpenChange,
  onSubmit,
  onFallback,
  initialMeta,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [useEgyptianStandards, setUseEgyptianStandards] = useState(
    initialMeta?.region ? initialMeta.region === 'egypt' : true,
  );
  const [showTuningStudio, setShowTuningStudio] = useState(false);
  const [customSystems, setCustomSystems] = useState<any[]>([]);
  const [tuningInitialSystem, setTuningInitialSystem] = useState<any | null>(null);
  const [showTuningPrompt, setShowTuningPrompt] = useState(false);

  // Load custom systems and tuned systems from localStorage
  React.useEffect(() => {
    const saved = loadCustomSystems();
    const tunedSystems: any[] = [];
    
    // Also load tuned systems from localStorage (custom-profile-* and system-pack-*)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('custom-profile-') || key?.startsWith('system-pack-')) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const pack = JSON.parse(stored);
            // Only include if it's tuned
            if (pack.tuningStatus === 'tuned' || pack.profiles?.some((p: any) => p.tuningStatus === 'tuned')) {
              tunedSystems.push(pack);
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    // Merge custom systems and tuned systems, avoiding duplicates
    const allCustom = [...saved, ...tunedSystems];
    const unique = allCustom.filter((sys, idx, self) => 
      idx === self.findIndex((s) => s.meta?.id === sys.meta?.id || s.id === sys.id)
    );
    if (unique.length) setCustomSystems(unique);
    
    // Listen for system pack tuned events
    const handleSystemPackTuned = () => {
      const updated = loadCustomSystems();
      // Reload tuned systems
      const newTuned: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('custom-profile-') || key?.startsWith('system-pack-')) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const pack = JSON.parse(stored);
              if (pack.tuningStatus === 'tuned' || pack.profiles?.some((p: any) => p.tuningStatus === 'tuned')) {
                newTuned.push(pack);
              }
            }
          } catch {
            // Ignore
          }
        }
      }
      const merged = [...updated, ...newTuned];
      const uniqueMerged = merged.filter((sys, idx, self) => 
        idx === self.findIndex((s) => s.meta?.id === sys.meta?.id || s.id === sys.id)
      );
      setCustomSystems(uniqueMerged);
    };
    
    window.addEventListener('systemPackTuned', handleSystemPackTuned);
    return () => window.removeEventListener('systemPackTuned', handleSystemPackTuned);
  }, []);

  // Core header
  const [clientName, setClientName] = useState(initialMeta?.clientName ?? '');
  const [projectName, setProjectName] = useState(initialMeta?.projectName ?? '');
  const [siteName, setSiteName] = useState(initialMeta?.siteName ?? '');

  // Step data
  const [governorate, setGovernorate] = useState(initialMeta?.egyptianConstraints?.governorate ?? GOVERNORATES[0].name);
  const [windZone, setWindZone] = useState<WindZone>(initialMeta?.egyptianConstraints?.windZone as WindZone ?? GOVERNORATES[0].windZone);
  const [exposure, setExposure] = useState<Exposure>((initialMeta?.egyptianConstraints?.exposure as Exposure) || 'street');
  const [floorLevel, setFloorLevel] = useState<number>(initialMeta?.egyptianConstraints?.floorLevel ?? 1);
  const [usageType, setUsageType] = useState<UsageType>((initialMeta?.egyptianConstraints?.usageType as UsageType) || 'residential');
  const [baseShape, setBaseShape] = useState<BaseShape>((initialMeta?.egyptianConstraints?.baseShape as BaseShape) || 'two_sash');
  const [openingType, setOpeningType] = useState<OpeningType>((initialMeta?.egyptianConstraints?.openingType as OpeningType) || 'sliding');
  const [materialPreference, setMaterialPreference] = useState<'aluminum' | 'upvc'>('aluminum');
  
  // Set default system based on material preference
  const getDefaultSystemForMaterial = (material: 'aluminum' | 'upvc'): string => {
    if (material === 'aluminum') {
      return 'caluminium-ps'; // PS system pack as default for aluminum
    } else {
      return 'foxywin_eco_smart_50'; // FoxyWin as default for UPVC
    }
  };

  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(
    getDefaultSystemForMaterial(materialPreference)
  );

  // Update selected system when material changes
  React.useEffect(() => {
    const defaultSystem = getDefaultSystemForMaterial(materialPreference);
    setSelectedSystemId(defaultSystem);
  }, [materialPreference]);

  // Check tuning status when system is selected - also check localStorage for tuned versions
  const selectedSystemPack = React.useMemo(() => {
    if (!selectedSystemId) return null;
    
    // First check localStorage for tuned version
    try {
      const tunedStored = localStorage.getItem(`custom-profile-${selectedSystemId}`) || 
                         localStorage.getItem(`system-pack-${selectedSystemId}`);
      if (tunedStored) {
        const tunedPack = JSON.parse(tunedStored);
        if (tunedPack.tuningStatus === 'tuned' || tunedPack.profiles?.some((p: any) => p.tuningStatus === 'tuned')) {
          return tunedPack;
        }
      }
    } catch {
      // Ignore errors
    }
    
    // Fall back to original systems
    return SYSTEM_PACKS.find((p) => p.meta.id === selectedSystemId) 
      || EGYPTIAN_UPVC_SYSTEMS.find((p) => (p as any).meta?.id === selectedSystemId)
      || customSystems.find((c) => c.meta?.id === selectedSystemId);
  }, [selectedSystemId, customSystems]);

  const tuningStatus = React.useMemo(() => {
    return getSystemPackTuningStatus(selectedSystemPack);
  }, [selectedSystemPack]);

  // Show tuning prompt if system needs tuning
  React.useEffect(() => {
    if (selectedSystemPack && tuningStatus.needsTuning && step >= 3) {
      setShowTuningPrompt(true);
    } else {
      setShowTuningPrompt(false);
    }
  }, [selectedSystemPack, tuningStatus, step]);

  const recommendedSystems = useMemo(() => {
    const recs = new Set<string>();
    const allSystems = [...SYSTEM_PACKS, ...EGYPTIAN_UPVC_SYSTEMS, ...customSystems];
    
    // Filter by material preference first
    const materialFiltered = allSystems.filter(pack => {
      const isUPVC = (pack as any).upvcSpec !== undefined;
      if (materialPreference === 'aluminum' && isUPVC) return false;
      if (materialPreference === 'upvc' && !isUPVC) return false;
      return true;
    });
    
    // Usage-based recommendations
    if (usageType === 'commercial' || usageType === 'hotel') {
      if (materialPreference === 'aluminum') {
        recs.add('caluminium-ps'); // PS system for commercial aluminum
        recs.add('panda-100');
        recs.add('jumbo100');
      } else {
        recs.add('foxywin_foxy_shield_60'); // Premium FoxyWin for commercial
        recs.add('veka_70_softline');
        recs.add('rehau_geneo');
      }
    } else {
      if (materialPreference === 'aluminum') {
        recs.add('caluminium-ps'); // PS system as primary recommendation
        recs.add('panda-50');
      } else {
        recs.add('foxywin_eco_smart_50'); // FoxyWin as primary recommendation
        recs.add('katra_pro_red_series'); // Katra PRO RED - Egyptian manufacturer for testing
        recs.add('wintech_6400_detailed');
        recs.add('kompen_60_eco');
      }
    }
    
    // Wind / exposure / floor
    if (windZone === 'high_wind' || floorLevel > 5) {
      if (materialPreference === 'aluminum') {
        recs.add('rock60');
        recs.add('jumbo100');
      } else {
        recs.add('veka_70_softline');
        recs.add('rehau_geneo');
      }
    } else if (windZone === 'coastal') {
      if (materialPreference === 'aluminum') {
        recs.add('rock60');
      } else {
        recs.add('veka_70_softline'); // UV stabilized for coastal
      }
    }
    
    // Opening preference
    if (openingType === 'sliding' || openingType === 'door') {
      if (materialPreference === 'aluminum') {
        recs.add('rock60');
      } else {
        recs.add('wintech_6400_detailed');
        recs.add('katra_pro_red_series'); // Katra has sliding system (S120)
      }
    }
    if (openingType === 'door') {
      if (materialPreference === 'aluminum') {
        recs.add('panda-100');
      } else {
        recs.add('rehau_geneo'); // High load capacity
      }
    }
    
    const list = Array.from(recs).filter((id) => 
      materialFiltered.find((p) => p.meta.id === id)
    );
    // Default fallback based on material
    const fallback = materialPreference === 'aluminum' 
      ? ['caluminium-ps'] // PS system as default for aluminum
      : ['foxywin_eco_smart_50']; // FoxyWin as default for UPVC
    return list.length ? list : fallback;
  }, [usageType, windZone, floorLevel, openingType, customSystems, materialPreference]);

  const canNext = () => {
    if (step === 0) return clientName.trim().length > 0 && projectName.trim().length > 0;
    return true;
  };

  const handleSubmit = () => {
    if (!selectedSystemId && recommendedSystems.length > 0) {
      setSelectedSystemId(recommendedSystems[0]);
    }
    onSubmit({
      clientName: clientName.trim(),
      projectName: projectName.trim(),
      siteName: siteName.trim() || undefined,
      currency: 'EGP',
      region: 'egypt',
      systemPackId: selectedSystemId || recommendedSystems[0] || getDefaultSystemForMaterial(materialPreference),
      allowedSystemPackIds: recommendedSystems,
      egyptianConstraints: {
        governorate,
        windZone,
        exposure,
        floorLevel,
        usageType,
        baseShape,
        openingType,
        recommendedByWizard: true,
        wizardVersion: '1.0',
      },
      governorate,
      windZone,
      exposure,
      floorLevel,
      usageType,
      baseShape,
      openingType,
      recommendedSystemIds: recommendedSystems,
    });
    onOpenChange(false);
  };

  const progress = ((step + 1) / 5) * 100;

  const handleFallback = () => {
    onOpenChange(false);
    if (onFallback) onFallback();
  };

  // Handle Enter key to trigger Next button
  React.useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if user is typing in an input/textarea
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        if (step < 4 && canNext()) {
          setStep((s) => Math.min(4, s + 1));
        } else if (step === 4) {
          handleSubmit();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto bg-gray-900 border-gray-800 text-white sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-orange-400" />
            Egyptian Project Wizard
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Captures Egyptian context (wind, floor, usage) and recommends the right system pack before measuring.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={progress} className="h-2" />

          <div className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-lg p-3">
            <div className="text-sm">
              <div className="font-semibold text-white">Use Egyptian engineering standards</div>
              <div className="text-xs text-gray-400">Switch off to use the standard (international) wizard.</div>
            </div>
            <Button
              variant={useEgyptianStandards ? 'default' : 'outline'}
              className={useEgyptianStandards ? 'bg-orange-600 hover:bg-orange-500' : 'border-gray-600'}
              onClick={() => {
                if (useEgyptianStandards) {
                  setUseEgyptianStandards(false);
                  handleFallback();
                } else {
                  setUseEgyptianStandards(true);
                }
              }}
            >
              {useEgyptianStandards ? 'Using Egyptian Mode' : 'Switch to Egyptian Mode'}
            </Button>
          </div>

          {step === 0 && (
            <div className="space-y-4">
              {/* Material Selection - FIRST STEP for Egypt Pilot */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Material Type (Egypt Pilot)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className={`relative p-4 rounded-lg border cursor-pointer transition-all ${
                      materialPreference === 'aluminum' 
                        ? 'bg-blue-900/20 border-blue-500 shadow-lg shadow-blue-500/20' 
                        : 'bg-gray-800/40 border-gray-700 hover:bg-gray-800'
                    }`}
                    onClick={() => setMaterialPreference('aluminum')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className={`h-5 w-5 ${materialPreference === 'aluminum' ? 'text-blue-400' : 'text-gray-400'}`} />
                      <span className={`text-base font-medium ${materialPreference === 'aluminum' ? 'text-blue-100' : 'text-gray-300'}`}>
                        Aluminum
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">Default: PS System Pack</div>
                    <div className="text-[10px] text-gray-500">60% Market Share (Standard)</div>
                    {materialPreference === 'aluminum' && (
                      <div className="absolute top-2 right-2 text-blue-500"><Check className="h-4 w-4" /></div>
                    )}
                  </div>
                  <div 
                    className={`relative p-4 rounded-lg border cursor-pointer transition-all ${
                      materialPreference === 'upvc' 
                        ? 'bg-green-900/20 border-green-500 shadow-lg shadow-green-500/20' 
                        : 'bg-gray-800/40 border-gray-700 hover:bg-gray-800'
                    }`}
                    onClick={() => setMaterialPreference('upvc')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <BoxSelect className={`h-5 w-5 ${materialPreference === 'upvc' ? 'text-green-400' : 'text-gray-400'}`} />
                      <span className={`text-base font-medium ${materialPreference === 'upvc' ? 'text-green-100' : 'text-gray-300'}`}>
                        UPVC (Welded)
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">Default: FoxyWin System</div>
                    <div className="text-[10px] text-gray-500">40% Market Share (Insulated)</div>
                    {materialPreference === 'upvc' && (
                      <div className="absolute top-2 right-2 text-green-500"><Check className="h-4 w-4" /></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Project Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="El Sherif Aluminum"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Nasr City Tower"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Site / Address</Label>
                  <Input
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Nasr City, Cairo"
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Governorate</Label>
                <Select
                  value={governorate}
                  onValueChange={(val) => {
                    setGovernorate(val);
                    const found = GOVERNORATES.find((g) => g.name === val);
                    if (found) setWindZone(found.windZone);
                  }}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {GOVERNORATES.map((g) => (
                      <SelectItem key={g.name} value={g.name}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Wind Zone</Label>
                <Select value={windZone} onValueChange={(val) => setWindZone(val as WindZone)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="inland">Inland (Cairo/Delta)</SelectItem>
                    <SelectItem value="coastal">Coastal (Alexandria)</SelectItem>
                    <SelectItem value="high_wind">High Wind (North Coast)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Exposure</Label>
                <Select value={exposure} onValueChange={(val) => setExposure(val as Exposure)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="street">Street / Wind-facing</SelectItem>
                    <SelectItem value="backyard">Backyard / Courtyard</SelectItem>
                    <SelectItem value="open_field">Open Field</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Floor Level</Label>
                  <Input
                    type="number"
                    min={0}
                    value={floorLevel}
                    onChange={(e) => setFloorLevel(Number(e.target.value || 0))}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Usage Type</Label>
                  <Select value={usageType} onValueChange={(val) => setUsageType(val as UsageType)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="hotel">Hotel</SelectItem>
                      <SelectItem value="hospital">Hospital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Opening Type</Label>
                  <Select value={openingType} onValueChange={(val) => setOpeningType(val as OpeningType)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="sliding">Sliding</SelectItem>
                      <SelectItem value="casement">Casement</SelectItem>
                      <SelectItem value="tilt_turn">Tilt & Turn</SelectItem>
                      <SelectItem value="door">Door</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {/* Tuning Status Alert */}
              {showTuningPrompt && selectedSystemPack && (
                <Alert className="bg-yellow-900/20 border-yellow-500/50">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong className="text-yellow-300">System needs tuning for accurate cut lists</strong>
                        <p className="text-xs text-gray-400 mt-1">
                          Configure Frame and Sash profiles, welding parameters, and cutting rules for 99.8% accuracy.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-500 text-white ml-4"
                        onClick={() => {
                          // Save return URL with wizard state
                          saveReturnUrl('/fabricator-workflow', {
                            returnToWizard: 'true',
                            systemPackId: selectedSystemId || '',
                            materialPreference,
                            clientName,
                            projectName,
                          });
                          // Navigate to no-DXF tuning studio
                          navigate(`/fabricator/tuning-studio-no-dxf?systemPackId=${selectedSystemId}`);
                        }}
                      >
                        <Settings className="h-3.5 w-3.5 mr-2" />
                        Tune System Now
                        <ArrowRight className="h-3.5 w-3.5 ml-2" />
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Shape</Label>
                  <Select value={baseShape} onValueChange={(val) => setBaseShape(val as BaseShape)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="two_sash">Two Sash</SelectItem>
                      <SelectItem value="three_sash">Three Sash</SelectItem>
                      <SelectItem value="balcony">Balcony Combo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Recommended Systems</Label>
                  <div className="flex flex-wrap gap-2">
                    {recommendedSystems.map((id) => {
                      const pack = SYSTEM_PACKS.find((p) => p.meta.id === id) 
                        || EGYPTIAN_UPVC_SYSTEMS.find((p) => (p as any).meta?.id === id)
                        || customSystems.find((c) => c.meta?.id === id);
                      if (!pack) return null;
                      const active = selectedSystemId === id;
                      const packTuningStatus = getSystemPackTuningStatus(pack);
                      return (
                        <button
                          key={id}
                          onClick={() => setSelectedSystemId(id)}
                          className={`relative px-3 py-2 rounded border text-xs transition ${
                            active ? 'border-orange-500 bg-orange-500/10 text-orange-200' : 'border-gray-700 hover:border-gray-500'
                          }`}
                        >
                          <span>{pack.meta.name}</span>
                          {!packTuningStatus.isTuned && packTuningStatus.hasProfiles && (
                            <span className="ml-2 text-[10px] text-yellow-500">Needs Tuning</span>
                          )}
                          {packTuningStatus.isTuned && (
                            <span className="ml-2 text-[10px] text-green-500">✓ Tuned</span>
                          )}
                          {pack.meta.id.startsWith('custom') && (
                            <span className="ml-2 text-[10px] text-amber-500">Custom</span>
                          )}
                          {pack.meta.id.startsWith('custom') && (
                            <div
                              className="absolute top-1 right-1 opacity-0 hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <CustomSystemManager
                                systemId={pack.meta.id}
                                systemName={pack.meta.name}
                                onDelete={() => setCustomSystems(loadCustomSystems())}
                                onArchive={() => setCustomSystems(loadCustomSystems())}
                                onDuplicate={() => setCustomSystems(loadCustomSystems())}
                                onEdit={() => {
                                  setTuningInitialSystem(pack as any);
                                  setShowTuningStudio(true);
                                }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {recommendedSystems.length === 0 && (
                      <span className="text-[11px] text-gray-400">No recommendation; select manually.</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      const currentPack =
                        SYSTEM_PACKS.find((p) => p.meta.id === selectedSystemId) ||
                        EGYPTIAN_UPVC_SYSTEMS.find((p) => (p as any).meta?.id === selectedSystemId) ||
                        customSystems.find((c) => c.meta?.id === selectedSystemId);
                      setTuningInitialSystem(currentPack || null);
                      setShowTuningStudio(true);
                    }}
                  >
                    <Factory className="h-3.5 w-3.5 mr-2" />
                    Tune This System (Advanced)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <Alert className="bg-gray-800 border-gray-700">
                <AlertDescription className="text-sm text-gray-200">
                  We will create a project with region Egypt, apply wind/floor/usage constraints, and shortlist recommended systems.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded border border-gray-700 bg-gray-900/60 space-y-1">
                  <div className="flex items-center gap-2 text-orange-300">
                    <MapPin className="h-4 w-4" /> Location
                  </div>
                  <div>Governorate: {governorate}</div>
                  <div>Wind Zone: {windZone}</div>
                  <div>Exposure: {exposure}</div>
                </div>
                <div className="p-3 rounded border border-gray-700 bg-gray-900/60 space-y-1">
                  <div className="flex items-center gap-2 text-orange-300">
                    <Ruler className="h-4 w-4" /> Constraints
                  </div>
                  <div>Floor: {floorLevel}</div>
                  <div>Usage: {usageType}</div>
                  <div>Opening: {openingType}</div>
                  <div>Shape: {baseShape}</div>
                </div>
                <div className="p-3 rounded border border-gray-700 bg-gray-900/60 space-y-1 md:col-span-2">
                  <div className="flex items-center gap-2 text-orange-300">
                    <Factory className="h-4 w-4" /> System
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recommendedSystems.map((id) => (
                      <Badge key={id} variant="outline" className="border-orange-500 text-orange-200 bg-orange-500/10">
                        {SYSTEM_PACKS.find((p) => p.meta.id === id)?.meta.name || id}
                      </Badge>
                    ))}
                  </div>
                  <div>Selected: {selectedSystemId || recommendedSystems[0] || 'Panda 50'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            Auto-applies Egyptian constraints and shortlists systems.
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Back
            </Button>
            {step < 4 ? (
              <Button onClick={() => canNext() && setStep((s) => Math.min(4, s + 1))} disabled={!canNext()} className="bg-orange-600 hover:bg-orange-500">
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-500">
                Create Project
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      <SystemTuningStudio
        open={showTuningStudio}
        onClose={() => setShowTuningStudio(false)}
        initialSystem={tuningInitialSystem}
        onSave={(customPack) => {
          const updated = addCustomSystem(customPack);
          setCustomSystems(updated);
          setSelectedSystemId(customPack.meta?.id);
          setShowTuningStudio(false);
        }}
      />
    </Dialog>
  );
};

