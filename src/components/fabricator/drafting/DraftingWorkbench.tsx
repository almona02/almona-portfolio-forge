// src/components/fabricator/drafting/DraftingWorkbench.tsx
import React, { useState, useCallback } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Ruler, Grid3x3, Box, CheckCircle, AlertTriangle } from 'lucide-react';
import { useDraftingEngine } from './hooks/useDraftingEngine';
import { DraftingCanvas2D } from './DraftingCanvas2D';
import { DraftingPreview3D } from './DraftingPreview3D';
import { DraftingToolbar } from './DraftingToolbar';
import { DraftingValidationGate } from './DraftingValidationGate';
import { DraftingContext } from './DraftingContext';
import type { ValidationResult, DraftingOutput, DraftingTool } from './types/drafting';

export const DraftingWorkbench: React.FC<{
  onDesignValidated: (output: DraftingOutput) => void;
  initialTemplate?: string;
}> = ({ onDesignValidated, initialTemplate }) => {
  const [activeTab, setActiveTab] = useState<'2d' | '3d' | 'validation'>('2d');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [selectedTool, setSelectedTool] = useState<DraftingTool>('select');
  
  const draftingEngine = useDraftingEngine({
    initialTemplate,
    onStateChange: useCallback((state) => {
      // Auto-save draft
      try {
        localStorage.setItem('almona-draft', JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to save draft:', e);
      }
    }, [])
  });

  // Constitutional Gate: Validate before execution
  const handleValidateForExecution = useCallback(async () => {
    const result = await draftingEngine.validateDesign();
    setValidationResult(result);
    setActiveTab('validation');
    
    if (result.valid && result.data) {
      // Convert to ALMONA execution format
      const executionReadyOutput: DraftingOutput = {
        geometry: draftingEngine.getGeometry(),
        dimensions: draftingEngine.getDimensions(),
        annotations: draftingEngine.getAnnotations(),
        template: result.data.template,
        suggestedSystemPack: result.data.suggestedSystemPack,
        metadata: {
          tier: 'Tier 0',
          draftingOnly: true,
          requiresValidation: true,
          timestamp: new Date().toISOString(),
          validationId: result.data.validationId,
          constitutionalNote: 'Passed Tier 1 validation, ready for Tier 3 execution'
        }
      };
      
      onDesignValidated(executionReadyOutput);
    }
  }, [draftingEngine, onDesignValidated]);

  return (
    <DraftingContext.Provider value={draftingEngine as any}>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ruler className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold">ALMONA Drafting Workbench</h1>
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                Tier 0 - Visual Drafting Only
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleValidateForExecution}
                disabled={!draftingEngine.hasGeometry()}
                className="flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Validate for ALMONA Execution
              </Button>
            </div>
          </div>
          
          <div className="mt-2">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                This is a visual drafting layer only. All designs must pass constitutional validation before manufacturing execution.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Toolbar */}
          <div className="w-16 border-r bg-white">
            <DraftingToolbar 
              selectedTool={selectedTool}
              onToolSelect={setSelectedTool}
            />
          </div>

          {/* Center - Canvas/Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-2">
                <TabsTrigger value="2d" className="flex items-center gap-2">
                  <Grid3x3 size={16} />
                  2D Drafting
                </TabsTrigger>
                <TabsTrigger value="3d" className="flex items-center gap-2">
                  <Box size={16} />
                  3D Preview
                </TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
              </TabsList>
              
              <TabsContent value="2d" className="flex-1 overflow-hidden m-0">
                <DraftingCanvas2D />
              </TabsContent>
              
              <TabsContent value="3d" className="flex-1 overflow-hidden m-0">
                <DraftingPreview3D />
              </TabsContent>
              
              <TabsContent value="validation" className="flex-1 overflow-auto m-0">
                <DraftingValidationGate
                  result={validationResult}
                  onFixIssues={() => {
                    setActiveTab('2d');
                    if (validationResult?.issues) {
                      draftingEngine.highlightIssues(validationResult.issues);
                    }
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Properties */}
          <div className="w-80 border-l bg-white p-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Properties</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Width</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={draftingEngine.getProperty('width')}
                        onChange={(e) => draftingEngine.setProperty('width', Number(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                      <span className="text-sm text-gray-500">mm</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Height</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={draftingEngine.getProperty('height')}
                        onChange={(e) => draftingEngine.setProperty('height', Number(e.target.value))}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                      <span className="text-sm text-gray-500">mm</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Egyptian Templates</h3>
                <select
                  value={draftingEngine.getActiveTemplate()}
                  onChange={(e) => draftingEngine.setTemplate(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select Template</option>
                  {draftingEngine.getAvailableTemplates().map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.rows}x{template.cols})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Dimensions</h3>
                <div className="text-sm space-y-1">
                  {draftingEngine.getDimensions().length > 0 ? (
                    draftingEngine.getDimensions().map((dim, i) => (
                      <div key={i} className="flex justify-between py-1">
                        <span className="text-gray-600">{dim.label}</span>
                        <span className="font-mono font-medium">{dim.value}mm</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-xs">No dimensions added yet</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Geometry Info</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rectangles:</span>
                    <span className="font-medium">{draftingEngine.getGeometry().rectangles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lines:</span>
                    <span className="font-medium">{draftingEngine.getGeometry().lines.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Points:</span>
                    <span className="font-medium">{draftingEngine.getGeometry().points.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DraftingContext.Provider>
  );
};

