/**
 * Machining Zone Editor
 * Visual editor for defining machining zones (hinge slots, lock pockets, etc.)
 * Now with interactive joystick-style calibration
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Plus, Trash2, Settings, Info, Target, List } from 'lucide-react';
import type { Profile } from '@/types/fabricator';
import { MachiningZoneJoystick } from './MachiningZoneJoystick';

export interface MachiningZone {
  id: string;
  zoneName: string;
  zoneType: 'hinge_slot' | 'lock_pocket' | 'drainage' | 'anchor' | 'custom';
  xOffset: number; // mm from reference corner
  yOffset: number; // mm from reference corner
  width: number; // mm
  height: number; // mm
  depth?: number; // mm
  referenceCorner: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
  isReusable: boolean;
}

interface MachiningZoneEditorProps {
  profile: Profile;
  crossSectionImageUrl?: string;
  zones?: MachiningZone[];
  onZonesChange?: (zones: MachiningZone[]) => void;
  onSave?: (zones: MachiningZone[]) => Promise<void>;
  useJoystickMode?: boolean; // Enable joystick-style calibration
}

export const MachiningZoneEditor: React.FC<MachiningZoneEditorProps> = ({
  profile,
  crossSectionImageUrl: _crossSectionImageUrl,
  zones = [],
  onZonesChange,
  onSave,
  useJoystickMode = true, // Default to joystick mode
}) => {
  const [editingZone, setEditingZone] = useState<MachiningZone | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'joystick' | 'form'>('joystick');

  const handleAddZone = () => {
    const newZone: MachiningZone = {
      id: `zone-${Date.now()}`,
      zoneName: '',
      zoneType: 'hinge_slot',
      xOffset: 0,
      yOffset: 0,
      width: 20,
      height: 10,
      depth: 5,
      referenceCorner: 'top_left',
      isReusable: true,
    };
    setEditingZone(newZone);
  };

  const handleEditZone = (zone: MachiningZone) => {
    setEditingZone({ ...zone });
  };

  const handleDeleteZone = (id: string) => {
    const updatedZones = zones.filter((z) => z.id !== id);
    onZonesChange?.(updatedZones);
  };

  const handleSaveZone = () => {
    if (!editingZone) return;

    if (!editingZone.zoneName.trim()) {
      alert('Zone name is required');
      return;
    }

    const existingIndex = zones.findIndex((z) => z.id === editingZone.id);
    let updatedZones: MachiningZone[];

    if (existingIndex >= 0) {
      updatedZones = [...zones];
      updatedZones[existingIndex] = editingZone;
    } else {
      updatedZones = [...zones, editingZone];
    }

    onZonesChange?.(updatedZones);
    setEditingZone(null);
  };

  const handleSaveAll = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(zones);
    } catch (error) {
      console.error('Error saving zones:', error);
      alert('Failed to save machining zones');
    } finally {
      setIsSaving(false);
    }
  };

  // Get profile dimensions for visual scaling
  const profileWidth = profile.width || 100;
  const profileHeight = profile.height || 100;

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5 text-purple-400" /> Machining Zone Editor
            </CardTitle>
            <CardDescription className="text-gray-400">
              Define machining operations (hinge slots, lock pockets, etc.) for {profile.name}
            </CardDescription>
          </div>
          {useJoystickMode && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
              <TabsList className="bg-gray-900 border-gray-700">
                <TabsTrigger value="joystick" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  Interactive
                </TabsTrigger>
                <TabsTrigger value="form" className="text-xs">
                  <List className="h-3 w-3 mr-1" />
                  Form
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {useJoystickMode && viewMode === 'joystick' ? (
          <MachiningZoneJoystick
            zones={zones}
            onZonesChange={(updated) => {
              onZonesChange?.(updated);
            }}
            profileWidth={profileWidth}
            profileHeight={profileHeight}
          />
        ) : (
          <>
        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm text-gray-400">
            Define zones where machining operations will be performed. These zones can be reused across similar profiles.
          </AlertDescription>
        </Alert>

        {/* Zone List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-300">Defined Zones ({zones.length})</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddZone}
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Zone
            </Button>
          </div>

          {zones.length === 0 ? (
            <div className="p-4 bg-gray-900 rounded border border-gray-700 text-center text-gray-400">
              <p>No machining zones defined</p>
              <p className="text-xs mt-1">Click "Add Zone" to create one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="p-3 bg-gray-900 rounded border border-gray-700 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-300">{zone.zoneName}</p>
                    <p className="text-xs text-gray-400">
                      {zone.zoneType.replace('_', ' ')} • {zone.width}mm × {zone.height}mm
                      {zone.depth && ` × ${zone.depth}mm`} • Offset: ({zone.xOffset}, {zone.yOffset})mm
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditZone(zone)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteZone(zone.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zone Editor Form */}
        {editingZone && (
          <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 space-y-4">
            <h4 className="text-sm font-semibold text-gray-300">
              {zones.find((z) => z.id === editingZone.id) ? 'Edit Zone' : 'New Zone'}
            </h4>

            <div>
              <Label htmlFor="zone-name" className="text-gray-300">
                Zone Name *
              </Label>
              <Input
                id="zone-name"
                value={editingZone.zoneName}
                onChange={(e) => setEditingZone({ ...editingZone, zoneName: e.target.value })}
                placeholder="e.g., Hinge Slot Top"
                className="mt-1 bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="zone-type" className="text-gray-300">
                Zone Type *
              </Label>
              <Select
                value={editingZone.zoneType}
                onValueChange={(value) => setEditingZone({ ...editingZone, zoneType: value as any })}
              >
                <SelectTrigger id="zone-type" className="mt-1 bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="hinge_slot">Hinge Slot</SelectItem>
                  <SelectItem value="lock_pocket">Lock Pocket</SelectItem>
                  <SelectItem value="drainage">Drainage Slot</SelectItem>
                  <SelectItem value="anchor">Anchor Point</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="x-offset" className="text-gray-300">
                  X Offset (mm)
                </Label>
                <Input
                  id="x-offset"
                  type="number"
                  step="0.1"
                  value={editingZone.xOffset}
                  onChange={(e) =>
                    setEditingZone({ ...editingZone, xOffset: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="y-offset" className="text-gray-300">
                  Y Offset (mm)
                </Label>
                <Input
                  id="y-offset"
                  type="number"
                  step="0.1"
                  value={editingZone.yOffset}
                  onChange={(e) =>
                    setEditingZone({ ...editingZone, yOffset: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="width" className="text-gray-300">
                  Width (mm) *
                </Label>
                <Input
                  id="width"
                  type="number"
                  step="0.1"
                  value={editingZone.width}
                  onChange={(e) =>
                    setEditingZone({ ...editingZone, width: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="height" className="text-gray-300">
                  Height (mm) *
                </Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  value={editingZone.height}
                  onChange={(e) =>
                    setEditingZone({ ...editingZone, height: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="depth" className="text-gray-300">
                  Depth (mm)
                </Label>
                <Input
                  id="depth"
                  type="number"
                  step="0.1"
                  value={editingZone.depth || 0}
                  onChange={(e) =>
                    setEditingZone({ ...editingZone, depth: parseFloat(e.target.value) || undefined })
                  }
                  className="mt-1 bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reference-corner" className="text-gray-300">
                Reference Corner *
              </Label>
              <Select
                value={editingZone.referenceCorner}
                onValueChange={(value) =>
                  setEditingZone({ ...editingZone, referenceCorner: value as any })
                }
              >
                <SelectTrigger id="reference-corner" className="mt-1 bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="top_left">Top Left</SelectItem>
                  <SelectItem value="top_right">Top Right</SelectItem>
                  <SelectItem value="bottom_left">Bottom Left</SelectItem>
                  <SelectItem value="bottom_right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-reusable"
                checked={editingZone.isReusable}
                onChange={(e) => setEditingZone({ ...editingZone, isReusable: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is-reusable" className="text-gray-300 cursor-pointer">
                Reusable (can be applied to similar profiles)
              </Label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleSaveZone}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Save Zone
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingZone(null)}
                className="text-gray-300 border-gray-600 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Save All Button */}
        {zones.length > 0 && onSave && (
          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            {isSaving ? (
              <>
                <Settings className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Save All Zones
              </>
            )}
          </Button>
        )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

