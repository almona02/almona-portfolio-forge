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
  Filter,
  X
} from 'lucide-react';
import { Profile } from '@/types/fabricator';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
}

export const ProfileManagement: React.FC<ProfileManagementProps> = ({
  onProfilesUpdate,
  userId,
}) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [subscription, setSubscription] = useState<any>(null);

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
    specifications: {},
  });

  // Load profiles from Supabase
  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('fabricator_profiles')
        .select('*')
        .eq('user_id', userId || '')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mappedProfiles: Profile[] = (data || []).map((p: any) => ({
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
        specifications: p.specifications || {},
        userId: p.user_id,
        createdAt: p.created_at ? new Date(p.created_at) : undefined,
        updatedAt: p.updated_at ? new Date(p.updated_at) : undefined,
      }));

      setProfiles(mappedProfiles);
      setFilteredProfiles(mappedProfiles);
      if (onProfilesUpdate) {
        onProfilesUpdate(mappedProfiles);
      }
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

    const channel = supabase
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
        supabase.removeChannel(subscription);
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

      const { data, error: insertError } = await supabase
        .from('fabricator_profiles')
        .insert({
          user_id: userId,
          name: formData.name,
          material: formData.material,
          width: formData.width,
          height: formData.height,
          thickness: formData.thickness,
          color: formData.color,
          cost_per_meter: formData.costPerMeter,
          cutting_allowance: formData.cuttingAllowance,
          stock_quantity: formData.stockQuantity || 0,
          min_stock_level: formData.minStockLevel || 0,
          max_stock_level: formData.maxStockLevel,
          supplier: formData.supplier || '',
          system_brand: formData.systemBrand || 'Standard',
          grain_direction: formData.grainDirection,
          specifications: formData.specifications || {},
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

      const { error: updateError } = await supabase
        .from('fabricator_profiles')
        .update({
          name: formData.name,
          material: formData.material,
          width: formData.width,
          height: formData.height,
          thickness: formData.thickness,
          color: formData.color,
          cost_per_meter: formData.costPerMeter,
          cutting_allowance: formData.cuttingAllowance,
          stock_quantity: formData.stockQuantity,
          min_stock_level: formData.minStockLevel,
          max_stock_level: formData.maxStockLevel,
          supplier: formData.supplier,
          system_brand: formData.systemBrand,
          grain_direction: formData.grainDirection,
          specifications: formData.specifications,
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
      const { error: deleteError } = await supabase
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
      const imported: Profile[] = JSON.parse(text);
      
      if (!Array.isArray(imported)) {
        throw new Error('Invalid JSON format');
      }

      // Validate and import profiles
      const validProfiles = imported.filter((p) => p.name && p.material);
      
      if (validProfiles.length === 0) {
        throw new Error('No valid profiles found in file');
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
        specifications: p.specifications || {},
      }));

      const { error: insertError } = await supabase
        .from('fabricator_profiles')
        .insert(profilesToInsert);

      if (insertError) throw insertError;

      await loadProfiles();
      toast.success(`Imported ${validProfiles.length} profiles`);
    } catch (err) {
      console.error('Error importing profiles:', err);
      toast.error('Failed to import profiles');
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
        const { error } = await supabase
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

  if (loading) {
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
              <Label>Width (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.width || 50}
                onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 50 })}
              />
            </div>
            <div>
              <Label>Height (mm)</Label>
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
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Stock Level</span>
                            <span>{stockPercentage.toFixed(0)}%</span>
                          </div>
                          <Progress value={stockPercentage} className="h-2" />
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
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
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

