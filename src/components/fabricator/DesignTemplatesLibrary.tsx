/**
 * Design Templates Library Component
 * 
 * Browse, save, and manage design templates
 * Prestige theme with luxury styling
 */

import {
  DesignTemplate,
  DesignTemplatesManager,
  TemplateStats,
  generateTemplateThumbnail
} from '@/lib/fabricator/DesignTemplatesManager';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select';
import { WindowUnit } from '@/types/fabricator';
import {
  AlertCircle,
  Clock,
  Copy,
  Grid,
  List,
  Save,
  Search,
  Star,
  Trash2,
  TrendingUp
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface DesignTemplatesLibraryProps {
  userId: string;
  currentDesign: WindowUnit | null;
  onLoadTemplate: (template: DesignTemplate) => void;
  onSaveTemplate?: (template: DesignTemplate) => void;
}

export const DesignTemplatesLibrary: React.FC<DesignTemplatesLibraryProps> = ({
  userId,
  currentDesign,
  onLoadTemplate,
  onSaveTemplate
}) => {
  const [manager] = useState(() => new DesignTemplatesManager(userId));
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [stats, setStats] = useState<TemplateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFormData, setSaveFormData] = useState({
    name: '',
    description: '',
    category: 'residential' as const,
    tags: ''
  });

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const allTemplates = await manager.getAllTemplates();
      setTemplates(allTemplates);
      const templateStats = await manager.getTemplateStats();
      setStats(templateStats);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!currentDesign || !saveFormData.name.trim()) {
      alert('Please enter a template name');
      return;
    }

    try {
      const thumbnail = generateTemplateThumbnail(currentDesign);
      const tags = saveFormData.tags.split(',').map(t => t.trim()).filter(t => t);

      const template = await manager.saveAsTemplate(
        saveFormData.name,
        saveFormData.description,
        currentDesign.grid,
        currentDesign.systemPackId || 'generic',
        saveFormData.category,
        thumbnail,
        tags,
        ''
      );

      if (template) {
        setTemplates([template, ...templates]);
        setShowSaveDialog(false);
        setSaveFormData({ name: '', description: '', category: 'residential', tags: '' });
        onSaveTemplate?.(template);
      }
    } catch (err) {
      console.error('Failed to save template:', err);
      alert('Failed to save template');
    }
  };

  const handleLoadTemplate = async (template: DesignTemplate) => {
    try {
      const loaded = await manager.loadTemplate(template.id);
      if (loaded) {
        onLoadTemplate(loaded);
      }
    } catch (err) {
      console.error('Failed to load template:', err);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const success = await manager.deleteTemplate(templateId);
      if (success) {
        setTemplates(templates.filter(t => t.id !== templateId));
        await loadTemplates();
      }
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const handleToggleFavorite = async (templateId: string) => {
    try {
      await manager.toggleFavorite(templateId);
      await loadTemplates();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDuplicateTemplate = async (template: DesignTemplate) => {
    try {
      const duplicated = await manager.duplicateTemplate(
        template.id,
        `${template.name} (Copy)`
      );
      if (duplicated) {
        setTemplates([duplicated, ...templates]);
      }
    } catch (err) {
      console.error('Failed to duplicate template:', err);
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 -xl shadow-premium card-glass-dark">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Grid className="h-5 w-5 text-amber-400" />
                Design Templates Library
              </CardTitle>
              <CardDescription>
                Save, manage, and reuse your favorite window designs
              </CardDescription>
            </div>
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button className="btn-primary">
                  <Save className="h-4 w-4 mr-2" />
                  Save Current Design
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50 shadow-premium">
                <DialogHeader>
                  <DialogTitle className="text-slate-100">Save Design as Template</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Create a reusable template from your current design
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="typography-label text-sm text-slate-300">Template Name *</Label>
                    <Input
                      placeholder="e.g., Modern Living Room Window"
                      value={saveFormData.name}
                      onChange={(e) => setSaveFormData({ ...saveFormData, name: e.target.value })}
                      className="border-slate-700/50 text-slate-100 mt-1 focus:border-amber- 500/30 card-premium"
                    />
                  </div>
                  <div>
                    <Label className="typography-label text-sm text-slate-300">Description</Label>
                    <Input
                      placeholder="Optional description"
                      value={saveFormData.description}
                      onChange={(e) => setSaveFormData({ ...saveFormData, description: e.target.value })}
                      className="border-slate-700/50 text-slate-100 mt-1 focus:border-amber- 500/30 card-premium"
                    />
                  </div>
                  <div>
                    <Label className="typography-label text-sm text-slate-300">Category</Label>
                    <Select value={saveFormData.category} onValueChange={(value: any) => setSaveFormData({ ...saveFormData, category: value })}>
                      <SelectTrigger className="border-slate-700/50 text-slate-100 mt-1 focus:border-amber- 500/30 card-premium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50">
                        <SelectItem value="residential" className="text-slate-200 focus:bg-slate-800/80 focus:text-amber-400">Residential</SelectItem>
                        <SelectItem value="commercial" className="text-slate-200 focus:bg-slate-800/80 focus:text-amber-400">Commercial</SelectItem>
                        <SelectItem value="industrial" className="text-slate-200 focus:bg-slate-800/80 focus:text-amber-400">Industrial</SelectItem>
                        <SelectItem value="custom" className="text-slate-200 focus:bg-slate-800/80 focus:text-amber-400">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="typography-label text-sm text-slate-300">Tags (comma-separated)</Label>
                    <Input
                      placeholder="e.g., modern, large, double-casement"
                      value={saveFormData.tags}
                      onChange={(e) => setSaveFormData({ ...saveFormData, tags: e.target.value })}
                      className="border-slate-700/50 text-slate-100 mt-1 focus:border-amber- 500/30 card-premium"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleSaveTemplate}
                      className="btn-primary"
                    >
                      Save Template
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowSaveDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-slate-900/60 -xl border-slate-700/50 shadow-card card-glass-dark">
            <CardContent className="p-4">
              <div className="text-xs text-slate-400 mb-1">Total Templates</div>
              <div className="text-2xl font-bold text-slate-100">{stats.totalTemplates}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/60 -xl border-slate-700/50 shadow-card card-glass-dark">
            <CardContent className="p-4">
              <div className="text-xs text-slate-400 mb-1">Favorites</div>
              <div className="text-2xl font-bold text-amber-400">{stats.favoriteCount}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/60 -xl border-slate-700/50 shadow-card card-glass-dark">
            <CardContent className="p-4">
              <div className="text-xs text-slate-400 mb-1">Most Used</div>
              <div className="text-sm font-bold text-slate-100 truncate">
                {stats.mostUsed?.name || 'N/A'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/60 -xl border-slate-700/50 shadow-card card-glass-dark">
            <CardContent className="p-4">
              <div className="text-xs text-slate-400 mb-1">By Category</div>
              <div className="text-sm font-bold text-slate-100">
                {Object.keys(stats.byCategory).length} categories
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filter */}
      <Card className="bg-slate-900/60 -xl border-slate-700/50 shadow-card card-glass-dark">
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-700/50 text-slate-100 focus:border-amber- 500/30 card-premium"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40 border-slate-700/50 text-slate-100 focus:border-amber- 500/30 card-premium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50">
                <SelectItem value="all" className="text-slate-200 focus:bg-slate-800/80 focus:text-amber-400">All Categories</SelectItem>
                <SelectItem value="residential" className="text-slate-200 focus:bg-slate-800/80 focus:text-amber-400">Residential</SelectItem>
                <SelectItem value="commercial" className="text-slate-200 focus:bg-slate-800/80 focus:text-amber-400">Commercial</SelectItem>
                <SelectItem value="industrial" className="text-slate-200 focus:bg-slate-800/80 focus:text-amber-400">Industrial</SelectItem>
                <SelectItem value="custom" className="text-slate-200 focus:bg-slate-800/80 focus:text-amber-400">Custom</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700 /50 card-dark">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid/List */}
      {loading ? (
        <Card className="bg-slate-900/60 -xl border-slate-700/50 shadow-card card-glass-dark">
          <CardContent className="p-8 text-center text-slate-400">
            Loading templates...
          </CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Alert className="bg-cyan-500/10 border-cyan-500/30">
          <AlertCircle className="h-4 w-4 text-cyan-400" />
          <AlertDescription className="text-sm text-cyan-300">
            No templates found. {templates.length === 0 ? 'Create your first template by saving a design.' : 'Try adjusting your search filters.'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="border-slate-700/50 hover:border-amber- 500/50 transition-all cursor-pointer group shadow-card hover:shadow-premium card-premium"
            >
              <CardContent className="p-4 space-y-3">
                {/* Thumbnail */}
                {template.thumbnail && (
                  <div className="w-full h-32 bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700 /50 card-dark">
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Template Info */}
                <div>
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="typography-h3 text-slate-100 text-sm group-hover:text-amber-400 transition-colors">
                      {template.name}
                    </h3>
                    <button
                      onClick={() => handleToggleFavorite(template.id)}
                      className="transition-colors"
                    >
                      <Star
                        className={`h-4 w-4 ${template.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{template.description}</p>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs border-slate-700/50 text-slate-300 bg-slate-800 /30 card-dark">
                    {template.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1 border-cyan-500/30 text-cyan-300 bg-cyan-500/10">
                    <TrendingUp className="h-3 w-3" />
                    {template.usageCount}
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1 border-slate-700/50 text-slate-400 bg-slate-800 /30 card-dark">
                    <Clock className="h-3 w-3" />
                    {template.createdAt.toLocaleDateString()}
                  </Badge>
                </div>

                {/* Tags */}
                {template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs bg-slate-800/50 text-slate-300 border-slate-700 /50 card-dark">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs bg-slate-800/50 text-slate-400 border-slate-700 /50 card-dark">
                        +{template.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                  <Button
                    size="sm"
                    onClick={() => handleLoadTemplate(template)}
                    className="flex-1 btn-primary-gradient font-semibold text-xs h-8"
                  >
                    Load
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicateTemplate(template)}
                    className="h-8 w-8 p-0 border-slate-700/50 text-slate-300 hover:bg-slate-800 /50 hover:text-amber-400 card-dark"
                    title="Duplicate"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="h-8 w-8 p-0 border-slate-700/50 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DesignTemplatesLibrary;
