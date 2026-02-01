/**
 * TemplateGallery Component
 * 
 * Visual gallery for quick template selection with thumbnails and one-click apply.
 * Part of Phase 3: Measurement-First Workflow Redesign.
 * 
 * Features:
 * - Grid layout with template cards (thumbnail + name)
 * - Filter by system pack
 * - Search functionality
 * - Quick preview on hover
 * - One-click apply (no confirmation needed for quick workflow)
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Grid3X3, LayoutList, Search, Sparkles } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ArchitecturalPreset } from '../drafting/prestige/ArchitecturalPresetSelector';
import { SIMPLE_PRESETS } from '../drafting/prestige/simplePresetsData';

export interface Template {
  id: string;
  title: string;
  description: string;
  icon?: string;
  complexity?: string;
  applications?: string[];
  pricingTier?: string;
  systemPackId?: string; // Optional system pack compatibility
}

export interface TemplateGalleryProps {
  systemPackId?: string | null;
  onTemplateSelect: (templateId: string, template: Template) => void;
  selectedTemplateId?: string | null;
  showFilters?: boolean;
  mode?: 'modal' | 'inline';
  templates?: ArchitecturalPreset[]; // Allow custom templates, default to SIMPLE_PRESETS
  className?: string;
}

type ViewMode = 'grid' | 'list';

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  systemPackId,
  onTemplateSelect,
  selectedTemplateId,
  showFilters = true,
  mode: _mode = 'inline', // Reserved for future modal/inline mode differentiation
  templates = SIMPLE_PRESETS,
  className = '',
}) => {
  const { t } = useTranslation('fabricator');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filter templates by search and system pack
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by system pack compatibility (if systemPackId provided and template has systemPackId)
    if (systemPackId) {
      filtered = filtered.filter((template) => {
        // If template has systemPackId, filter by it
        // Otherwise, show all templates (assume compatibility)
        const templateSystemPackId = (template as any).systemPackId;
        return !templateSystemPackId || templateSystemPackId === systemPackId;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((template) => {
        return (
          template.title.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.applications?.some((app) => app.toLowerCase().includes(query)) ||
          template.intelligence?.gridPattern?.toLowerCase().includes(query) ||
          false
        );
      });
    }

    return filtered;
  }, [templates, systemPackId, searchQuery]);

  // Handle template selection
  const handleTemplateSelect = useCallback(
    (template: ArchitecturalPreset) => {
      const templateData: Template = {
        id: template.id,
        title: template.title,
        description: template.description,
        icon: template.icon,
        complexity: template.complexity,
        applications: template.applications,
        pricingTier: template.pricingTier,
        systemPackId: (template as any).systemPackId,
      };
      onTemplateSelect(template.id, templateData);
    },
    [onTemplateSelect]
  );

  // Get complexity badge color
  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'Basic':
        return 'bg-green-900/30 border-green-500/30 text-green-400';
      case 'Intermediate':
        return 'bg-blue-900/30 border-blue-500/30 text-blue-400';
      case 'Advanced':
        return 'bg-amber-900/30 border-amber-500/30 text-amber-400';
      default:
        return 'bg-gray-900/30 border-gray-500/30 text-gray-400';
    }
  };

  // Get pricing tier badge color
  const getPricingTierColor = (tier?: string) => {
    switch (tier) {
      case 'Local':
        return 'bg-gray-900/30 border-gray-500/30 text-gray-400';
      case 'Premium':
        return 'bg-amber-900/30 border-amber-500/30 text-amber-400';
      default:
        return 'bg-gray-900/30 border-gray-500/30 text-gray-400';
    }
  };

  // Generate simple grid preview (visual representation of grid pattern)
  const renderGridPreview = (template: ArchitecturalPreset) => {
    const gridPattern = template.intelligence?.gridPattern || '2x2';
    const match = gridPattern.match(/(\d+)x(\d+)/);
    if (!match) return null;

    const cols = parseInt(match[1], 10);
    const rows = parseInt(match[2], 10);
    const cellCount = cols * rows;

    return (
      <div className="grid gap-1 p-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cellCount }).map((_, idx) => (
          <div
            key={idx}
            className="aspect-square bg-amber-600/20 border border-amber-600/40 rounded"
          />
        ))}
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with Search and View Toggle */}
      {showFilters && (
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-600/70" />
              <Input
                type="text"
                placeholder={t('template_gallery.search', 'Search templates...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-amber-600/30 bg-gray-900/50 text-amber-200 placeholder:text-amber-600/50"
              />
            </div>
            <div className="flex items-center gap-1 border border-amber-600/30 rounded-lg p-1 bg-gray-900/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'h-7 px-2',
                  viewMode === 'grid'
                    ? 'bg-amber-900/30 text-amber-200'
                    : 'text-amber-600/70 hover:text-amber-200'
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn(
                  'h-7 px-2',
                  viewMode === 'list'
                    ? 'bg-amber-900/30 text-amber-200'
                    : 'text-amber-600/70 hover:text-amber-200'
                )}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Grid/List */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sparkles className="h-12 w-12 text-amber-600/50 mb-4" />
          <p className="text-amber-600/70 text-sm">
            {t('template_gallery.no_templates', 'No templates found')}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            'flex-1 overflow-y-auto',
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          )}
        >
          {filteredTemplates.map((template) => {
            const isSelected = selectedTemplateId === template.id;

            return (
              <Card
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={cn(
                  'cursor-pointer transition-all duration-200',
                  'border-amber-600/30 bg-gray-900/50 hover:bg-gray-900/70',
                  'hover:border-amber-500/50 hover:shadow-lg',
                  isSelected && 'ring-2 ring-amber-500 border-amber-500 bg-amber-900/20',
                  viewMode === 'list' && 'flex flex-row'
                )}
              >
                {viewMode === 'grid' ? (
                  <>
                    {/* Grid View */}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-semibold text-amber-200 truncate flex items-center gap-2">
                            {template.icon && <span className="text-lg">{template.icon}</span>}
                            {template.title}
                          </CardTitle>
                        </div>
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Grid Preview */}
                      <div className="h-24 bg-gray-950/50 rounded border border-amber-600/20 flex items-center justify-center">
                        {renderGridPreview(template)}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-amber-600/80 line-clamp-2">
                        {template.description}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {template.complexity && (
                          <Badge
                            variant="outline"
                            className={cn('text-xs', getComplexityColor(template.complexity))}
                          >
                            {template.complexity}
                          </Badge>
                        )}
                        {template.pricingTier && (
                          <Badge
                            variant="outline"
                            className={cn('text-xs', getPricingTierColor(template.pricingTier))}
                          >
                            {template.pricingTier}
                          </Badge>
                        )}
                      </div>

                      {/* Applications (truncated) */}
                      {template.applications && template.applications.length > 0 && (
                        <div className="text-[10px] text-amber-600/60 line-clamp-1">
                          {template.applications.slice(0, 2).join(', ')}
                          {template.applications.length > 2 && '...'}
                        </div>
                      )}
                    </CardContent>
                  </>
                ) : (
                  <>
                    {/* List View */}
                    <div className="w-24 bg-gray-950/50 border-r border-amber-600/20 flex items-center justify-center flex-shrink-0">
                      {renderGridPreview(template)}
                    </div>
                    <div className="flex-1 flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm font-semibold text-amber-200 flex items-center gap-2">
                            {template.icon && <span>{template.icon}</span>}
                            {template.title}
                          </CardTitle>
                          {isSelected && (
                            <div className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-xs text-amber-600/80">{template.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {template.complexity && (
                            <Badge
                              variant="outline"
                              className={cn('text-xs', getComplexityColor(template.complexity))}
                            >
                              {template.complexity}
                            </Badge>
                          )}
                          {template.pricingTier && (
                            <Badge
                              variant="outline"
                              className={cn('text-xs', getPricingTierColor(template.pricingTier))}
                            >
                              {template.pricingTier}
                            </Badge>
                          )}
                        </div>
                        {template.applications && template.applications.length > 0 && (
                          <div className="text-[10px] text-amber-600/60">
                            {template.applications.join(', ')}
                          </div>
                        )}
                      </CardContent>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};