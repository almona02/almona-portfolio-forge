import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Input } from '@/shared/ui/ui/input';
import { Settings, Calculator, Plus, Trash2, AlertCircle, Box, FileText } from 'lucide-react';
import { WindowUnit, Profile, WindowComponent } from '@/types/fabricator';
import { Window3DGenerator } from './Window3DGenerator';
import { PDFExportService } from '@/modules/reporting';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { validateWindowComponent } from '@/lib/fabricatorValidation';

interface TechnicalCalculatorProps {
  project: WindowUnit | null;
  onDesignComplete: (components: WindowComponent[]) => void;
  profiles: Profile[];
}

export const TechnicalCalculator: React.FC<TechnicalCalculatorProps> = ({
  project,
  onDesignComplete,
  profiles,
}) => {
  const [components, setComponents] = useState<WindowComponent[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [show3DPreview, setShow3DPreview] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const { branding } = useCompanyBranding();

  useEffect(() => {
    // When reopening a project that already has components, seed them into the editor
    if (project && project.components && project.components.length > 0 && components.length === 0) {
      setComponents(project.components);
    }
  }, [project, components.length]);

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

    const specs = profile.specifications || {};
    const isMiter45 =
      specs.cuttingType === 'miter_45' || specs.optimizedFor45Degree === true;

    const newComponent: WindowComponent = {
      id: `comp_${Date.now()}`,
      type: 'frame',
      profile,
      width: project?.overallWidth || 1200,
      height: project?.overallHeight || 1500,
      quantity: 1,
      cuttingLengths: [project?.overallWidth || 1200, project?.overallHeight || 1500],
      // For ROCK 60 / ELSHERIF 45°-optimized profiles, default to 45° miter cuts
      angles: isMiter45 ? [45, 45] : [90, 90],
      machiningOperations: [],
      glazingType: 'double',
      hardware: []
    };

    setComponents(prev => [...prev, newComponent]);
  };

  const applyRock60Template = () => {
    if (!project) {
      setError('Project data is missing. Please complete the measuring step first.');
      return;
    }

    if (!profiles || profiles.length === 0) {
      setError('No profiles available in inventory to apply ROCK 60 template.');
      return;
    }

    const baseRockProfile =
      profiles.find((p) => p.specifications && (p.specifications as any).rock60_45_degree_config) ||
      profiles.find(
        (p) =>
          p.systemBrand === 'ROCK 60' ||
          (p.specifications && (p.specifications as any).window_system === 'ROCK 60')
      );

    if (!baseRockProfile) {
      setError('ROCK 60 template profile not found in inventory.');
      return;
    }

    const L = project.overallWidth;
    const H = project.overallHeight;

    const frameProfile: Profile = {
      ...baseRockProfile,
      specifications: {
        ...(baseRockProfile.specifications || {}),
        profileRole: 'frame',
      },
    };

    const sashProfile: Profile = {
      ...baseRockProfile,
      specifications: {
        ...(baseRockProfile.specifications || {}),
        profileRole: 'sash',
      },
    };

    const beadProfile: Profile = {
      ...baseRockProfile,
      specifications: {
        ...(baseRockProfile.specifications || {}),
        profileRole: 'glazing_bead',
      },
    };

    const now = Date.now();

    const templateComponents: WindowComponent[] = [
      {
        id: `rock60_frame_${now}`,
        type: 'frame',
        profile: frameProfile,
        width: L,
        height: H,
        quantity: 1,
        // 2 × (L + 60), 2 × (H + 60)
        cuttingLengths: [L + 60, L + 60, H + 60, H + 60],
        angles: [45, 45, 45, 45],
        machiningOperations: [],
        glazingType: 'double',
        hardware: [],
      },
      {
        id: `rock60_sash_${now}`,
        type: 'sash',
        profile: sashProfile,
        width: L,
        height: H,
        quantity: 1,
        // 2 × (L - 44), 2 × (H - 44)
        cuttingLengths: [L - 44, L - 44, H - 44, H - 44],
        angles: [45, 45, 45, 45],
        machiningOperations: [],
        glazingType: 'double',
        hardware: [],
      },
      {
        id: `rock60_bead_${now}`,
        type: 'glazing_bead',
        profile: beadProfile,
        width: L,
        height: H,
        quantity: 1,
        // 2 × (L - 167), 2 × (H - 205)
        cuttingLengths: [L - 167, L - 167, H - 205, H - 205],
        angles: [45, 45, 45, 45],
        machiningOperations: [],
        glazingType: 'double',
        hardware: [],
      },
    ];

    setError(null);
    setComponents(templateComponents);
  };

  const removeComponent = (id: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
  };

  const handleSubmit = () => {
    if (components.length === 0) {
      setError('Please add at least one component before generating the cutting plan');
      return;
    }

    // Per-component validation with precise feedback
    for (const comp of components) {
      const validation = validateWindowComponent(comp, profiles);
      if (!validation.isValid) {
        setError(
          `Component "${comp.profile.name}" is invalid: ${validation.errors
            .map((e) => e.message)
            .join(', ')}`,
        );
        return;
      }
    }

    setError(null);
    onDesignComplete(components);
  };

  const handleExportProjectSummary = async () => {
    if (!project) return;

    setIsGeneratingReport(true);
    setError(null);

    try {
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
          
          <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
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
            <div className="flex gap-2">
              <Button onClick={addComponent} disabled={!selectedProfile}>
                <Plus className="h-4 w-4 mr-2" />
                Add Component
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                onClick={applyRock60Template}
              >
                Apply ROCK 60 45° Template
              </Button>
            </div>
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
              {components.map((component, index) => {
                const allowance = component.profile.cuttingAllowance ?? 0;
                const cutPreview =
                  component.cuttingLengths && component.cuttingLengths.length > 0
                    ? component.cuttingLengths
                        .map((len) => `${len.toFixed(0)} → ${(len + allowance).toFixed(0)} mm`)
                        .join(' | ')
                    : 'No cutting lengths defined';

                return (
                  <div
                    key={component.id}
                    className="p-3 bg-gray-800 rounded space-y-2 border border-gray-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div>
                          <div className="font-medium text-sm">{component.profile.name}</div>
                          <div className="text-[11px] text-gray-400">
                            Role: {(component as any).type ?? 'frame'}
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

                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <div className="text-gray-300 mb-1">Width (mm)</div>
                        <Input
                          type="number"
                          value={component.width}
                          onChange={(e) => {
                            const value = Number(e.target.value) || 0;
                            setComponents((prev) =>
                              prev.map((c) =>
                                c.id === component.id ? { ...c, width: value } : c,
                              ),
                            );
                          }}
                          className="h-7 bg-gray-900 border-gray-700 text-xs"
                        />
                      </div>
                      <div>
                        <div className="text-gray-300 mb-1">Height (mm)</div>
                        <Input
                          type="number"
                          value={component.height}
                          onChange={(e) => {
                            const value = Number(e.target.value) || 0;
                            setComponents((prev) =>
                              prev.map((c) =>
                                c.id === component.id ? { ...c, height: value } : c,
                              ),
                            );
                          }}
                          className="h-7 bg-gray-900 border-gray-700 text-xs"
                        />
                      </div>
                      <div>
                        <div className="text-gray-300 mb-1">Quantity</div>
                        <Input
                          type="number"
                          min={1}
                          value={component.quantity ?? 1}
                          onChange={(e) => {
                            const value = Math.max(1, Number(e.target.value) || 1);
                            setComponents((prev) =>
                              prev.map((c) =>
                                c.id === component.id ? { ...c, quantity: value } : c,
                              ),
                            );
                          }}
                          className="h-7 bg-gray-900 border-gray-700 text-xs"
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-300 mt-1">
                      <span className="font-semibold">Cuts (design → saw length): </span>
                      <span className="text-gray-200">{cutPreview}</span>
                      {allowance !== 0 && (
                        <span className="text-gray-500 ml-1">
                          (allowance {allowance.toFixed(0)} mm per cut)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
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
