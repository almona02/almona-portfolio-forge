/**
 * TemplateGallery - Template management and selection interface
 * Week 3: Enterprise Automation & Customization
 * 
 * Features:
 * - Browse and search templates
 * - Create and edit custom templates
 * - Apply templates to exports
 * - Template versioning and sharing
 * - Template performance analytics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Badge } from '@/shared/ui/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Copy,
  Star,
  FileText,
  Download,
  Upload,
  CheckCircle
} from 'lucide-react';
import { templateManager } from '@/lib/exports/TemplateManager';
import { ExportTemplate, ExportFormat, ExportOptions } from '@/lib/exports/types';

interface TemplateGalleryProps {
  onTemplateSelect?: (templateId: string) => void;
  selectedFormat?: ExportFormat;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  onTemplateSelect,
  selectedFormat
}) => {
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<ExportFormat | 'all'>(
    selectedFormat || 'all'
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExportTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    let filtered = templateManager.getAllTemplates();

    // Filter by format
    if (selectedFormatFilter !== 'all') {
      filtered = filtered.filter(t => t.format === selectedFormatFilter);
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.type === selectedType);
    }

    // Search filter
    if (searchQuery) {
      filtered = templateManager.searchTemplates(searchQuery);
      // Apply other filters to search results
      if (selectedFormatFilter !== 'all') {
        filtered = filtered.filter(t => t.format === selectedFormatFilter);
      }
      if (selectedType !== 'all') {
        filtered = filtered.filter(t => t.type === selectedType);
      }
    }

    setTemplates(filtered);
  };

  useEffect(() => {
    loadTemplates();
  }, [searchQuery, selectedType, selectedFormatFilter]);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setIsCreateDialogOpen(true);
  };

  const handleEditTemplate = (template: ExportTemplate) => {
    setEditingTemplate(template);
    setIsCreateDialogOpen(true);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      templateManager.deleteTemplate(templateId);
      loadTemplates();
    }
  };

  const handleDuplicateTemplate = (templateId: string) => {
    const duplicated = templateManager.duplicateTemplate(templateId);
    if (duplicated) {
      loadTemplates();
    }
  };

  const handleSetDefault = (templateId: string, format: ExportFormat) => {
    templateManager.setDefaultTemplate(templateId, format);
    loadTemplates();
  };

  const handleSelectTemplate = (templateId: string) => {
    if (onTemplateSelect) {
      onTemplateSelect(templateId);
    }
  };

  const getTypeColor = (type: ExportTemplate['type']): string => {
    const colors: Record<ExportTemplate['type'], string> = {
      basic: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
      minimal: 'bg-gray-100 text-gray-800',
      'client-facing': 'bg-green-100 text-green-800',
      workshop: 'bg-orange-100 text-orange-800',
      'multi-language': 'bg-indigo-100 text-indigo-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getFormatIcon = (format: ExportFormat) => {
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Gallery</h2>
          <p className="text-muted-foreground">
            Manage and apply report templates for consistent formatting
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="client-facing">Client-Facing</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="multi-language">Multi-Language</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={selectedFormatFilter} 
              onValueChange={(v) => setSelectedFormatFilter(v as ExportFormat | 'all')}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="dxf">DXF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {template.description}
                  </CardDescription>
                </div>
                {template.isDefault && (
                  <Badge variant="default" className="ml-2">
                    Default
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getTypeColor(template.type)}>
                    {template.type}
                  </Badge>
                  <Badge variant="outline">
                    {getFormatIcon(template.format)}
                    <span className="ml-1">{template.format.toUpperCase()}</span>
                  </Badge>
                  {template.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{template.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>Version: {template.version}</p>
                  <p>Used: {template.usageCount || 0} times</p>
                  <p>Updated: {new Date(template.updatedAt).toLocaleDateString()}</p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleSelectTemplate(template.id)}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateTemplate(template.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {!template.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => handleSetDefault(template.id, template.format)}
                  >
                    Set as Default
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No templates found</p>
            <Button onClick={handleCreateTemplate} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Template Dialog */}
      <TemplateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        template={editingTemplate}
        onSave={() => {
          loadTemplates();
          setIsCreateDialogOpen(false);
        }}
      />
    </div>
  );
};

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ExportTemplate | null;
  onSave: () => void;
}

const TemplateDialog: React.FC<TemplateDialogProps> = ({
  open,
  onOpenChange,
  template,
  onSave
}) => {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [type, setType] = useState<ExportTemplate['type']>(template?.type || 'basic');
  const [format, setFormat] = useState<ExportFormat>(template?.format || 'pdf');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setType(template.type);
      setFormat(template.format);
    } else {
      setName('');
      setDescription('');
      setType('basic');
      setFormat('pdf');
    }
  }, [template, open]);

  const handleSave = () => {
    if (!name || !description) {
      alert('Please fill in all required fields');
      return;
    }

    const defaultOptions: ExportOptions = {
      includeQRCode: true,
      includeDiagrams: true,
      includeMetadata: true
    };

    if (template) {
      templateManager.updateTemplate(template.id, {
        name,
        description,
        type,
        format,
        options: defaultOptions
      });
    } else {
      templateManager.createTemplate(
        name,
        description,
        type,
        format,
        defaultOptions,
        undefined,
        'user'
      );
    }

    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
          <DialogDescription>
            {template 
              ? 'Update template settings and options'
              : 'Create a new report template with custom settings'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Premium Client Report"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the template's purpose and use case"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Template Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ExportTemplate['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="client-facing">Client-Facing</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="multi-language">Multi-Language</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="dxf">DXF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {template ? 'Update Template' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

