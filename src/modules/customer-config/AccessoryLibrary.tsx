/**
 * AccessoryLibrary - Manage hardware, locks, hinges, handles
 * Add/remove hardware and set prices
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Plus, Trash2, Save, Edit2, AlertCircle, CheckCircle, Package } from 'lucide-react';

export interface Accessory {
  id: string;
  name: string;
  type: 'hinge' | 'lock' | 'handle' | 'seal' | 'spacer' | 'corner' | 'other';
  category: string;
  unitPrice: number;
  markup: number; // Percentage markup
  cost: number; // Base cost
  supplier?: string;
  sku?: string;
  description?: string;
  compatibleMaterials?: string[];
  region?: string;
}

interface AccessoryLibraryProps {
  accessories: Accessory[];
  onAccessoriesUpdate: (accessories: Accessory[]) => void;
}

export const AccessoryLibrary: React.FC<AccessoryLibraryProps> = ({
  accessories: initialAccessories,
  onAccessoriesUpdate,
}) => {
  const [accessories, setAccessories] = useState<Accessory[]>(initialAccessories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<Partial<Accessory>>({
    name: '',
    type: 'other',
    category: '',
    unitPrice: 0,
    markup: 30,
    cost: 0,
    supplier: '',
    sku: '',
    description: '',
    compatibleMaterials: [],
    region: 'global',
  });

  useEffect(() => {
    setAccessories(initialAccessories);
  }, [initialAccessories]);

  const calculatePrice = (cost: number, markup: number) => {
    return cost * (1 + markup / 100);
  };

  const handleAddAccessory = () => {
    if (!formData.name || !formData.type) {
      setError('Name and type are required');
      return;
    }

    const finalPrice = calculatePrice(formData.cost || 0, formData.markup || 0);

    const newAccessory: Accessory = {
      id: `acc_${Date.now()}`,
      name: formData.name!,
      type: formData.type!,
      category: formData.category || '',
      unitPrice: finalPrice,
      markup: formData.markup || 30,
      cost: formData.cost || 0,
      supplier: formData.supplier || '',
      sku: formData.sku || '',
      description: formData.description || '',
      compatibleMaterials: formData.compatibleMaterials || [],
      region: formData.region || 'global',
    };

    setAccessories([...accessories, newAccessory]);
    setFormData({
      name: '',
      type: 'other',
      category: '',
      unitPrice: 0,
      markup: 30,
      cost: 0,
      supplier: '',
      sku: '',
      description: '',
      compatibleMaterials: [],
      region: 'global',
    });
    setError(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleEditAccessory = (accessory: Accessory) => {
    setEditingId(accessory.id);
    setFormData({
      name: accessory.name,
      type: accessory.type,
      category: accessory.category,
      unitPrice: accessory.unitPrice,
      markup: accessory.markup,
      cost: accessory.cost,
      supplier: accessory.supplier,
      sku: accessory.sku,
      description: accessory.description,
      compatibleMaterials: accessory.compatibleMaterials,
      region: accessory.region || 'global',
    });
  };

  const handleUpdateAccessory = () => {
    if (!editingId) return;

    const finalPrice = calculatePrice(formData.cost || 0, formData.markup || 0);

    const updated = accessories.map((a) =>
      a.id === editingId
        ? {
            ...a,
            ...formData,
            unitPrice: finalPrice,
            id: a.id,
          }
        : a
    );

    setAccessories(updated);
    setEditingId(null);
    setFormData({
      name: '',
      type: 'other',
      category: '',
      unitPrice: 0,
      markup: 30,
      cost: 0,
      supplier: '',
      sku: '',
      description: '',
      compatibleMaterials: [],
      region: 'global',
    });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleDeleteAccessory = (id: string) => {
    if (confirm('Are you sure you want to delete this accessory?')) {
      setAccessories(accessories.filter((a) => a.id !== id));
      onAccessoriesUpdate(accessories.filter((a) => a.id !== id));
    }
  };

  const handleSave = () => {
    onAccessoriesUpdate(accessories);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
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
          <AlertDescription>Accessory saved successfully!</AlertDescription>
        </Alert>
      )}

      {/* Accessory Form */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingId ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editingId ? 'Edit Accessory' : 'Add New Accessory'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Accessory Name *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Multi-point Lock System"
              />
            </div>
            <div>
              <Label>Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as Accessory['type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hinge">Hinge</SelectItem>
                  <SelectItem value="lock">Lock</SelectItem>
                  <SelectItem value="handle">Handle</SelectItem>
                  <SelectItem value="seal">Seal</SelectItem>
                  <SelectItem value="spacer">Spacer</SelectItem>
                  <SelectItem value="corner">Corner</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Security, Standard"
              />
            </div>
            <div>
              <Label>SKU</Label>
              <Input
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Product SKU"
              />
            </div>
            <div>
              <Label>Base Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost || 0}
                onChange={(e) => {
                  const cost = Number(e.target.value);
                  const markup = formData.markup || 30;
                  setFormData({
                    ...formData,
                    cost,
                    unitPrice: calculatePrice(cost, markup),
                  });
                }}
              />
            </div>
            <div>
              <Label>Markup (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.markup || 30}
                onChange={(e) => {
                  const markup = Number(e.target.value);
                  const cost = formData.cost || 0;
                  setFormData({
                    ...formData,
                    markup,
                    unitPrice: calculatePrice(cost, markup),
                  });
                }}
              />
            </div>
            <div>
              <Label>Unit Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.unitPrice || 0}
                readOnly
                className="bg-gray-700"
              />
              <p className="text-xs text-gray-400 mt-1">
                Calculated: ${formData.cost || 0} × (1 + {formData.markup || 30}%) = ${formData.unitPrice?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div>
              <Label>Supplier</Label>
              <Input
                value={formData.supplier || ''}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Supplier name"
              />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Accessory description"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {editingId ? (
              <>
                <Button onClick={handleUpdateAccessory} className="bg-orange-500 hover:bg-orange-600">
                  <Save className="h-4 w-4 mr-2" />
                  Update Accessory
                </Button>
                <Button variant="outline" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={handleAddAccessory} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Accessory
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Accessories List */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Accessory Library ({accessories.length})
            </CardTitle>
            <Button onClick={handleSave} variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accessories.map((accessory) => (
              <div key={accessory.id} className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{accessory.name}</h4>
                      <Badge className={getTypeColor(accessory.type)}>{accessory.type}</Badge>
                      {accessory.category && <Badge variant="outline">{accessory.category}</Badge>}
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm text-gray-400">
                      <div>Price: ${accessory.unitPrice.toFixed(2)}</div>
                      <div>Cost: ${accessory.cost.toFixed(2)}</div>
                      <div>Markup: {accessory.markup}%</div>
                      <div>Supplier: {accessory.supplier || 'N/A'}</div>
                    </div>
                    {accessory.description && (
                      <p className="text-sm text-gray-500 mt-2">{accessory.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

