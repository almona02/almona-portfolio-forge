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

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Textarea } from '@/shared/ui/ui/textarea';
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
} from 'lucide-react';
import { Profile } from '@/types/fabricator';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { parseProfileFromDXF } from '@/lib/imports/ProfileDXFImporter';
import { ElsherifImportWizard } from '@/components/fabricator/ElsherifImportWizard';
import {
  ROCK60_WINDOW_SYSTEM_TEMPLATE,
  ROCK60_SYSTEM_PACK,
  JUMBO100_WINDOW_SYSTEM_SPEC,
  JUMBO100_SYSTEM_PACK,
} from '@/data/systemPacks';

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
}

export const ProfileManagement: React.FC<ProfileManagementProps> = ({
  onProfilesUpdate,
  userId,
  initialProfiles,
}) => {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles || []);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>(initialProfiles || []);
  const [activeImportTab, setActiveImportTab] = useState('manual');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [subscription, setSubscription] = useState<any>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isUploadingPreview, setIsUploadingPreview] = useState<string | null>(null);

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
      // Use untyped Supabase client here to avoid friction with generated types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { data, error: fetchError } = await db
        .from('fabricator_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      let rows = data || [];

      // Seed ROCK 60 template profile once per user if it does not exist yet
      const hasRock60Template = rows.some(
        (p: any) => p.specifications?.window_system === ROCK60_WINDOW_SYSTEM_TEMPLATE.window_system
      );

      if (!hasRock60Template) {
        const seedProfile = {
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
        };

        const { error: seedError } = await db
          .from('fabricator_profiles')
          .insert(seedProfile);

        if (seedError) {
          console.error('Error seeding ROCK 60 template profile:', seedError);
        } else {
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

      // Seed ELSHERIF JUMBO 100 template profile once per user if it does not exist yet
      const hasJumbo100Template = rows.some(
        (p: any) => p.specifications?.window_system === JUMBO100_WINDOW_SYSTEM_SPEC.window_system
      );

      if (!hasJumbo100Template) {
        const jumboSeedProfile = {
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
        };

        const { error: jumboSeedError } = await db
          .from('fabricator_profiles')
          .insert(jumboSeedProfile);

        if (jumboSeedError) {
          console.error('Error seeding JUMBO 100 template profile:', jumboSeedError);
        } else {
          const { data: reloaded, error: reloadError } = await db
            .from('fabricator_profiles')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (reloadError) {
            console.error('Error reloading profiles after JUMBO 100 seeding:', reloadError);
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
          costPerMeter: p.cost_per_meter,
          cuttingAllowance: p.cutting_allowance,
          stockQuantity: p.stock_quantity,
          minStockLevel: p.min_stock_level,
          maxStockLevel: p.max_stock_level,
          supplier: p.supplier || '',
          systemBrand: p.system_brand,
          grainDirection: p.grain_direction,
          weightPerMeter:
            typeof specs.weightPerMeterKg === 'number'
              ? specs.weightPerMeterKg
              : undefined,
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
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, [userId, onProfilesUpdate]);

  // Setup real-time subscription
  useEffect(() => {
    if (!userId) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const channel = db
      .channel('fabricator_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fabricator_profiles',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Profile change detected:', payload);
          loadProfiles();
        }
      )
      .subscribe();

    setSubscription(channel);

    return () => {
      if (subscription) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).removeChannel(subscription);
      }
    };
  }, [userId, loadProfiles]);

  // Initial load
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Filter profiles
  useEffect(() => {
    let filtered = profiles;

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.systemBrand?.toLowerCase().includes(searchTerm.toLowerCase())
      );
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

    setFilteredProfiles(filtered);
  }, [profiles, searchTerm, materialFilter, regionFilter]);

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
      const { data, error: insertError } = await db
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
      toast.success('Profile added successfully');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error adding profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to add profile');
      toast.error('Failed to add profile');
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
      toast.success('Profile updated successfully');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
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
      toast.success('Profile deleted successfully');
    } catch (err) {
      console.error('Error deleting profile:', err);
      toast.error('Failed to delete profile');
    }
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingId(profile.id);
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
      specifications: profile.specifications || {},
    });
  };

  const resetForm = () => {
    setEditingId(null);
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
    });
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

  const getMaterialColors = () => {
    return MATERIAL_COLORS[formData.material || 'aluminum'] || MATERIAL_COLORS.aluminum;
  };

  // Show full-page loader only on the first load
  if (loading && !hasLoadedOnce) {
    return (
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Loading Profiles</h3>
        </CardContent>
      </Card>
    );
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

      {/* Header with Actions */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-400" />
              Profile Management ({profiles.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                disabled={profiles.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={profiles.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <label>
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Import JSON
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
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search profiles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Materials</SelectItem>
                <SelectItem value="aluminum">Aluminum</SelectItem>
                <SelectItem value="upvc">UPVC</SelectItem>
                <SelectItem value="wood">Wood</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="turkey">Turkey</SelectItem>
                <SelectItem value="egypt">Egypt</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              {filteredProfiles.length > 0 && (
                <>
                  <Input
                    type="number"
                    placeholder="Bulk cost"
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
                    placeholder="Bulk stock"
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
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingId ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editingId ? 'Edit Profile' : 'Add New Profile'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">
              You can also start a new profile from a DXF file exported from your CAD system.
            </p>
            <label>
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Import from DXF
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
              <Label>Profile Name *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Yilmaz 50mm Aluminum"
              />
            </div>
            <div>
              <Label>Material Type *</Label>
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
                  <SelectItem value="aluminum">Aluminum</SelectItem>
                  <SelectItem value="upvc">UPVC</SelectItem>
                  <SelectItem value="wood">Wood</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Face Width (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.width || 50}
                onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 50 })}
              />
            </div>
            <div>
              <Label>Depth / Section Height (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.height || 25}
                onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 25 })}
              />
            </div>
            <div>
              <Label>Thickness (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.thickness || 1.4}
                onChange={(e) => setFormData({ ...formData, thickness: parseFloat(e.target.value) || 1.4 })}
              />
            </div>
            <div>
              <Label>Color</Label>
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
              <Label>Cost per Meter ($)</Label>
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
              <Label>Weight per Meter (kg/m) – Aluminum</Label>
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
              <Label>Cutting Allowance (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.cuttingAllowance || 3}
                onChange={(e) => setFormData({ ...formData, cuttingAllowance: parseFloat(e.target.value) || 3 })}
              />
            </div>
            <div>
              <Label>Stock Quantity (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.stockQuantity || 0}
                onChange={(e) => setFormData({ ...formData, stockQuantity: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Min Stock Level (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.minStockLevel || 0}
                onChange={(e) => setFormData({ ...formData, minStockLevel: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Max Stock Level (m)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.maxStockLevel || 1000}
                onChange={(e) => setFormData({ ...formData, maxStockLevel: parseFloat(e.target.value) || 1000 })}
              />
            </div>
            <div>
              <Label>Supplier</Label>
              <Input
                value={formData.supplier || ''}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Supplier name"
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
              <Label>Supplier Code</Label>
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
              <Label>Internal Code</Label>
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
              <Label>System Brand</Label>
              <Select
                value={formData.systemBrand || 'Standard'}
                onValueChange={(value) => setFormData({ ...formData, systemBrand: value })}
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
            </div>
            {(formData.material === 'wood' || formData.material === 'upvc') && (
              <div>
                <Label>Grain Direction</Label>
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
                    <SelectItem value="none">Not Applicable</SelectItem>
                    <SelectItem value="horizontal">Horizontal</SelectItem>
                    <SelectItem value="vertical">Vertical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Series</Label>
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
              <Label>Year</Label>
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

            {/* Egyptian market specific details (optional) */}
            <div className="col-span-2 border-t border-gray-700 pt-4 mt-2">
              <Label>Egyptian Sliding / Casement Details (optional)</Label>
              <p className="text-xs text-gray-400 mb-2">
                Use this to describe Egyptian sliding and casement frames with liners / borders
                (flat or décor), such as Alsalam PS small / big / jumbo series with 5 cm frame
                border included or without.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label>Frame Type</Label>
                  <Select
                    value={(formData.specifications as any)?.egyptFrameType || 'sliding'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        specifications: {
                          ...(formData.specifications || {}),
                          egyptFrameType: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frame type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sliding">Sliding Frame</SelectItem>
                      <SelectItem value="casement">Casement Frame</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Border / Liner Style</Label>
                  <Select
                    value={(formData.specifications as any)?.egyptBorderStyle || 'flat'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        specifications: {
                          ...(formData.specifications || {}),
                          egyptBorderStyle: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Liner</SelectItem>
                      <SelectItem value="decor">Décor Liner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Alsalam PS Series</Label>
                  <Select
                    value={(formData.specifications as any)?.egyptSeries || 'ps_small'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        specifications: {
                          ...(formData.specifications || {}),
                          egyptSeries: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select series" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ps_small">Alsalam PS – Small</SelectItem>
                      <SelectItem value="ps_big">Alsalam PS – Big</SelectItem>
                      <SelectItem value="ps_jumbo">
                        Alsalam PS – Jumbo (with 5 cm frame border)
                      </SelectItem>
                      <SelectItem value="custom">Other / Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>5 cm Frame Border</Label>
                  <Select
                    value={(formData.specifications as any)?.egyptBorderIncluded ?? 'with'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        specifications: {
                          ...(formData.specifications || {}),
                          egyptBorderIncluded: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Border option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="with">Included (5 cm border)</SelectItem>
                      <SelectItem value="without">Without border</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3">
                <Label>Profile Notes / Regional Description</Label>
                <Textarea
                  className="mt-1"
                  placeholder="Example: Egyptian sliding frame, Alsalam PS Jumbo with integrated 5 cm décor liner border."
                  value={(formData.specifications as any)?.description || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specifications: {
                        ...(formData.specifications || {}),
                        description: e.target.value,
                      },
                    })
                  }
                />
              </div>
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
                  {saving ? 'Updating...' : 'Update Profile'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={handleAddProfile}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                {saving ? 'Adding...' : 'Add Profile'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ELSHERIF Catalog Import */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            ELSHERIF Catalog Import
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ElsherifImportWizard
            onProfilesImported={(importedProfiles) => {
              setProfiles((prev) => [...prev, ...importedProfiles]);
              setFilteredProfiles((prev) => [...prev, ...importedProfiles]);
              if (onProfilesUpdate) {
                onProfilesUpdate([...profiles, ...importedProfiles]);
              }
              toast.success(`Successfully imported ${importedProfiles.length} ELSHERIF profiles`);
            }}
            userId={userId}
          />
        </CardContent>
      </Card>

      {/* Profiles List */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle>Profiles ({filteredProfiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredProfiles.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No profiles found. Add your first profile to get started.</p>
              </div>
            ) : (
              filteredProfiles.map((profile) => {
                const status = getStockStatus(profile);
                const stockPercentage =
                  profile.minStockLevel > 0
                    ? Math.min((profile.stockQuantity / profile.minStockLevel) * 100, 100)
                    : 100;
                const specs = profile.specifications || {};

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
                            {status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm text-gray-400">
                          <div>
                            Dimensions: {profile.width}mm × {profile.height || 'N/A'}mm
                          </div>
                          <div>Cost: ${profile.costPerMeter.toFixed(2)}/m</div>
                          <div>Stock: {profile.stockQuantity}m</div>
                          <div>Supplier: {profile.supplier || 'N/A'}</div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-xs text-gray-400 mt-2">
                          <div>
                            TwinCode:
                            <span className="ml-1 font-mono">
                              {(specs.internalCode as string) || profile.id.slice(0, 8)}/
                              {(specs.supplierCode as string) || '—'}
                            </span>
                          </div>
                          <div>Series: {(specs.series as string) || '—'}</div>
                          <div>Year: {(specs.year as string) || '—'}</div>
                          <div>
                            DXF:
                            <span className="ml-1">
                              {specs.dxfImported ? 'Imported' : '—'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Stock Level</span>
                            <span>{stockPercentage.toFixed(0)}%</span>
                          </div>
                          <Progress value={stockPercentage} className="h-2" />
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
                                {isUploadingPreview === profile.id ? 'Uploading...' : '2D Preview'}
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
    </div>
  );
};

