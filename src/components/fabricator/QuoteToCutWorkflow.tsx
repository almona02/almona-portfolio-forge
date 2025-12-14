/**
 * Quote-to-Cut Workflow - Unified 4-Step Workflow
 * Orchestrates the complete flow from project setup to quote generation
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import type { Profile, WindowComponent, WindowUnit } from '@/types/fabricator';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { LiveCostConsole } from './LiveCostConsole';
import { NewProjectWizard, type ProjectHeaderMeta } from './NewProjectWizard';
import { ProjectCockpit, getProjectTypeConfig, type ProjectType } from './ProjectCockpit';
import { SmartDrawTool } from './SmartDrawTool';
import { SystemDrivenDesign } from './SystemDrivenDesign';

type WorkflowStep = 1 | 2 | 3 | 4;

interface QuoteToCutWorkflowProps {
  onComplete: (project: WindowUnit, components: WindowComponent[]) => void;
  profiles: Profile[];
  userId?: string;
}

export const QuoteToCutWorkflow: React.FC<QuoteToCutWorkflowProps> = ({
  onComplete,
  profiles,
  userId,
}) => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);
  const [projectType, setProjectType] = useState<ProjectType | undefined>();
  const [projectMeta, setProjectMeta] = useState<ProjectHeaderMeta | null>(null);
  const [selectedSystemPackId, setSelectedSystemPackId] = useState<string>('');
  const [designMode, setDesignMode] = useState<'system' | 'freeform'>('system');
  const [components, setComponents] = useState<WindowComponent[]>([]);
  const [showProjectWizard, setShowProjectWizard] = useState(false);

  const projectTypeConfig = projectType ? getProjectTypeConfig(projectType) : undefined;

  // Pre-select system pack based on project type
  React.useEffect(() => {
    if (projectTypeConfig && projectTypeConfig.suggestedSystems.length > 0) {
      const suggestedSystem = projectTypeConfig.suggestedSystems[0];
      const pack = SYSTEM_PACKS.find(
        (p) =>
          p.meta.id === suggestedSystem.toUpperCase() ||
          p.meta.name.toUpperCase().includes(suggestedSystem.toUpperCase())
      );
      if (pack) {
        setSelectedSystemPackId(pack.meta.id);
      }
    }
  }, [projectType, projectTypeConfig]);

  const handleStep1Complete = (type: ProjectType) => {
    setProjectType(type);
    setShowProjectWizard(true);
  };

  const handleProjectWizardSubmit = (meta: ProjectHeaderMeta) => {
    setProjectMeta(meta);
    setShowProjectWizard(false);
    setCurrentStep(2);
  };

  const handleSystemDesignGenerate = (generatedComponents: WindowComponent[]) => {
    setComponents(generatedComponents);
    setCurrentStep(3);
  };

  const handleSmartDrawApply = (payload: { components: WindowComponent[] }) => {
    setComponents(payload.components);
    setCurrentStep(3);
  };

  const handleGenerateQuote = () => {
    if (!projectMeta || components.length === 0) return;

    // Calculate overall dimensions from components
    let maxWidth = 0;
    let maxHeight = 0;
    components.forEach(comp => {
      if (comp.width > maxWidth) maxWidth = comp.width;
      if (comp.height > maxHeight) maxHeight = comp.height;
    });

    // Create a basic WindowUnit from the workflow data
    const project: WindowUnit = {
      id: `project-${Date.now()}`,
      orderNumber: projectMeta.orderNumber || `ORD-${Date.now()}`,
      posNumber: '1', // Default position number
      type: 'window',
      overallWidth: maxWidth || 1200,
      overallHeight: maxHeight || 1200,
      color: 'Silver', // Default color
      glazing: {
        type: 'double',
        thickness: 24,
      },
      hardware: [],
      status: 'design',
      optimization: null,
      customer: projectMeta.clientName,
      components,
      systemPackId: selectedSystemPackId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onComplete(project, components);
  };

  const canProceedToStep2 = projectType !== undefined && projectMeta !== null;
  const canProceedToStep3 = components.length > 0;
  const canGenerateQuote = canProceedToStep3 && projectMeta !== null;

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">Step {currentStep} of 4</span>
              <Progress value={(currentStep / 4) * 100} className="flex-1 max-w-xs" />
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-2 w-2 rounded-full ${
                    step <= currentStep
                      ? 'bg-orange-500'
                      : step === currentStep + 1
                        ? 'bg-orange-500/50'
                        : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {currentStep === 1 && 'Select project type'}
            {currentStep === 2 && 'Design your window'}
            {currentStep === 3 && 'Review costs & optimize'}
            {currentStep === 4 && 'Generate quote'}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Project Cockpit */}
      {currentStep === 1 && (
        <ProjectCockpit
          selectedType={projectType}
          onSelectType={handleStep1Complete}
        />
      )}

      {/* Project Wizard Modal */}
      <NewProjectWizard
        open={showProjectWizard}
        onOpenChange={setShowProjectWizard}
        onSubmit={handleProjectWizardSubmit}
      />

      {/* Step 2: Design Canvas */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Design Mode Toggle */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <Button
                    variant={designMode === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDesignMode('system')}
                    className={designMode === 'system' ? 'bg-orange-500' : ''}
                  >
                    System-Driven (Fast)
                  </Button>
                  <Button
                    variant={designMode === 'freeform' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDesignMode('freeform')}
                    className={designMode === 'freeform' ? 'bg-orange-500' : ''}
                  >
                    Freeform (Custom)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Design Component */}
            {designMode === 'system' ? (
              <SystemDrivenDesign
                selectedSystemPackId={selectedSystemPackId}
                onSystemPackChange={setSelectedSystemPackId}
                onGenerate={handleSystemDesignGenerate}
              />
            ) : (
              <SmartDrawTool
                project={null}
                profiles={profiles}
                onApplyLayout={(payload) => {
                  if (payload.components && payload.components.length > 0) {
                    handleSmartDrawApply({ components: payload.components });
                  }
                }}
              />
            )}
          </div>

          {/* Live Cost Console Sidebar */}
          <div className="lg:col-span-1">
            <LiveCostConsole
              components={components}
              profiles={profiles}
              currency={projectMeta?.currency || 'EGP'}
              userId={userId}
            />
          </div>
        </div>
      )}

      {/* Step 3: Review & Optimize */}
      {currentStep === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle>Review Your Design</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">
                    {components.length} component{components.length !== 1 ? 's' : ''} generated
                  </p>
                  <div className="space-y-1">
                    {components.map((comp) => (
                      <div
                        key={comp.id}
                        className="text-xs bg-gray-900 p-2 rounded flex justify-between"
                      >
                        <span>{comp.type}</span>
                        <span>
                          {((comp.cuttingLengths?.[0] || 0) / 1000).toFixed(2)}m ×{' '}
                          {comp.quantity || 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <LiveCostConsole
              components={components}
              profiles={profiles}
              currency={projectMeta?.currency || 'EGP'}
              userId={userId}
            />
          </div>
        </div>
      )}

      {/* Step 4: Generate Quote */}
      {currentStep === 4 && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle>Ready to Generate Quote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>All steps completed successfully</span>
              </div>
              <Button
                onClick={handleGenerateQuote}
                className="w-full bg-orange-500 hover:bg-orange-600"
                size="lg"
              >
                Generate Quote & Cutting Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1) as WorkflowStep)}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={() => {
            if (currentStep === 1 && canProceedToStep2) {
              setCurrentStep(2);
            } else if (currentStep === 2 && canProceedToStep3) {
              setCurrentStep(3);
            } else if (currentStep === 3 && canGenerateQuote) {
              setCurrentStep(4);
            }
          }}
          disabled={
            (currentStep === 1 && !canProceedToStep2) ||
            (currentStep === 2 && !canProceedToStep3) ||
            (currentStep === 3 && !canGenerateQuote) ||
            currentStep === 4
          }
          className="bg-orange-500 hover:bg-orange-600"
        >
          {currentStep === 4 ? 'Complete' : 'Next'}
          {currentStep < 4 && <ChevronRight className="h-4 w-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
};

