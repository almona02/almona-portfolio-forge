import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Settings, Calculator, Plus, Trash2, AlertCircle, Box, FileText } from 'lucide-react';
import { WindowUnit, Profile, OptimizationResult, WindowComponent } from '@/types/fabricator';
import { Window3DGenerator } from './Window3DGenerator';
import { PDFExportService, CompanyBranding } from '@/modules/reporting';

interface TechnicalCalculatorProps {
  project: WindowUnit | null;
  onDesignComplete: (components: WindowComponent[]) => void;
  profiles: Profile[];
}

export const TechnicalCalculator: React.FC<TechnicalCalculatorProps> = ({ 
  project, 
  onDesignComplete, 
  profiles 
}) => {
  const [components, setComponents] = useState<WindowComponent[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [show3DPreview, setShow3DPreview] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Create updated project with current components for 3D preview
  const previewProject = useMemo<WindowUnit | null>(() => {
    if (!project) return null;
    
    return {
      ...project,
      components: components.length > 0 ? components : project.components,
      updatedAt: new Date()
    };
  }, [project, components]);

  if (!project) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-8 text-center">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Project Data</h3>
            <p className="text-gray-400">
              Please complete the measurement phase first to create a project.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profiles || profiles.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-8 text-center">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Profiles Available</h3>
            <p className="text-gray-400">
              Inventory data is not available. Please refresh the page or contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const addComponent = () => {
    if (!selectedProfile) {
      setError('Please select a profile before adding a component');
      return;
    }
    
    const profile = profiles.find(p => p.id === selectedProfile);
    if (!profile) {
      setError('Selected profile not found in inventory');
      return;
    }

    setError(null);

    const newComponent: WindowComponent = {
      id: `comp_${Date.now()}`,
      type: 'frame',
      profile,
      width: project?.overallWidth || 1200,
      height: project?.overallHeight || 1500,
      quantity: 1,
      cuttingLengths: [project?.overallWidth || 1200, project?.overallHeight || 1500],
      angles: [90, 90],
      machiningOperations: [],
      glazingType: 'double',
      hardware: []
    };

    setComponents(prev => [...prev, newComponent]);
  };

  const removeComponent = (id: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
  };

  const handleSubmit = () => {
    if (components.length === 0) {
      setError('Please add at least one component before generating the cutting plan');
      return;
    }

    setError(null);
    onDesignComplete(components);
  };

  const handleExportProjectSummary = async () => {
    if (!project) return;

    setIsGeneratingReport(true);
    setError(null);

    try {
      // Default branding - in production, this would come from user settings
      const branding: CompanyBranding = {
        companyName: 'Almona',
        primaryColor: '#FF6B35',
      };

      const pdfService = new PDFExportService(branding);
      
      // Create a simple project summary PDF (without quote)
      // Generate a basic project info PDF
      const summaryBlob = await pdfService.generateCuttingListPDF(
        project,
        {
          materialUsage: 0,
          wastePercentage: 0,
          estimatedProductionTime: 0,
          cuttingPlan: [],
          nestingEfficiency: 0,
          costBreakdown: {
            materialCost: 0,
            laborCost: 0,
            hardwareCost: 0,
            glazingCost: 0,
            totalCost: 0,
          },
        },
        { branding }
      );

      // Download the PDF
      const url = URL.createObjectURL(summaryBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `project_summary_${project.orderNumber}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Report export error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Component Builder */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-orange-400" />
              Component Specification
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShow3DPreview(!show3DPreview)}
              className="flex items-center gap-2"
            >
              <Box className="h-4 w-4" />
              {show3DPreview ? 'Hide' : 'Show'} 3D Preview
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-500">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Profile</label>
              <select 
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded"
              >
                <option value="">Choose profile...</option>
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} - {profile.material} ({profile.width}mm)
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={addComponent} disabled={!selectedProfile}>
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Components List */}
      {components.length > 0 && (
        <Card className="bg-gray-700/50 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-orange-400" />
              Window Components
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {components.map((component, index) => (
                <div key={component.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <div className="font-medium">{component.profile.name}</div>
                      <div className="text-sm text-gray-400">
                        {component.width}mm × {component.height}mm
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeComponent(component.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time 3D Preview */}
      {show3DPreview && previewProject && (
        <Card className="bg-gray-700/50 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="h-5 w-5 text-orange-400" />
              Real-time 3D Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-600">
              <Window3DGenerator 
                windowUnit={previewProject}
                showControls={true}
                presentationMode={false}
                showErrorDetection={true}
                profiles={profiles}
                onModelUpdate={(model) => {
                  // Optional: Handle model updates for error detection
                  console.log('3D model updated:', model);
                }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2 text-center">
              The 3D model updates automatically as you add or modify components
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button
          onClick={handleExportProjectSummary}
          disabled={isGeneratingReport || !project}
          variant="outline"
        >
          {isGeneratingReport ? (
            <>
              <FileText className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Export Project Summary
            </>
          )}
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={components.length === 0}
          className="bg-orange-500 hover:bg-orange-600"
        >
          Generate Cutting Plan
        </Button>
      </div>
    </div>
  );
};
