/**
 * Machining Zone Joystick Calibration
 * Interactive joystick-style interface for adjusting machining zone positions and sizes
 * Inspired by joystick calibration with visual feedback and real-time adjustments
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Plus, Trash2, Info, Move, Maximize2, Grid, Target } from 'lucide-react';
import { LazyAnimatePresence, LazyMotionDiv } from '@/utils/lazyMotion';
import type { MachiningZone } from './MachiningZoneEditor';

interface MachiningZoneJoystickProps {
  zones: MachiningZone[];
  onZonesChange: (zones: MachiningZone[]) => void;
  profileWidth?: number; // Profile width in mm (for visual scaling)
  profileHeight?: number; // Profile height in mm (for visual scaling)
}

interface JoystickState {
  activeZoneId: string | null;
  isDragging: boolean;
  dragType: 'position' | 'resize' | null;
  startX: number;
  startY: number;
  startValue: { x: number; y: number; width: number; height: number };
}

export const MachiningZoneJoystick: React.FC<MachiningZoneJoystickProps> = ({
  zones,
  onZonesChange,
  profileWidth = 100, // Default 100mm
  profileHeight = 100, // Default 100mm
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedZone, setSelectedZone] = useState<MachiningZone | null>(null);
  const [editingZone, setEditingZone] = useState<MachiningZone | null>(null);
  const [joystickState, setJoystickState] = useState<JoystickState>({
    activeZoneId: null,
    isDragging: false,
    dragType: null,
    startX: 0,
    startY: 0,
    startValue: { x: 0, y: 0, width: 0, height: 0 },
  });
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const [sensitivity, setSensitivity] = useState(1); // Joystick sensitivity multiplier

  // Calculate scale factors for visual representation
  const scaleX = canvasSize.width / profileWidth;
  const scaleY = canvasSize.height / profileHeight;
  const scale = Math.min(scaleX, scaleY) * 0.9; // 90% of canvas for padding

  // Update canvas size on mount and resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Convert zone coordinates to canvas coordinates
  const _zoneToCanvas = useCallback((zone: MachiningZone) => {
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    
    // Calculate position based on reference corner
    let x = 0, y = 0;
    switch (zone.referenceCorner) {
      case 'top_left':
        x = zone.xOffset;
        y = zone.yOffset;
        break;
      case 'top_right':
        x = profileWidth - zone.xOffset - zone.width;
        y = zone.yOffset;
        break;
      case 'bottom_left':
        x = zone.xOffset;
        y = profileHeight - zone.yOffset - zone.height;
        break;
      case 'bottom_right':
        x = profileWidth - zone.xOffset - zone.width;
        y = profileHeight - zone.yOffset - zone.height;
        break;
    }
    
    return {
      x: centerX + (x - profileWidth / 2) * scale,
      y: centerY + (y - profileHeight / 2) * scale,
      width: zone.width * scale,
      height: zone.height * scale,
    };
  }, [canvasSize, profileWidth, profileHeight, scale]);

  // Handle mouse/touch start
  const handlePointerDown = (e: React.PointerEvent, zone: MachiningZone, type: 'position' | 'resize') => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    setJoystickState({
      activeZoneId: zone.id,
      isDragging: true,
      dragType: type,
      startX: canvasX,
      startY: canvasY,
      startValue: {
        x: zone.xOffset,
        y: zone.yOffset,
        width: zone.width,
        height: zone.height,
      },
    });
    setSelectedZone(zone);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Handle mouse/touch move
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!joystickState.isDragging || !joystickState.activeZoneId) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const deltaX = (canvasX - joystickState.startX) / scale * sensitivity;
    const deltaY = (canvasY - joystickState.startY) / scale * sensitivity;

    const zone = zones.find((z) => z.id === joystickState.activeZoneId);
    if (!zone) return;

    const updatedZones = zones.map((z) => {
      if (z.id !== zone.id) return z;

      if (joystickState.dragType === 'position') {
        const newX = Math.max(0, joystickState.startValue.x + deltaX);
        const newY = Math.max(0, joystickState.startValue.y + deltaY);
        return { ...z, xOffset: newX, yOffset: newY };
      } else if (joystickState.dragType === 'resize') {
        const newWidth = Math.max(5, joystickState.startValue.width + deltaX);
        const newHeight = Math.max(5, joystickState.startValue.height + deltaY);
        return { ...z, width: newWidth, height: newHeight };
      }
      return z;
    });

    onZonesChange(updatedZones);
  }, [joystickState, zones, scale, sensitivity, onZonesChange]);

  // Handle mouse/touch end
  const handlePointerUp = useCallback(() => {
    setJoystickState({
      activeZoneId: null,
      isDragging: false,
      dragType: null,
      startX: 0,
      startY: 0,
      startValue: { x: 0, y: 0, width: 0, height: 0 },
    });
  }, []);

  // Attach global event listeners
  useEffect(() => {
    if (joystickState.isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [joystickState.isDragging, handlePointerMove, handlePointerUp]);

  const handleAddZone = () => {
    const newZone: MachiningZone = {
      id: `zone-${Date.now()}`,
      zoneName: `Zone ${zones.length + 1}`,
      zoneType: 'hinge_slot',
      xOffset: profileWidth / 2 - 10,
      yOffset: profileHeight / 2 - 5,
      width: 20,
      height: 10,
      depth: 5,
      referenceCorner: 'top_left',
      isReusable: true,
    };
    onZonesChange([...zones, newZone]);
    setEditingZone(newZone);
    setSelectedZone(newZone);
  };

  const handleDeleteZone = (id: string) => {
    onZonesChange(zones.filter((z) => z.id !== id));
    if (selectedZone?.id === id) {
      setSelectedZone(null);
      setEditingZone(null);
    }
  };

  const handleSaveZone = () => {
    if (!editingZone) return;
    const updatedZones = zones.map((z) => (z.id === editingZone.id ? editingZone : z));
    onZonesChange(updatedZones);
    setEditingZone(null);
  };

  const getZoneColor = (zoneType: string) => {
    switch (zoneType) {
      case 'hinge_slot':
        return 'bg-blue-500/30 border-blue-400';
      case 'lock_pocket':
        return 'bg-purple-500/30 border-purple-400';
      case 'drainage':
        return 'bg-cyan-500/30 border-cyan-400';
      case 'anchor':
        return 'bg-orange-500/30 border-orange-400';
      default:
        return 'bg-gray-500/30 border-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Joystick Controls Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            Interactive Zone Calibration
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Drag zones to adjust position, drag corners to resize
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-gray-400">Sensitivity:</Label>
          <Input
            type="number"
            min="0.1"
            max="5"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value) || 1)}
            className="w-20 h-8 text-xs bg-gray-800 border-gray-600 text-white"
          />
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Visual Canvas - Joystick Area */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-900/80 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Grid className="h-4 w-4 text-purple-400" />
                Visual Zone Editor
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Click and drag zones to position, drag corners to resize
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                ref={canvasRef}
                className="relative w-full h-[400px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border-2 border-gray-700 overflow-hidden"
                style={{ minHeight: '400px' }}
              >
                {/* Grid Background */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: `${scale * 10}px ${scale * 10}px`,
                  }}
                />

                {/* Profile Outline */}
                <div
                  className="absolute border-2 border-gray-600 rounded"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: `${profileWidth * scale}px`,
                    height: `${profileHeight * scale}px`,
                  }}
                >
                  <div className="absolute -top-6 left-0 text-xs text-gray-400">
                    {profileWidth}mm × {profileHeight}mm
                  </div>
                </div>

                {/* Reference Corner Indicators */}
                <div className="absolute top-2 left-2 text-[10px] text-gray-500">TL</div>
                <div className="absolute top-2 right-2 text-[10px] text-gray-500">TR</div>
                <div className="absolute bottom-2 left-2 text-[10px] text-gray-500">BL</div>
                <div className="absolute bottom-2 right-2 text-[10px] text-gray-500">BR</div>

                {/* Zones */}
                <LazyAnimatePresence>
                  {zones.map((zone) => {
                    const isSelected = selectedZone?.id === zone.id;
                    const isActive = joystickState.activeZoneId === zone.id;

                    return (
                      <LazyMotionDiv
                        key={zone.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                          opacity: isActive ? 1 : isSelected ? 0.9 : 0.7,
                          scale: isActive ? 1.05 : 1,
                          x: canvas.x - canvas.width / 2,
                          y: canvas.y - canvas.height / 2,
                        }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`absolute cursor-move border-2 rounded ${
                          getZoneColor(zone.zoneType)
                        } ${isSelected ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-gray-900' : ''}`}
                        style={{
                          width: `${canvas.width}px`,
                          height: `${canvas.height}px`,
                        }}
                        onPointerDown={(e) => handlePointerDown(e, zone, 'position')}
                        onClick={() => {
                          setSelectedZone(zone);
                          setEditingZone(zone);
                        }}
                      >
                        {/* Zone Label */}
                        <div className="absolute -top-6 left-0 text-xs font-semibold text-white whitespace-nowrap">
                          {zone.zoneName}
                        </div>

                        {/* Zone Info */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-[10px] text-white/80 text-center">
                            <div>{zone.width.toFixed(1)}×{zone.height.toFixed(1)}mm</div>
                            {zone.depth && <div>D: {zone.depth}mm</div>}
                          </div>
                        </div>

                        {/* Resize Handle */}
                        <div
                          className="absolute bottom-0 right-0 w-4 h-4 bg-purple-400 rounded-tl-lg cursor-nwse-resize hover:bg-purple-300 transition-colors"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            handlePointerDown(e, zone, 'resize');
                          }}
                        >
                          <Maximize2 className="w-3 h-3 text-white m-0.5" />
                        </div>

                        {/* Position Indicator */}
                        {isSelected && (
                          <LazyMotionDiv
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -left-2 w-6 h-6 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center"
                          >
                            <Move className="w-3 h-3 text-white" />
                          </LazyMotionDiv>
                        )}
                      </LazyMotionDiv>
                    );
                  })}
                </LazyAnimatePresence>

                {/* Joystick Feedback Overlay */}
                {joystickState.isDragging && (
                          <LazyMotionDiv
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-4 right-4 bg-purple-500/90 text-white px-3 py-2 rounded-lg text-xs font-semibold backdrop-blur-sm"
                  >
                    {joystickState.dragType === 'position' ? (
                      <>
                        <Move className="inline h-3 w-3 mr-1" />
                        Adjusting Position
                      </>
                    ) : (
                      <>
                        <Maximize2 className="inline h-3 w-3 mr-1" />
                        Resizing Zone
                      </>
                    )}
                          </LazyMotionDiv>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Zone List & Editor */}
        <div className="space-y-4">
          {/* Zone List */}
          <Card className="bg-gray-900/80 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Zones ({zones.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
              {zones.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-4">
                  No zones defined
                </div>
              ) : (
                zones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`p-2 rounded border cursor-pointer transition-colors ${
                      selectedZone?.id === zone.id
                        ? 'bg-purple-500/20 border-purple-400'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => {
                      setSelectedZone(zone);
                      setEditingZone(zone);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{zone.zoneName}</p>
                        <p className="text-[10px] text-gray-400">
                          {zone.zoneType.replace('_', ' ')} • {zone.width}×{zone.height}mm
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteZone(zone.id);
                        }}
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Zone Editor */}
          {editingZone && (
            <Card className="bg-gray-900/80 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Edit Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-300">Zone Name</Label>
                  <Input
                    value={editingZone.zoneName}
                    onChange={(e) => setEditingZone({ ...editingZone, zoneName: e.target.value })}
                    className="mt-1 h-8 text-xs bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-300">Type</Label>
                  <Select
                    value={editingZone.zoneType}
                    onValueChange={(value) => setEditingZone({ ...editingZone, zoneType: value as any })}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="hinge_slot">Hinge Slot</SelectItem>
                      <SelectItem value="lock_pocket">Lock Pocket</SelectItem>
                      <SelectItem value="drainage">Drainage</SelectItem>
                      <SelectItem value="anchor">Anchor</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-300">X Offset (mm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingZone.xOffset}
                      onChange={(e) =>
                        setEditingZone({ ...editingZone, xOffset: parseFloat(e.target.value) || 0 })
                      }
                      className="mt-1 h-8 text-xs bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Y Offset (mm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingZone.yOffset}
                      onChange={(e) =>
                        setEditingZone({ ...editingZone, yOffset: parseFloat(e.target.value) || 0 })
                      }
                      className="mt-1 h-8 text-xs bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-300">Width (mm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingZone.width}
                      onChange={(e) =>
                        setEditingZone({ ...editingZone, width: parseFloat(e.target.value) || 0 })
                      }
                      className="mt-1 h-8 text-xs bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-300">Height (mm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingZone.height}
                      onChange={(e) =>
                        setEditingZone({ ...editingZone, height: parseFloat(e.target.value) || 0 })
                      }
                      className="mt-1 h-8 text-xs bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-300">Reference Corner</Label>
                  <Select
                    value={editingZone.referenceCorner}
                    onValueChange={(value) =>
                      setEditingZone({ ...editingZone, referenceCorner: value as any })
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs bg-gray-800 border-gray-600 text-white">
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

                <Button
                  onClick={handleSaveZone}
                  className="w-full h-8 text-xs bg-purple-500 hover:bg-purple-600 text-white"
                >
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="bg-purple-500/10 border-purple-500/30">
        <Info className="h-4 w-4 text-purple-400" />
        <AlertDescription className="text-xs text-gray-300">
          <strong>Joystick Controls:</strong> Click and drag zones to move them, drag the corner handle to resize.
          Adjust sensitivity for fine-tuning. Changes are applied in real-time.
        </AlertDescription>
      </Alert>
    </div>
  );
};

