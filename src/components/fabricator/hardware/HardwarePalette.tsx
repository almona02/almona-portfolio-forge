/**
 * HardwarePalette Component
 * 
 * Drag-and-drop palette for quick hardware addition with context menu support.
 * Part of Phase 3: Measurement-First Workflow Redesign.
 * 
 * Features:
 * - Hardware items organized by category (handles, locks, hinges, etc.)
 * - Click to add (or drag-and-drop for future enhancement)
 * - Context menu integration support
 * - Filter by system pack compatibility
 * - Icon-based visualization
 * - Quick-add buttons for common hardware
 */

import type { HardwareSpec } from '@/lib/fabricator/hardwareConnector';
import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Circle, Lock, Move, Package, Search, Wrench } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface HardwareItem extends HardwareSpec {
  category: 'handle' | 'lock' | 'hinge' | 'roller' | 'gasket' | 'reinforcement' | 'other';
  icon?: React.ReactNode;
}

export interface HardwarePaletteProps {
  systemPackId?: string | null;
  onHardwareAdd: (hardware: HardwareItem) => void;
  availableHardware?: HardwareItem[];
  mode?: 'palette' | 'context-menu';
  showSearch?: boolean;
  className?: string;
}

// Common hardware items for quick selection
const COMMON_HARDWARE: Omit<HardwareItem, 'icon'>[] = [
  // Handles
  {
    id: 'handle-sliding-standard',
    type: 'handle',
    category: 'handle',
    name: 'Standard Sliding Handle',
    quantity: 1,
    position: 'sash_left',
  },
  {
    id: 'handle-casement-standard',
    type: 'handle',
    category: 'handle',
    name: 'Standard Casement Handle',
    quantity: 1,
    position: 'sash_left',
  },
  {
    id: 'handle-tilt-turn',
    type: 'handle',
    category: 'handle',
    name: 'Tilt-Turn Handle',
    quantity: 1,
    position: 'sash_left',
  },
  // Locks
  {
    id: 'lock-casement-standard',
    type: 'lock',
    category: 'lock',
    name: 'Standard Casement Lock',
    quantity: 1,
    position: 'sash_opposite_hinge',
  },
  {
    id: 'lock-multi-point',
    type: 'lock',
    category: 'lock',
    name: 'Multi-Point Lock',
    quantity: 1,
    position: 'sash_opposite_hinge',
  },
  // Hinges
  {
    id: 'hinge-casement-standard',
    type: 'hinge',
    category: 'hinge',
    name: 'Standard Casement Hinge',
    quantity: 2,
    position: 'sash_side',
  },
  {
    id: 'hinge-tilt-turn',
    type: 'hinge',
    category: 'hinge',
    name: 'Tilt-Turn Mechanism',
    quantity: 1,
    position: 'sash_bottom',
  },
  // Rollers
  {
    id: 'roller-sliding-standard',
    type: 'roller',
    category: 'roller',
    name: 'Standard Sliding Roller',
    quantity: 2,
    position: 'sash_bottom',
  },
  {
    id: 'roller-heavy-duty',
    type: 'roller',
    category: 'roller',
    name: 'Heavy-Duty Roller',
    quantity: 2,
    position: 'sash_bottom',
  },
  // Gaskets
  {
    id: 'gasket-sliding',
    type: 'gasket',
    category: 'gasket',
    name: 'Sliding Gasket',
    quantity: 4,
    position: 'sash_perimeter',
    length: 1000,
  },
  {
    id: 'gasket-weather',
    type: 'gasket',
    category: 'gasket',
    name: 'Weather Gasket',
    quantity: 4,
    position: 'sash_perimeter',
    length: 1000,
  },
  // Reinforcement
  {
    id: 'reinforcement-bar',
    type: 'reinforcement',
    category: 'reinforcement',
    name: 'Reinforcement Bar',
    quantity: 1,
    position: 'sash_center',
    length: 1000,
  },
];

// Helper function to get icon for hardware type
const getHardwareIcon = (category: HardwareItem['category']): React.ReactNode => {
  switch (category) {
    case 'handle':
      return <Move className="h-4 w-4" />;
    case 'lock':
      return <Lock className="h-4 w-4" />;
    case 'hinge':
    case 'roller':
      return <Circle className="h-4 w-4" />;
    case 'gasket':
    case 'other':
      return <Package className="h-4 w-4" />;
    case 'reinforcement':
      return <Wrench className="h-4 w-4" />;
    default:
      return <Package className="h-4 w-4" />;
  }
};

// Category labels and icons
const CATEGORY_CONFIG: Record<HardwareItem['category'], { label: string; icon: React.ReactNode }> = {
  handle: { label: 'Handles', icon: <Move className="h-4 w-4" /> },
  lock: { label: 'Locks', icon: <Lock className="h-4 w-4" /> },
  hinge: { label: 'Hinges', icon: <Circle className="h-4 w-4" /> },
  roller: { label: 'Rollers', icon: <Circle className="h-4 w-4" /> },
  gasket: { label: 'Gaskets', icon: <Package className="h-4 w-4" /> },
  reinforcement: { label: 'Reinforcement', icon: <Wrench className="h-4 w-4" /> },
  other: { label: 'Other', icon: <Package className="h-4 w-4" /> },
};

export const HardwarePalette: React.FC<HardwarePaletteProps> = ({
  systemPackId: _systemPackId, // Reserved for future system pack filtering
  onHardwareAdd,
  availableHardware,
  mode = 'palette',
  showSearch = true,
  className = '',
}) => {
  const { t } = useTranslation('fabricator');
  const [searchQuery, setSearchQuery] = useState('');

  // Use provided hardware or default common hardware (with icons added)
  const hardwareItems = useMemo(() => {
    if (availableHardware) return availableHardware;
    return COMMON_HARDWARE.map((item) => ({
      ...item,
      icon: getHardwareIcon(item.category),
    })) as HardwareItem[];
  }, [availableHardware]);

  // Filter hardware by search and system pack
  const filteredHardware = useMemo(() => {
    let filtered = hardwareItems;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        return (
          item.name.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          false
        );
      });
    }

    // Note: System pack filtering can be enhanced based on systemPackId
    // For now, show all hardware items

    return filtered;
  }, [hardwareItems, searchQuery]);

  // Group hardware by category
  const groupedHardware = useMemo(() => {
    const grouped: Record<HardwareItem['category'], HardwareItem[]> = {
      handle: [],
      lock: [],
      hinge: [],
      roller: [],
      gasket: [],
      reinforcement: [],
      other: [],
    };

    filteredHardware.forEach((item) => {
      grouped[item.category].push(item);
    });

    // Remove empty categories
    return Object.entries(grouped).reduce((acc, [category, items]) => {
      if (items.length > 0) {
        acc[category as HardwareItem['category']] = items;
      }
      return acc;
    }, {} as Record<HardwareItem['category'], HardwareItem[]>);
  }, [filteredHardware]);

  // Handle hardware add
  const handleAddHardware = useCallback(
    (item: HardwareItem) => {
      onHardwareAdd(item);
    },
    [onHardwareAdd]
  );

  // Get category color
  const getCategoryColor = (category: HardwareItem['category']) => {
    switch (category) {
      case 'handle':
        return 'bg-green-900/20 border-green-500/30 text-green-400';
      case 'lock':
        return 'bg-red-900/20 border-red-500/30 text-red-400';
      case 'hinge':
        return 'bg-blue-900/20 border-blue-500/30 text-blue-400';
      case 'roller':
        return 'bg-amber-900/20 border-amber-500/30 text-amber-400';
      case 'gasket':
        return 'bg-amber-900/20 border-amber-500/30 text-amber-400';
      case 'reinforcement':
        return 'bg-gray-900/20 border-gray-500/30 text-gray-400';
      default:
        return 'bg-gray-900/20 border-gray-500/30 text-gray-400';
    }
  };

  // Context menu mode - return items for context menu
  if (mode === 'context-menu') {
    return null; // Context menu items should be generated by parent component
  }

  // Palette mode - full palette UI
  return (
    <div className={cn('flex flex-col h-full', className)}>
      <Card className="card-glass-dark flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <Package className="h-4 w-4 text-amber-500" />
            {t('hardware_palette.title', 'Hardware Palette')}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col overflow-hidden space-y-4">
          {/* Search */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-600/70" />
              <Input
                type="text"
                placeholder={t('hardware_palette.search', 'Search hardware...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-amber-600/30 bg-gray-900/50 text-amber-200 placeholder:text-amber-600/50 text-sm"
              />
            </div>
          )}

          {/* Hardware by Category */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {Object.entries(groupedHardware).map(([category, items]) => {
              const config = CATEGORY_CONFIG[category as HardwareItem['category']];
              if (!config) return null;

              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2 px-2">
                    <div className={cn('p-1 rounded', getCategoryColor(category as HardwareItem['category']))}>
                      {config.icon}
                    </div>
                    <h4 className="text-xs font-semibold text-amber-500/80 uppercase tracking-wide">
                      {config.label}
                    </h4>
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddHardware(item)}
                        className={cn(
                          'w-full justify-start text-left h-auto py-2 px-3',
                          'border border-amber-600/20 bg-gray-900/30',
                          'hover:bg-amber-900/20 hover:border-amber-500/40',
                          'text-xs text-amber-200'
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {item.icon && (
                            <div className="flex-shrink-0 text-amber-500">{item.icon}</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.name}</div>
                            {item.position && (
                              <div className="text-[10px] text-amber-600/70 truncate">
                                {item.position}
                              </div>
                            )}
                          </div>
                          {item.quantity > 1 && (
                            <Badge variant="outline" className="text-[10px] border-amber-600/30 text-amber-400">
                              {item.quantity}x
                            </Badge>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredHardware.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-8 w-8 text-amber-600/50 mb-2" />
                <p className="text-xs text-amber-600/70">
                  {t('hardware_palette.no_hardware', 'No hardware found')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};