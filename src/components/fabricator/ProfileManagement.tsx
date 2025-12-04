/**
 * ProfileManagement - Complete profile management system with Supabase integration
 * 
 * Features:
 * - Full CRUD operations for user-defined profiles
 * - Material types: aluminum, UPVC, wood with specific properties
 * - Regional focus: Turkish and Egyptian market presets
 * - Visual color picker with material-specific colors
 * - Stock level tracking with alerts
 * - Supplier and brand management
 * - Import/Export profiles (JSON, CSV)
 * - Bulk operations for pricing and stock updates
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/ui/collapsible';
import { FabricatorProjectSkeleton } from '@/components/ui/EnhancedLoadingStates';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Progress } from '@/shared/ui/ui/progress';
import { 
  Plus, 
  Trash2, 
  Save, 
  Edit2, 
  AlertCircle, 
  CheckCircle, 
  Package,
  Download,
  Upload,
  RefreshCw,
  Search,
  FileText,
  Settings,
  ChevronDown,
  Sparkles,
  Shield,
} from 'lucide-react';
import { Profile, Accessory, MachiningMacro, SystemPack } from '@/types/fabricator';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { parseProfileFromDXF } from '@/lib/imports/ProfileDXFImporter';
import {
  ROCK60_WINDOW_SYSTEM_TEMPLATE,
  ROCK60_SYSTEM_PACK,
  JUMBO100_WINDOW_SYSTEM_SPEC,
  JUMBO100_SYSTEM_PACK,
  SYSTEM_PACKS,
} from '@/data/systemPacks';
import { ProfileDetailCard } from './ProfileDetailCard';
import { AccessoryManagement } from './AccessoryManagement';
import { ProfileDefinitionWizard } from './ProfileDefinitionWizard';
import { ProfileTuningStudio } from './ProfileTuningStudio';

// Material-specific color presets
const MATERIAL_COLORS: Record<string, string[]> = {
  aluminum: [
    '#C0C0C0', // Silver
    '#808080', // Gray
    '#000000', // Black
    '#FFFFFF', // White
    '#FFD700', // Gold
    '#8B4513', // Brown
    '#2F4F4F', // Dark Slate Gray
    '#4682B4', // Steel Blue
  ],
  upvc: [
    '#FFFFFF', // White
    '#C0C0C0', // Silver
    '#8B4513', // Brown
    '#2F4F4F', // Dark Gray
    '#000000', // Black
    '#FFD700', // Gold
    '#4682B4', // Blue
    '#228B22', // Forest Green
  ],
  wood: [
    '#8B4513', // Brown
    '#A0522D', // Sienna
    '#D2691E', // Chocolate
    '#CD853F', // Peru
    '#DEB887', // Burlywood
    '#F5DEB3', // Wheat
    '#D2B48C', // Tan
    '#BC8F8F', // Rosy Brown
  ],
};

// Regional brand presets
const REGIONAL_BRANDS = {
  turkey: ['Yilmaz', 'Kale', 'Profilma', 'Alumil', 'Other'],
  egypt: ['Alumil', 'Salam', 'Kastamonu', 'Other'],
  global: ['Standard', 'Custom'],
};


interface ProfileManagementProps {
  onProfilesUpdate?: (profiles: Profile[]) => void;
  userId?: string;
  /** Optional initial list of profiles from a higher-level page shell. */
  initialProfiles?: Profile[];
  /** If true, skip initial load and use initialProfiles instead */
  skipInitialLoad?: boolean;
}

export const ProfileManagement: React.FC<ProfileManagementProps> = ({
  onProfilesUpdate,
  userId,
  initialProfiles,
  skipInitialLoad = false,
}) => {
  const { t } = useTranslation('fabricator');
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles || []);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>(initialProfiles || []);
  const [_activeImportTab, _setActiveImportTab] = useState('manual');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { state: workspaceState, dispatch } = useFabricatorWorkspace();
  const searchTerm = workspaceState.globalSearchQuery || '';
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [systemPackFilter, setSystemPackFilter] = useState<string>('all');
  const [_subscription, _setSubscription] = useState<any>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isUploadingPreview, setIsUploadingPreview] = useState<string | null>(null);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [showAccessoryManager, setShowAccessoryManager] = useState(false);
  const [showProfileDefinitionWizard, setShowProfileDefinitionWizard] = useState(false);
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState<Profile | null>(null);
  const [selectedSystemPackId, setSelectedSystemPackId] = useState<string>('custom');
  const [tuningProfile, setTuningProfile] = useState<Profile | null>(null);
  const [tuningFilter, setTuningFilter] = useState<'all' | 'tuned' | 'in_progress' | 'untuned'>('all');

  const getTuningStatus = (profile: Profile): 'untuned' | 'in_progress' | 'tuned' => {
    const specs = profile.specifications || {};
    const raw = (specs as any).tuningStatus as 'untuned' | 'in_progress' | 'tuned' | undefined;
    if (raw === 'tuned' || raw === 'in_progress' || raw === 'untuned') return raw;
    if ((profile.calibrations && profile.calibrations.length > 0) || profile.machiningMacros?.length) {
      return 'in_progress';
    }
    return 'untuned';
  };

  const tuningStats = useMemo(() => {
    const stats = {
      total: profiles.length,
      tuned: 0,
      inProgress: 0,
      untuned: 0,
      byRole: {
        frame: { total: 0, tuned: 0 },
        sash: { total: 0, tuned: 0 },
        mullion: { total: 0, tuned: 0 },
        glazing_bead: { total: 0, tuned: 0 },
      } as Record<string, { total: number; tuned: number }>,
    };

    profiles.forEach((p) => {
      const status = getTuningStatus(p);
      if (status === 'tuned') stats.tuned += 1;
      else if (status === 'in_progress') stats.inProgress += 1;
      else stats.untuned += 1;

      const role = p.profileRole || (p.specifications as any)?.profileRole;
      if (role && stats.byRole[role]) {
        stats.byRole[role].total += 1;
        if (status === 'tuned') stats.byRole[role].tuned += 1;
      }
    });

    return stats;
  }, [profiles]);
  // Collapsible states - both collapsed by default
  const [isProfileManagementOpen, setIsProfileManagementOpen] = useState<boolean>(false);
  const [isProfileFormOpen, setIsProfileFormOpen] = useState<boolean>(false);

  // Memoized callback to prevent re-renders
  const handleAccessoriesUpdate = useCallback((updatedAccessories: any[]) => {
    setAccessories(updatedAccessories.map((acc) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type === 'corner' ? 'corner_connector' : 
            acc.type === 'other' ? 'bracket' : 
            acc.type as 'hinge' | 'handle' | 'lock' | 'corner_connector' | 'bracket' | 'seal' | 'screw',
      compatibleProfiles: [],
      installationMacros: [],
      specifications: acc.specifications || {},
      images: acc.imageUrl ? [acc.imageUrl] : [],
      category: acc.category,
      unitPrice: acc.unitPrice,
      baseCost: acc.baseCost,
      markupPercentage: acc.markupPercentage,
      supplier: acc.supplier,
      sku: acc.sku,
      description: acc.description,
      compatibleMaterials: acc.compatibleMaterials || [],
      region: acc.region || [],
      imageUrl: acc.imageUrl,
      userId: acc.userId,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
    })));
  }, []);

  // Form state
  const [formData, setFormData] = useState<Partial<Profile>>({
    name: '',
    material: 'aluminum',
    width: 50,
    height: 25,
    thickness: 1.4,
    color: '#C0C0C0',
    costPerMeter: 0,
    cuttingAllowance: 3,
    stockQuantity: 0,
    minStockLevel: 0,
    maxStockLevel: 1000,
    supplier: '',
    systemBrand: 'Standard',
    grainDirection: null,
    weightPerMeter: undefined,
    specifications: {},
    category: 'window',
    systemType: 'casement',
    profileRole: 'frame',
    compatibleAccessories: [],
    machiningMacros: [],
    technicalDrawings: [],
    systemPackIds: [],
  });

  const handleImportDXF = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseProfileFromDXF(file);

      setFormData((prev) => ({
        ...prev,
        name: prev.name || parsed.name,
        material: prev.material || parsed.material || 'aluminum',
        width: prev.width || parsed.width || 50,
        height: prev.height || parsed.height || 25,
        thickness: prev.thickness || parsed.thickness || 1.4,
        specifications: {
          ...(prev.specifications || {}),
          ...(parsed.specifications || {}),
        },
      }));

      toast.success('DXF imported. Please review the detected values before saving.');
    } catch (err) {
      console.error('Error importing DXF profile:', err);
      toast.error('Failed to import profile from DXF');
    } finally {
      // Reset input so the same file can be re-selected if needed
      event.target.value = '';
    }
  };

  // Load profiles from Supabase
  const loadProfiles = useCallback(async () => {
    // If we don't have a user yet, don't hit Supabase – just clear state and stop loading
    if (!userId) {
      setLoading(false);
      setProfiles([]);
      setFilteredProfiles([]);
      return;
    }

    try {
      setLoading(true);
      
      // Check session validity
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Session expired. Please log in again.');
      }
      
      // Use untyped Supabase client here to avoid friction with generated types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      
      // Add timeout wrapper
      const queryPromise = db
        .from('fabricator_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      // Add timeout (30 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout: Request took too long')), 30000)
      );
      
      const { data, error: fetchError } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (fetchError) {
        // Check for auth errors
        if (fetchError.code === 'PGRST301' || fetchError.message?.includes('JWT') || fetchError.message?.includes('token')) {
          throw new Error('Authentication failed. Please log in again.');
        }
        throw fetchError;
      }

      let rows = data || [];

      // Seed templates in a single batch to avoid multiple reloads
      const hasRock60Template = rows.some(
        (p: any) => p.specifications?.window_system === ROCK60_WINDOW_SYSTEM_TEMPLATE.window_system
      );
      const hasJumbo100Template = rows.some(
        (p: any) => p.specifications?.window_system === JUMBO100_WINDOW_SYSTEM_SPEC.window_system
      );

      const profilesToSeed: any[] = [];
      
      if (!hasRock60Template) {
        profilesToSeed.push({
          user_id: userId,
          name: 'ROCK 60 System Template',
          material: 'aluminum',
          width: 60,
          height: 60,
          thickness: 1.8,
          color: '#C0C0C0',
          cost_per_meter: 0,
          cutting_allowance: 3,
          stock_quantity: 0,
          min_stock_level: 0,
          max_stock_level: 1000,
          supplier: 'Global Template',
          system_brand: ROCK60_SYSTEM_PACK.meta.name,
          grain_direction: null,
          specifications: {
            ...ROCK60_WINDOW_SYSTEM_TEMPLATE,
            template: true,
            template_type: 'window_system',
          },
        });
      }

      if (!hasJumbo100Template) {
        profilesToSeed.push({
          user_id: userId,
          name: 'JUMBO 100 Sliding Template',
          material: 'aluminum',
          width: 100,
          height: 32,
          thickness: 1.8,
          color: '#C0C0C0',
          cost_per_meter: 0,
          cutting_allowance: 3,
          stock_quantity: 0,
          min_stock_level: 0,
          max_stock_level: 1000,
          supplier: JUMBO100_WINDOW_SYSTEM_SPEC.catalog_metadata?.company ?? 'ELSHERIF',
          system_brand: JUMBO100_SYSTEM_PACK.meta.name,
          grain_direction: null,
          specifications: {
            ...JUMBO100_WINDOW_SYSTEM_SPEC,
            template: true,
            template_type: 'window_system',
          },
        });
      }

      // Insert all templates at once if needed
      if (profilesToSeed.length > 0) {
        const { error: seedError } = await db
          .from('fabricator_profiles')
          .insert(profilesToSeed);

        if (seedError) {
          console.error('Error seeding template profiles:', seedError);
        } else {
          // Reload once after seeding all templates
          const { data: reloaded, error: reloadError } = await db
            .from('fabricator_profiles')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (reloadError) {
            console.error('Error reloading profiles after seeding:', reloadError);
          } else if (reloaded) {
            rows = reloaded;
          }
        }
      }

      const mappedProfiles: Profile[] = rows.map((p: any) => {
        const specs = p.specifications || {};
        return {
          id: p.id,
          name: p.name,
          material: p.material as 'aluminum' | 'upvc' | 'wood',
          width: p.width,
          height: p.height,
          thickness: p.thickness,
          color: p.color || '#C0C0C0',
          costPerMeter: p.cost_per_meter ?? 0,
          cuttingAllowance: p.cutting_allowance ?? 3,
          stockQuantity: p.stock_quantity ?? 0,
          minStockLevel: p.min_stock_level ?? 0,
          maxStockLevel: p.max_stock_level ?? 1000,
          supplier: p.supplier || '',
          systemBrand: p.system_brand,
          grainDirection: p.grain_direction,
          weightPerMeter:
            typeof specs.weightPerMeterKg === 'number'
              ? specs.weightPerMeterKg
              : undefined,
          category: specs.category as Profile['category'],
          systemType: specs.systemType as Profile['systemType'],
          profileRole: specs.profileRole as Profile['profileRole'],
          compatibleAccessories: specs.compatibleAccessories as string[] || [],
          machiningMacros: specs.machiningMacros as MachiningMacro[] || [],
          technicalDrawings: specs.technicalDrawings as any[] || [],
          systemPackIds: specs.systemPackIds as string[] || [],
          specifications: specs,
          userId: p.user_id,
          createdAt: p.created_at ? new Date(p.created_at) : undefined,
          updatedAt: p.updated_at ? new Date(p.updated_at) : undefined,
        };
      });

      setProfiles(mappedProfiles);
      setFilteredProfiles(mappedProfiles);
      if (onProfilesUpdate) {
        onProfilesUpdate(mappedProfiles);
      }
      setHasLoadedOnce(true);
    } catch (err) {
      console.error('Error loading profiles:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profiles';
      setError(errorMessage);
      
      // Don't show toast for auth errors (handled at page level)
      if (!errorMessage.includes('Session expired') && !errorMessage.includes('Authentication failed')) {
        toast.error('Failed to load profiles');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, onProfilesUpdate]);

  // Setup real-time subscription (use ref to avoid circular dependency)
  const loadProfilesRef = useRef(loadProfiles);
  useEffect(() => {
    loadProfilesRef.current = loadProfiles;
  }, [loadProfiles]);

  useEffect(() => {
    if (!userId) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const channel = db
      .channel(`fabricator_profiles_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fabricator_profiles',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          console.log('Profile change detected:', payload);
          // Use ref to avoid dependency on loadProfiles
          loadProfilesRef.current();
        }
      )
      .subscribe();

    return () => {
      // Cleanup subscription properly
      if (channel) {
        db.removeChannel(channel);
      }
    };
  }, [userId]); // Only depend on userId, not loadProfiles

  // Initial load - use initialProfiles if provided and skipInitialLoad is true
  useEffect(() => {
    if (skipInitialLoad && initialProfiles !== undefined) {
      // Use initial profiles from parent component (even if empty array)
      setProfiles(initialProfiles);
      setFilteredProfiles(initialProfiles);
      setLoading(false);
      setHasLoadedOnce(true);
    } else if (userId && !hasLoadedOnce) {
      // Only load if we don't have initial profiles or skipInitialLoad is false
      loadProfiles();
    }
  }, [userId, skipInitialLoad]); // Don't depend on loadProfiles or initialProfiles to avoid re-runs

  // Update profiles when initialProfiles changes (for real-time updates from parent)
  useEffect(() => {
    if (skipInitialLoad && initialProfiles !== undefined) {
      setProfiles(initialProfiles);
      setFilteredProfiles(initialProfiles);
    }
  }, [initialProfiles, skipInitialLoad]);

  // Helper function to get system packs for category
  const getSystemPacksForCategory = (category: string): SystemPack[] => {
    if (category === 'all') return [];
    const mappedPacks: SystemPack[] = SYSTEM_PACKS.map((pack) => ({
      id: pack.meta.id,
      name: pack.meta.name,
      category: determineCategoryFromPack(pack.meta.id, pack.meta.name),
      brand: pack.meta.brands[0] || 'Unknown',
      compatibleProfiles: [],
      compatibleAccessories: [],
      description: `System pack for ${pack.meta.name}`,
      technicalData: {},
    }));
    return mappedPacks.filter((pack) => pack.category === category);
  };

  const determineCategoryFromPack = (
    id: string,
    name: string
  ): 'aluminum_windows' | 'aluminum_doors' | 'curtain_walls' | 'upvc_windows' | 'upvc_doors' => {
    const lowerId = id.toLowerCase();
    const lowerName = name.toLowerCase();
    if (lowerId.includes('curtain') || lowerName.includes('curtain')) return 'curtain_walls';
    if (lowerId.includes('door') || lowerName.includes('door')) {
      if (lowerId.includes('upvc') || lowerName.includes('upvc')) return 'upvc_doors';
      return 'aluminum_doors';
    }
    if (lowerId.includes('upvc') || lowerName.includes('upvc')) return 'upvc_windows';
    return 'aluminum_windows';
  };

  // Filter profiles
  useEffect(() => {
    let filtered = profiles;

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        // Search across multiple fields
        const name = p.name?.toLowerCase() || '';
        const supplier = p.supplier?.toLowerCase() || '';
        const systemBrand = p.systemBrand?.toLowerCase() || '';
        const material = p.material?.toLowerCase() || '';
        const width = p.width?.toString() || '';
        const height = p.height?.toString() || '';
        const code = (p.specifications as any)?.supplierCode?.toLowerCase() || 
                     (p.specifications as any)?.internalCode?.toLowerCase() || '';
        const role = (p.specifications as any)?.profileRole?.toLowerCase() || '';
        
        return (
          name.includes(query) ||
          supplier.includes(query) ||
          systemBrand.includes(query) ||
          material.includes(query) ||
          width.includes(query) ||
          height.includes(query) ||
          code.includes(query) ||
          role.includes(query)
        );
      });
    }

    if (materialFilter !== 'all') {
      filtered = filtered.filter((p) => p.material === materialFilter);
    }

    if (regionFilter !== 'all') {
      filtered = filtered.filter((p) => {
        const brand = p.systemBrand || '';
        if (regionFilter === 'turkey') {
          return REGIONAL_BRANDS.turkey.some((b) => brand.includes(b));
        }
        if (regionFilter === 'egypt') {
          return REGIONAL_BRANDS.egypt.some((b) => brand.includes(b));
        }
        return true;
      });
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => {
        const category = p.category || 'window';
        return category === categoryFilter;
      });
    }

    if (systemPackFilter !== 'all') {
      filtered = filtered.filter((p) => {
        return p.systemPackIds?.includes(systemPackFilter);
      });
    }

    if (tuningFilter !== 'all') {
      filtered = filtered.filter((p) => getTuningStatus(p) === tuningFilter);
    }

    setFilteredProfiles(filtered);
  }, [profiles, searchTerm, materialFilter, regionFilter, categoryFilter, systemPackFilter, tuningFilter]);

  const handleUploadPreviewImage = async (event: React.ChangeEvent<HTMLInputElement>, profile: Profile) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    try {
      setIsUploadingPreview(profile.id);
      const path = `${userId}/${profile.id}/${Date.now()}-${file.name}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storage = (supabase as unknown as { storage: any }).storage.from('profile-previews');
      const { error } = await storage.upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = storage.getPublicUrl(path);
      const url = (pub.publicUrl || (pub as any).publicURL) as string;

      const nextSpecs = {
        ...(profile.specifications || {}),
        previewImageUrl: url,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { error: updateError } = await db
        .from('fabricator_profiles')
        .update({ specifications: nextSpecs })
        .eq('id', profile.id)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      await loadProfiles();
      toast.success('Profile preview image uploaded');
    } catch (err) {
      console.error('Error uploading profile preview image:', err);
      toast.error('Failed to upload profile preview image');
    } finally {
      setIsUploadingPreview(null);
      event.target.value = '';
    }
  };

  const handleAddProfile = async () => {
    if (!formData.name || !formData.material) {
      setError('Name and material are required');
      return;
    }

    if (!userId) {
      setError('User ID is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const specs = {
        ...(formData.specifications || {}),
        ...(formData.weightPerMeter !== undefined
          ? { weightPerMeterKg: formData.weightPerMeter }
          : {}),
        category: formData.category,
        systemType: formData.systemType,
        profileRole: formData.profileRole,
        compatibleAccessories: formData.compatibleAccessories || [],
        machiningMacros: formData.machiningMacros || [],
        technicalDrawings: formData.technicalDrawings || [],
        systemPackIds: formData.systemPackIds || [],
      };

      // Derive cost per meter for aluminum from kg, otherwise use entered per‑meter price
      let effectiveCostPerMeter = formData.costPerMeter || 0;
      if (
        formData.material === 'aluminum' &&
        typeof (specs as any).costPerKg === 'number' &&
        typeof formData.weightPerMeter === 'number'
      ) {
        effectiveCostPerMeter = (specs as any).costPerKg * formData.weightPerMeter;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { error: insertError } = await db
        .from('fabricator_profiles')
        .insert({
          user_id: userId,
          name: formData.name,
          material: formData.material,
          width: formData.width,
          height: formData.height,
          thickness: formData.thickness,
          color: formData.color,
          cost_per_meter: effectiveCostPerMeter,
          cutting_allowance: formData.cuttingAllowance,
          stock_quantity: formData.stockQuantity || 0,
          min_stock_level: formData.minStockLevel || 0,
          max_stock_level: formData.maxStockLevel,
          supplier: formData.supplier || '',
          system_brand: formData.systemBrand || 'Standard',
          grain_direction: formData.grainDirection,
          specifications: specs,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await loadProfiles();
      resetForm();
      setSuccess(true);
      toast.success(t('profileManagement.profileSavedSuccess', 'Profile saved successfully'));
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error adding profile:', err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detailedError = (err as any)?.message || (err as any)?.details || (err as any)?.error_description || 'Unknown error';
      setError(detailedError);
      toast.error(`Error saving profile: ${detailedError}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editingId || !userId) return;

    try {
      setSaving(true);
      setError(null);

      const specs = {
        ...(formData.specifications || {}),
        ...(formData.weightPerMeter !== undefined
          ? { weightPerMeterKg: formData.weightPerMeter }
          : {}),
        category: formData.category,
        systemType: formData.systemType,
        profileRole: formData.profileRole,
        compatibleAccessories: formData.compatibleAccessories || [],
        machiningMacros: formData.machiningMacros || [],
        technicalDrawings: formData.technicalDrawings || [],
        systemPackIds: formData.systemPackIds || [],
      };

      let effectiveCostPerMeter = formData.costPerMeter || 0;
      if (
        formData.material === 'aluminum' &&
        typeof (specs as any).costPerKg === 'number' &&
        typeof formData.weightPerMeter === 'number'
      ) {
        effectiveCostPerMeter = (specs as any).costPerKg * formData.weightPerMeter;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { error: updateError } = await db
        .from('fabricator_profiles')
        .update({
          name: formData.name,
          material: formData.material,
          width: formData.width,
          height: formData.height,
          thickness: formData.thickness,
          color: formData.color,
          cost_per_meter: effectiveCostPerMeter,
          cutting_allowance: formData.cuttingAllowance,
          stock_quantity: formData.stockQuantity,
          min_stock_level: formData.minStockLevel,
          max_stock_level: formData.maxStockLevel,
          supplier: formData.supplier,
          system_brand: formData.systemBrand,
          grain_direction: formData.grainDirection,
          specifications: specs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      await loadProfiles();
      resetForm();
      setSuccess(true);
      toast.success(t('profileManagement.profileUpdatedSuccess', 'Profile updated successfully'));
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : t('profileManagement.errorUpdatingProfile', 'Error updating profile'));
      toast.error(t('profileManagement.errorUpdatingProfile', 'Error updating profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm(t('profileManagement.confirmDelete', 'Are you sure you want to delete this profile?'))) return;
    if (!userId) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { error: deleteError } = await db
        .from('fabricator_profiles')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      await loadProfiles();
      toast.success(t('profileManagement.profileDeletedSuccess', 'Profile deleted successfully'));
    } catch (err) {
      console.error('Error deleting profile:', err);
      toast.error(t('profileManagement.errorDeletingProfile', 'Error deleting profile'));
    }
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingId(profile.id);
    const specs = profile.specifications || {};
    const packIds = profile.systemPackIds || (specs.systemPackIds as string[]) || [];
    const firstPackId = packIds.length > 0 ? packIds[0] : 'custom';
    
    setSelectedSystemPackId(firstPackId);
    setFormData({
      name: profile.name,
      material: profile.material,
      width: profile.width,
      height: profile.height,
      thickness: profile.thickness,
      color: profile.color,
      costPerMeter: profile.costPerMeter,
      cuttingAllowance: profile.cuttingAllowance,
      stockQuantity: profile.stockQuantity,
      minStockLevel: profile.minStockLevel,
      maxStockLevel: profile.maxStockLevel,
      supplier: profile.supplier,
      systemBrand: profile.systemBrand || 'Standard',
      grainDirection: profile.grainDirection,
      weightPerMeter: profile.weightPerMeter,
      category: profile.category || (specs.category as Profile['category']) || 'window',
      systemType: profile.systemType || (specs.systemType as Profile['systemType']) || 'casement',
      profileRole: profile.profileRole || (specs.profileRole as Profile['profileRole']) || 'frame',
      compatibleAccessories: profile.compatibleAccessories || (specs.compatibleAccessories as string[]) || [],
      machiningMacros: profile.machiningMacros || (specs.machiningMacros as MachiningMacro[]) || [],
      technicalDrawings: profile.technicalDrawings || (specs.technicalDrawings as any) || [],
      systemPackIds: packIds,
      specifications: specs,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedSystemPackId('custom');
    setFormData({
      name: '',
      material: 'aluminum',
      width: 50,
      height: 25,
      thickness: 1.4,
      color: '#C0C0C0',
      costPerMeter: 0,
      cuttingAllowance: 3,
      stockQuantity: 0,
      minStockLevel: 0,
      maxStockLevel: 1000,
      supplier: '',
      systemBrand: 'Standard',
      grainDirection: null,
      weightPerMeter: undefined,
      specifications: {},
      category: 'window',
      systemType: 'casement',
      profileRole: 'frame',
      compatibleAccessories: [],
      machiningMacros: [],
      technicalDrawings: [],
      systemPackIds: [],
    });
  };

  // Machining macro helper functions
  const addNewMacro = () => {
    const newMacro: MachiningMacro = {
      id: `macro-${Date.now()}`,
      name: '',
      operation: 'slot',
      dimensions: { width: 0, height: 0, depth: 0 },
      position: { x: 0, y: 0 },
      toolSpecs: { diameter: 0, type: 'router' },
    };
    setFormData({
      ...formData,
      machiningMacros: [...(formData.machiningMacros || []), newMacro],
    });
  };

  const updateMacro = (index: number, field: keyof MachiningMacro, value: any) => {
    const updatedMacros = [...(formData.machiningMacros || [])];
    updatedMacros[index] = { ...updatedMacros[index], [field]: value };
    setFormData({ ...formData, machiningMacros: updatedMacros });
  };

  const updateMacroDimension = (index: number, dimension: 'width' | 'height' | 'depth', value: number) => {
    const updatedMacros = [...(formData.machiningMacros || [])];
    updatedMacros[index] = {
      ...updatedMacros[index],
      dimensions: { ...updatedMacros[index].dimensions, [dimension]: value },
    };
    setFormData({ ...formData, machiningMacros: updatedMacros });
  };

  const removeMacro = (index: number) => {
    const updatedMacros = formData.machiningMacros?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, machiningMacros: updatedMacros });
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(profiles, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profiles_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Profiles exported to JSON');
  };

  const handleExportCSV = () => {
    const headers = [
      'Name',
      'Material',
      'Width (mm)',
      'Height (mm)',
      'Thickness (mm)',
      'Color',
      'Cost per Meter',
      'Cutting Allowance (mm)',
      'Stock Quantity',
      'Min Stock Level',
      'Max Stock Level',
      'Supplier',
      'System Brand',
    ];
    const rows = profiles.map((p) => [
      p.name,
      p.material,
      p.width,
      p.height || '',
      p.thickness || '',
      p.color,
      p.costPerMeter,
      p.cuttingAllowance,
      p.stockQuantity,
      p.minStockLevel,
      p.maxStockLevel || '',
      p.supplier,
      p.systemBrand || '',
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profiles_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Profiles exported to CSV');
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const raw = JSON.parse(text);

      // Support both a raw array and an object wrapper like { profiles: [...] }
      const imported: Profile[] = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as any)?.profiles)
        ? (raw as any).profiles
        : (() => {
            throw new Error('Invalid JSON format. Expected an array of profiles or { "profiles": [...] }.');
          })();
      
      if (!Array.isArray(imported)) {
        throw new Error('Invalid JSON format. Expected an array of profiles.');
      }

      // Validate and import profiles
      const validProfiles = imported.filter((p) => p.name && p.material);
      
      if (validProfiles.length === 0) {
        throw new Error('No valid profiles found in file');
      }

      if (!userId) {
        throw new Error('User ID is required to import profiles');
      }

      // Insert profiles
      const profilesToInsert = validProfiles.map((p) => ({
        user_id: userId,
        name: p.name,
        material: p.material,
        width: p.width || 50,
        height: p.height,
        thickness: p.thickness,
        color: p.color || '#C0C0C0',
        cost_per_meter: p.costPerMeter || 0,
        cutting_allowance: p.cuttingAllowance || 3,
        stock_quantity: p.stockQuantity || 0,
        min_stock_level: p.minStockLevel || 0,
        max_stock_level: p.maxStockLevel,
        supplier: p.supplier || '',
        system_brand: p.systemBrand || 'Standard',
        grain_direction: p.grainDirection,
        specifications: {
          ...(p.specifications || {}),
          ...(p.weightPerMeter !== undefined
            ? { weightPerMeterKg: p.weightPerMeter }
            : {}),
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { error: insertError } = await db
        .from('fabricator_profiles')
        .insert(profilesToInsert);

      if (insertError) throw insertError;

      await loadProfiles();
      toast.success(`Imported ${validProfiles.length} profiles`);
    } catch (err) {
      console.error('Error importing profiles:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to import profiles';
      toast.error(message);
    } finally {
      // Allow re‑selecting the same file
      event.target.value = '';
    }
  };

  // Bulk system import function
  const _handleImportSystemPack = async (systemPack: SystemPack) => {
    if (!userId) return;

    try {
      setLoading(true);

      // Import all profiles from the system pack
      const profilesToImport = await fetchProfilesForSystemPack(systemPack.id);

      // Import all accessories from the system pack
      const accessoriesToImport = await fetchAccessoriesForSystemPack(systemPack.id);

      // Batch insert profiles
      const profileInserts = profilesToImport.map((profile) => ({
        user_id: userId,
        name: profile.name,
        material: profile.material,
        width: profile.width || 50,
        height: profile.height,
        thickness: profile.thickness,
        color: profile.color || '#C0C0C0',
        cost_per_meter: profile.costPerMeter || 0,
        cutting_allowance: profile.cuttingAllowance || 3,
        stock_quantity: profile.stockQuantity || 0,
        min_stock_level: profile.minStockLevel || 0,
        max_stock_level: profile.maxStockLevel,
        supplier: profile.supplier || '',
        system_brand: profile.systemBrand || systemPack.brand,
        grain_direction: profile.grainDirection,
        specifications: {
          ...(profile.specifications || {}),
          systemPackIds: [systemPack.id],
          category: profile.category,
          systemType: profile.systemType,
          profileRole: profile.profileRole,
          compatibleAccessories: profile.compatibleAccessories || [],
          machiningMacros: profile.machiningMacros || [],
          technicalDrawings: profile.technicalDrawings || [],
        },
      }));

      // Batch insert accessories
      const accessoryInserts = accessoriesToImport.map((accessory) => ({
        user_id: userId,
        name: accessory.name,
        type: accessory.type,
        category: accessory.category || '',
        unit_price: accessory.unitPrice || 0,
        base_cost: accessory.baseCost || 0,
        markup_percentage: accessory.markupPercentage || 0,
        supplier: accessory.supplier,
        sku: accessory.sku,
        description: accessory.description,
        compatible_materials: accessory.compatibleMaterials || [],
        region: accessory.region || [],
        image_url: accessory.imageUrl || accessory.images?.[0],
        specifications: accessory.specifications || {},
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      if (profileInserts.length > 0) {
        const { error: profileError } = await db
          .from('fabricator_profiles')
          .insert(profileInserts);

        if (profileError) throw profileError;
      }

      if (accessoryInserts.length > 0) {
        const { error: accessoryError } = await db
          .from('fabricator_accessories')
          .insert(accessoryInserts);

        if (accessoryError) throw accessoryError;
      }

      // Reload data
      await loadProfiles();
      // Reload accessories if we have an accessory update handler
      if (showAccessoryManager) {
        // Trigger accessory reload
        const { data: accessoryData } = await db
          .from('fabricator_accessories')
          .select('*')
          .eq('user_id', userId);
        if (accessoryData) {
          setAccessories(accessoryData.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            type: acc.type as any,
            compatibleProfiles: [],
            installationMacros: [],
            specifications: acc.specifications || {},
            images: acc.image_url ? [acc.image_url] : [],
            category: acc.category,
            unitPrice: acc.unit_price,
            baseCost: acc.base_cost,
            markupPercentage: acc.markup_percentage,
            supplier: acc.supplier,
            sku: acc.sku,
            description: acc.description,
            compatibleMaterials: acc.compatible_materials || [],
            region: acc.region || [],
            imageUrl: acc.image_url,
            userId: acc.user_id,
            createdAt: acc.created_at ? new Date(acc.created_at) : undefined,
            updatedAt: acc.updated_at ? new Date(acc.updated_at) : undefined,
          })));
        }
      }

      toast.success(`Imported ${systemPack.name} with ${profilesToImport.length} profiles and ${accessoriesToImport.length} accessories`);
    } catch (err) {
      console.error('Error importing system pack:', err);
      toast.error('Failed to import system pack');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for fetching system pack data
  const fetchProfilesForSystemPack = async (_systemPackId: string): Promise<Profile[]> => {
    // In a real implementation, this would fetch from a system pack database or API
    // For now, return empty array - this should be implemented based on your data source
    return [];
  };

  const fetchAccessoriesForSystemPack = async (_systemPackId: string): Promise<Accessory[]> => {
    // In a real implementation, this would fetch from a system pack database or API
    // For now, return empty array - this should be implemented based on your data source
    return [];
  };

  const handleBulkUpdate = async (field: 'costPerMeter' | 'stockQuantity', value: number) => {
    if (!userId || filteredProfiles.length === 0) return;

    try {
      setSaving(true);
      const updates = filteredProfiles.map((p) => ({
        id: p.id,
        [field === 'costPerMeter' ? 'cost_per_meter' : 'stock_quantity']: value,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any;
        const { error } = await db
          .from('fabricator_profiles')
          .update({ [field === 'costPerMeter' ? 'cost_per_meter' : 'stock_quantity']: update[field === 'costPerMeter' ? 'cost_per_meter' : 'stock_quantity'] })
          .eq('id', update.id)
          .eq('user_id', userId);

        if (error) throw error;
      }

      await loadProfiles();
      toast.success(`Updated ${updates.length} profiles`);
    } catch (err) {
      console.error('Error bulk updating:', err);
      toast.error('Failed to bulk update profiles');
    } finally {
      setSaving(false);
    }
  };

  const getStockStatus = (profile: Profile) => {
    if (profile.stockQuantity <= 0) return 'out';
    const percentage = profile.minStockLevel > 0 
      ? (profile.stockQuantity / profile.minStockLevel) * 100 
      : 100;
    if (percentage < 50) return 'low';
    if (percentage < 80) return 'medium';
    return 'high';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out': return 'text-red-600';
      case 'low': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStockStatusLabel = (status: string) => {
    switch (status) {
      case 'high':
        return t('profileManagement.inStock', 'In Stock');
      case 'medium':
      case 'low':
        return t('profileManagement.lowStock', 'Low Stock');
      case 'out':
        return t('profileManagement.outOfStock', 'Out of Stock');
      default:
        return t('inventory.status.critical', 'CRITICAL');
    }
  };

  const getMaterialColors = () => {
    return MATERIAL_COLORS[formData.material || 'aluminum'] || MATERIAL_COLORS.aluminum;
  };

  // Show full-page loader only on the first load
  if (loading && !hasLoadedOnce) {
    return <FabricatorProjectSkeleton showHeader={true} showTabs={false} showContent={true} />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-500">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-900/20 border-green-500">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Operation completed successfully!</AlertDescription>
        </Alert>
      )}

      {/* Tuning & System Overview */}
      <Card className="bg-gray-900/70 border-gray-700">
        <CardContent className="py-4 px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/15 border border-orange-400/60">
                <Sparkles className="h-5 w-5 text-orange-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Fabricator Pro · Profile Readiness
                </p>
                <p className="text-sm text-gray-200">
                  {tuningStats.tuned}/{tuningStats.total} profiles tuned for production
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="px-3 py-2 rounded-md bg-gray-800/70 border border-gray-700">
                <p className="text-[10px] uppercase text-gray-400">Tuned</p>
                <p className="text-sm font-semibold text-emerald-400">
                  {tuningStats.tuned}
                  <span className="text-[11px] text-gray-500 ml-1">
                    ({tuningStats.total > 0 ? Math.round((tuningStats.tuned / tuningStats.total) * 100) : 0}
                    %)
                  </span>
                </p>
              </div>
              <div className="px-3 py-2 rounded-md bg-gray-800/70 border border-gray-700">
                <p className="text-[10px] uppercase text-gray-400">In Progress</p>
                <p className="text-sm font-semibold text-blue-300">
                  {tuningStats.inProgress}
                </p>
              </div>
              <div className="px-3 py-2 rounded-md bg-gray-800/70 border border-gray-700">
                <p className="text-[10px] uppercase text-gray-400">Untuned</p>
                <p className="text-sm font-semibold text-yellow-300">
                  {tuningStats.untuned}
                </p>
              </div>
              <div className="px-3 py-2 rounded-md bg-gray-800/70 border border-gray-700 hidden md:block">
                <p className="text-[10px] uppercase text-gray-400 flex items-center gap-1">
                  <Shield className="h-3 w-3 text-teal-300" />
                  Core Roles Tuned
                </p>
                <p className="text-[11px] text-gray-200 mt-1">
                  F:{tuningStats.byRole.frame.tuned}/{tuningStats.byRole.frame.total}{' '}
                  S:{tuningStats.byRole.sash.tuned}/{tuningStats.byRole.sash.total}{' '}
                  M:{tuningStats.byRole.mullion.tuned}/{tuningStats.byRole.mullion.total}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header with Actions - Collapsible */}
      <Collapsible open={isProfileManagementOpen} onOpenChange={setIsProfileManagementOpen}>
        <Card className="bg-gray-800/50 border-gray-700">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-800/70 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-400" />
                  {t('profileManagement.title', 'Profile Management')} ({profiles.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportJSON}
                      disabled={profiles.length === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t('profileManagement.exportProfiles', 'Export Profiles')} JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      disabled={profiles.length === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t('profileManagement.exportProfiles', 'Export Profiles')} CSV
                    </Button>
                    <label>
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {t('profileManagement.importProfilesFile', 'Import Profile File')}
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportJSON}
                        className="hidden"
                      />
                    </label>
                    <Button variant="outline" size="sm" onClick={loadProfiles}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('profileManagement.refreshProfiles', 'Refresh Profiles')}
                    </Button>
                  </div>
                  <ChevronDown 
                    className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                      isProfileManagementOpen ? 'rotate-180' : ''
                    }`} 
                  />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
        </Card>

        <CollapsibleContent>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Material Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="aluminum_windows">Aluminum Windows</SelectItem>
                <SelectItem value="aluminum_doors">Aluminum Doors</SelectItem>
                <SelectItem value="curtain_walls">Curtain Walls</SelectItem>
                <SelectItem value="upvc_windows">UPVC Windows</SelectItem>
                <SelectItem value="upvc_doors">UPVC Doors</SelectItem>
                <SelectItem value="accessories">Accessories</SelectItem>
              </SelectContent>
            </Select>

            {/* System Pack Filter */}
            <Select value={systemPackFilter} onValueChange={setSystemPackFilter}>
              <SelectTrigger>
                <SelectValue placeholder="System Pack" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Systems</SelectItem>
                {getSystemPacksForCategory(categoryFilter).map((pack) => (
                  <SelectItem key={pack.id} value={pack.id}>
                    {pack.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('profileManagement.searchProfiles', 'Search Profiles')}
                value={searchTerm}
                onChange={(e) => dispatch({ type: 'SET_GLOBAL_SEARCH', payload: e.target.value })}
                className="pl-10"
              />
            </div>

            {/* Material Filter */}
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('profileManagement.filterByMaterial', 'Filter by Material')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('profileManagement.all', 'All')}</SelectItem>
                <SelectItem value="aluminum">{t('profileManagement.aluminum', 'Aluminum')}</SelectItem>
                <SelectItem value="upvc">{t('profileManagement.upvc', 'UPVC')}</SelectItem>
                <SelectItem value="wood">{t('profileManagement.wood', 'Wood')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Region Filter */}
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('profileManagement.filterByRegion', 'Filter by Region')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('profileManagement.all', 'All')}</SelectItem>
                <SelectItem value="turkey">{t('profileManagement.turkey', 'Turkey')}</SelectItem>
                <SelectItem value="egypt">{t('profileManagement.egypt', 'Egypt')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Tuning Status Filter */}
            <Select value={tuningFilter} onValueChange={(v) => setTuningFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Tuning Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tuning States</SelectItem>
                <SelectItem value="tuned">Tuned</SelectItem>
                <SelectItem value="in_progress">Tuning in Progress</SelectItem>
                <SelectItem value="untuned">Not Tuned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Bulk Operations */}
          {filteredProfiles.length > 0 && (
            <div className="flex gap-2 mt-4">
              <Input
                type="number"
                placeholder={t('profileManagement.bulkCost', 'Bulk cost')}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = parseFloat(e.currentTarget.value);
                    if (!isNaN(value)) {
                      handleBulkUpdate('costPerMeter', value);
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
              <Input
                type="number"
                placeholder={t('profileManagement.bulkStock', 'Bulk stock')}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = parseFloat(e.currentTarget.value);
                    if (!isNaN(value)) {
                      handleBulkUpdate('stockQuantity', value);
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Form - Collapsible */}
      <Collapsible open={isProfileFormOpen} onOpenChange={setIsProfileFormOpen}>
        <Card className="bg-gray-800/50 border-gray-700">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-800/70 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {editingId ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editingId ? t('profileManagement.updateProfile', 'Update Profile') : t('profileManagement.addNewProfile', 'Add New Profile')}
                </CardTitle>
                <ChevronDown 
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                    isProfileFormOpen ? 'rotate-180' : ''
                  }`} 
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">
              You can also start a new profile from a DXF file exported from your CAD system.
            </p>
            <label>
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('profileManagement.importDxf', 'Import DXF')}
                </span>
              </Button>
              <input
                type="file"
                accept=".dxf"
                onChange={handleImportDXF}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('profileManagement.name', 'Name')} *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Yilmaz 50mm Aluminum"
              />
            </div>
            <div>
              <Label>{t('profileManagement.material', 'Material')} *</Label>
              <Select
                value={formData.material}
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    material: value as 'aluminum' | 'upvc' | 'wood',
                    color: MATERIAL_COLORS[value]?.[0] || '#C0C0C0',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluminum">{t('profileManagement.aluminum', 'Aluminum')}</SelectItem>
                  <SelectItem value="upvc">{t('profileManagement.upvc', 'UPVC')}</SelectItem>
                  <SelectItem value="wood">{t('profileManagement.wood', 'Wood')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={formData.category || 'window'}
                onValueChange={(value) => setFormData({ ...formData, category: value as Profile['category'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="window">Window</SelectItem>
                  <SelectItem value="door">Door</SelectItem>
                  <SelectItem value="curtain_wall">Curtain Wall</SelectItem>
                  <SelectItem value="structural">Structural</SelectItem>
                  <SelectItem value="accessory">Accessory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>System Type</Label>
              <Select
                value={formData.systemType || 'casement'}
                onValueChange={(value) => setFormData({ ...formData, systemType: value as Profile['systemType'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casement">Casement</SelectItem>
                  <SelectItem value="sliding">Sliding</SelectItem>
                  <SelectItem value="tilt_turn">Tilt & Turn</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="facade">Facade</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('profileManagement.widthMm', 'Width (mm)')}</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.width || 50}
                onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 50 })}
              />
            </div>
            <div>
              <Label>{t('profileManagement.heightMm', 'Height (mm)')}</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.height || 25}
                onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 25 })}
              />
            </div>
            <div>
              <Label>{t('profileManagement.thicknessMm', 'Thickness (mm)')}</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.thickness || 1.4}
                onChange={(e) => setFormData({ ...formData, thickness: parseFloat(e.target.value) || 1.4 })}
              />
            </div>
            <div>
              <Label>{t('profileManagement.color', 'Color')}</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.color || '#C0C0C0'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <div className="flex gap-1 flex-1">
                  {getMaterialColors().map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-8 h-8 rounded border-2 border-gray-600 hover:border-orange-400"
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label>{t('profileManagement.costPerMeter', 'Cost Per Meter')} ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.costPerMeter || 0}
                onChange={(e) => setFormData({ ...formData, costPerMeter: parseFloat(e.target.value) || 0 })}
              />
            </div>
            {formData.material === 'aluminum' && (
              <div>
                <Label>Cost per Kg (Aluminum)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(formData.specifications as any)?.costPerKg ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specifications: {
                        ...(formData.specifications || {}),
                        costPerKg: e.target.value ? parseFloat(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="e.g., 6.50"
                />
              </div>
            )}
            <div>
              <Label>{t('profileManagement.weightPerMeter', 'Weight Per Meter')} (kg/m) – Aluminum</Label>
              <Input
                type="number"
                step="0.001"
                value={formData.weightPerMeter ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    weightPerMeter: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="e.g., 1.250"
              />
            </div>
            <div>
              <Label>{t('profileManagement.cuttingAllowance', 'Cutting Allowance')} (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.cuttingAllowance || 3}
                onChange={(e) => setFormData({ ...formData, cuttingAllowance: parseFloat(e.target.value) || 3 })}
              />
            </div>
            <div>
              <Label>{t('profileManagement.stockQuantity', 'Stock Quantity')} (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.stockQuantity || 0}
                onChange={(e) => setFormData({ ...formData, stockQuantity: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>{t('profileManagement.minStockLevel', 'Minimum Stock Level')} (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.minStockLevel || 0}
                onChange={(e) => setFormData({ ...formData, minStockLevel: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>{t('profileManagement.maxStockLevel', 'Maximum Stock Level')} (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.maxStockLevel || 1000}
                onChange={(e) => setFormData({ ...formData, maxStockLevel: parseFloat(e.target.value) || 1000 })}
              />
            </div>
            <div>
              <Label>{t('profileManagement.supplier', 'Supplier')}</Label>
              <Input
                value={formData.supplier || ''}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder={t('profileManagement.supplier', 'Supplier')}
              />
            </div>
            <div>
              <Label>Profile Role in System</Label>
              <Select
                value={(formData.specifications as any)?.profileRole || 'frame'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    specifications: {
                      ...(formData.specifications || {}),
                      profileRole: value,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frame">Frame</SelectItem>
                  <SelectItem value="sash">Sash</SelectItem>
                  <SelectItem value="mullion">Mullion / Transom</SelectItem>
                  <SelectItem value="glazing_bead">Glazing Bead</SelectItem>
                  <SelectItem value="interlock">Interlock</SelectItem>
                  <SelectItem value="accessory">Accessory Profile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('profileManagement.supplierCode', 'Supplier Code')}</Label>
              <Input
                value={(formData.specifications as any)?.supplierCode || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specifications: {
                      ...(formData.specifications || {}),
                      supplierCode: e.target.value,
                    },
                  })
                }
                placeholder="e.g., ALS-PS-50"
              />
            </div>
            <div>
              <Label>{t('profileManagement.internalCode', 'Internal Code')}</Label>
              <Input
                value={(formData.specifications as any)?.internalCode || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specifications: {
                      ...(formData.specifications || {}),
                      internalCode: e.target.value,
                    },
                  })
                }
                placeholder="Factory code (ERP)"
              />
            </div>
            <div>
              <Label>System Pack *</Label>
              <Select
                value={selectedSystemPackId}
                onValueChange={(value) => {
                  setSelectedSystemPackId(value);
                  if (value === 'custom') {
                    // Custom system - user will enter manually
                    setFormData({
                      ...formData,
                      systemPackIds: [],
                      systemBrand: formData.systemBrand || 'Standard',
                    });
                  } else {
                    // Find the selected system pack
                    const selectedPack = SYSTEM_PACKS.find(p => p.meta.id === value);
                    if (selectedPack) {
                      setFormData({
                        ...formData,
                        systemPackIds: [selectedPack.meta.id],
                        systemBrand: selectedPack.meta.brands[0] || selectedPack.meta.name,
                        specifications: {
                          ...(formData.specifications || {}),
                          window_system: selectedPack.meta.name,
                          systemPackId: selectedPack.meta.id,
                        },
                      });
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select system pack or Custom" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="custom">
                    Custom / Other
                  </SelectItem>
                  {SYSTEM_PACKS.map((pack) => (
                    <SelectItem key={pack.meta.id} value={pack.meta.id}>
                      {pack.meta.name} ({pack.meta.brands[0] || 'Generic'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">
                {selectedSystemPackId === 'custom' 
                  ? 'You can manually enter system details below'
                  : 'System details will be auto-filled'}
              </p>
            </div>
            <div>
              <Label>{t('profileManagement.systemBrand', 'System Brand')}</Label>
              <Select
                value={formData.systemBrand || 'Standard'}
                onValueChange={(value) => setFormData({ ...formData, systemBrand: value })}
                disabled={selectedSystemPackId !== 'custom'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Yilmaz">Yilmaz</SelectItem>
                  <SelectItem value="Kale">Kale</SelectItem>
                  <SelectItem value="Profilma">Profilma</SelectItem>
                  <SelectItem value="Alumil">Alumil</SelectItem>
                  <SelectItem value="Salam">Salam</SelectItem>
                  <SelectItem value="Kastamonu">Kastamonu</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {selectedSystemPackId !== 'custom' && (
                <p className="text-xs text-gray-400 mt-1">
                  Auto-filled from selected system pack
                </p>
              )}
            </div>
            {(formData.material === 'wood' || formData.material === 'upvc') && (
              <div>
                <Label>{t('profileManagement.grainDirection', 'Grain Direction')}</Label>
                <Select
                  value={formData.grainDirection || 'none'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      grainDirection: value === 'none' ? null : (value as 'horizontal' | 'vertical'),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('profileManagement.none', '—')}</SelectItem>
                    <SelectItem value="horizontal">Horizontal</SelectItem>
                    <SelectItem value="vertical">Vertical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>{t('profileManagement.series', 'Series')}</Label>
              <Input
                value={(formData.specifications as any)?.series || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specifications: {
                      ...(formData.specifications || {}),
                      series: e.target.value,
                    },
                  })
                }
                placeholder="e.g., PS Jumbo, 70 Series"
              />
            </div>
            <div>
              <Label>{t('profileManagement.year', 'Year')}</Label>
              <Input
                type="number"
                value={(formData.specifications as any)?.year || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specifications: {
                      ...(formData.specifications || {}),
                      year: e.target.value,
                    },
                  })
                }
                placeholder="e.g., 2025"
              />
            </div>
            <div>
              <Label>Glazing Thickness Min (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={(formData.specifications as any)?.glazingMinMm || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specifications: {
                      ...(formData.specifications || {}),
                      glazingMinMm: e.target.value ? parseFloat(e.target.value) : undefined,
                    },
                  })
                }
                placeholder="e.g., 18"
              />
            </div>
            <div>
              <Label>Glazing Thickness Max (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={(formData.specifications as any)?.glazingMaxMm || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specifications: {
                      ...(formData.specifications || {}),
                      glazingMaxMm: e.target.value ? parseFloat(e.target.value) : undefined,
                    },
                  })
                }
                placeholder="e.g., 32"
              />
            </div>
            <div>
              <Label>Extra Cutting Allowance for Border Frames (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={(formData.specifications as any)?.borderExtraAllowanceMm ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    specifications: {
                      ...(formData.specifications || {}),
                      borderExtraAllowanceMm: e.target.value ? parseFloat(e.target.value) : undefined,
                    },
                  })
                }
                placeholder="Default 5mm when frame has 5 cm border"
              />
            </div>
          </div>

          {/* Machining Macros Section */}
          <div className="col-span-2 border-t border-gray-700 pt-4 mt-2">
            <Label>Machining Macros (Router/Pantograph Operations)</Label>
            <p className="text-xs text-gray-400 mb-2">
              Define machining operations required for accessory installation
            </p>

            <div className="space-y-3">
              {formData.machiningMacros?.map((macro, index) => (
                <div key={macro.id} className="p-3 bg-gray-700 rounded space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Operation name"
                      value={macro.name}
                      onChange={(e) => updateMacro(index, 'name', e.target.value)}
                    />
                    <Select
                      value={macro.operation}
                      onValueChange={(value) => updateMacro(index, 'operation', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slot">Slot</SelectItem>
                        <SelectItem value="pocket">Pocket</SelectItem>
                        <SelectItem value="drill">Drill</SelectItem>
                        <SelectItem value="counterbore">Counterbore</SelectItem>
                        <SelectItem value="contour">Contour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Width (mm)"
                      value={macro.dimensions.width}
                      onChange={(e) => updateMacroDimension(index, 'width', parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Height (mm)"
                      value={macro.dimensions.height}
                      onChange={(e) => updateMacroDimension(index, 'height', parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Depth (mm)"
                      value={macro.dimensions.depth}
                      onChange={(e) => updateMacroDimension(index, 'depth', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Position X (mm)"
                      value={macro.position.x}
                      onChange={(e) => updateMacro(index, 'position', { ...macro.position, x: parseFloat(e.target.value) || 0 })}
                    />
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Position Y (mm)"
                      value={macro.position.y}
                      onChange={(e) => updateMacro(index, 'position', { ...macro.position, y: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeMacro(index)}
                    className="text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove Macro
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addNewMacro}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Machining Operation
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            {editingId ? (
              <>
                <Button
                  onClick={handleUpdateProfile}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? t('profileManagement.uploading', 'Uploading...') : t('profileManagement.updateProfile', 'Update Profile')}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  {t('profileManagement.cancel', 'Cancel')}
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleAddProfile}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {saving ? t('inventory.adding', 'Adding...') : t('inventory.add_profile', 'Add Profile')}
                </Button>
                <Button
                  onClick={() => setShowProfileDefinitionWizard(true)}
                  variant="outline"
                  className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Define from Data Sheet
                </Button>
              </div>
            )}
          </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Accessory Management Section */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-400" />
              Accessory Library ({accessories.length})
            </CardTitle>
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowAccessoryManager(!showAccessoryManager)}
            >
              {showAccessoryManager ? 'Hide' : 'Manage Accessories'}
            </Button>
          </div>
        </CardHeader>

        {showAccessoryManager && (
          <CardContent>
            <AccessoryManagement
              profiles={profiles}
              onAccessoriesUpdate={handleAccessoriesUpdate}
              userId={userId}
            />
          </CardContent>
        )}
      </Card>

      {/* Profiles List */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle>{t('profileManagement.title', 'Profile Management')} ({filteredProfiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredProfiles.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('profileManagement.errorLoadingProfiles', 'No profiles found. Add your first profile to get started.')}</p>
              </div>
            ) : (
              filteredProfiles.map((profile) => {
                const status = getStockStatus(profile);
                const tuningStatus = getTuningStatus(profile);
                const stockPercentage =
                  profile.minStockLevel > 0 && profile.stockQuantity !== undefined && profile.minStockLevel !== undefined
                    ? Math.min(((profile.stockQuantity ?? 0) / profile.minStockLevel) * 100, 100)
                    : (profile.stockQuantity !== undefined && profile.stockQuantity > 0 ? 100 : 0);
                const specs = profile.specifications || {};

                // Show detail card if selected, otherwise show compact view
                if (selectedProfileForDetail?.id === profile.id) {
                  return (
                    <div key={profile.id} className="mb-4">
                      <ProfileDetailCard
                        profile={profile}
                        accessories={accessories}
                        onEdit={handleEditProfile}
                        onMachiningPreview={(macro) => {
                          toast.info(`Previewing machining operation: ${macro.name}`);
                        }}
                      />
                          <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setSelectedProfileForDetail(null)}
                      >
                        Show Compact View
                      </Button>
                    </div>
                  );
                }

                return (
                  <div key={profile.id} className="p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{profile.name}</h4>
                          <Badge variant="outline">{profile.material}</Badge>
                          {profile.systemBrand && (
                            <Badge variant="outline" className="bg-blue-500/20 text-blue-400">
                              {profile.systemBrand}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(status)} border-current`}
                          >
                            {getStockStatusLabel(status)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              tuningStatus === 'tuned'
                                ? 'border-emerald-400 text-emerald-300'
                                : tuningStatus === 'in_progress'
                                ? 'border-blue-400 text-blue-300'
                                : 'border-yellow-400 text-yellow-300'
                            }
                          >
                            {tuningStatus === 'tuned'
                              ? 'Tuned'
                              : tuningStatus === 'in_progress'
                              ? 'Tuning'
                              : 'Untuned'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm text-gray-400">
                          <div>
                            {t('profileManagement.dimensions', 'Dimensions')}: {profile.width}mm × {profile.height || 'N/A'}mm
                          </div>
                          <div>{t('profileManagement.cost', 'Cost')}: ${(profile.costPerMeter ?? 0).toFixed(2)}/m</div>
                          <div>{t('profileManagement.stock', 'Stock')}: {profile.stockQuantity}m</div>
                          <div>{t('profileManagement.supplier', 'Supplier')}: {profile.supplier || t('profileManagement.none', '—')}</div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-xs text-gray-400 mt-2">
                          <div>
                            {t('profileManagement.twinCode', 'Twin Code')}:
                            <span className="ml-1 font-mono">
                              {(specs.internalCode as string) || profile.id.slice(0, 8)}/
                              {(specs.supplierCode as string) || t('profileManagement.none', '—')}
                            </span>
                          </div>
                          <div>{t('profileManagement.series', 'Series')}: {(specs.series as string) || t('profileManagement.none', '—')}</div>
                          <div>{t('profileManagement.year', 'Year')}: {(specs.year as string) || t('profileManagement.none', '—')}</div>
                          <div>
                            {t('profileManagement.dxf', 'DXF')}:
                            <span className="ml-1">
                              {specs.dxfImported ? t('profileManagement.imported', 'Imported') : t('profileManagement.none', '—')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Tuning:</span>
                            <span
                              className={
                                tuningStatus === 'tuned'
                                  ? 'text-emerald-300'
                                  : tuningStatus === 'in_progress'
                                  ? 'text-blue-300'
                                  : 'text-yellow-300'
                              }
                            >
                              {tuningStatus === 'tuned'
                                ? 'Full profile tuned'
                                : tuningStatus === 'in_progress'
                                ? 'Partially tuned'
                                : 'Not tuned yet'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{t('profileManagement.stockLevel', 'Stock Level')}</span>
                            <span>{(stockPercentage ?? 0).toFixed(0)}%</span>
                          </div>
                          <Progress value={stockPercentage ?? 0} className="h-2" />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        {specs.previewImageUrl && (
                          <img
                            src={specs.previewImageUrl as string}
                            alt={profile.name}
                            className="w-24 h-24 rounded border border-gray-600 object-cover"
                          />
                        )}
                        <div className="flex gap-2">
                          <label>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isUploadingPreview === profile.id}
                              asChild
                            >
                              <span>
                                <Upload className="h-4 w-4 mr-1" />
                                {isUploadingPreview === profile.id ? t('profileManagement.uploading', 'Uploading...') : t('profileManagement.uploadPreview', 'Upload 2D Preview')}
                              </span>
                            </Button>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleUploadPreviewImage(e, profile)}
                              className="hidden"
                            />
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedProfileForDetail(profile)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          {userId && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-orange-500/60 text-orange-300 hover:bg-orange-500/10"
                              onClick={() => setTuningProfile(profile)}
                            >
                              Tune
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProfile(profile)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProfile(profile.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

        </CollapsibleContent>
      </Collapsible>

      {/* Profile Definition Wizard */}
      {userId && (
        <ProfileDefinitionWizard
          open={showProfileDefinitionWizard}
          onOpenChange={setShowProfileDefinitionWizard}
          userId={userId}
          onProfileCreated={(profile) => {
            // Refresh profiles list
            loadProfiles();
            setShowProfileDefinitionWizard(false);
            toast.success(`Profile "${profile.name}" created successfully`);
          }}
        />
      )}

      {/* Profile Tuning Studio Overlay */}
      {userId && tuningProfile && (
        <ProfileTuningStudio
          profile={tuningProfile}
          userId={userId}
          onClose={() => setTuningProfile(null)}
          onProfileUpdated={loadProfiles}
        />
      )}
    </div>
  );
};

