/**
 * Block Library Panel
 * 
 * Professional CAD block/symbol library browser with high precision
 * 
 * Constitutional: Deterministic block operations, no ML/AI
 * Tier: 3 Protected Determinism
 */

'use client';

import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/ui/select';
import {
    AlertCircle,
    Box,
    Clock,
    Copy,
    Edit2,
    Grid,
    List,
    Plus,
    Search,
    Trash2,
    TrendingUp
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useDraftingContext } from '../DraftingContext';
import type { BlockDefinition } from '../types/blocks';
import { BlockManager } from '../types/blocks';

interface BlockLibraryPanelProps {
  className?: string;
}

/**
 * Generate SVG thumbnail from block geometry
 */
function generateBlockThumbnail(block: BlockDefinition): string {
  const geometry = block.geometry;
  
  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  const updateBounds = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  
  // Process all geometry types
  geometry.rectangles.forEach(r => {
    updateBounds(r.x, r.y);
    updateBounds(r.x + r.width, r.y + r.height);
  });
  
  geometry.lines.forEach(l => {
    updateBounds(l.start.x, l.start.y);
    updateBounds(l.end.x, l.end.y);
  });
  
  geometry.circles.forEach(c => {
    updateBounds(c.cx - c.r, c.cy - c.r);
    updateBounds(c.cx + c.r, c.cy + c.r);
  });
  
  geometry.arcs.forEach(a => {
    updateBounds(a.cx - a.r, a.cy - a.r);
    updateBounds(a.cx + a.r, a.cy + a.r);
  });
  
  geometry.polygons.forEach(p => {
    p.points.forEach(pt => updateBounds(pt.x, pt.y));
  });
  
  // If no geometry, return placeholder
  if (!isFinite(minX) || !isFinite(minY)) {
    const svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#1e293b" stroke="#475569" stroke-width="2"/>
      <text x="100" y="100" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-size="14">No Preview</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
  
  // Calculate dimensions with padding
  const padding = 20;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  
  // Scale to fit 200x200 viewBox
  const scale = Math.min(180 / width, 180 / height);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const offsetX = (200 - scaledWidth) / 2;
  const offsetY = (200 - scaledHeight) / 2;
  
  let svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="200" height="200" fill="#1e293b" stroke="#475569" stroke-width="1"/>`;
  
  // Transform to center and scale
  const transform = `translate(${offsetX - (minX - padding) * scale}, ${offsetY - (minY - padding) * scale}) scale(${scale})`;
  
  // Draw rectangles
  geometry.rectangles.forEach(r => {
    svg += `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" 
      fill="none" stroke="#3b82f6" stroke-width="1" transform="${transform}"/>`;
  });
  
  // Draw lines
  geometry.lines.forEach(l => {
    svg += `<line x1="${l.start.x}" y1="${l.start.y}" x2="${l.end.x}" y2="${l.end.y}" 
      stroke="#10b981" stroke-width="1" transform="${transform}"/>`;
  });
  
  // Draw circles
  geometry.circles.forEach(c => {
    svg += `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" 
      fill="none" stroke="#f59e0b" stroke-width="1" transform="${transform}"/>`;
  });
  
  // Draw arcs (simplified as circles)
  geometry.arcs.forEach(a => {
    svg += `<circle cx="${a.cx}" cy="${a.cy}" r="${a.r}" 
      fill="none" stroke="#f59e0b" stroke-width="1" stroke-dasharray="2,2" transform="${transform}"/>`;
  });
  
  // Draw polygons
  geometry.polygons.forEach(p => {
    if (p.points.length > 0) {
      const points = p.points.map(pt => `${pt.x},${pt.y}`).join(' ');
      svg += `<polygon points="${points}" 
        fill="none" stroke="#ef4444" stroke-width="1" transform="${transform}"/>`;
    }
  });
  
  svg += `</svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export const BlockLibraryPanel: React.FC<BlockLibraryPanelProps> = ({
  className = ''
}) => {
  const drafting = useDraftingContext();
  const blocks = drafting.getBlockDefinitions();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingBlock, setEditingBlock] = useState<BlockDefinition | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    category: 'custom' as BlockDefinition['category'],
    tags: ''
  });

  // Filter blocks
  const filteredBlocks = useMemo(() => {
    let filtered = blocks;
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = BlockManager.filterByCategory(filtered, selectedCategory as BlockDefinition['category']);
    }
    
    // Search filter
    if (searchTerm.trim()) {
      filtered = BlockManager.searchBlocks(filtered, searchTerm);
    }
    
    return filtered;
  }, [blocks, selectedCategory, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const totalBlocks = blocks.length;
    const byCategory = blocks.reduce((acc, b) => {
      acc[b.category] = (acc[b.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const totalUsage = blocks.reduce((sum, b) => sum + b.usageCount, 0);
    const mostUsed = blocks.reduce((max, b) => b.usageCount > max.usageCount ? b : max, blocks[0] || null);
    
    return { totalBlocks, byCategory, totalUsage, mostUsed };
  }, [blocks]);

  // Handle insert block - click-to-place mode
  const handleInsertBlock = useCallback((blockId: string) => {
    // Start click-to-place mode
    if (drafting.startPlacingBlock) {
      drafting.startPlacingBlock(blockId);
      toast.info(`Click on canvas to place "${blocks.find(b => b.id === blockId)?.name}". Press ESC to cancel.`);
    } else {
      // Fallback to direct insertion if method not available
      const result = drafting.insertBlock(blockId, { x: 0, y: 0 });
      if (result.success) {
        toast.success(`Block "${blocks.find(b => b.id === blockId)?.name}" inserted`);
      } else {
        toast.error(result.error || 'Failed to insert block');
      }
    }
  }, [drafting, blocks]);

  // Handle delete block
  const handleDeleteBlock = useCallback((blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    
    if (!confirm(`Are you sure you want to delete block "${block.name}"?`)) {
      return;
    }
    
    const result = drafting.deleteBlock(blockId);
    if (result.success) {
      toast.success(`Block "${block.name}" deleted`);
    } else {
      toast.error(result.error || 'Failed to delete block');
    }
  }, [drafting, blocks]);

  // Handle edit block
  const handleEditBlock = useCallback((block: BlockDefinition) => {
    setEditingBlock(block);
    setEditFormData({
      name: block.name,
      description: block.description || '',
      category: block.category,
      tags: block.tags.join(', ')
    });
  }, []);

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    if (!editingBlock) return;
    
    const tags = editFormData.tags.split(',').map(t => t.trim()).filter(t => t);
    
    drafting.updateBlock(editingBlock.id, {
      name: editFormData.name,
      description: editFormData.description,
      category: editFormData.category,
      tags,
      updatedAt: new Date()
    });
    
    setEditingBlock(null);
    toast.success('Block updated');
  }, [drafting, editingBlock, editFormData]);

  // Handle duplicate block
  const handleDuplicateBlock = useCallback((block: BlockDefinition) => {
    const newName = `${block.name} (Copy)`;
    
    // Create new block with copied geometry
    const newBlock: BlockDefinition = {
      ...block,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newName,
      geometry: JSON.parse(JSON.stringify(block.geometry)), // Deep copy
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    };
    
    // Add to state via addBlock method
    const result = drafting.addBlock(newBlock);
    if (result.success) {
      toast.success(`Block "${newName}" duplicated`);
    } else {
      toast.error(result.error || 'Failed to duplicate block');
    }
  }, [drafting]);

  const categoryOptions: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All Categories' },
    { value: 'window', label: 'Window' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'architectural', label: 'Architectural' },
    { value: 'custom', label: 'Custom' },
    { value: 'egyptian', label: 'Egyptian' }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Box className="h-5 w-5 text-amber-400" />
            Block Library
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Statistics */}
      {stats.totalBlocks > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="p-3">
              <div className="text-xs text-slate-400 mb-1">Total Blocks</div>
              <div className="text-xl font-bold text-slate-100">{stats.totalBlocks}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="p-3">
              <div className="text-xs text-slate-400 mb-1">Total Usage</div>
              <div className="text-xl font-bold text-amber-400">{stats.totalUsage}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filter */}
      <Card className="bg-slate-900/60 border-slate-700/50">
        <CardContent className="p-3 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search blocks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm border-slate-700/50 text-slate-100 focus:border-amber-500/30 bg-slate-800/50"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-32 h-9 text-sm border-slate-700/50 text-slate-100 focus:border-amber-500/30 bg-slate-800/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50">
                {categoryOptions.map(opt => (
                  <SelectItem 
                    key={opt.value} 
                    value={opt.value}
                    className="text-slate-200 focus:bg-slate-800/80 focus:text-amber-400"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className="h-7 w-7 p-0"
              >
                <Grid className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className="h-7 w-7 p-0"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocks Grid/List */}
      {filteredBlocks.length === 0 ? (
        <Alert className="bg-cyan-500/10 border-cyan-500/30">
          <AlertCircle className="h-4 w-4 text-cyan-400" />
          <AlertDescription className="text-sm text-cyan-300">
            {blocks.length === 0 
              ? 'No blocks available. Create blocks from selected geometry in the canvas.'
              : 'No blocks match your search. Try adjusting your filters.'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto' 
          : 'space-y-2 max-h-[600px] overflow-y-auto'
        }>
          {filteredBlocks.map((block) => {
            const thumbnail = block.thumbnail || generateBlockThumbnail(block);
            
            return (
              <Card
                key={block.id}
                className="border-slate-700/50 hover:border-amber-500/50 transition-all cursor-pointer group shadow-sm hover:shadow-md bg-slate-900/60"
              >
                <CardContent className="p-3 space-y-2">
                  {/* Thumbnail */}
                  {viewMode === 'grid' && (
                    <div className="w-full h-24 bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50 flex items-center justify-center">
                      <img
                        src={thumbnail}
                        alt={block.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback if thumbnail fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Block Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                      {block.name}
                    </h3>
                    {block.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {block.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge 
                      variant="outline" 
                      className="text-[10px] border-slate-700/50 text-slate-300 bg-slate-800/30"
                    >
                      {block.category}
                    </Badge>
                    {block.usageCount > 0 && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px] flex items-center gap-1 border-cyan-500/30 text-cyan-300 bg-cyan-500/10"
                      >
                        <TrendingUp className="h-2.5 w-2.5" />
                        {block.usageCount}
                      </Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className="text-[10px] flex items-center gap-1 border-slate-700/50 text-slate-400 bg-slate-800/30"
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(block.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>

                  {/* Tags */}
                  {block.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {block.tags.slice(0, 2).map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className="text-[10px] bg-slate-800/50 text-slate-300 border-slate-700/50"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {block.tags.length > 2 && (
                        <Badge 
                          variant="secondary" 
                          className="text-[10px] bg-slate-800/50 text-slate-400 border-slate-700/50"
                        >
                          +{block.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1.5 pt-2 border-t border-slate-700/50">
                    <Button
                      size="sm"
                      onClick={() => handleInsertBlock(block.id)}
                      className="flex-1 h-7 text-xs btn-primary-gradient font-semibold"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Insert
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditBlock(block)}
                      className="h-7 w-7 p-0 border-slate-700/50 text-slate-300 hover:bg-slate-800/50 hover:text-amber-400"
                      title="Edit"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicateBlock(block)}
                      className="h-7 w-7 p-0 border-slate-700/50 text-slate-300 hover:bg-slate-800/50 hover:text-amber-400"
                      title="Duplicate"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteBlock(block.id)}
                      className="h-7 w-7 p-0 border-slate-700/50 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingBlock} onOpenChange={(open) => !open && setEditingBlock(null)}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Edit Block</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update block properties
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="typography-label text-sm text-slate-300">Block Name *</Label>
              <Input
                placeholder="Block name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="border-slate-700/50 text-slate-100 mt-1 focus:border-amber-500/30 bg-slate-800/50"
              />
            </div>
            <div>
              <Label className="typography-label text-sm text-slate-300">Description</Label>
              <Input
                placeholder="Optional description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="border-slate-700/50 text-slate-100 mt-1 focus:border-amber-500/30 bg-slate-800/50"
              />
            </div>
            <div>
              <Label className="typography-label text-sm text-slate-300">Category</Label>
              <Select 
                value={editFormData.category} 
                onValueChange={(value: BlockDefinition['category']) => 
                  setEditFormData({ ...editFormData, category: value })
                }
              >
                <SelectTrigger className="border-slate-700/50 text-slate-100 mt-1 focus:border-amber-500/30 bg-slate-800/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50">
                  {categoryOptions.slice(1).map(opt => (
                    <SelectItem 
                      key={opt.value} 
                      value={opt.value}
                      className="text-slate-200 focus:bg-slate-800/80 focus:text-amber-400"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="typography-label text-sm text-slate-300">Tags (comma-separated)</Label>
              <Input
                placeholder="e.g., window, casement, modern"
                value={editFormData.tags}
                onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                className="border-slate-700/50 text-slate-100 mt-1 focus:border-amber-500/30 bg-slate-800/50"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveEdit}
                className="btn-primary"
                disabled={!editFormData.name.trim()}
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingBlock(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

