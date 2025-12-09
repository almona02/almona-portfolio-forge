/**
 * AccessoryManagement - Complete accessory management system with Supabase integration
 * 
 * Features:
 * - Full CRUD operations for hardware and accessories
 * - Compatibility matrix with profiles
 * - Regional focus: Turkish and Egyptian market presets
 * - Import/Export accessories (JSON, CSV)
 * - Bulk operations for pricing updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Checkbox } from '@/shared/ui/ui/checkbox';
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
  Link2,
  X
} from 'lucide-react';
import { FabricatorAccessory, Profile } from '@/types/fabricator';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { FabricatorProjectSkeleton } from '@/components/ui/EnhancedLoadingStates';
import { useTranslation } from 'react-i18next';

interface AccessoryManagementProps {
  onAccessoriesUpdate?: (accessories: FabricatorAccessory[]) => void;
  profiles?: Profile[];
  userId?: string;
}

export const AccessoryManagement: React.FC<AccessoryManagementProps> = ({
  onAccessoriesUpdate,
  profiles = [],
  userId,
}) => {
  const { t } = useTranslation('fabricator');
  const [accessories, setAccessories] = useState<FabricatorAccessory[]>([]);
  const [filteredAccessories, setFilteredAccessories] = useState<FabricatorAccessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [compatibilityMode, setCompatibilityMode] = useState(false);
  const [selectedProfileForCompatibility, setSelectedProfileForCompatibility] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [editingBaselineUpdatedAt, setEditingBaselineUpdatedAt] = useState<string | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{
    name: string;
    serverUpdatedAt?: string | null;
  } | null>(null);

  // Default ROCK 60 accessories template to seed for all users
  const ROCK60_ACCESSORIES_TEMPLATE = [
    {
      accessory_number: '0253',
      quantity: 2,
      description: 'Hinges',
    },
    {
      accessory_number: '1130',
      quantity: 4,
      description: 'Corner Joint',
    },
    {
      accessory_number: '1110',
      quantity: 4,
      description: 'Corner Joint',
    },
    {
      accessory_number: '0707',
      quantity: 1,
      description: 'Commons Handle',
    },
    {
      accessory_number: 'KIT 10451',
      quantity: 1,
      description: 'Locking Kit',
    },
    {
      accessory_number: 'GT 0122',
      quantity: '21.4H',
      description: 'Glass Gasket',
    },
    {
      accessory_number: 'GT 0118',
      quantity: '21.4H',
      description: 'Glass Gasket',
    },
    {
      accessory_number: 'GT 0137',
      quantity: '21.4H',
      description: 'Central Gasket',
    },
    {
      accessory_number: 'GT 0146',
      quantity: '21.4H',
      description: 'Stash Striker Gasket',
    },
    {
      accessory_number: 'GT 0152',
      quantity: '21.4H',
      description: 'Frame Gasket',
    },
  ];

  const mapAccessoryType = (description: string): FabricatorAccessory['type'] => {
    const text = description.toLowerCase();
    if (text.includes('hinge')) return 'hinge';
    if (text.includes('lock')) return 'lock';
    if (text.includes('handle')) return 'handle';
    if (text.includes('gasket') || text.includes('seal')) return 'seal';
    if (text.includes('corner')) return 'corner';
    return 'other';
  };

  // Form state
  const [formData, setFormData] = useState<Partial<FabricatorAccessory>>({
    name: '',
    type: 'other',
    category: '',
    unitPrice: 0,
    baseCost: 0,
    markupPercentage: 30,
    supplier: '',
    sku: '',
    description: '',
    compatibleMaterials: [],
    region: ['global'],
    specifications: {},
  });

  // Load accessories from Supabase
  const loadAccessories = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('fabricator_accessories')
        .select('*')
        .eq('user_id', userId || '')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      let rows = data || [];

      // Seed ROCK 60 accessories once per user if they do not exist yet
      if (userId) {
        const hasRock60Accessories = rows.some(
          (a: any) => a.specifications?.window_system === 'ROCK 60'
        );

        if (!hasRock60Accessories) {
          const accessoriesToInsert = ROCK60_ACCESSORIES_TEMPLATE.map((item) => ({
            user_id: userId,
            name: `${item.accessory_number} - ${item.description}`,
            type: mapAccessoryType(item.description),
            category: mapAccessoryType(item.description),
            unit_price: 0,
            base_cost: 0,
            markup_percentage: 0,
            supplier: 'Global Template',
            sku: item.accessory_number,
            description: item.description,
            compatible_materials: ['aluminum', 'upvc', 'wood'],
            region: ['global'],
            image_url: null,
            specifications: {
              window_system: 'ROCK 60',
              accessory_number: item.accessory_number,
              default_quantity: item.quantity,
              template: true,
              template_type: 'window_system',
            },
          }));

          const { error: seedError } = await supabase
            .from('fabricator_accessories')
            .insert(accessoriesToInsert);

          if (seedError) {
            console.error('Error seeding ROCK 60 accessories:', seedError);
            // Don't show error toast for seeding - it's optional template data
            // The error is logged for debugging purposes
          } else {
            const { data: reloaded, error: reloadError } = await supabase
              .from('fabricator_accessories')
              .select('*')
              .eq('user_id', userId || '')
              .order('created_at', { ascending: false });

            if (reloadError) {
              console.error('Error reloading accessories after seeding:', reloadError);
            } else if (reloaded) {
              rows = reloaded;
            }
          }
        }
      }

      const mappedAccessories: FabricatorAccessory[] = rows.map((a: any) => ({
        id: a.id,
        name: a.name,
        type: a.type as FabricatorAccessory['type'],
        category: a.category || '',
        unitPrice: a.unit_price,
        baseCost: a.base_cost,
        markupPercentage: a.markup_percentage,
        supplier: a.supplier,
        sku: a.sku,
        description: a.description,
        compatibleMaterials: a.compatible_materials || [],
        region: a.region || ['global'],
        imageUrl: a.image_url,
        specifications: a.specifications || {},
        userId: a.user_id,
        createdAt: a.created_at ? new Date(a.created_at) : undefined,
        updatedAt: a.updated_at ? new Date(a.updated_at) : undefined,
      }));

      setAccessories(mappedAccessories);
      setFilteredAccessories(mappedAccessories);
      // Only call onAccessoriesUpdate if accessories actually changed to prevent re-render loops
      // The parent component will be notified through the real-time subscription or explicit updates
      // Avoid calling onAccessoriesUpdate here to prevent flashing/flashing issues
    } catch (err) {
      console.error('Error loading accessories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load accessories');
      toast.error('Failed to load accessories');
    } finally {
      setLoading(false);
    }
  }, [userId, onAccessoriesUpdate]);

  // Setup real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('fabricator_accessories_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fabricator_accessories',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Accessory change detected:', payload);
          loadAccessories();
        }
      )
      .subscribe();

    setSubscription(channel);

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [userId, loadAccessories]);

  // Initial load
  useEffect(() => {
    loadAccessories();
  }, [loadAccessories]);

  // Filter accessories
  useEffect(() => {
    let filtered = accessories;

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((a) => a.type === typeFilter);
    }

    setFilteredAccessories(filtered);
  }, [accessories, searchTerm, typeFilter]);

  const calculatePrice = (cost: number, markup: number) => {
    return cost * (1 + markup / 100);
  };

  const handleAddAccessory = async () => {
    if (!formData.name || !formData.type) {
      setError('Name and type are required');
      return;
    }

    if (!userId) {
      setError('User ID is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const finalPrice = calculatePrice(formData.baseCost || 0, formData.markupPercentage || 30);

      const { data, error: insertError } = await supabase
        .from('fabricator_accessories')
        .insert({
          user_id: userId,
          name: formData.name,
          type: formData.type,
          category: formData.category || '',
          unit_price: finalPrice,
          base_cost: formData.baseCost || 0,
          markup_percentage: formData.markupPercentage || 30,
          supplier: formData.supplier || '',
          sku: formData.sku || '',
          description: formData.description || '',
          compatible_materials: formData.compatibleMaterials || [],
          region: formData.region || ['global'],
          image_url: formData.imageUrl,
          specifications: formData.specifications || {},
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await loadAccessories();
      resetForm();
      setSuccess(true);
      toast.success('Accessory added successfully');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error adding accessory:', err);
      setError(err instanceof Error ? err.message : 'Failed to add accessory');
      toast.error('Failed to add accessory');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAccessory = async () => {
    if (!editingId || !userId) return;

    try {
      setSaving(true);
      setError(null);

      const finalPrice = calculatePrice(formData.baseCost || 0, formData.markupPercentage || 30);

      let query = supabase
        .from('fabricator_accessories')
        .update({
          name: formData.name,
          type: formData.type,
          category: formData.category,
          unit_price: finalPrice,
          base_cost: formData.baseCost,
          markup_percentage: formData.markupPercentage,
          supplier: formData.supplier,
          sku: formData.sku,
          description: formData.description,
          compatible_materials: formData.compatibleMaterials,
          region: formData.region,
          image_url: formData.imageUrl,
          specifications: formData.specifications,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)
        .eq('user_id', userId);

      if (editingBaselineUpdatedAt) {
        query = query.eq('updated_at', editingBaselineUpdatedAt);
      }

      const { data, error: updateError } = await query.select('id, updated_at');

      if (updateError) throw updateError;

      if (!data || data.length === 0) {
        // Conflict: row was changed by someone else
        const { data: serverRow } = await supabase
          .from('fabricator_accessories')
          .select('name, updated_at')
          .eq('id', editingId)
          .single();

        setConflictInfo({
          name: (serverRow as any)?.name || (formData.name as string) || 'Accessory',
          serverUpdatedAt: (serverRow as any)?.updated_at || null,
        });
        toast.error('Accessory was modified by another user. Your changes were not saved.');
      } else {
        await loadAccessories();
        resetForm();
        setConflictInfo(null);
        setSuccess(true);
        toast.success('Accessory updated successfully');
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error updating accessory:', err);
      setError(err instanceof Error ? err.message : 'Failed to update accessory');
      toast.error('Failed to update accessory');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccessory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this accessory?')) return;
    if (!userId) return;

    try {
      // First delete compatibility relationships
      await supabase
        .from('profile_accessory_compatibility')
        .delete()
        .eq('accessory_id', id);

      // Then delete the accessory
      const { error: deleteError } = await supabase
        .from('fabricator_accessories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      await loadAccessories();
      toast.success('Accessory deleted successfully');
    } catch (err) {
      console.error('Error deleting accessory:', err);
      toast.error('Failed to delete accessory');
    }
  };

  const handleEditAccessory = (accessory: FabricatorAccessory) => {
    setEditingId(accessory.id);
    setEditingBaselineUpdatedAt(accessory.updatedAt ? accessory.updatedAt.toISOString() : null);
    setConflictInfo(null);
    setFormData({
      name: accessory.name,
      type: accessory.type,
      category: accessory.category,
      unitPrice: accessory.unitPrice,
      baseCost: accessory.baseCost,
      markupPercentage: accessory.markupPercentage,
      supplier: accessory.supplier,
      sku: accessory.sku,
      description: accessory.description,
      compatibleMaterials: accessory.compatibleMaterials,
      region: accessory.region,
      imageUrl: accessory.imageUrl,
      specifications: accessory.specifications,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setEditingBaselineUpdatedAt(null);
    setConflictInfo(null);
    setFormData({
      name: '',
      type: 'other',
      category: '',
      unitPrice: 0,
      baseCost: 0,
      markupPercentage: 30,
      supplier: '',
      sku: '',
      description: '',
      compatibleMaterials: [],
      region: ['global'],
      specifications: {},
    });
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(accessories, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `accessories_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Accessories exported to JSON');
  };

  const handleExportCSV = () => {
    const headers = [
      'Name',
      'Type',
      'Category',
      'Unit Price',
      'Base Cost',
      'Markup %',
      'Supplier',
      'SKU',
      'Description',
      'Compatible Materials',
      'Region',
    ];
    const rows = accessories.map((a) => [
      a.name,
      a.type,
      a.category,
      a.unitPrice,
      a.baseCost,
      a.markupPercentage,
      a.supplier || '',
      a.sku || '',
      a.description || '',
      a.compatibleMaterials.join(';'),
      a.region.join(';'),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `accessories_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Accessories exported to CSV');
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported: FabricatorAccessory[] = JSON.parse(text);
      
      if (!Array.isArray(imported)) {
        throw new Error('Invalid JSON format');
      }

      const validAccessories = imported.filter((a) => a.name && a.type);
      
      if (validAccessories.length === 0) {
        throw new Error('No valid accessories found in file');
      }

      const accessoriesToInsert = validAccessories.map((a) => {
        const finalPrice = calculatePrice(a.baseCost || 0, a.markupPercentage || 30);
        return {
          user_id: userId,
          name: a.name,
          type: a.type,
          category: a.category || '',
          unit_price: finalPrice,
          base_cost: a.baseCost || 0,
          markup_percentage: a.markupPercentage || 30,
          supplier: a.supplier || '',
          sku: a.sku || '',
          description: a.description || '',
          compatible_materials: a.compatibleMaterials || [],
          region: a.region || ['global'],
          image_url: a.imageUrl,
          specifications: a.specifications || {},
        };
      });

      const { error: insertError } = await supabase
        .from('fabricator_accessories')
        .insert(accessoriesToInsert);

      if (insertError) throw insertError;

      await loadAccessories();
      toast.success(`Imported ${validAccessories.length} accessories`);
    } catch (err) {
      console.error('Error importing accessories:', err);
      toast.error('Failed to import accessories');
    }
  };

  const handleToggleCompatibility = async (profileId: string, accessoryId: string) => {
    if (!userId) return;

    try {
      // Check if compatibility exists
      const { data: existing } = await supabase
        .from('profile_accessory_compatibility')
        .select('*')
        .eq('profile_id', profileId)
        .eq('accessory_id', accessoryId)
        .single();

      if (existing) {
        // Remove compatibility
        await supabase
          .from('profile_accessory_compatibility')
          .delete()
          .eq('profile_id', profileId)
          .eq('accessory_id', accessoryId);
        toast.success('Compatibility removed');
      } else {
        // Add compatibility
        await supabase
          .from('profile_accessory_compatibility')
          .insert({
            profile_id: profileId,
            accessory_id: accessoryId,
          });
        toast.success('Compatibility added');
      }
    } catch (err) {
      console.error('Error toggling compatibility:', err);
      toast.error('Failed to update compatibility');
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      hinge: 'bg-blue-500/20 text-blue-400',
      lock: 'bg-purple-500/20 text-purple-400',
      handle: 'bg-green-500/20 text-green-400',
      seal: 'bg-yellow-500/20 text-yellow-400',
      spacer: 'bg-orange-500/20 text-orange-400',
      corner: 'bg-red-500/20 text-red-400',
      other: 'bg-gray-500/20 text-gray-400',
    };
    return colors[type] || colors.other;
  };

  if (loading) {
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

      {conflictInfo && (
        <Alert className="bg-yellow-900/20 border-yellow-500">
          <AlertCircle className="h-4 w-4 text-yellow-300" />
          <AlertTitle>Accessory Update Conflict</AlertTitle>
          <AlertDescription>
            <span className="font-semibold">{conflictInfo.name}</span> was modified by another user
            or process while you were editing. Please reload accessories and review the latest
            values before applying further changes.
            {conflictInfo.serverUpdatedAt && (
              <span className="block text-xs text-yellow-200 mt-1">
                Server last updated at:{' '}
                {new Date(conflictInfo.serverUpdatedAt).toLocaleString()}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Header with Actions */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-400" />
              {t('accessory_management.title', { count: accessories.length, defaultValue: `Accessory Management (${accessories.length})` })}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                disabled={accessories.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('accessory_management.export_json', 'Export JSON')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={accessories.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('accessory_management.export_csv', 'Export CSV')}
              </Button>
              <label>
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('accessory_management.import_json', 'Import JSON')}
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
              <Button variant="outline" size="sm" onClick={loadAccessories}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('accessory_management.refresh', 'Refresh')}
              </Button>
              <Button
                variant={compatibilityMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCompatibilityMode(!compatibilityMode)}
              >
                <Link2 className="h-4 w-4 mr-2" />
                {t('accessory_management.compatibility_mode', 'Compatibility Mode')}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('accessory_management.search_placeholder', 'Search accessories...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('accessory_management.filter_by_type', 'Filter by Type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('accessory_management.all_types', 'All Types')}</SelectItem>
                <SelectItem value="hinge">{t('accessory_management.types.hinge', 'Hinge')}</SelectItem>
                <SelectItem value="lock">{t('accessory_management.types.lock', 'Lock')}</SelectItem>
                <SelectItem value="handle">{t('accessory_management.types.handle', 'Handle')}</SelectItem>
                <SelectItem value="seal">{t('accessory_management.types.seal', 'Seal')}</SelectItem>
                <SelectItem value="spacer">{t('accessory_management.types.spacer', 'Spacer')}</SelectItem>
                <SelectItem value="corner">{t('accessory_management.types.corner', 'Corner')}</SelectItem>
                <SelectItem value="other">{t('accessory_management.types.other', 'Other')}</SelectItem>
              </SelectContent>
            </Select>
            {compatibilityMode && profiles.length > 0 && (
              <Select
                value={selectedProfileForCompatibility || ''}
                onValueChange={setSelectedProfileForCompatibility}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('accessory_management.select_profile_compatibility', 'Select Profile for Compatibility')} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Accessory Form */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingId ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editingId ? t('accessory_management.edit_title', 'Edit Accessory') : t('accessory_management.add_title', 'Add New Accessory')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('accessory_management.form.name', 'Accessory Name *')}</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('accessory_management.form.name_placeholder', 'e.g., Multi-point Lock System')}
              />
            </div>
            <div>
              <Label>{t('accessory_management.form.type', 'Type *')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as FabricatorAccessory['type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hinge">{t('accessory_management.types.hinge', 'Hinge')}</SelectItem>
                  <SelectItem value="lock">{t('accessory_management.types.lock', 'Lock')}</SelectItem>
                  <SelectItem value="handle">{t('accessory_management.types.handle', 'Handle')}</SelectItem>
                  <SelectItem value="seal">{t('accessory_management.types.seal', 'Seal')}</SelectItem>
                  <SelectItem value="spacer">{t('accessory_management.types.spacer', 'Spacer')}</SelectItem>
                  <SelectItem value="corner">{t('accessory_management.types.corner', 'Corner')}</SelectItem>
                  <SelectItem value="other">{t('accessory_management.types.other', 'Other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('accessory_management.form.category', 'Category')}</Label>
              <Input
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder={t('accessory_management.form.category_placeholder', 'e.g., Security, Standard')}
              />
            </div>
            <div>
              <Label>{t('accessory_management.form.sku', 'SKU')}</Label>
              <Input
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder={t('accessory_management.form.sku_placeholder', 'Product SKU')}
              />
            </div>
            <div>
              <Label>{t('accessory_management.form.base_cost', 'Base Cost ($)')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.baseCost || 0}
                onChange={(e) => {
                  const cost = Number(e.target.value);
                  const markup = formData.markupPercentage || 30;
                  setFormData({
                    ...formData,
                    baseCost: cost,
                    unitPrice: calculatePrice(cost, markup),
                  });
                }}
              />
            </div>
            <div>
              <Label>{t('accessory_management.form.markup', 'Markup (%)')}</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.markupPercentage || 30}
                onChange={(e) => {
                  const markup = Number(e.target.value);
                  const cost = formData.baseCost || 0;
                  setFormData({
                    ...formData,
                    markupPercentage: markup,
                    unitPrice: calculatePrice(cost, markup),
                  });
                }}
              />
            </div>
            <div>
              <Label>{t('accessory_management.form.unit_price', 'Unit Price ($)')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.unitPrice || 0}
                readOnly
                className="bg-gray-700"
              />
              <p className="text-xs text-gray-400 mt-1">
                {t('accessory_management.form.calculated', {
                  base: formData.baseCost || 0,
                  markup: formData.markupPercentage || 30,
                  price: formData.unitPrice?.toFixed(2) || '0.00',
                  defaultValue: `Calculated: $${formData.baseCost || 0} × (1 + ${formData.markupPercentage || 30}%) = $${formData.unitPrice?.toFixed(2) || '0.00'}`
                })}
              </p>
            </div>
            <div>
              <Label>{t('accessory_management.form.supplier', 'Supplier')}</Label>
              <Input
                value={formData.supplier || ''}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder={t('accessory_management.form.supplier_placeholder', 'Supplier name')}
              />
            </div>
            <div className="col-span-2">
              <Label>{t('accessory_management.form.description', 'Description')}</Label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('accessory_management.form.description_placeholder', 'Accessory description')}
              />
            </div>
            <div className="col-span-2">
              <Label>{t('accessory_management.form.compatible_materials', 'Compatible Materials')}</Label>
              <div className="flex gap-2 mt-2">
                {['aluminum', 'upvc', 'wood'].map((material) => (
                  <div key={material} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.compatibleMaterials?.includes(material)}
                      onCheckedChange={(checked) => {
                        const current = formData.compatibleMaterials || [];
                        setFormData({
                          ...formData,
                          compatibleMaterials: checked
                            ? [...current, material]
                            : current.filter((m) => m !== material),
                        });
                      }}
                    />
                    <Label className="text-sm">{t(`accessory_management.materials.${material}`, material.charAt(0).toUpperCase() + material.slice(1))}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <Label>{t('accessory_management.form.region', 'Region')}</Label>
              <div className="flex gap-2 mt-2">
                {['turkey', 'egypt', 'global'].map((region) => (
                  <div key={region} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.region?.includes(region)}
                      onCheckedChange={(checked) => {
                        const current = formData.region || [];
                        setFormData({
                          ...formData,
                          region: checked
                            ? [...current, region]
                            : current.filter((r) => r !== region),
                        });
                      }}
                    />
                    <Label className="text-sm">{t(`accessory_management.regions.${region}`, region.charAt(0).toUpperCase() + region.slice(1))}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {editingId ? (
              <>
                <Button
                  onClick={handleUpdateAccessory}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? t('accessory_management.updating', 'Updating...') : t('accessory_management.update', 'Update Accessory')}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  {t('accessory_management.cancel', 'Cancel')}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleAddAccessory}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                {saving ? t('accessory_management.adding', 'Adding...') : t('accessory_management.add', 'Add Accessory')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Accessories List */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle>Accessories ({filteredAccessories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredAccessories.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No accessories found. Add your first accessory to get started.</p>
              </div>
            ) : (
              filteredAccessories.map((accessory) => (
                <div key={accessory.id} className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{accessory.name}</h4>
                        <Badge className={getTypeColor(accessory.type)}>{accessory.type}</Badge>
                        {accessory.category && <Badge variant="outline">{accessory.category}</Badge>}
                        {accessory.region.map((r) => (
                          <Badge key={r} variant="outline" className="bg-blue-500/20 text-blue-400">
                            {r}
                          </Badge>
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm text-gray-400">
                        <div>Price: ${accessory.unitPrice.toFixed(2)}</div>
                        <div>Cost: ${accessory.baseCost.toFixed(2)}</div>
                        <div>Markup: {accessory.markupPercentage}%</div>
                        <div>Supplier: {accessory.supplier || 'N/A'}</div>
                      </div>
                      {accessory.compatibleMaterials.length > 0 && (
                        <div className="mt-2 text-sm text-gray-400">
                          Compatible: {accessory.compatibleMaterials.join(', ')}
                        </div>
                      )}
                      {accessory.description && (
                        <p className="text-sm text-gray-500 mt-2">{accessory.description}</p>
                      )}
                      {compatibilityMode && selectedProfileForCompatibility && (
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleCompatibility(selectedProfileForCompatibility, accessory.id)}
                          >
                            <Link2 className="h-4 w-4 mr-2" />
                            Toggle Compatibility
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAccessory(accessory)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAccessory(accessory.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

