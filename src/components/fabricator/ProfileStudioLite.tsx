/**
 * Profile Studio Lite - Turkish Pilot Self-Onboarding
 * 
 * Emergency deployment for Turkish pilot to define custom profiles
 * without waiting for hard-coded system packs.
 * 
 * Focus: Physics configuration for MicronEngine accuracy
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Upload, Save, CheckCircle2, AlertTriangle, Zap, Settings, Sparkles, Factory, FileCode, Gauge, Plus } from 'lucide-react';
import { parseProfileFromDXF } from '@/lib/imports/ProfileDXFImporter';
import { motion, AnimatePresence } from 'framer-motion';

interface MachiningSlot {
  id: string;
  name: string;
  operation: 'slot' | 'pocket' | 'drill' | 'counterbore';
  position: { x: number; y: number }; // mm from profile origin
  dimensions: { width: number; height: number; depth: number }; // mm
  toolNumber?: number;
  feedRate?: number;
}

interface TurkishProfileConfig {
  id: string;
  name: string;
  manufacturer: string;
  profileType: 'frame' | 'sash' | 'mullion' | 'transom' | 'bead';
  material: 'aluminum' | 'upvc' | 'steel';
  barLength: number; // Turkish bars often 6500mm vs Egyptian 6000mm
  unitWeight: number; // kg/m
  weldingAllowance: number; // 3mm for UPVC, 0 for aluminum
  sawKerf: number; // Turkish saws often 4.5mm
  millingDepth: number; // For transoms
  bendingRadius?: number; // Minimum bending radius
  dxfFileName?: string;
  dxfPreview?: string;
  // Extracted from DXF
  width?: number;
  height?: number;
  thickness?: number;
  perimeter?: number;
  area?: number;
  // Milling slots
  machiningSlots?: MachiningSlot[];
}

// Turkish Industry Presets
const TURKISH_PRESETS = {
  asas_aluminum: {
    name: 'ASAŞ Aluminum (Standard)',
    barLength: 6500,
    sawKerf: 4.5,
    weldingAllowance: 0,
    millingDepth: 2.5,
    material: 'aluminum' as const,
  },
  firat_upvc: {
    name: 'Fırat UPVC (Plastik)',
    barLength: 6000,
    sawKerf: 4.2,
    weldingAllowance: 3,
    millingDepth: 2.5,
    material: 'upvc' as const,
  },
  yilmaz_heavy: {
    name: 'Yılmaz Heavy Duty',
    barLength: 7000,
    sawKerf: 4.8,
    weldingAllowance: 0,
    millingDepth: 3.0,
    material: 'aluminum' as const,
  },
};

export const ProfileStudioLite: React.FC = () => {
  const [profile, setProfile] = useState<TurkishProfileConfig>({
    id: `custom-${Date.now()}`,
    name: '',
    manufacturer: '',
    profileType: 'frame',
    material: 'aluminum',
    barLength: 6500, // Turkish standard
    unitWeight: 1.2,
    weldingAllowance: 0,
    sawKerf: 4.5, // Turkish industry standard
    millingDepth: 2.5,
  });

  const [dxfPreview, setDxfPreview] = useState<string>('');
  const [dxfFileName, setDxfFileName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isUploading, setIsUploading] = useState(false);
  const [_dxfExtractedData, setDxfExtractedData] = useState<any>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [detectedProfiles, setDetectedProfiles] = useState<Array<{
    type: 'frame' | 'sash' | 'mullion' | 'transom' | 'bead';
    name: string;
    width?: number;
    height?: number;
    thickness?: number;
    unitWeight?: number;
  }>>([]);
  const [importedProfiles, setImportedProfiles] = useState<Array<{
    id: string;
    type: 'frame' | 'sash' | 'mullion' | 'transom' | 'bead';
    name: string;
    dxfFileName: string;
    data: any;
  }>>([]);
  const [currentSystemPackId, setCurrentSystemPackId] = useState<string | null>(null);
  const [machiningSlots] = useState<MachiningSlot[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDXFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setDxfFileName(file.name);

    try {
      // Try backend API first for proper DXF parsing
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source_type', file.name.endsWith('.dwg') ? 'dwg' : 'dxf');
      formData.append('material_type', profile.material === 'upvc' ? 'upvc' : 'aluminium');

      try {
        const response = await fetch('/api/v2/profile-import/ingest', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'success' && data.profile_metrics) {
            const metrics = data.profile_metrics;
            
            // Store extracted data for verification
            setDxfExtractedData(data);
            
            // Detect multiple profiles from DXF layers/entities
            // Check if DXF contains multiple polygons (frame + sash)
            const isThermalBreak = metrics.is_thermal_break || false;
            const boundingBox = metrics.bounding_box || [];
            const width = boundingBox[2] - boundingBox[0] || undefined;
            const height = boundingBox[3] - boundingBox[1] || undefined;
            
            // Auto-detect profile types from filename or structure
            const detected: Array<{
              type: 'frame' | 'sash' | 'mullion' | 'transom' | 'bead';
              name: string;
              width?: number;
              height?: number;
              thickness?: number;
              unitWeight?: number;
            }> = [];
            
            // Check filename for profile type hints
            const filenameUpper = file.name.toUpperCase();
            const hasFrame = filenameUpper.includes('FRAME') || filenameUpper.includes('CERCEVE');
            const hasSash = filenameUpper.includes('SASH') || filenameUpper.includes('KANAT');
            
            // If thermal break detected or multiple polygons, assume frame + sash
            if (isThermalBreak || (hasFrame && hasSash)) {
              detected.push({
                type: 'frame',
                name: `${profile.manufacturer || 'Custom'} Frame`,
                width,
                height,
                thickness: metrics.thickness,
                unitWeight: metrics.weight_kg_per_m,
              });
              detected.push({
                type: 'sash',
                name: `${profile.manufacturer || 'Custom'} Sash`,
                width: width ? width * 0.9 : undefined, // Sash typically slightly smaller
                height: height ? height * 0.9 : undefined,
                thickness: metrics.thickness,
                unitWeight: metrics.weight_kg_per_m ? metrics.weight_kg_per_m * 0.9 : undefined,
              });
            } else {
              // Single profile - determine type from filename or default to frame
              const profileType = hasSash ? 'sash' : hasFrame ? 'frame' : 'frame';
              detected.push({
                type: profileType,
                name: `${profile.manufacturer || 'Custom'} ${profileType.charAt(0).toUpperCase() + profileType.slice(1)}`,
                width,
                height,
                thickness: metrics.thickness,
                unitWeight: metrics.weight_kg_per_m,
              });
            }
            
            setDetectedProfiles(detected);
            
            // Auto-populate first profile with extracted dimensions
            if (detected.length > 0) {
              setProfile(prev => ({
                ...prev,
                profileType: detected[0].type,
                name: detected[0].name,
                width: detected[0].width || prev.width,
                height: detected[0].height || prev.height,
                thickness: detected[0].thickness || prev.thickness,
                unitWeight: detected[0].unitWeight || prev.unitWeight,
              }));
            }

            // Show verification step
            setShowVerification(true);
            
            // Extract preview from DXF content
            const fileText = await file.text();
            setDxfPreview(fileText.slice(0, 500));
          } else {
            // Fallback to basic parser
            throw new Error('Backend parsing failed, using fallback');
          }
        } else {
          throw new Error('Backend API unavailable');
        }
      } catch (apiError) {
        // Fallback to basic frontend parser
        console.warn('Backend DXF parsing unavailable, using fallback:', apiError);
        const parsed = await parseProfileFromDXF(file);
        const previewSnippet = parsed.specifications?.dxfPreviewSnippet || '';
        setDxfPreview(previewSnippet.slice(0, 500));
        setDxfExtractedData({ status: 'fallback', parsed });
      }

      // Auto-suggest name from filename
      if (!profile.name) {
        const suggestedName = file.name
          .replace(/\.(dxf|dwg)$/i, '')
          .replace(/[^a-zA-Z0-9\s]/g, ' ')
          .trim();
        setProfile(prev => ({ ...prev, name: suggestedName }));
      }

      // Try to extract manufacturer from filename
      const filenameUpper = file.name.toUpperCase();
      if (filenameUpper.includes('ASAS') || filenameUpper.includes('ASAŞ')) {
        setProfile(prev => ({ ...prev, manufacturer: 'ASAŞ' }));
      } else if (filenameUpper.includes('FIRAT') || filenameUpper.includes('FİRAT')) {
        setProfile(prev => ({ ...prev, manufacturer: 'Fırat' }));
      } else if (filenameUpper.includes('KALE')) {
        setProfile(prev => ({ ...prev, manufacturer: 'Kale' }));
      } else if (filenameUpper.includes('YILMAZ')) {
        setProfile(prev => ({ ...prev, manufacturer: 'Yılmaz' }));
      }

    } catch (error) {
      console.error('DXF parse error:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const applyPreset = (presetKey: keyof typeof TURKISH_PRESETS) => {
    const preset = TURKISH_PRESETS[presetKey];
    setProfile(prev => ({
      ...prev,
      ...preset,
      material: preset.material,
    }));
  };

  // Milling slot functions reserved for future enhancement
  // const addMachiningSlot = () => { ... };
  // const removeMachiningSlot = (slotId: string) => { ... };
  // const updateMachiningSlot = (slotId: string, updates: Partial<MachiningSlot>) => { ... };

  const addImportedProfile = () => {
    if (!profile.name || !profile.manufacturer) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    setIsSaving(true);

    try {
      // Build single profile from current form
      const newProfile = {
        id: `${profile.id}-${profile.profileType}-${Date.now()}`,
        name: profile.name,
        type: profile.profileType,
        material: profile.material,
        unitWeight: profile.unitWeight,
        barLength: profile.barLength,
        width: profile.width,
        height: profile.height,
        thickness: profile.thickness,
        micronConfig: {
          barLength: profile.barLength,
          weldingAllowance: profile.weldingAllowance,
          sawKerf: profile.sawKerf,
          millingDepth: profile.millingDepth,
          bendingRadius: profile.bendingRadius,
        },
        dxfFileName: dxfFileName,
        machiningMacros: machiningSlots.map(slot => ({
          id: slot.id,
          name: slot.name,
          operation: slot.operation,
          dimensions: slot.dimensions,
          position: slot.position,
          toolSpecs: {
            diameter: slot.dimensions.width,
            type: 'mill',
          },
        })),
      };

      // Add to imported profiles list
      const updatedImported = [...importedProfiles, {
        id: newProfile.id,
        type: profile.profileType,
        name: profile.name,
        dxfFileName: dxfFileName || 'manual',
        data: newProfile,
      }];

      setImportedProfiles(updatedImported);

      // Check if we have complete system (frame + sash)
      const hasFrame = updatedImported.some(p => p.type === 'frame');
      const hasSash = updatedImported.some(p => p.type === 'sash');
      const isCompleteSystem = hasFrame && hasSash;

      // Create or update system pack
      const systemPackId = currentSystemPackId || `system-${profile.manufacturer}-${Date.now()}`;
      if (!currentSystemPackId) {
        setCurrentSystemPackId(systemPackId);
      }

      const customPack = {
        id: systemPackId,
        name: `${profile.manufacturer} ${profile.name} System`,
        manufacturer: profile.manufacturer,
        region: 'turkey',
        isCustom: true,
        createdAt: new Date().toISOString(),
        profiles: updatedImported.map(p => p.data),
        isComplete: isCompleteSystem,
        tuningStatus: 'untuned' as const,
        smartDrawPreset: {
          defaultMullionSpacingMm: 1000,
          maxSpanWithoutIntermediateMm: 2000,
          minPanelWidthMm: 400,
          maxPanelWidthMm: 1500,
          typicalPanelWidthsMm: [600, 800, 1000, 1200],
          recommendedMullionCounts: [2, 3, 4],
          spacingStrategy: 'equal' as const,
        },
      };

      // Save to localStorage
      const storageKey = `custom-profile-${systemPackId}`;
      localStorage.setItem(storageKey, JSON.stringify(customPack));

      // Dispatch event for other components to reload
      window.dispatchEvent(new CustomEvent('customProfileAdded', { detail: customPack }));

      setSaveStatus('success');
      setIsSaving(false);

      // Reset form for next profile import
      setProfile({
        id: `custom-${Date.now()}`,
        name: '',
        manufacturer: profile.manufacturer, // Keep manufacturer
        profileType: hasFrame ? 'sash' : 'frame', // Auto-suggest next type
        material: profile.material,
        barLength: profile.barLength,
        unitWeight: profile.unitWeight,
        weldingAllowance: profile.weldingAllowance,
        sawKerf: profile.sawKerf,
        millingDepth: profile.millingDepth,
      });
      setDxfPreview('');
      setDxfFileName('');
      setDetectedProfiles([]);
      setShowVerification(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // If complete system, redirect to tuning studio
      if (isCompleteSystem) {
        setTimeout(() => {
          window.location.href = `/fabricator/tuning-studio?systemPackId=${systemPackId}`;
        }, 1500);
      } else {
        // Show message to import next profile
        setTimeout(() => setSaveStatus('idle'), 2000);
      }

    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveStatus('error');
      setIsSaving(false);
    }
  };

  const isFormValid = profile.name.trim().length > 0 && profile.manufacturer.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Prestige Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 border-slate-700/50 shadow-2xl shadow-orange-500/5">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 via-amber-400 to-orange-600 shadow-lg shadow-orange-500/40">
                      <Factory className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
                          Profile Studio
                        </CardTitle>
                        <Badge className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500/40 text-orange-300 px-3 py-1">
                          <Sparkles className="h-3 w-3 mr-1" />
                          PRO
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="text-lg">🇹🇷</span>
                        <span className="font-medium">Turkish Custom Profiles</span>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-base text-slate-300 max-w-2xl leading-relaxed">
                    Define custom Turkish profiles with precision physics configuration. 
                    DXF import, verification, and milling slot configuration for immediate use in Precision Design Interface.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* DXF Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-slate-700/50 rounded-xl p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm shadow-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <FileCode className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <Label className="text-lg font-semibold text-white">DXF Profile Import</Label>
                <p className="text-xs text-slate-400 mt-0.5">Optional - Auto-extract dimensions from CAD files</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".dxf,.dwg"
                  onChange={handleDXFUpload}
                  ref={fileInputRef}
                  className="flex-1 bg-slate-800/50 border-slate-600 text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-500/20 file:text-orange-300 hover:file:bg-orange-500/30"
                  disabled={isUploading}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50 hover:border-orange-500/50 hover:text-orange-300 transition-all"
                >
                  {isUploading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Upload className="h-4 w-4" />
                      </motion.div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload DXF
                    </>
                  )}
                </Button>
              </div>
              
              <AnimatePresence>
                {dxfFileName && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Alert className="bg-green-500/10 border-green-500/30 text-green-300">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <AlertDescription className="text-green-200">
                        <strong className="text-green-300">{dxfFileName}</strong> loaded successfully
                        {dxfPreview && (
                          <div className="mt-3 text-xs font-mono bg-slate-900/50 p-3 rounded-lg border border-slate-700 max-h-32 overflow-auto text-slate-300">
                            {dxfPreview}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {!dxfFileName && !isUploading && (
                <div className="text-sm text-slate-400 p-6 border-2 border-dashed border-slate-700 rounded-lg text-center bg-slate-900/30">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                  <p className="font-medium text-slate-300">Upload DXF/DWG file from Turkish supplier</p>
                  <p className="text-xs mt-2 text-slate-500">Supported: ASAŞ, Fırat, Kale, Yılmaz profiles</p>
                  <p className="text-xs text-slate-600 mt-1">(Optional - you can enter values manually)</p>
                </div>
              )}
            </div>
            
            {/* Detected Profiles Verification */}
            {showVerification && detectedProfiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-400" />
                  <h4 className="font-semibold text-blue-300">Detected Profiles ({detectedProfiles.length})</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {detectedProfiles.map((detected, idx) => (
                    <div key={idx} className="p-3 bg-slate-800/50 rounded border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white capitalize">{detected.type}</span>
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40">
                          {detected.name}
                        </Badge>
                      </div>
                      {detected.width && detected.height && (
                        <p className="text-xs text-slate-400">
                          {detected.width.toFixed(1)} × {detected.height.toFixed(1)} mm
                        </p>
                      )}
                      {detected.unitWeight && (
                        <p className="text-xs text-slate-400 mt-1">
                          Weight: {detected.unitWeight.toFixed(3)} kg/m
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {detectedProfiles.length >= 2 && (
                  <p className="text-xs text-blue-300 mt-3">
                    ✓ Complete window system detected (Frame + Sash). Both profiles will be saved.
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Physics Configuration Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Basic Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 pb-2 border-b border-slate-700/50">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Settings className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Profile Information</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300 font-medium">Profile Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  placeholder="e.g., ASAŞ Sliding Frame 60"
                  className="h-11 text-base bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturer" className="text-slate-300 font-medium">Manufacturer *</Label>
                <Select
                  value={profile.manufacturer}
                  onValueChange={(value) => setProfile({...profile, manufacturer: value})}
                >
                  <SelectTrigger id="manufacturer" className="h-11 text-base bg-slate-800/50 border-slate-600 text-white focus:border-orange-500 focus:ring-orange-500/20">
                    <SelectValue placeholder="Select Manufacturer" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="ASAŞ" className="text-white hover:bg-slate-700">ASAŞ Alüminyum</SelectItem>
                    <SelectItem value="Fırat" className="text-white hover:bg-slate-700">Fırat Alüminyum</SelectItem>
                    <SelectItem value="Kale" className="text-white hover:bg-slate-700">Kale Alüminyum</SelectItem>
                    <SelectItem value="Yılmaz" className="text-white hover:bg-slate-700">Yılmaz Makine</SelectItem>
                    <SelectItem value="custom" className="text-white hover:bg-slate-700">Custom/Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profileType" className="text-slate-300 font-medium">Profile Type *</Label>
                <Select
                  value={profile.profileType}
                  onValueChange={(value) => setProfile({...profile, profileType: value as any})}
                >
                  <SelectTrigger id="profileType" className="h-11 text-base bg-slate-800/50 border-slate-600 text-white focus:border-orange-500 focus:ring-orange-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="frame" className="text-white hover:bg-slate-700">Frame (Çerçeve)</SelectItem>
                    <SelectItem value="sash" className="text-white hover:bg-slate-700">Sash (Kanat)</SelectItem>
                    <SelectItem value="mullion" className="text-white hover:bg-slate-700">Mullion (Orta Dikme)</SelectItem>
                    <SelectItem value="transom" className="text-white hover:bg-slate-700">Transom (Orta Yatay)</SelectItem>
                    <SelectItem value="bead" className="text-white hover:bg-slate-700">Glazing Bead (Cam Profili)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="material" className="text-slate-300 font-medium">Material *</Label>
                <Select
                  value={profile.material}
                  onValueChange={(value) => {
                    const newMaterial = value as 'aluminum' | 'upvc' | 'steel';
                    setProfile({
                      ...profile,
                      material: newMaterial,
                      weldingAllowance: newMaterial === 'upvc' ? 3 : 0,
                    });
                  }}
                >
                  <SelectTrigger id="material" className="h-11 text-base bg-slate-800/50 border-slate-600 text-white focus:border-orange-500 focus:ring-orange-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="aluminum" className="text-white hover:bg-slate-700">Aluminum (Alüminyum)</SelectItem>
                    <SelectItem value="upvc" className="text-white hover:bg-slate-700">UPVC (Plastik)</SelectItem>
                    <SelectItem value="steel" className="text-white hover:bg-slate-700">Steel (Çelik)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Right Column: Turkish Production Settings */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 pb-2 border-b border-slate-700/50">
                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <Gauge className="h-5 w-5 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Turkish Production Settings</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barLength" className="text-slate-300 font-medium">Bar Length (mm) *</Label>
                  <Input
                    id="barLength"
                    type="number"
                    value={profile.barLength}
                    onChange={(e) => setProfile({...profile, barLength: Number(e.target.value)})}
                    placeholder="6500"
                    className="h-11 text-base bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"
                  />
                  <p className="text-xs text-slate-400">Turkish standard: 6500mm</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitWeight" className="text-slate-300 font-medium">Unit Weight (kg/m) *</Label>
                  <Input
                    id="unitWeight"
                    type="number"
                    step="0.1"
                    value={profile.unitWeight}
                    onChange={(e) => setProfile({...profile, unitWeight: Number(e.target.value)})}
                    placeholder="1.2"
                    className="h-11 text-base bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weldingAllowance" className="text-slate-300 font-medium">Welding Allowance (mm)</Label>
                <Input
                  id="weldingAllowance"
                  type="number"
                  step="0.5"
                  value={profile.weldingAllowance}
                  onChange={(e) => setProfile({...profile, weldingAllowance: Number(e.target.value)})}
                  placeholder={profile.material === 'upvc' ? '3' : '0'}
                  className="h-11 text-base bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"
                />
                <p className="text-xs text-slate-400">
                  UPVC: 3mm, Aluminum: 0mm
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sawKerf" className="text-slate-300 font-medium">Saw Kerf (mm) *</Label>
                <Input
                  id="sawKerf"
                  type="number"
                  step="0.1"
                  value={profile.sawKerf}
                  onChange={(e) => setProfile({...profile, sawKerf: Number(e.target.value)})}
                  placeholder="4.5"
                  className="h-11 text-base bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"
                />
                <p className="text-xs text-slate-400">Turkish double-mitre saw: 4.2-4.8mm</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="millingDepth" className="text-slate-300 font-medium">Milling Depth (mm)</Label>
                <Input
                  id="millingDepth"
                  type="number"
                  step="0.5"
                  value={profile.millingDepth}
                  onChange={(e) => setProfile({...profile, millingDepth: Number(e.target.value)})}
                  placeholder="2.5"
                  className="h-11 text-base bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"
                />
                <p className="text-xs text-slate-400">For transoms (ara dikme)</p>
              </div>

              {profile.profileType === 'frame' && (
                <div className="space-y-2">
                  <Label htmlFor="bendingRadius" className="text-slate-300 font-medium">Minimum Bending Radius (mm)</Label>
                  <Input
                    id="bendingRadius"
                    type="number"
                    value={profile.bendingRadius || ''}
                    onChange={(e) => setProfile({...profile, bendingRadius: Number(e.target.value) || undefined})}
                    placeholder="1000"
                    className="h-11 text-base bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"
                  />
                  <p className="text-xs text-slate-400">For arched windows (kemerli pencere)</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Turkish Industry Presets */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="border border-slate-700/50 rounded-xl p-6 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-orange-500/10 backdrop-blur-sm"
          >
            <h4 className="font-bold mb-4 flex items-center gap-2 text-white">
              <div className="p-1.5 rounded-lg bg-orange-500/20 border border-orange-500/30">
                <Zap className="h-4 w-4 text-orange-400" />
              </div>
              <span>🇹🇷 Turkish Industry Presets</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={() => applyPreset('asas_aluminum')}
                className="h-auto py-4 flex flex-col items-start bg-slate-800/50 border-slate-600 hover:border-orange-500/50 hover:bg-slate-700/50 transition-all group"
              >
                <span className="font-semibold text-white group-hover:text-orange-300">ASAŞ Aluminum</span>
                <span className="text-xs text-slate-400 mt-1">6500mm bars, 4.5mm kerf</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => applyPreset('firat_upvc')}
                className="h-auto py-4 flex flex-col items-start bg-slate-800/50 border-slate-600 hover:border-orange-500/50 hover:bg-slate-700/50 transition-all group"
              >
                <span className="font-semibold text-white group-hover:text-orange-300">Fırat UPVC</span>
                <span className="text-xs text-slate-400 mt-1">6000mm bars, 3mm welding</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => applyPreset('yilmaz_heavy')}
                className="h-auto py-4 flex flex-col items-start bg-slate-800/50 border-slate-600 hover:border-orange-500/50 hover:bg-slate-700/50 transition-all group"
              >
                <span className="font-semibold text-white group-hover:text-orange-300">Yılmaz Heavy Duty</span>
                <span className="text-xs text-slate-400 mt-1">7000mm bars, 4.8mm kerf</span>
              </Button>
            </div>
          </motion.div>

          {/* Imported Profiles List */}
          {importedProfiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="border border-slate-700/50 rounded-xl p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  Imported Profiles ({importedProfiles.length})
                </h4>
                {importedProfiles.some(p => p.type === 'frame') && importedProfiles.some(p => p.type === 'sash') && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/40">
                    Complete System Ready
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {importedProfiles.map((imported) => (
                  <div key={imported.id} className="p-3 bg-slate-800/50 rounded border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white capitalize">{imported.type}</span>
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40">
                        {imported.name}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">From: {imported.dxfFileName}</p>
                  </div>
                ))}
              </div>
              {importedProfiles.some(p => p.type === 'frame') && importedProfiles.some(p => p.type === 'sash') ? (
                <Alert className="bg-green-500/10 border-green-500/30">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-300">
                    ✓ Complete system ready! Click "Add Profile" to save, then you'll be redirected to Tuning Studio.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-amber-500/10 border-amber-500/30">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <AlertDescription className="text-amber-300">
                    {importedProfiles.some(p => p.type === 'frame') 
                      ? 'Import a Sash profile to complete the system (Frame + Sash required).'
                      : 'Import a Frame profile first, then a Sash profile to create a complete window system.'}
                  </AlertDescription>
                </Alert>
              )}
            </motion.div>
          )}

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-between pt-6 border-t border-slate-700/50"
          >
            <div className="flex-1">
              <AnimatePresence>
                {saveStatus === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <Alert className="bg-green-500/10 border-green-500/30">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <AlertDescription className="text-green-300">
                        {importedProfiles.some(p => p.type === 'frame') && importedProfiles.some(p => p.type === 'sash')
                          ? 'Complete system ready! Redirecting to Tuning Studio...'
                          : 'Profile added! Import next profile to complete the system.'}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
                {saveStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <Alert className="bg-red-500/10 border-red-500/30">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-300">
                        Please fill in all required fields (Name and Manufacturer).
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button
              onClick={addImportedProfile}
              disabled={!isFormValid || isSaving}
              size="lg"
              className="h-12 px-8 text-base bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSaving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Save className="h-5 w-5 mr-2" />
                  </motion.div>
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  {importedProfiles.length === 0 ? 'Add First Profile' : 'Add Profile to System'}
                </>
              )}
            </Button>
          </motion.div>

          {/* Turkish Tips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="border border-amber-500/30 rounded-xl p-6 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/10 backdrop-blur-sm"
          >
            <h4 className="font-bold mb-3 text-white flex items-center gap-2">
              <span className="text-xl">🇹🇷</span>
              <span>Turkish Industry Tips</span>
            </h4>
            <ul className="text-sm space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span>
                <span>Turkish bars: <strong className="text-white">6500mm</strong> (not Egyptian 6000mm)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span>
                <span>Turkish saws: Double-mitre with <strong className="text-white">4.5mm kerf</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span>
                <span>UPVC welding: Use <strong className="text-white">3mm allowance</strong> per corner</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span>
                <span>Bending: ASAŞ profiles can bend to <strong className="text-white">1000mm radius</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span>
                <span>Hardware: Use <strong className="text-white">MACO (Austrian)</strong> or local Turkish brands</span>
              </li>
            </ul>
          </motion.div>
        </CardContent>
      </Card>
        </motion.div>
      </div>
    </div>
  );
};

