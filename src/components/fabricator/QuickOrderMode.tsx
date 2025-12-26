/**
 * QuickOrderMode - Expert Workflow Interface
 * 
 * Streamlined interface for expert fabricators to create projects in 2-3 minutes:
 * - Template-based project creation
 * - Keyboard shortcuts
 * - Bulk operations
 * - Fast workflow optimization
 * 
 * @since Phase 1: Special Presets (Weeks 3-4)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { 
  Zap, 
  Save, 
  FolderOpen, 
  Copy,
  Trash2,
  Keyboard,
  CheckCircle2,
  Loader2,
  Plus,
  X
} from 'lucide-react';
import type { WindowUnit } from '@/types/fabricator';
import { QuickOrderEngine, type QuickOrderParams } from '@/lib/quick/QuickOrderEngine';
import { FabricatorTemplates, type FabricatorTemplate } from '@/lib/quick/FabricatorTemplates';
import { KeyboardShortcuts, getGlobalShortcuts } from '@/lib/quick/KeyboardShortcuts';
import { SYSTEM_PACKS } from '@/data/systemPacks';

interface QuickOrderModeProps {
  onOrderCreated?: (windowUnit: WindowUnit) => void;
  onCancel?: () => void;
}

export const QuickOrderMode: React.FC<QuickOrderModeProps> = ({
  onOrderCreated,
  onCancel
}) => {
  const [params, setParams] = useState<QuickOrderParams>({
    dimensions: { width: 1800, height: 1500 },
    systemPackId: 'rock60',
    windowType: 'sliding_window',
    color: 'Silver',
    glazingType: 'double',
    quantity: 1
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templates, setTemplates] = useState<FabricatorTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  const engine = useMemo(() => new QuickOrderEngine(), []);
  const templateManager = useMemo(() => new FabricatorTemplates(), []);
  const shortcuts = useMemo(() => getGlobalShortcuts(), []);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Setup keyboard shortcuts
  useEffect(() => {
    shortcuts.on('new_project', handleCreateOrder);
    shortcuts.on('load_template', () => {
      // Focus template selector
      const templateSelect = document.getElementById('template-select');
      templateSelect?.focus();
    });
    shortcuts.on('save_template', handleSaveAsTemplate);
    shortcuts.on('quick_save', handleCreateOrder);

    return () => {
      shortcuts.off('new_project');
      shortcuts.off('load_template');
      shortcuts.off('save_template');
      shortcuts.off('quick_save');
    };
  }, [params, selectedTemplate]);

  const loadTemplates = useCallback(async () => {
    const loaded = await templateManager.loadAllTemplates();
    setTemplates(loaded);
  }, [templateManager]);

  const handleCreateOrder = useCallback(async () => {
    setIsCreating(true);
    setError(null);
    setProcessingTime(null);

    try {
      const startTime = performance.now();
      const result = await engine.createQuickOrder({
        ...params,
        templateId: selectedTemplate || undefined
      });
      const elapsed = performance.now() - startTime;
      setProcessingTime(elapsed);

      if (onOrderCreated) {
        onOrderCreated(result.windowUnit);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
      console.error('Quick order creation error:', err);
    } finally {
      setIsCreating(false);
    }
  }, [params, selectedTemplate, engine, onOrderCreated]);

  const handleLoadTemplate = useCallback(async (templateId: string) => {
    const template = await templateManager.loadTemplate(templateId);
    if (template && template.windowUnit) {
      setSelectedTemplate(templateId);
      setParams(prev => ({
        ...prev,
        dimensions: {
          width: (template.windowUnit as any).overallWidth || prev.dimensions.width,
          height: (template.windowUnit as any).overallHeight || prev.dimensions.height
        },
        systemPackId: template.windowUnit.systemPackId || prev.systemPackId,
        windowType: template.windowUnit.type || prev.windowType,
        color: template.windowUnit.color || prev.color,
        glazingType: (template.windowUnit.glazing as any)?.type || prev.glazingType
      }));
    }
  }, [templateManager]);

  const handleSaveAsTemplate = useCallback(async () => {
    // Create a temporary window unit for template creation
    const tempUnit: WindowUnit = {
      id: 'temp',
      orderNumber: 'TEMP',
      posNumber: '1',
      type: params.windowType,
      components: [],
      overallWidth: params.dimensions.width,
      overallHeight: params.dimensions.height,
      color: params.color || 'Silver',
      glazing: { type: params.glazingType || 'double', thickness: 24 },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      systemPackId: params.systemPackId
    };

    const name = prompt('Template name:');
    if (!name) return;

    try {
      await templateManager.createTemplateFromWindowUnit(
        tempUnit,
        name,
        `Quick order template: ${params.dimensions.width}x${params.dimensions.height}mm`,
        'custom'
      );
      await loadTemplates();
      alert('Template saved!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  }, [params, templateManager, loadTemplates]);

  const quickDefaults = useMemo(() => {
    return engine.getQuickDefaults(params.systemPackId);
  }, [params.systemPackId, engine]);

  const availableSystemPacks = useMemo(() => {
    return SYSTEM_PACKS.map(pack => ({
      id: pack.meta.id,
      name: pack.meta.name
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Zap className="h-8 w-8 text-orange-500" />
              Quick Order Mode
            </h1>
            <p className="text-gray-400 mt-2">
              Expert workflow: Create projects in 2-3 minutes
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="flex items-center gap-2"
            >
              <Keyboard className="h-4 w-4" />
              Shortcuts
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        {showShortcuts && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Keyboard Shortcuts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {shortcuts.getShortcuts().map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-gray-300">{shortcut.description}</span>
                    <Badge variant="outline" className="bg-gray-800 text-gray-300 font-mono">
                      {shortcut.ctrl && 'Ctrl+'}
                      {shortcut.shift && 'Shift+'}
                      {shortcut.alt && 'Alt+'}
                      {shortcut.key}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Quick Parameters */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  Quick Parameters
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Essential parameters for fast order creation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template Selection */}
                <div className="space-y-2">
                  <Label className="text-gray-300">Template (Optional)</Label>
                  <Select
                    value={selectedTemplate || ''}
                    onValueChange={(value) => {
                      if (value) {
                        handleLoadTemplate(value);
                      } else {
                        setSelectedTemplate(null);
                      }
                    }}
                  >
                    <SelectTrigger id="template-select" className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Load from template..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="">None (New Order)</SelectItem>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} {template.category && `(${template.category})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templates.length === 0 && (
                    <p className="text-xs text-gray-500">
                      No templates saved. Create one with Ctrl+Shift+S
                    </p>
                  )}
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Width (mm)</Label>
                    <Input
                      type="number"
                      value={params.dimensions.width}
                      onChange={(e) => setParams({
                        ...params,
                        dimensions: { ...params.dimensions, width: Number(e.target.value) }
                      })}
                      className="bg-gray-800 border-gray-700 text-white"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Height (mm)</Label>
                    <Input
                      type="number"
                      value={params.dimensions.height}
                      onChange={(e) => setParams({
                        ...params,
                        dimensions: { ...params.dimensions, height: Number(e.target.value) }
                      })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>

                {/* System Pack */}
                <div className="space-y-2">
                  <Label className="text-gray-300">System Pack</Label>
                  <Select
                    value={params.systemPackId}
                    onValueChange={(value) => {
                      setParams({ ...params, systemPackId: value });
                      // Apply quick defaults
                      const defaults = engine.getQuickDefaults(value);
                      setParams(prev => ({ ...prev, ...defaults }));
                    }}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {availableSystemPacks.map(pack => (
                        <SelectItem key={pack.id} value={pack.id}>
                          {pack.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Window Type */}
                <div className="space-y-2">
                  <Label className="text-gray-300">Window Type</Label>
                  <Select
                    value={params.windowType}
                    onValueChange={(value) => setParams({ ...params, windowType: value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="sliding_window">Sliding Window</SelectItem>
                      <SelectItem value="casement">Casement</SelectItem>
                      <SelectItem value="tilt_turn">Tilt & Turn</SelectItem>
                      <SelectItem value="fixed_window">Fixed Window</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick Defaults Badge */}
                {quickDefaults && Object.keys(quickDefaults).length > 0 && (
                  <Alert className="bg-blue-900/20 border-blue-800">
                    <AlertDescription className="text-blue-300 text-sm">
                      Quick defaults applied: {Object.entries(quickDefaults).map(([key, value]) => 
                        `${key}: ${value}`
                      ).join(', ')}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Error */}
                {error && (
                  <Alert variant="destructive" className="bg-red-900/20 border-red-800">
                    <AlertDescription className="text-red-300">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Processing Time */}
                {processingTime !== null && (
                  <Alert className="bg-green-900/20 border-green-800">
                    <AlertDescription className="text-green-300 text-sm">
                      Order created in {processingTime.toFixed(0)}ms
                    </AlertDescription>
                  </Alert>
                )}

                {/* Create Button */}
                <Button
                  onClick={handleCreateOrder}
                  disabled={isCreating || !params.dimensions.width || !params.dimensions.height}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Create Order (Ctrl+N)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Templates & Actions */}
          <div className="space-y-6">
            {/* Recent Templates */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-orange-500" />
                  Recent Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">
                    No templates yet. Save your first template with Ctrl+Shift+S
                  </p>
                ) : (
                  <div className="space-y-2">
                    {templates.slice(0, 5).map(template => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-2 bg-gray-800/50 rounded hover:bg-gray-800 cursor-pointer"
                        onClick={() => handleLoadTemplate(template.id)}
                      >
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{template.name}</p>
                          <p className="text-gray-400 text-xs">
                            {template.category} • Used {template.usageCount || 0}x
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadTemplate(template.id);
                          }}
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleSaveAsTemplate}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Template (Ctrl+Shift+S)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    // Duplicate current params
                    setParams(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions }
                    }));
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate (Ctrl+D)
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};


