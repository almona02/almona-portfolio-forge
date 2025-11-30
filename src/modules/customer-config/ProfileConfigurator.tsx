/**
 * ProfileConfigurator - Manage custom profiles, dimensions, colors
 * Allows customers to add/edit profile systems with dimensional data
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Plus, Trash2, Save, Edit2, AlertCircle, CheckCircle } from 'lucide-react';
import { Profile } from '@/types/fabricator';

export interface CustomProfile extends Profile {
  region?: string;
  brand?: string;
  finish?: string;
  customFields?: Record<string, any>;
}

interface ProfileConfiguratorProps {
  profiles: Profile[];
  onProfilesUpdate: (profiles: CustomProfile[]) => void;
  region?: string;
}

export const ProfileConfigurator: React.FC<ProfileConfiguratorProps> = ({
  profiles,
  onProfilesUpdate,
  region = 'global',
}) => {
  const { t } = useTranslation('fabricator');
  const [customProfiles, setCustomProfiles] = useState<CustomProfile[]>(profiles as CustomProfile[]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<Partial<CustomProfile>>({
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
    supplier: '',
    region: region,
    brand: '',
    finish: 'standard',
  });

  useEffect(() => {
    setCustomProfiles(profiles as CustomProfile[]);
  }, [profiles]);

  const handleAddProfile = () => {
    if (!formData.name || !formData.material) {
      setError('Name and material are required');
      return;
    }

    const newProfile: CustomProfile = {
      id: `profile_${Date.now()}`,
      name: formData.name!,
      material: formData.material!,
      width: formData.width || 50,
      height: formData.height || 25,
      thickness: formData.thickness || 1.4,
      color: formData.color || '#C0C0C0',
      costPerMeter: formData.costPerMeter || 0,
      cuttingAllowance: formData.cuttingAllowance || 3,
      stockQuantity: formData.stockQuantity || 0,
      minStockLevel: formData.minStockLevel || 0,
      supplier: formData.supplier || '',
      region: formData.region || region,
      brand: formData.brand || '',
      finish: formData.finish || 'standard',
      customFields: {},
    };

    setCustomProfiles([...customProfiles, newProfile]);
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
      supplier: '',
      region: region,
      brand: '',
      finish: 'standard',
    });
    setError(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleEditProfile = (profile: CustomProfile) => {
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
      supplier: profile.supplier,
      region: profile.region || region,
      brand: profile.brand || '',
      finish: profile.finish || 'standard',
    });
  };

  const handleUpdateProfile = () => {
    if (!editingId) return;

    const updated = customProfiles.map((p) =>
      p.id === editingId
        ? {
            ...p,
            ...formData,
            id: p.id, // Preserve ID
          }
        : p
    );

    setCustomProfiles(updated);
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
      supplier: '',
      region: region,
      brand: '',
      finish: 'standard',
    });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleDeleteProfile = (id: string) => {
    if (confirm('Are you sure you want to delete this profile?')) {
      setCustomProfiles(customProfiles.filter((p) => p.id !== id));
      onProfilesUpdate(customProfiles.filter((p) => p.id !== id));
    }
  };

  const handleSave = () => {
    onProfilesUpdate(customProfiles);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-red-900/20 border-red-500">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-900/20 border-green-500">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Profile saved successfully!</AlertDescription>
        </Alert>
      )}

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
                placeholder="e.g., Alumil 70mm"
              />
            </div>
            <div>
              <Label>Material *</Label>
              <Select
                value={formData.material}
                onValueChange={(value) => setFormData({ ...formData, material: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluminum">Aluminum</SelectItem>
                  <SelectItem value="upvc">uPVC</SelectItem>
                  <SelectItem value="wood">Wood</SelectItem>
                  <SelectItem value="composite">Composite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Width (mm)</Label>
              <Input
                type="number"
                value={formData.width || 50}
                onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Height (mm)</Label>
              <Input
                type="number"
                value={formData.height || 25}
                onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Thickness (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.thickness || 1.4}
                onChange={(e) => setFormData({ ...formData, thickness: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.color || '#C0C0C0'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20"
                />
                <Input
                  value={formData.color || '#C0C0C0'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#C0C0C0"
                />
              </div>
            </div>
            <div>
              <Label>Cost per Meter ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.costPerMeter || 0}
                onChange={(e) => setFormData({ ...formData, costPerMeter: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Cutting Allowance (mm)</Label>
              <Input
                type="number"
                value={formData.cuttingAllowance || 3}
                onChange={(e) => setFormData({ ...formData, cuttingAllowance: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Region</Label>
              <Select
                value={formData.region || region}
                onValueChange={(value) => setFormData({ ...formData, region: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="turkey">Turkey</SelectItem>
                  <SelectItem value="egypt">Egypt</SelectItem>
                  <SelectItem value="europe">Europe</SelectItem>
                  <SelectItem value="middle_east">Middle East</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Brand</Label>
              <Input
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., Alumil, Schüco"
              />
            </div>
            <div>
              <Label>Finish</Label>
              <Select
                value={formData.finish || 'standard'}
                onValueChange={(value) => setFormData({ ...formData, finish: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="anodized">Anodized</SelectItem>
                  <SelectItem value="powder_coated">Powder Coated</SelectItem>
                  <SelectItem value="wood_grain">Wood Grain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier</Label>
              <Input
                value={formData.supplier || ''}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Supplier name"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {editingId ? (
              <>
                <Button onClick={handleUpdateProfile} className="bg-orange-500 hover:bg-orange-600">
                  <Save className="h-4 w-4 mr-2" />
                  Update Profile
                </Button>
                <Button variant="outline" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={handleAddProfile} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                {t('inventory.add_profile', 'Add Profile')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profiles List */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Custom Profiles ({customProfiles.length})</CardTitle>
            <Button onClick={handleSave} variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customProfiles.map((profile) => (
              <div key={profile.id} className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{profile.name}</h4>
                      <Badge variant="outline">{profile.material}</Badge>
                      {profile.region && <Badge variant="outline">{profile.region}</Badge>}
                      {profile.brand && <Badge variant="outline">{profile.brand}</Badge>}
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm text-gray-400">
                      <div>Width: {profile.width}mm</div>
                      <div>Height: {profile.height}mm</div>
                      <div>Cost: ${profile.costPerMeter}/m</div>
                      <div>Supplier: {profile.supplier || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

