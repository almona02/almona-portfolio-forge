/**
 * Layer Manager Panel
 * 
 * Professional CAD layer management UI with high precision
 * 
 * Constitutional: Deterministic layer operations, no ML/AI
 * Tier: 3 Protected Determinism
 */

'use client';

import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import {
    Check,
    Edit2,
    Eye,
    EyeOff,
    Layers,
    Lock,
    Plus,
    Trash2,
    Unlock,
    X
} from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useDraftingContext } from '../DraftingContext';
import type { Layer } from '../types/layers';
import { DEFAULT_LAYERS } from '../types/layers';

interface LayerManagerPanelProps {
  className?: string;
}

export const LayerManagerPanel: React.FC<LayerManagerPanelProps> = ({
  className = ''
}) => {
  const drafting = useDraftingContext();
  const layers = drafting.getLayers();
  const activeLayer = drafting.getActiveLayer();
  const [editingLayer, setEditingLayer] = useState<Layer | null>(null);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerColor, setNewLayerColor] = useState('#3b82f6');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleSetActiveLayer = useCallback((layerId: string) => {
    const result = drafting.setActiveLayer(layerId);
    if (!result.success) {
      toast.error(result.error || 'Failed to set active layer');
    }
  }, [drafting]);

  const handleToggleVisibility = useCallback((layerId: string) => {
    drafting.toggleLayerVisibility(layerId);
  }, [drafting]);

  const handleToggleLock = useCallback((layerId: string) => {
    drafting.toggleLayerLock(layerId);
  }, [drafting]);

  const handleCreateLayer = useCallback(() => {
    if (!newLayerName.trim()) {
      toast.error('Layer name cannot be empty');
      return;
    }

    const result = drafting.createLayer(newLayerName.trim(), newLayerColor);
    if (result.success && result.layer) {
      toast.success(`Layer "${result.layer.name}" created`);
      setNewLayerName('');
      setNewLayerColor('#3b82f6');
      setShowCreateDialog(false);
      // Set as active layer
      drafting.setActiveLayer(result.layer.id);
    } else {
      toast.error(result.error || 'Failed to create layer');
    }
  }, [drafting, newLayerName, newLayerColor]);

  const handleDeleteLayer = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    // Check if it's a default layer
    if (DEFAULT_LAYERS.some(dl => dl.id === layerId)) {
      toast.error('Cannot delete default layers');
      return;
    }

    const result = drafting.deleteLayer(layerId);
    if (result.success) {
      toast.success(`Layer "${layer.name}" deleted`);
    } else {
      toast.error(result.error || 'Failed to delete layer');
    }
  }, [drafting, layers]);

  const handleUpdateLayer = useCallback((layerId: string, updates: Partial<Layer>) => {
    drafting.updateLayer(layerId, updates);
    setEditingLayer(null);
    toast.success('Layer updated');
  }, [drafting]);

  // TODO: Use getLineTypeDisplay when line type display is needed in UI
  // const getLineTypeDisplay = (lineType: Layer['lineType']) => {
  //   switch (lineType) {
  //     case 'solid': return 'Solid';
  //     case 'dashed': return 'Dashed';
  //     case 'dotted': return 'Dotted';
  //     case 'dash-dot': return 'Dash-Dot';
  //     default: return lineType;
  //   }
  // };

  return (
    <Card className={`bg-slate-900/80 border-slate-700/50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-200 flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-amber-400" />
            Layers
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-amber-400 hover:text-slate-300 hover:bg-amber-500/10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700/50">
              <DialogHeader>
                <DialogTitle className="text-slate-200">Create New Layer</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Add a new layer to organize your drawing
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="layer-name" className="text-slate-300">Layer Name</Label>
                  <Input
                    id="layer-name"
                    value={newLayerName}
                    onChange={(e) => setNewLayerName(e.target.value)}
                    placeholder="e.g., Hardware, Dimensions"
                    className="bg-slate-800 border-slate-700/50 text-slate-200 mt-1"
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="layer-color" className="text-slate-300">Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="layer-color"
                      type="color"
                      value={newLayerColor}
                      onChange={(e) => setNewLayerColor(e.target.value)}
                      className="w-16 h-10 p-1 bg-slate-800 border-slate-700/50"
                    />
                    <Input
                      type="text"
                      value={newLayerColor}
                      onChange={(e) => {
                        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                          setNewLayerColor(e.target.value);
                        }
                      }}
                      placeholder="#3b82f6"
                      className="flex-1 bg-slate-800 border-slate-700/50 text-slate-200"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    className="border-amber-500/30 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateLayer}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white"
                  >
                    Create Layer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {layers.map((layer) => {
          const isActive = layer.id === activeLayer.id;
          const isDefault = DEFAULT_LAYERS.some(dl => dl.id === layer.id);
          const isEditing = editingLayer?.id === layer.id;

          return (
            <div
              key={layer.id}
              className={`
                flex items-center gap-2 p-2 rounded-lg transition-all
                ${isActive 
                  ? 'bg-amber-600/20 border border-amber-500/50' 
                  : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-700/50'
                }
              `}
            >
              {/* Color indicator */}
              <div
                className="w-4 h-4 rounded border border-slate-600 flex-shrink-0"
                style={{ backgroundColor: layer.color }}
                title={layer.color}
              />

              {/* Layer name */}
              {isEditing ? (
                <Input
                  value={editingLayer?.name || ''}
                  onChange={(e) => setEditingLayer({ ...editingLayer!, name: e.target.value })}
                  className="flex-1 h-7 text-xs bg-slate-700 border-slate-700/50 text-slate-200"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateLayer(layer.id, { name: editingLayer!.name });
                    } else if (e.key === 'Escape') {
                      setEditingLayer(null);
                    }
                  }}
                />
              ) : (
                <button
                  onClick={() => handleSetActiveLayer(layer.id)}
                  className={`
                    flex-1 text-left text-xs font-medium transition-colors
                    ${isActive ? 'text-slate-300' : 'text-slate-300 hover:text-amber-400'}
                  `}
                  title={layer.description || layer.name}
                >
                  {layer.name}
                </button>
              )}

              {/* Active indicator */}
              {isActive && (
                <Badge className="bg-amber-500/20 text-slate-300 border-amber-500/30 text-[10px] px-1.5 py-0">
                  Active
                </Badge>
              )}

              {/* Controls */}
              <div className="flex items-center gap-1">
                {/* Visibility toggle */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-amber-500/10"
                  onClick={() => handleToggleVisibility(layer.id)}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible ? (
                    <Eye className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                  )}
                </Button>

                {/* Lock toggle */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-amber-500/10"
                  onClick={() => handleToggleLock(layer.id)}
                  title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                >
                  {layer.locked ? (
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </Button>

                {/* Edit button */}
                {!isEditing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-amber-500/10"
                    onClick={() => setEditingLayer(layer)}
                    title="Edit layer"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                )}

                {/* Save/Cancel edit */}
                {isEditing && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-green-500/10"
                      onClick={() => handleUpdateLayer(layer.id, { name: editingLayer!.name })}
                      title="Save"
                    >
                      <Check className="h-3.5 w-3.5 text-green-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-red-500/10"
                      onClick={() => setEditingLayer(null)}
                      title="Cancel"
                    >
                      <X className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </>
                )}

                {/* Delete button (only for non-default layers) */}
                {!isDefault && !isEditing && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-red-500/10"
                    onClick={() => handleDeleteLayer(layer.id)}
                    title="Delete layer"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* Layer info footer */}
        <div className="pt-2 mt-2 border-t border-slate-700/50 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span>Total: {layers.length} layers</span>
            <span className="text-amber-400">{activeLayer.name}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

