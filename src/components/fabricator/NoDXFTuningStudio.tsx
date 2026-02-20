/**
 * No-DXF Tuning Studio
 * 
 * Allows users to tune system packs without DXF import:
 * - Define profile roles (Frame, Sash)
 * - Configure micron parameters (kerf, welding, etc.)
 * - Set cutting rules
 * - All parameters used in optimization and cut list
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import { EGYPTIAN_UPVC_SYSTEMS } from '@/data/upvc-systems';
import { addCustomSystem } from '@/lib/fabricator/customSystemStorage';
import { detectRoleFromName } from '@/lib/fabricator/roleDetection';
import { getReturnUrl } from '@/lib/fabricator/systemTuningUtils';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import type { Profile } from '@/types/fabricator';
import { LazyMotionDiv } from '@/utils/lazyMotion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BoxSelect,
  CheckCircle2,
  Layers,
  Save,
  Settings,
  Sparkles
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ProfileConfig {
  id: string;
  name: string;
  role: Profile['profileRole'] | 'frame' | 'sash'; // Support both old and new roles
  width: number;
  height: number;
  thickness: number;
  material: 'aluminum' | 'upvc';
  // Micron parameters
  sawKerf: number;
  barEndTrim: number;
  weldingLoss?: number; // UPVC only
  transomMilling?: number;
  // Cutting rules
  cuttingAllowance: number;
  barLength: number;
  // UPVC specific
  reinforcementDeduction?: number;
  reinforcementThickness?: number;
}

export const NoDXFTuningStudio: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const systemPackId = searchParams.get('systemPackId');
  const [activeTab, setActiveTab] = useState<'profiles' | 'micron' | 'cutting' | 'summary'>('profiles');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [systemPack, setSystemPack] = useState<any | null>(null);
  const [profiles, setProfiles] = useState<ProfileConfig[]>([]);

  // Load system pack
  useEffect(() => {
    if (!systemPackId) {
      navigate('/fabricator/system-packs');
      return;
    }

    const pack = SYSTEM_PACKS.find((p) => p.meta?.id === systemPackId) ||
                 EGYPTIAN_UPVC_SYSTEMS.find((p) => (p as any).meta?.id === systemPackId);
    
    if (!pack) {
      navigate('/fabricator/system-packs');
      return;
    }

    setSystemPack(pack);

    // Initialize profiles from system pack
    const isUPVC = !!(pack as any).upvcSpec;
    const existingProfiles = (pack as any).profiles || [];
    
    if (existingProfiles.length > 0) {
      // Use existing profiles
      const profileConfigs: ProfileConfig[] = existingProfiles.map((p: Profile) => {
        // ✅ Smart role detection: Use existing role, or detect from name, or fallback to type
        const role = p.profileRole || detectRoleFromName(p.name, p.type) || (p.type === 'frame' ? 'frame' : 'sash');
        
        return {
          id: p.id,
          name: p.name,
          role,
          width: p.width || 50,
          height: p.height || 50,
          thickness: p.thickness || 1.5,
          material: p.material || (isUPVC ? 'upvc' : 'aluminum'),
          sawKerf: 4.5, // UPVC default
          barEndTrim: 20, // UPVC default
          weldingLoss: isUPVC ? 3 : undefined,
          transomMilling: 2.5,
          cuttingAllowance: p.cuttingAllowance || 0,
          barLength: isUPVC ? 5800 : 6000,
          reinforcementDeduction: isUPVC ? 12 : undefined,
          reinforcementThickness: isUPVC ? 1.2 : undefined,
        };
      });
      
      // Ensure we have at least Frame and Sash
      const hasFrame = profileConfigs.some(p => p.role === 'frame');
      const hasSash = profileConfigs.some(p => p.role === 'sash');
      
      if (!hasFrame) {
        profileConfigs.push({
          id: `${systemPackId}-frame`,
          name: 'Frame Profile',
          role: 'frame',
          width: isUPVC ? 50 : 85,
          height: isUPVC ? 54 : 72,
          thickness: isUPVC ? 50 : 1.7,
          material: isUPVC ? 'upvc' : 'aluminum',
          sawKerf: isUPVC ? 4.5 : 4.2,
          barEndTrim: isUPVC ? 20 : 15,
          weldingLoss: isUPVC ? 3 : undefined,
          transomMilling: 2.5,
          cuttingAllowance: 0,
          barLength: isUPVC ? 5800 : 6000,
          reinforcementDeduction: isUPVC ? 12 : undefined,
          reinforcementThickness: isUPVC ? 1.2 : undefined,
        });
      }
      
      if (!hasSash) {
        profileConfigs.push({
          id: `${systemPackId}-sash`,
          name: 'Sash Profile',
          role: 'sash',
          width: isUPVC ? 50 : 85,
          height: isUPVC ? 74 : 68,
          thickness: isUPVC ? 50 : 1.6,
          material: isUPVC ? 'upvc' : 'aluminum',
          sawKerf: isUPVC ? 4.5 : 4.2,
          barEndTrim: isUPVC ? 20 : 15,
          weldingLoss: isUPVC ? 3 : undefined,
          transomMilling: 2.5,
          cuttingAllowance: 0,
          barLength: isUPVC ? 5800 : 6000,
          reinforcementDeduction: isUPVC ? 12 : undefined,
          reinforcementThickness: isUPVC ? 1.2 : undefined,
        });
      }
      
      setProfiles(profileConfigs);
    } else {
      // Create default Frame and Sash profiles
      setProfiles([
        {
          id: `${systemPackId}-frame`,
          name: 'Frame Profile',
          role: 'frame',
          width: isUPVC ? 50 : 85,
          height: isUPVC ? 54 : 72,
          thickness: isUPVC ? 50 : 1.7,
          material: isUPVC ? 'upvc' : 'aluminum',
          sawKerf: isUPVC ? 4.5 : 4.2,
          barEndTrim: isUPVC ? 20 : 15,
          weldingLoss: isUPVC ? 3 : undefined,
          transomMilling: 2.5,
          cuttingAllowance: 0,
          barLength: isUPVC ? 5800 : 6000,
          reinforcementDeduction: isUPVC ? 12 : undefined,
          reinforcementThickness: isUPVC ? 1.2 : undefined,
        },
        {
          id: `${systemPackId}-sash`,
          name: 'Sash Profile',
          role: 'sash',
          width: isUPVC ? 50 : 85,
          height: isUPVC ? 74 : 68,
          thickness: isUPVC ? 50 : 1.6,
          material: isUPVC ? 'upvc' : 'aluminum',
          sawKerf: isUPVC ? 4.5 : 4.2,
          barEndTrim: isUPVC ? 20 : 15,
          weldingLoss: isUPVC ? 3 : undefined,
          transomMilling: 2.5,
          cuttingAllowance: 0,
          barLength: isUPVC ? 5800 : 6000,
          reinforcementDeduction: isUPVC ? 12 : undefined,
          reinforcementThickness: isUPVC ? 1.2 : undefined,
        },
      ]);
    }
  }, [systemPackId, navigate]);

  const handleProfileUpdate = (id: string, updates: Partial<ProfileConfig>) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Convert profiles to Profile format
      const profileObjects: Profile[] = profiles.map(p => ({
        id: p.id,
        name: p.name,
        type: p.role,
        material: p.material,
        width: p.width,
        height: p.height,
        thickness: p.thickness,
        color: '#cccccc',
        costPerMeter: 0,
        cuttingAllowance: p.cuttingAllowance,
        stockQuantity: 0,
        minStockLevel: 0,
        supplier: systemPack?.meta?.brands?.[0] || 'Custom',
        profileRole: p.role,
        systemBrand: systemPack?.meta?.brands?.[0] || 'Custom',
        systemPackIds: [systemPackId || ''],
        specifications: {
          tuningStatus: 'tuned',
          sawKerf: p.sawKerf,
          barEndTrim: p.barEndTrim,
          weldingLoss: p.weldingLoss,
          transomMilling: p.transomMilling,
          barLength: p.barLength,
          reinforcementDeduction: p.reinforcementDeduction,
          reinforcementThickness: p.reinforcementThickness,
        },
        calibrations: [],
        machiningMacros: [],
      }));

      // Update the original system pack (don't create a new one)
      const tunedPack = {
        ...systemPack,
        meta: {
          ...systemPack.meta,
          // Keep original ID to maintain references
          id: systemPack.meta.id,
          name: systemPack.meta.name,
        },
        profiles: profileObjects,
        tuningStatus: 'tuned',
      };

      // Save to custom systems (this will update if exists, add if new)
      addCustomSystem(tunedPack);

      // Save to localStorage for SystemPackTuningStudio compatibility
      localStorage.setItem(`custom-profile-${tunedPack.meta.id}`, JSON.stringify({
        ...tunedPack,
        profiles: profiles.map(p => ({
          ...p,
          tuningStatus: 'tuned',
        })),
        tuningStatus: 'tuned',
        tunedAt: new Date().toISOString(),
      }));

      // Also update the original system pack reference
      localStorage.setItem(`system-pack-${tunedPack.meta.id}`, JSON.stringify(tunedPack));

      setSaveSuccess(true);
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('customProfileAdded', { detail: tunedPack }));
      window.dispatchEvent(new CustomEvent('systemPackTuned', { 
        detail: { 
          systemPackId: tunedPack.meta.id,
          systemPackName: tunedPack.meta.name,
          tuned: true 
        } 
      }));

      // Show success message for 2 seconds before returning
      setTimeout(() => {
        const returnUrl = getReturnUrl();
        if (returnUrl) {
          // Pass tuned system info in state
          navigate(returnUrl.url, { 
            state: { 
              systemPackId: tunedPack.meta.id,
              systemTuned: true,
              systemTunedMessage: `System "${tunedPack.meta.name}" has been tuned and is ready to use with Frame and Sash profiles configured.`,
              ...returnUrl.params 
            } 
          });
        } else {
          navigate('/fabricator/system-packs', {
            state: {
              systemPackId: tunedPack.meta.id,
              systemTuned: true,
              systemTunedMessage: `System "${tunedPack.meta.name}" has been tuned and is ready to use.`,
            }
          });
        }
      }, 2000);
    } catch (error) {
      console.error('Error saving tuned system:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!systemPack) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center text-white">
          <p>Loading system pack...</p>
        </div>
      </div>
    );
  }

  const isUPVC = !!(systemPack).upvcSpec;
  const frameProfile = profiles.find(p => p.role === 'frame');
  const sashProfile = profiles.find(p => p.role === 'sash');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <LazyMotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="typography-h1 text-2xl text-white flex items-center gap-2">
              <Settings className="h-6 w-6 text-amber-400" />
              Tune System: {systemPack.meta.name}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Configure profiles and parameters for accurate cut lists (No DXF required)
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const returnUrl = getReturnUrl();
              if (returnUrl) {
                navigate(returnUrl.url, { state: returnUrl.params });
              } else {
                navigate('/fabricator/system-packs');
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Wizard
          </Button>
        </LazyMotionDiv>

        {saveSuccess && (
          <Alert className="bg-green-900/20 border-green-500/50">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertDescription>
              System tuned successfully! Returning to project wizard...
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profiles">Profiles & Roles</TabsTrigger>
            <TabsTrigger value="micron">Micron Parameters</TabsTrigger>
            <TabsTrigger value="cutting">Cutting Rules</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          {/* Profiles Tab */}
          <TabsContent value="profiles" className="space-y-4">
            <Alert className="bg-blue-900/20 border-blue-500/50">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription>
                Define Frame and Sash profiles. These will be used for cut list generation.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((profile) => (
                <Card key={profile.id} className="bg-gray-900/60 border-gray-700 card-dark">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      {profile.role === 'frame' ? (
                        <Layers className="h-5 w-5 text-blue-400" />
                      ) : (
                        <BoxSelect className="h-5 w-5 text-green-400" />
                      )}
                      {profile.name}
                      <Badge variant={profile.role === 'frame' ? 'default' : 'secondary'}>
                        {profile.role.toUpperCase()}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="typography-label text-xs">Width (mm)</Label>
                        <Input
                          type="number"
                          value={profile.width}
                          onChange={(e) => handleProfileUpdate(profile.id, { width: Number(e.target.value) })}
                          className="bg-gray-800 border-gray-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="typography-label text-xs">Height (mm)</Label>
                        <Input
                          type="number"
                          value={profile.height}
                          onChange={(e) => handleProfileUpdate(profile.id, { height: Number(e.target.value) })}
                          className="bg-gray-800 border-gray-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="typography-label text-xs">Thickness (mm)</Label>
                        <Input
                          type="number"
                          value={profile.thickness}
                          onChange={(e) => handleProfileUpdate(profile.id, { thickness: Number(e.target.value) })}
                          className="bg-gray-800 border-gray-700"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label className="typography-label text-xs">Profile Role (Gold-Tier Granular)</Label>
                        <Select
                          value={profile.role}
                          onValueChange={(val) => handleProfileUpdate(profile.id, { role: val as any })}
                        >
                          <SelectTrigger className="bg-gray-800 border-gray-700">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[400px]">
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 border-b border-gray-700">Frame Roles</div>
                            <SelectItem value="frame">Frame (Main)</SelectItem>
                            <SelectItem value="frame_architrave">Frame with Architrave</SelectItem>
                            <SelectItem value="architrave">Architrave (Standalone)</SelectItem>
                            <SelectItem value="threshold">Threshold</SelectItem>
                            <SelectItem value="sill">Sill</SelectItem>
                            <SelectItem value="head">Head</SelectItem>
                            <SelectItem value="jamb">Jamb</SelectItem>
                            
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 border-b border-gray-700 mt-2">Sash Roles</div>
                            <SelectItem value="sash">Sash (Standard)</SelectItem>
                            <SelectItem value="sash_sliding">Sliding Sash</SelectItem>
                            <SelectItem value="sash_door">Door Sash</SelectItem>
                            <SelectItem value="sash_flyscreen">Fly-screen Sash</SelectItem>
                            <SelectItem value="sash_casement">Casement Sash</SelectItem>
                            <SelectItem value="screen_sash">Screen Sash</SelectItem>
                            
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 border-b border-gray-700 mt-2">Structural Roles</div>
                            <SelectItem value="mullion">Mullion (True)</SelectItem>
                            <SelectItem value="mullion_false">False Mullion</SelectItem>
                            <SelectItem value="transom">Transom</SelectItem>
                            <SelectItem value="reinforcement">Reinforcement</SelectItem>
                            <SelectItem value="corner_cleat">Corner Cleat</SelectItem>
                            
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 border-b border-gray-700 mt-2">Glazing Roles</div>
                            <SelectItem value="glazing_bead">Glazing Bead (Standard)</SelectItem>
                            <SelectItem value="glazing_bead_inner">Glazing Bead (Inner)</SelectItem>
                            <SelectItem value="glazing_bead_outer">Glazing Bead (Outer)</SelectItem>
                            
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 border-b border-gray-700 mt-2">Accessory Roles</div>
                            <SelectItem value="interlock">Interlock</SelectItem>
                            <SelectItem value="accessory">Accessory Profile</SelectItem>
                            <SelectItem value="screen_adapter">Screen Adapter (Barour Shabaak)</SelectItem>
                            <SelectItem value="panel">Panel / Filler</SelectItem>
                            <SelectItem value="gasket">Gasket</SelectItem>
                            <SelectItem value="weather_strip">Weather Strip</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Micron Parameters Tab */}
          <TabsContent value="micron" className="space-y-4">
            <Alert className="bg-amber-900/20 border-amber-500/50">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <AlertDescription>
                These parameters control 99.8% manufacturing accuracy. Used in optimization and cut list calculations.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((profile) => (
                <Card key={profile.id} className="bg-gray-900/60 border-gray-700 card-dark">
                  <CardHeader>
                    <CardTitle className="text-sm">{profile.name} - Micron Parameters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="typography-label text-xs">Saw Kerf (mm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={profile.sawKerf}
                          onChange={(e) => handleProfileUpdate(profile.id, { sawKerf: Number(e.target.value) })}
                          className="bg-gray-800 border-gray-700"
                        />
                        <p className="text-[10px] text-gray-500">Default: {isUPVC ? '4.5' : '4.2'}mm</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="typography-label text-xs">Bar End Trim (mm)</Label>
                        <Input
                          type="number"
                          value={profile.barEndTrim}
                          onChange={(e) => handleProfileUpdate(profile.id, { barEndTrim: Number(e.target.value) })}
                          className="bg-gray-800 border-gray-700"
                        />
                        <p className="text-[10px] text-gray-500">Default: {isUPVC ? '20' : '15'}mm</p>
                      </div>
                      {isUPVC && (
                        <div className="space-y-2">
                          <Label className="typography-label text-xs">Welding Loss (mm)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={profile.weldingLoss || 3}
                            onChange={(e) => handleProfileUpdate(profile.id, { weldingLoss: Number(e.target.value) })}
                            className="bg-gray-800 border-gray-700"
                          />
                          <p className="text-[10px] text-gray-500">Per corner</p>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="typography-label text-xs">Bar Length (mm)</Label>
                        <Input
                          type="number"
                          value={profile.barLength}
                          onChange={(e) => handleProfileUpdate(profile.id, { barLength: Number(e.target.value) })}
                          className="bg-gray-800 border-gray-700"
                        />
                        <p className="text-[10px] text-gray-500">Default: {isUPVC ? '5800' : '6000'}mm</p>
                      </div>
                    </div>
                    {isUPVC && profile.role === 'sash' && (
                      <div className="pt-2 border-t border-gray-700">
                        <Label className="typography-label text-xs text-yellow-400 mb-2 block">Reinforcement Settings</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="typography-label text-xs">Deduction (mm)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={profile.reinforcementDeduction || 12}
                              onChange={(e) => handleProfileUpdate(profile.id, { reinforcementDeduction: Number(e.target.value) })}
                              className="bg-gray-800 border-gray-700"
                            />
                            <p className="text-[10px] text-gray-500">Steel = Dimension - Deduction</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="typography-label text-xs">Thickness (mm)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={profile.reinforcementThickness || 1.2}
                              onChange={(e) => handleProfileUpdate(profile.id, { reinforcementThickness: Number(e.target.value) })}
                              className="bg-gray-800 border-gray-700"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Cutting Rules Tab */}
          <TabsContent value="cutting" className="space-y-4">
            <Alert className="bg-amber-900/20 border-amber-500/50">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <AlertDescription>
                Cutting allowances and rules applied to all cuts in the optimization engine.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((profile) => (
                <Card key={profile.id} className="bg-gray-900/60 border-gray-700 card-dark">
                  <CardHeader>
                    <CardTitle className="text-sm">{profile.name} - Cutting Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="typography-label text-xs">Cutting Allowance (mm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={profile.cuttingAllowance}
                        onChange={(e) => handleProfileUpdate(profile.id, { cuttingAllowance: Number(e.target.value) })}
                        className="bg-gray-800 border-gray-700"
                      />
                      <p className="text-[10px] text-gray-500">
                        {profile.role === 'frame' ? 'Added to frame length' : 'Deducted from sash length'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card className="bg-gray-900/60 border-gray-700 card-dark">
              <CardHeader>
                <CardTitle className="text-base">Tuning Summary</CardTitle>
                <CardDescription>
                  Review all parameters before saving. These will be used in optimization and cut list generation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profiles.map((profile) => (
                  <div key={profile.id} className="p-4 rounded border border-gray-700 bg-gray-800/40">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="typography-h4 text-white">{profile.name}</h4>
                      <Badge>{profile.role.toUpperCase()}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Dimensions:</span>
                        <div className="text-white">{profile.width} × {profile.height} × {profile.thickness}mm</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Saw Kerf:</span>
                        <div className="text-white">{profile.sawKerf}mm</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Bar Trim:</span>
                        <div className="text-white">{profile.barEndTrim}mm</div>
                      </div>
                      {isUPVC && (
                        <div>
                          <span className="text-gray-400">Welding Loss:</span>
                          <div className="text-white">{profile.weldingLoss}mm</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {frameProfile && sashProfile ? (
              <span className="text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Frame and Sash profiles configured
              </span>
            ) : (
              <span className="text-yellow-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Configure Frame and Sash profiles
              </span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !frameProfile || !sashProfile}
            className="bg-green-600 hover:bg-green-500"
          >
            {isSaving ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save & Return to Wizard
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

