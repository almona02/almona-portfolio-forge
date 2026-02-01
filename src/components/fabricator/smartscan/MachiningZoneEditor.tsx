import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
  Wrench,
  Plus,
  Trash2,
  Code,
  Factory,
  Zap,
} from 'lucide-react';
import type { EgyptianHardware } from '@/data/egyptian-hardware-database';
import type { ImportedProfile } from './DXFProfileImporter';

export interface MachiningZone {
  id: string;
  name: string;
  type: 'slot' | 'pocket' | 'hole' | 'groove' | 'milling';
  position: {
    x: number; // mm from left edge
    y: number; // mm from bottom edge
    angle?: number; // degrees (0 = horizontal)
  };
  dimensions: {
    width: number; // mm
    depth: number; // mm
    length?: number; // mm (for slots/grooves)
  };
  hardwareId?: string; // Linked hardware
  macro?: string; // CNC macro name
  machine?: string; // Target machine
  notes?: string;
}

interface MachiningZoneEditorProps {
  profiles?: ImportedProfile[];
  selectedProfileId?: string | null;
  linkedHardware?: EgyptianHardware[];
  onZonesChange?: (zones: MachiningZone[]) => void;
}

// Egyptian CNC Machine Presets
const EGYPTIAN_CNC_MACHINES = [
  { id: 'yilmaz_alm6510', name: 'YILMAZ ALM 6510', type: 'double_mitre', macros: ['espag_groove_13mm', 'lock_pocket', 'hinge_slot'] },
  { id: 'elumatec_sbz', name: 'Elumatec SBZ 122', type: 'machining_center', macros: ['multipoint_pocket', 'handle_holes', 'corner_key'] },
  { id: 'local_cnc', name: 'Local CNC (Generic)', type: 'generic', macros: ['custom'] },
];

// Hardware-aware machining macros
const MACHINING_MACROS: Record<string, {
  name: string;
  description: string;
  defaultDimensions: { width: number; depth: number; length?: number };
  machineCompatible: string[];
}> = {
  espag_groove_13mm: {
    name: 'Espagnolette Groove (13mm Axis)',
    description: 'KALE standard 13mm axis groove for espagnolette locks',
    defaultDimensions: { width: 15, depth: 28, length: 800 },
    machineCompatible: ['yilmaz_alm6510', 'elumatec_sbz'],
  },
  lock_pocket: {
    name: 'Lock Pocket (Mortise)',
    description: 'Standard mortise lock pocket',
    defaultDimensions: { width: 18, depth: 45, length: 210 },
    machineCompatible: ['yilmaz_alm6510', 'elumatec_sbz'],
  },
  multipoint_pocket: {
    name: 'Multipoint Lock Pocket',
    description: 'Multipoint lock system pocket',
    defaultDimensions: { width: 55, depth: 17, length: 350 },
    machineCompatible: ['elumatec_sbz'],
  },
  hinge_slot: {
    name: 'Hinge Slot',
    description: 'Standard hinge mounting slot',
    defaultDimensions: { width: 12, depth: 22, length: 65 },
    machineCompatible: ['yilmaz_alm6510', 'elumatec_sbz'],
  },
  handle_holes: {
    name: 'Handle Mounting Holes',
    description: 'Cremone handle mounting holes',
    defaultDimensions: { width: 8, depth: 45, length: 0 },
    machineCompatible: ['elumatec_sbz'],
  },
  corner_key: {
    name: 'Corner Key Pocket',
    description: 'Press-fit corner key pocket',
    defaultDimensions: { width: 8, depth: 30, length: 30 },
    machineCompatible: ['elumatec_sbz'],
  },
};

export const MachiningZoneEditor: React.FC<MachiningZoneEditorProps> = ({
  profiles = [],
  selectedProfileId,
  linkedHardware = [],
  onZonesChange,
}) => {
  const [zones, setZones] = useState<MachiningZone[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('yilmaz_alm6510');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [gCodePreview, setGCodePreview] = useState<string>('');

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedProfileId) || profiles[0],
    [profiles, selectedProfileId]
  );

  // Auto-suggest zones based on linked hardware
  const suggestedZones = useMemo(() => {
    if (!selectedProfile || linkedHardware.length === 0) return [];
    return linkedHardware
      .filter((hw) => hw.requiresMachining && hw.machiningMacro)
      .map((hw) => {
        const macro = MACHINING_MACROS[hw.machiningMacro || ''];
        if (!macro) return null;
        return {
          id: `auto_${hw.id}`,
          name: `${hw.name} Zone`,
          type: hw.category === 'lock' ? 'pocket' : hw.category === 'hinge' ? 'slot' : 'hole',
          position: { x: selectedProfile.widthMm * 0.3, y: selectedProfile.heightMm * 0.5 },
          dimensions: macro.defaultDimensions,
          hardwareId: hw.id,
          macro: hw.machiningMacro,
          machine: selectedMachine,
        } as MachiningZone;
      })
      .filter((z): z is MachiningZone => z !== null);
  }, [linkedHardware, selectedProfile, selectedMachine]);

  const handleAddZone = useCallback(
    (suggested?: MachiningZone) => {
      const newZone: MachiningZone = suggested || {
        id: `zone_${Date.now()}`,
        name: 'New Zone',
        type: 'slot',
        position: { x: selectedProfile?.widthMm ? selectedProfile.widthMm * 0.5 : 0, y: selectedProfile?.heightMm ? selectedProfile.heightMm * 0.5 : 0 },
        dimensions: { width: 15, depth: 28, length: 100 },
        machine: selectedMachine,
      };
      const updated = [...zones, newZone];
      setZones(updated);
      onZonesChange?.(updated);
      setSelectedZoneId(newZone.id);
    },
    [zones, selectedProfile, selectedMachine, onZonesChange]
  );

  const handleRemoveZone = useCallback(
    (id: string) => {
      const updated = zones.filter((z) => z.id !== id);
      setZones(updated);
      onZonesChange?.(updated);
      if (selectedZoneId === id) setSelectedZoneId(null);
    },
    [zones, selectedZoneId, onZonesChange]
  );

  const handleUpdateZone = useCallback(
    (id: string, updates: Partial<MachiningZone>) => {
      const updated = zones.map((z) => (z.id === id ? { ...z, ...updates } : z));
      setZones(updated);
      onZonesChange?.(updated);
    },
    [zones, onZonesChange]
  );

  // Generate G-code preview
  const generateGCode = useCallback(() => {
    if (!selectedProfile || zones.length === 0) {
      setGCodePreview('No zones defined or profile selected.');
      return;
    }

    const machine = EGYPTIAN_CNC_MACHINES.find((m) => m.id === selectedMachine);
    let gcode = `; G-code for ${machine?.name || 'CNC Machine'}\n`;
    gcode += `; Profile: ${selectedProfile.name} (${selectedProfile.widthMm} × ${selectedProfile.heightMm} mm)\n`;
    gcode += `; Generated: ${new Date().toISOString()}\n\n`;

    gcode += 'G21 ; Metric units\n';
    gcode += 'G90 ; Absolute positioning\n';
    gcode += 'G0 Z5 ; Safe height\n\n';

    zones.forEach((zone, idx) => {
      gcode += `; Zone ${idx + 1}: ${zone.name} (${zone.type})\n`;
      if (zone.macro) {
        const macro = MACHINING_MACROS[zone.macro];
        if (macro) {
          gcode += `; Macro: ${macro.name}\n`;
        }
      }
      gcode += `G0 X${zone.position.x.toFixed(2)} Y${zone.position.y.toFixed(2)}\n`;
      gcode += `G0 Z0\n`;
      if (zone.type === 'slot' || zone.type === 'groove') {
        gcode += `G1 Z-${zone.dimensions.depth.toFixed(2)} F100\n`;
        gcode += `G1 X${(zone.position.x + (zone.dimensions.length || zone.dimensions.width)).toFixed(2)} F200\n`;
        gcode += `G0 Z5\n`;
      } else if (zone.type === 'pocket') {
        gcode += `G1 Z-${zone.dimensions.depth.toFixed(2)} F100\n`;
        gcode += `G1 X${(zone.position.x + zone.dimensions.width).toFixed(2)} Y${(zone.position.y + (zone.dimensions.length || zone.dimensions.width)).toFixed(2)} F200\n`;
        gcode += `G0 Z5\n`;
      } else if (zone.type === 'hole') {
        gcode += `G81 X${zone.position.x.toFixed(2)} Y${zone.position.y.toFixed(2)} Z-${zone.dimensions.depth.toFixed(2)} R2 F150\n`;
      }
      gcode += '\n';
    });

    gcode += 'G0 Z50 ; Return to safe height\n';
    gcode += 'M30 ; Program end\n';

    setGCodePreview(gcode);
  }, [zones, selectedProfile, selectedMachine]);

  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  if (!selectedProfile) {
    return (
      <Alert className="bg-gray-900/60 border-gray-800 card-dark">
        <AlertDescription className="text-sm text-gray-200">
          Select a profile in the Import tab to define machining zones.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Machine Selection */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Label className="typography-label text-sm">Target CNC Machine</Label>
          <Select value={selectedMachine} onValueChange={setSelectedMachine}>
            <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {EGYPTIAN_CNC_MACHINES.map((machine) => (
                <SelectItem key={machine.id} value={machine.id}>
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    {machine.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={generateGCode} variant="outline" size="sm" className="bg-blue-600/20 border-blue-500 hover:bg-blue-600/30">
          <Code className="h-4 w-4 mr-2" />
          Generate G-Code
        </Button>
      </div>

      <Tabs defaultValue="zones" className="w-full">
        <TabsList className="grid grid-cols-3 bg-gray-900">
          <TabsTrigger value="zones" className="text-xs">
            <Wrench className="h-3 w-3 mr-1" /> Zones
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="text-xs">
            <Zap className="h-3 w-3 mr-1" /> Auto-Suggest
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-xs">
            <Code className="h-3 w-3 mr-1" /> G-Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="mt-4 space-y-4">
          {/* Profile Preview with Zones */}
          <Card className="bg-gray-900/60 border-gray-800 card-dark">
            <CardHeader>
              <CardTitle className="text-sm">Profile Cross-Section: {selectedProfile.name}</CardTitle>
              <CardDescription className="text-xs">
                {selectedProfile.widthMm} × {selectedProfile.heightMm} mm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative border border-gray-700 bg-white rounded p-4" style={{ minHeight: '300px' }}>
                {/* Profile Outline */}
                <svg
                  viewBox={`0 0 ${selectedProfile.widthMm || 100} ${selectedProfile.heightMm || 50}`}
                  className="w-full h-auto"
                  style={{ maxHeight: '300px' }}
                >
                  {/* Profile shape (simplified rectangle for now) */}
                  <rect
                    x="0"
                    y="0"
                    width={selectedProfile.widthMm || 100}
                    height={selectedProfile.heightMm || 50}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2"
                  />
                  {/* Chamber (estimated) */}
                  <rect
                    x={(selectedProfile.widthMm || 100) * 0.15}
                    y={(selectedProfile.heightMm || 50) * 0.2}
                    width={(selectedProfile.widthMm || 100) * 0.7}
                    height={(selectedProfile.heightMm || 50) * 0.6}
                    fill="#e2e8f0"
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                  {/* Machining Zones */}
                  {zones.map((zone) => {
                    const isSelected = zone.id === selectedZoneId;
                    return (
                      <g key={zone.id} onClick={() => setSelectedZoneId(zone.id)} style={{ cursor: 'pointer' }}>
                        {zone.type === 'slot' || zone.type === 'groove' ? (
                          <rect
                            x={zone.position.x}
                            y={zone.position.y - zone.dimensions.depth / 2}
                            width={zone.dimensions.length || zone.dimensions.width}
                            height={zone.dimensions.depth}
                            fill={isSelected ? '#3b82f6' : '#ef4444'}
                            fillOpacity={0.6}
                            stroke={isSelected ? '#2563eb' : '#dc2626'}
                            strokeWidth={isSelected ? 2 : 1}
                          />
                        ) : zone.type === 'pocket' ? (
                          <rect
                            x={zone.position.x}
                            y={zone.position.y}
                            width={zone.dimensions.width}
                            height={zone.dimensions.length || zone.dimensions.width}
                            fill={isSelected ? '#3b82f6' : '#ef4444'}
                            fillOpacity={0.6}
                            stroke={isSelected ? '#2563eb' : '#dc2626'}
                            strokeWidth={isSelected ? 2 : 1}
                          />
                        ) : (
                          <circle
                            cx={zone.position.x}
                            cy={zone.position.y}
                            r={zone.dimensions.width / 2}
                            fill={isSelected ? '#3b82f6' : '#ef4444'}
                            fillOpacity={0.6}
                            stroke={isSelected ? '#2563eb' : '#dc2626'}
                            strokeWidth={isSelected ? 2 : 1}
                          />
                        )}
                        <text
                          x={zone.position.x}
                          y={zone.position.y - 5}
                          fontSize="8"
                          fill={isSelected ? '#2563eb' : '#dc2626'}
                          fontWeight="bold"
                        >
                          {zone.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Zone List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="typography-label text-sm">Defined Zones ({zones.length})</Label>
              <Button onClick={() => handleAddZone()} size="sm" variant="outline" className="bg-green-600/20 border-green-500 hover:bg-green-600/30">
                <Plus className="h-3 w-3 mr-1" />
                Add Zone
              </Button>
            </div>
            {zones.length === 0 ? (
              <Alert className="bg-gray-900/60 border-gray-800 card-dark">
                <AlertDescription className="text-xs text-gray-400">
                  No machining zones defined. Click "Add Zone" or use "Auto-Suggest" to add zones based on linked hardware.
                </AlertDescription>
              </Alert>
            ) : (
              zones.map((zone) => (
                <Card
                  key={zone.id}
                  className={`bg-gray-900/60 border-gray-800 cursor-pointer transition-colors ${
                    selectedZoneId === zone.id ? 'border-blue-500 bg-blue-500/10' : 'hover:border-gray-700'
                  }`}
                  onClick={() => setSelectedZoneId(zone.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {zone.type}
                          </Badge>
                          <span className="font-medium text-sm">{zone.name}</span>
                          {zone.hardwareId && (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-300">
                              Hardware Linked
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {zone.dimensions.width} × {zone.dimensions.depth} mm
                          {zone.dimensions.length && ` × ${zone.dimensions.length} mm`}
                          {' · '}
                          Position: ({zone.position.x.toFixed(1)}, {zone.position.y.toFixed(1)})
                          {zone.macro && ` · Macro: ${zone.macro}`}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveZone(zone.id);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Zone Editor */}
          {selectedZone && (
            <Card className="bg-gray-900/60 border-gray-800 card-dark">
              <CardHeader>
                <CardTitle className="text-sm">Edit Zone: {selectedZone.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="typography-label text-xs">Zone Name</Label>
                    <Input
                      value={selectedZone.name}
                      onChange={(e) => handleUpdateZone(selectedZone.id, { name: e.target.value })}
                      className="bg-gray-800 border-gray-700 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="typography-label text-xs">Zone Type</Label>
                    <Select
                      value={selectedZone.type}
                      onValueChange={(val) => handleUpdateZone(selectedZone.id, { type: val as MachiningZone['type'] })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                        <SelectItem value="slot">Slot</SelectItem>
                        <SelectItem value="pocket">Pocket</SelectItem>
                        <SelectItem value="hole">Hole</SelectItem>
                        <SelectItem value="groove">Groove</SelectItem>
                        <SelectItem value="milling">Milling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="typography-label text-xs">X Position (mm)</Label>
                    <Input
                      type="number"
                      value={selectedZone.position.x}
                      onChange={(e) =>
                        handleUpdateZone(selectedZone.id, {
                          position: { ...selectedZone.position, x: Number(e.target.value) },
                        })
                      }
                      className="bg-gray-800 border-gray-700 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="typography-label text-xs">Y Position (mm)</Label>
                    <Input
                      type="number"
                      value={selectedZone.position.y}
                      onChange={(e) =>
                        handleUpdateZone(selectedZone.id, {
                          position: { ...selectedZone.position, y: Number(e.target.value) },
                        })
                      }
                      className="bg-gray-800 border-gray-700 h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="typography-label text-xs">Width (mm)</Label>
                    <Input
                      type="number"
                      value={selectedZone.dimensions.width}
                      onChange={(e) =>
                        handleUpdateZone(selectedZone.id, {
                          dimensions: { ...selectedZone.dimensions, width: Number(e.target.value) },
                        })
                      }
                      className="bg-gray-800 border-gray-700 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="typography-label text-xs">Depth (mm)</Label>
                    <Input
                      type="number"
                      value={selectedZone.dimensions.depth}
                      onChange={(e) =>
                        handleUpdateZone(selectedZone.id, {
                          dimensions: { ...selectedZone.dimensions, depth: Number(e.target.value) },
                        })
                      }
                      className="bg-gray-800 border-gray-700 h-8 text-xs"
                    />
                  </div>
                  {(selectedZone.type === 'slot' || selectedZone.type === 'groove') && (
                    <div>
                      <Label className="typography-label text-xs">Length (mm)</Label>
                      <Input
                        type="number"
                        value={selectedZone.dimensions.length || 0}
                        onChange={(e) =>
                          handleUpdateZone(selectedZone.id, {
                            dimensions: { ...selectedZone.dimensions, length: Number(e.target.value) },
                          })
                        }
                        className="bg-gray-800 border-gray-700 h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label className="typography-label text-xs">Machining Macro</Label>
                  <Select
                    value={selectedZone.macro || ''}
                    onValueChange={(val) => handleUpdateZone(selectedZone.id, { macro: val })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 h-8 text-xs">
                      <SelectValue placeholder="Select macro" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                      {Object.entries(MACHINING_MACROS)
                        .filter(([_, macro]) => macro.machineCompatible.includes(selectedMachine))
                        .map(([key, macro]) => (
                          <SelectItem key={key} value={key}>
                            {macro.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selectedZone.macro && MACHINING_MACROS[selectedZone.macro] && (
                    <p className="text-xs text-gray-400 mt-1">{MACHINING_MACROS[selectedZone.macro].description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4">
          <Card className="bg-gray-900/60 border-gray-800 card-dark">
            <CardHeader>
              <CardTitle className="text-sm">Auto-Suggest Zones from Hardware</CardTitle>
              <CardDescription className="text-xs">
                Automatically create machining zones based on linked hardware that requires machining.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestedZones.length === 0 ? (
                <Alert className="bg-gray-900/60 border-gray-800 card-dark">
                  <AlertDescription className="text-sm text-gray-200">
                    No hardware-linked machining suggestions available. Link hardware in the Hardware tab first.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert className="bg-blue-900/20 border-blue-500">
                    <AlertDescription className="text-xs text-blue-200">
                      Found {suggestedZones.length} hardware item(s) that require machining. Click "Add" to create zones.
                    </AlertDescription>
                  </Alert>
                  {suggestedZones.map((suggested) => {
                    const hardware = linkedHardware.find((hw) => hw.id === suggested.hardwareId);
                    const macro = suggested.macro ? MACHINING_MACROS[suggested.macro] : null;
                    return (
                      <Card key={suggested.id} className="bg-gray-900/60 border-gray-800 card-dark">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs border-amber-500 text-amber-300">
                                  {hardware?.name || 'Hardware'}
                                </Badge>
                                <span className="font-medium text-sm">{suggested.name}</span>
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                Type: {suggested.type} · {suggested.dimensions.width} × {suggested.dimensions.depth} mm
                                {macro && ` · ${macro.description}`}
                              </div>
                            </div>
                            <Button
                              onClick={() => handleAddZone(suggested)}
                              size="sm"
                              variant="outline"
                              className="bg-green-600/20 border-green-500 hover:bg-green-600/30"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <Card className="bg-gray-900/60 border-gray-800 card-dark">
            <CardHeader>
              <CardTitle className="text-sm">G-Code Preview</CardTitle>
              <CardDescription className="text-xs">
                Generated G-code for {EGYPTIAN_CNC_MACHINES.find((m) => m.id === selectedMachine)?.name || 'CNC Machine'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gCodePreview ? (
                <pre className="bg-gray-950 border border-gray-700 rounded p-4 text-xs font-mono text-green-300 overflow-x-auto max-h-[400px] overflow-y-auto">
                  {gCodePreview}
                </pre>
              ) : (
                <Alert className="bg-gray-900/60 border-gray-800 card-dark">
                  <AlertDescription className="text-sm text-gray-200">
                    Click "Generate G-Code" to preview the CNC program for defined zones.
                  </AlertDescription>
                </Alert>
              )}
              {gCodePreview && (
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={() => {
                      const blob = new Blob([gCodePreview], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${selectedProfile.name}_${selectedMachine}_${Date.now()}.nc`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Download G-Code
                  </Button>
                  <Button onClick={() => setGCodePreview('')} size="sm" variant="outline">
                    Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
