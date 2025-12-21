/**
 * System Pack Tuning Studio
 * 
 * Allows tuning multiple profiles within a system pack (Frame + Sash)
 * After tuning, mark as verified and proceed to design interface
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import { EGYPTIAN_UPVC_SYSTEMS } from '@/data/upvc-systems';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/ui/alert-dialog';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import type { Profile } from '@/types/fabricator';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BoxSelect,
  CheckCircle2,
  Edit,
  Gauge,
  Layers,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Wrench,
  Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ProfileDefinitionWizard } from './ProfileDefinitionWizard';
import { ProfileTuningStudio } from './ProfileTuningStudio';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

interface SystemPackProfile {
  id: string;
  name: string;
  type: 'frame' | 'sash' | 'mullion' | 'transom' | 'bead';
  material: string;
  unitWeight?: number;
  barLength?: number;
  width?: number;
  height?: number;
  thickness?: number;
  micronConfig?: any;
  tuningStatus?: 'untuned' | 'in_progress' | 'tuned';
}

interface SystemPack {
  id: string;
  name: string;
  manufacturer: string;
  region: string;
  profiles: SystemPackProfile[];
  isComplete: boolean;
  tuningStatus?: 'untuned' | 'in_progress' | 'tuned';
  createdAt: string;
}

export const SystemPackTuningStudio: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const systemPackId = searchParams.get('systemPackId');
  
  const [systemPack, setSystemPack] = useState<SystemPack | null>(null);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState<number>(0);
  const [tunedProfiles, setTunedProfiles] = useState<Set<string>>(new Set());
  const [tuningProfile, setTuningProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<'tabs' | 'cards'>('cards');
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SystemPackProfile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<SystemPackProfile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingWizardOpen, setPendingWizardOpen] = useState(false);

  // Get user ID from auth
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    getUserId();
  }, []);

  // Open wizard when userId becomes available and we're pending
  useEffect(() => {
    if (userId && pendingWizardOpen) {
      setPendingWizardOpen(false);
      setShowProfileWizard(true);
    }
  }, [userId, pendingWizardOpen]);

  // Load system pack from localStorage or original systems
  useEffect(() => {
    if (!systemPackId) {
      navigate('/fabricator/system-packs');
      return;
    }

    try {
      // First try custom/tuned version
      const stored = localStorage.getItem(`custom-profile-${systemPackId}`);
      if (stored) {
        const pack = JSON.parse(stored);
        setSystemPack(pack);
        
        // Initialize tuned profiles
        const tuned = new Set<string>();
        pack.profiles?.forEach((p: SystemPackProfile) => {
          if (p.tuningStatus === 'tuned') {
            tuned.add(p.id);
          }
        });
        setTunedProfiles(tuned);
        return;
      }

      // Try original system pack from SYSTEM_PACKS or EGYPTIAN_UPVC_SYSTEMS
      const originalPack = SYSTEM_PACKS.find((p: any) => p.meta?.id === systemPackId) ||
                          EGYPTIAN_UPVC_SYSTEMS.find((p: any) => p.meta?.id === systemPackId);
      
      if (originalPack) {
        // Convert to SystemPack format
        const packMeta = (originalPack as any).meta || {};
        const profiles = (originalPack as any).profiles || [];
        const systemPackProfiles: SystemPackProfile[] = profiles.map((p: any) => ({
          id: p.id,
          name: p.name,
          type: (p.profileRole || p.type || 'frame') as 'frame' | 'sash' | 'mullion' | 'transom' | 'bead',
          material: p.material || 'upvc',
          unitWeight: p.weightPerMeter,
          barLength: p.specifications?.barLength || 6000,
          width: p.width,
          height: p.height,
          thickness: p.thickness,
          tuningStatus: 'untuned',
        }));

        const pack: SystemPack = {
          id: packMeta.id || systemPackId,
          name: packMeta.name || 'Unknown System',
          manufacturer: packMeta.brands?.[0] || 'Unknown',
          region: packMeta.regions?.[0] || 'global',
          profiles: systemPackProfiles,
          tuningStatus: 'untuned',
          createdAt: new Date().toISOString(),
          isComplete: false,
        };

        setSystemPack(pack);
        setTunedProfiles(new Set());
        return;
      }

      // Pack not found, redirect back
      navigate('/fabricator/system-packs');
    } catch (error) {
      console.error('Error loading system pack:', error);
      navigate('/fabricator/system-packs');
    }
  }, [systemPackId, navigate]);

  const allProfilesTuned = systemPack?.profiles?.every(p => tunedProfiles.has(p.id)) || false;

  // Convert SystemPackProfile to Profile type for ProfileTuningStudio
  const convertToProfile = (packProfile: SystemPackProfile): Profile => {
    // Map material types - Profile only supports 'aluminum' | 'upvc' | 'wood'
    let material: 'aluminum' | 'upvc' | 'wood' = 'aluminum';
    if (packProfile.material === 'upvc') {
      material = 'upvc';
    } else if (packProfile.material === 'wood') {
      material = 'wood';
    }
    
    // Map profile type to Profile's profileRole
    const typeMap: Record<string, Profile['profileRole']> = {
      'frame': 'frame',
      'sash': 'sash',
      'mullion': 'mullion',
      'transom': 'transom',
      'bead': 'glazing_bead',
    };
    const profileRole = typeMap[packProfile.type] || 'frame';
    
    return {
      id: packProfile.id,
      name: packProfile.name,
      material,
      width: packProfile.width || 50,
      height: packProfile.height || 50,
      thickness: packProfile.thickness || 1.5,
      color: '#cccccc',
      costPerMeter: 0,
      cuttingAllowance: 0,
      stockQuantity: 0,
      minStockLevel: 0,
      supplier: systemPack?.manufacturer || '',
      profileRole,
      systemBrand: systemPack?.manufacturer,
      systemPackIds: systemPack ? [systemPack.id] : [],
      specifications: {
        ...packProfile.micronConfig,
        tuningStatus: packProfile.tuningStatus || 'untuned',
        unitWeight: packProfile.unitWeight,
        barLength: packProfile.barLength,
      },
      calibrations: [],
      machiningMacros: [],
    };
  };

  const [showSwitchProfileDialog, setShowSwitchProfileDialog] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<SystemPackProfile | null>(null);

  const handleOpenTuning = (profile: SystemPackProfile) => {
    // Check for unsaved changes before opening new profile
    if (hasUnsavedChanges && tuningProfile) {
      setPendingProfile(profile);
      setShowSwitchProfileDialog(true);
      return;
    }
    
    const profileForTuning = convertToProfile(profile);
    setTuningProfile(profileForTuning);
    setHasUnsavedChanges(false); // Reset for new profile
  };

  const handleConfirmSwitchProfile = () => {
    if (pendingProfile) {
      const profileForTuning = convertToProfile(pendingProfile);
      setTuningProfile(profileForTuning);
      setHasUnsavedChanges(false);
      setPendingProfile(null);
      setShowSwitchProfileDialog(false);
    }
  };

  const handleTuningClose = async (hasChanges: boolean = false) => {
    if (hasChanges) {
      setHasUnsavedChanges(true);
    }

    // If profile was updated, refresh the system pack data
    if (tuningProfile && userId) {
      try {
        // Fetch the latest profile data from database
        const { data: updatedProfileData, error } = await supabase
          .from('fabricator_profiles')
          .select('*')
          .eq('id', tuningProfile.id)
          .eq('user_id', userId)
          .single();

        if (!error && updatedProfileData && systemPack) {
          // Update the system pack with fresh database data
          const updatedProfiles = systemPack.profiles.map(p => {
            if (p.id === tuningProfile.id) {
              return {
                ...p,
                width: updatedProfileData.width || p.width,
                height: updatedProfileData.height || p.height,
                thickness: updatedProfileData.thickness || p.thickness,
                specifications: updatedProfileData.specifications || p.specifications,
                tuningStatus: (updatedProfileData.specifications as any)?.tuningStatus || p.tuningStatus,
              };
            }
            return p;
          });

          const updatedPack = {
            ...systemPack,
            profiles: updatedProfiles,
          };

          localStorage.setItem(`custom-profile-${systemPackId}`, JSON.stringify(updatedPack));
          setSystemPack(updatedPack);

          const tuned = new Set<string>();
          updatedPack.profiles?.forEach((p: SystemPackProfile) => {
            if (p.tuningStatus === 'tuned') {
              tuned.add(p.id);
            }
          });
          setTunedProfiles(tuned);
        }
      } catch (err) {
        console.error('Error refreshing system pack after tuning close:', err);
      }
    }

    setTuningProfile(null);

    // Always navigate back to system packs gallery after closing
    navigate('/fabricator/system-packs');
  };

  const handleExit = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      handleConfirmExit();
    }
  };

  const handleConfirmExit = () => {
    // Get return URL or default to System Packs Gallery
    const returnUrl = sessionStorage.getItem('tuning_return_url');
    if (returnUrl) {
      try {
        const data = JSON.parse(returnUrl);
        sessionStorage.removeItem('tuning_return_url');
        navigate(data.url, { state: data.params || {} });
      } catch {
        navigate('/fabricator/system-packs');
      }
    } else {
      navigate('/fabricator/system-packs');
    }
  };

  const handleCancelExit = () => {
    setShowExitConfirm(false);
  };

  const handleAddProfile = (profile: Profile) => {
    if (!systemPack || !systemPackId) return;
    
    const newProfile: SystemPackProfile = {
      id: profile.id || `profile_${Date.now()}`,
      name: profile.name,
      type: (profile.profileRole || profile.type || 'frame') as SystemPackProfile['type'],
      material: profile.material || 'aluminum',
      unitWeight: profile.unitWeight,
      barLength: profile.barLength,
      width: profile.width,
      height: profile.height,
      thickness: profile.thickness,
      micronConfig: profile.specifications,
      tuningStatus: 'untuned',
    };
    
    const updatedPack: SystemPack = {
      ...systemPack,
      profiles: [...systemPack.profiles, newProfile],
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(`custom-profile-${systemPackId}`, JSON.stringify(updatedPack));
    setSystemPack(updatedPack);
    setShowProfileWizard(false);
    setHasUnsavedChanges(true);
  };

  const handleEditProfile = (profile: Profile) => {
    if (!systemPack || !systemPackId || !editingProfile) return;
    
    const updatedProfiles = systemPack.profiles.map(p =>
      p.id === editingProfile.id
        ? {
            ...p,
            name: profile.name,
            type: (profile.profileRole || profile.type || p.type) as SystemPackProfile['type'],
            material: profile.material || p.material,
            unitWeight: profile.unitWeight ?? p.unitWeight,
            barLength: profile.barLength ?? p.barLength,
            width: profile.width ?? p.width,
            height: profile.height ?? p.height,
            thickness: profile.thickness ?? p.thickness,
            micronConfig: profile.specifications || p.micronConfig,
          }
        : p
    );
    
    const updatedPack: SystemPack = {
      ...systemPack,
      profiles: updatedProfiles,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(`custom-profile-${systemPackId}`, JSON.stringify(updatedPack));
    setSystemPack(updatedPack);
    setEditingProfile(null);
    setShowProfileWizard(false);
    setHasUnsavedChanges(true);
  };

  const handleDeleteProfile = () => {
    if (!systemPack || !systemPackId || !deletingProfile) return;
    
    const updatedProfiles = systemPack.profiles.filter(p => p.id !== deletingProfile.id);
    const updatedPack: SystemPack = {
      ...systemPack,
      profiles: updatedProfiles,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(`custom-profile-${systemPackId}`, JSON.stringify(updatedPack));
    setSystemPack(updatedPack);
    setDeletingProfile(null);
    setShowDeleteConfirm(false);
    setHasUnsavedChanges(true);
    
    // Remove from tuned profiles if it was tuned
    setTunedProfiles(prev => {
      const next = new Set(prev);
      next.delete(deletingProfile.id);
      return next;
    });
  };

  const handleProfileTuned = (profileId: string) => {
    setTunedProfiles(prev => new Set([...prev, profileId]));
    
    // Update system pack in localStorage
    if (systemPack) {
      const updatedProfiles = systemPack.profiles.map(p => 
        p.id === profileId ? { ...p, tuningStatus: 'tuned' as const } : p
      );
      const allTuned = updatedProfiles.every(p => p.tuningStatus === 'tuned');
      const updatedPack: SystemPack = {
        ...systemPack,
        profiles: updatedProfiles,
        tuningStatus: allTuned ? 'tuned' : 'in_progress',
      };
      
      localStorage.setItem(`custom-profile-${systemPackId}`, JSON.stringify(updatedPack));
      setSystemPack(updatedPack);
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('customProfileAdded', { detail: updatedPack }));
    }
  };

  const handleMarkAllTuned = () => {
    if (!systemPack) return;
    
    const updatedProfiles = systemPack.profiles.map(p => ({
      ...p,
      tuningStatus: 'tuned' as const,
    }));
    
    const updatedPack = {
      ...systemPack,
      profiles: updatedProfiles,
      tuningStatus: 'tuned' as const,
      tunedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(`custom-profile-${systemPackId}`, JSON.stringify(updatedPack));
    localStorage.setItem(`system-pack-${systemPackId}`, JSON.stringify(updatedPack));
    setSystemPack(updatedPack);
    setTunedProfiles(new Set(updatedProfiles.map(p => p.id)));
    
    window.dispatchEvent(new CustomEvent('customProfileAdded', { detail: updatedPack }));
    window.dispatchEvent(new CustomEvent('systemPackTuned', { 
      detail: { 
        systemPackId: systemPackId,
        systemPackName: systemPack.name,
        tuned: true 
      } 
    }));
  };

  const handleSaveAndReturn = () => {
    if (!systemPack) return;
    
    // Mark all as tuned if not already
    if (!allProfilesTuned) {
      handleMarkAllTuned();
    }

    // Get return URL
    const returnUrl = sessionStorage.getItem('tuning_return_url');
    if (returnUrl) {
      try {
        const data = JSON.parse(returnUrl);
        sessionStorage.removeItem('tuning_return_url');
        navigate(data.url, { 
          state: { 
            systemPackId: systemPackId,
            systemTuned: true,
            systemTunedMessage: `System "${systemPack.name}" has been tuned and is ready to use with all profiles configured.`,
            ...data.params 
          } 
        });
      } catch {
        navigate('/fabricator/system-packs', {
          state: {
            systemPackId: systemPackId,
            systemTuned: true,
            systemTunedMessage: `System "${systemPack.name}" has been tuned and is ready to use.`,
          }
        });
      }
    } else {
      navigate('/fabricator/system-packs', {
        state: {
          systemPackId: systemPackId,
          systemTuned: true,
          systemTunedMessage: `System "${systemPack.name}" has been tuned and is ready to use.`,
        }
      });
    }
  };

  const handleGoToDesign = () => {
    navigate('/fabricator/design');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 border-slate-700/50 shadow-2xl shadow-orange-500/5">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 via-amber-400 to-orange-600 shadow-lg shadow-orange-500/40">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
                          System Pack Tuning Studio
                        </CardTitle>
                        <Badge className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500/40 text-orange-300 px-3 py-1">
                          <Sparkles className="h-3 w-3 mr-1" />
                          PRO
                        </Badge>
                      </div>
                      <CardDescription className="text-base text-slate-300 max-w-2xl leading-relaxed">
                        Tune and verify all profiles in your system pack. Complete tuning for Frame and Sash to proceed to design.
                      </CardDescription>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleExit();
                  }}
                  className="border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50 relative z-10"
                  data-testid="system-pack-tuning-back-button"
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {hasUnsavedChanges ? 'Exit (Unsaved Changes)' : 'Back to System Packs Gallery'}
                </Button>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Prestige Exit Confirmation Dialog */}
        <UnsavedChangesDialog
          open={showExitConfirm}
          onOpenChange={setShowExitConfirm}
          onConfirm={handleConfirmExit}
          onCancel={handleCancelExit}
          context={`System Pack Tuning Studio - ${systemPack?.name || 'Custom System'}`}
          title="Unsaved Changes in System Pack Tuning"
          description="You have unsaved tuning changes that will be lost if you exit."
        />

        {/* Prestige Switch Profile Confirmation Dialog */}
        <UnsavedChangesDialog
          open={showSwitchProfileDialog}
          onOpenChange={setShowSwitchProfileDialog}
          onConfirm={handleConfirmSwitchProfile}
          onCancel={() => {
            setPendingProfile(null);
            setShowSwitchProfileDialog(false);
          }}
          context={`System Pack Tuning Studio - ${systemPack?.name || 'Custom System'}`}
          title="Switch Profile with Unsaved Changes?"
          description="You have unsaved changes in the current profile tuning. Opening a different profile will discard these changes."
        />

        {/* System Pack Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{systemPack.name}</h3>
                  <p className="text-slate-400 text-sm">{systemPack.manufacturer} • {systemPack.region.toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={allProfilesTuned ? 'bg-green-500/20 text-green-300 border-green-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}>
                    {allProfilesTuned ? 'All Tuned' : `${tunedProfiles.size}/${systemPack.profiles.length} Tuned`}
                  </Badge>
                  <Button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      try {
                        // Clear editing profile first
                        setEditingProfile(null);
                        
                        // Ensure userId is available before opening wizard
                        if (!userId) {
                          const { data: { session }, error } = await supabase.auth.getSession();
                          if (error) {
                            console.error('Auth error:', error);
                            toast.error('Authentication error. Please log in again.');
                            return;
                          }
                          if (session?.user?.id) {
                            // Set userId and mark that we want to open the wizard
                            setUserId(session.user.id);
                            setPendingWizardOpen(true);
                            // The useEffect will handle opening the wizard once userId is set
                          } else {
                            toast.error('Please log in to add profiles');
                            return;
                          }
                        } else {
                          // userId is available, open wizard immediately
                          setShowProfileWizard(true);
                        }
                      } catch (error) {
                        console.error('Error opening profile wizard:', error);
                        toast.error('Failed to open profile wizard');
                      }
                    }}
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 relative z-10"
                    type="button"
                    data-testid="add-profile-button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Profile
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'cards' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('cards')}
                      className={viewMode === 'cards' ? 'bg-orange-600' : ''}
                    >
                      <Layers className="h-4 w-4 mr-2" />
                      Cards
                    </Button>
                    <Button
                      variant={viewMode === 'tabs' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('tabs')}
                      className={viewMode === 'tabs' ? 'bg-orange-600' : ''}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Tabs
                    </Button>
                  </div>
                </div>
              </div>

              {/* Profile Cards View */}
              {viewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {systemPack.profiles.map((profile) => {
                    const isTuned = tunedProfiles.has(profile.id);
                    const profileIcon = profile.type === 'frame' ? Layers : BoxSelect;
                    const IconComponent = profileIcon;
                    
                    return (
                      <Card 
                        key={profile.id}
                        className={`bg-slate-900/50 border-slate-700/50 hover:border-orange-500/50 transition-colors ${
                          isTuned ? 'ring-2 ring-green-500/30' : ''
                        }`}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                profile.type === 'frame' ? 'bg-blue-500/20' : 
                                profile.type === 'sash' ? 'bg-green-500/20' : 
                                'bg-purple-500/20'
                              }`}>
                                <IconComponent className={`h-5 w-5 ${
                                  profile.type === 'frame' ? 'text-blue-400' : 
                                  profile.type === 'sash' ? 'text-green-400' : 
                                  'text-purple-400'
                                }`} />
                              </div>
                              <div>
                                <CardTitle className="text-base text-white capitalize">
                                  {profile.name}
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-400">
                                  {profile.type} • {profile.material}
                                </CardDescription>
                              </div>
                            </div>
                            {isTuned && (
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/40">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Tuned
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-xs text-slate-400 space-y-1">
                            {profile.width && profile.height && (
                              <div>Dimensions: {profile.width} × {profile.height} mm</div>
                            )}
                            {profile.unitWeight && (
                              <div>Weight: {profile.unitWeight} kg/m</div>
                            )}
                            {profile.barLength && (
                              <div>Bar Length: {profile.barLength} mm</div>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleOpenTuning(profile)}
                              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                              size="sm"
                            >
                              <Wrench className="h-4 w-4 mr-2" />
                              Tune
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingProfile(profile);
                                setShowProfileWizard(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                setDeletingProfile(profile);
                                setShowDeleteConfirm(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-red-600/50 text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {!isTuned && (
                            <Button
                              onClick={() => handleProfileTuned(profile.id)}
                              variant="outline"
                              className="w-full border-green-500/40 text-green-300 hover:bg-green-500/10"
                              size="sm"
                            >
                              <Zap className="h-4 w-4 mr-2" />
                              Mark as Tuned
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Profile Tabs View (Existing) */}
              {viewMode === 'tabs' && (
                <Tabs value={selectedProfileIndex.toString()} onValueChange={(v) => setSelectedProfileIndex(Number(v))}>
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-900/50">
                  {systemPack.profiles.map((profile, index) => (
                    <TabsTrigger
                      key={profile.id}
                      value={index.toString()}
                      className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300 data-[state=active]:border-orange-500/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="capitalize">{profile.type}</span>
                        {tunedProfiles.has(profile.id) && (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        )}
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {systemPack.profiles.map((profile, index) => (
                  <TabsContent key={profile.id} value={index.toString()} className="mt-6">
                    <Card className="bg-slate-900/50 border-slate-700/50">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl text-white capitalize">
                              {profile.type} Profile: {profile.name}
                            </CardTitle>
                            <CardDescription className="text-slate-400 mt-1">
                              {profile.material} • {profile.unitWeight ? `${profile.unitWeight} kg/m` : 'Weight not set'}
                              {profile.width && profile.height && ` • ${profile.width} × ${profile.height} mm`}
                            </CardDescription>
                          </div>
                          {tunedProfiles.has(profile.id) ? (
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/40">
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Tuned
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                              Needs Tuning
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <Alert className="bg-blue-500/10 border-blue-500/30">
                            <Gauge className="h-4 w-4 text-blue-400" />
                            <AlertDescription className="text-blue-300">
                              Configure cutting rules, machining zones, and calibration for this profile. 
                              Mark as "Tuned" when ready.
                            </AlertDescription>
                          </Alert>

                          {/* Profile Tuning Interface */}
                          <div className="space-y-4">
                            <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/30">
                              <p className="text-sm text-slate-400 mb-4">
                                Configure cutting rules, machining zones, and calibration for this profile:
                              </p>
                              <ul className="text-sm text-slate-300 space-y-2 mb-4">
                                <li className="flex items-center gap-2">
                                  <span className="text-orange-400">•</span>
                                  <span>Cutting rules (kerf: {profile.micronConfig?.sawKerf || 4.5}mm, bar length: {profile.barLength || 6500}mm)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <span className="text-orange-400">•</span>
                                  <span>Machining zones (slots, holes, milling operations)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <span className="text-orange-400">•</span>
                                  <span>Calibration data (cut tolerances, assembly tolerances)</span>
                                </li>
                              </ul>
                              
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleOpenTuning(profile)}
                                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                                >
                                  <Wrench className="h-4 w-4 mr-2" />
                                  Open Tuning Studio
                                </Button>
                                <Button
                                  onClick={() => handleProfileTuned(profile.id)}
                                  disabled={tunedProfiles.has(profile.id)}
                                  variant="outline"
                                  className="border-green-500/40 text-green-300 hover:bg-green-500/10"
                                >
                                  {tunedProfiles.has(profile.id) ? (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                      Tuned
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="h-4 w-4 mr-2" />
                                      Mark as Tuned
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between pt-4 border-t border-slate-700/50"
        >
          <div className="flex-1">
            {allProfilesTuned ? (
              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  All profiles tuned! System pack is ready for design and optimization.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-amber-300">
                  Tune all profiles ({tunedProfiles.size}/{systemPack.profiles.length} complete) before proceeding to design.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleMarkAllTuned}
              disabled={allProfilesTuned}
              className="border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark All as Tuned
            </Button>
            <Button
              onClick={handleSaveAndReturn}
              disabled={!allProfilesTuned}
              size="lg"
              className="h-12 px-8 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Save & Return to Workflow
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button
              onClick={handleGoToDesign}
              disabled={!allProfilesTuned}
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start New Measurement
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Profile Tuning Studio Overlay */}
      {tuningProfile && userId && (
        <ProfileTuningStudio
          profile={tuningProfile}
          userId={userId}
          onClose={handleTuningClose}
          onProfileUpdated={async () => {
            // When profile is updated in tuning studio, fetch updated data from database
            if (systemPack && tuningProfile && userId) {
              try {
                // The tuningProfile.id may have been updated to a UUID in ProfileTuningStudio
                const profileIdToFetch = tuningProfile.id;
                console.log('🔄 Fetching updated profile data for ID:', profileIdToFetch);

                // Fetch the updated profile from database
                let { data: updatedProfileData, error } = await supabase
                  .from('fabricator_profiles')
                  .select('*')
                  .eq('id', profileIdToFetch)
                  .eq('user_id', userId)
                  .single();

                if (error) {
                  console.error('❌ Error fetching updated profile:', error, { profileId: profileIdToFetch, tuningProfileId: tuningProfile.id });
                  // If the profile ID changed, try to find it by name
                  if (error.code === 'PGRST116') { // Not found
                    console.log('🔍 Profile not found by ID, trying to find by name...');
                    const { data: profilesByName, error: nameError } = await supabase
                      .from('fabricator_profiles')
                      .select('*')
                      .eq('name', tuningProfile.name)
                      .eq('user_id', userId)
                      .order('created_at', { ascending: false })
                      .limit(1);

                    if (nameError) {
                      console.error('❌ Error fetching by name:', nameError);
                      return;
                    }

                    if (profilesByName && profilesByName.length > 0) {
                      updatedProfileData = profilesByName[0];
                      console.log('✅ Found profile by name:', updatedProfileData.id);
                    } else {
                      console.error('❌ Profile not found by name either');
                      return;
                    }
                  } else {
                    return;
                  }
                }

                // Update the system pack with the fresh database data
                // Note: The profile ID may have changed from a static ID (like "KATRA-S120-FRAME") to a UUID
                const updatedProfiles = systemPack.profiles.map(p => {
                  // Match by the original tuningProfile ID or by name if ID changed
                  if (p.id === tuningProfile.id || (p.name === tuningProfile.name && p.id !== updatedProfileData.id)) {
                    console.log('🔄 Updating system pack profile:', { oldId: p.id, newId: updatedProfileData.id, name: p.name });
                    return {
                      ...p,
                      // Update the ID to the database UUID
                      id: updatedProfileData.id,
                      // Update basic properties
                      width: updatedProfileData.width,
                      height: updatedProfileData.height,
                      thickness: updatedProfileData.thickness,
                      // Update specifications
                      specifications: updatedProfileData.specifications,
                      // Update tuning status from specs
                      tuningStatus: (updatedProfileData.specifications as any)?.tuningStatus || p.tuningStatus,
                    };
                  }
                  return p;
                });

                const updatedPack = {
                  ...systemPack,
                  profiles: updatedProfiles,
                };

                // Save to localStorage and update state
                localStorage.setItem(`custom-profile-${systemPackId}`, JSON.stringify(updatedPack));
                setSystemPack(updatedPack);

                // Update tuned profiles set
                const tuned = new Set<string>();
                updatedPack.profiles?.forEach((p: SystemPackProfile) => {
                  if (p.tuningStatus === 'tuned') {
                    tuned.add(p.id);
                  }
                });
                setTunedProfiles(tuned);

                console.log('✅ System pack updated with database changes');
              } catch (err) {
                console.error('Error updating system pack after profile save:', err);
              }
            }
          }}
        />
      )}

      {/* Profile Definition Wizard */}
      {userId && (
        <ProfileDefinitionWizard
          open={showProfileWizard}
          onOpenChange={(open) => {
            setShowProfileWizard(open);
            if (!open) {
              setEditingProfile(null);
            }
          }}
          userId={userId}
          initialData={editingProfile ? {
            profileCode: editingProfile.id,
            systemName: systemPack?.name,
            width: editingProfile.width,
            height: editingProfile.height,
            materialThickness: editingProfile.thickness,
            weightPerMeter: editingProfile.unitWeight,
            role: editingProfile.type,
            material: editingProfile.material as 'aluminum' | 'upvc' | 'wood',
          } : {
            systemName: systemPack?.name,
            role: 'frame',
            material: 'aluminum',
          }}
          onProfileCreated={(profile) => {
            if (editingProfile) {
              handleEditProfile(profile);
            } else {
              handleAddProfile(profile);
            }
          }}
        />
      )}

      {/* Delete Profile Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Profile</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Are you sure you want to delete the profile "{deletingProfile?.name}"? This action cannot be undone and will remove all tuning data associated with this profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProfile}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

