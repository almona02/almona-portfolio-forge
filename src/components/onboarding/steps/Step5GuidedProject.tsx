/**
 * Step5GuidedProject - Guided First Project
 * 
 * Interactive tutorial for creating first project
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { OnboardingData } from '../OnboardingWizard';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface Step5GuidedProjectProps {
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
}

const GUIDED_STEPS = [
  { id: 1, title: 'Open Smart Wizard', description: 'Click "New Project" to start' },
  { id: 2, title: 'Select Project Type', description: 'Choose Residential, Commercial, or Industrial' },
  { id: 3, title: 'Set Location', description: 'Select your location for smart defaults' },
  { id: 4, title: 'Set Dimensions', description: 'Use the visual size picker' },
  { id: 5, title: 'Review & Customize', description: 'Review smart defaults and customize if needed' },
  { id: 6, title: 'Generate Window', description: 'Click "Create" to generate your window' }
];

export const Step5GuidedProject: React.FC<Step5GuidedProjectProps> = ({
  data,
  onUpdate
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const markStepComplete = (stepIndex: number) => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepIndex);
    setCompletedSteps(newCompleted);
    
    if (stepIndex === GUIDED_STEPS.length - 1) {
      onUpdate({
        firstProject: {
          completed: true,
          projectId: 'sample-project-1'
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="typography-h3 text-lg mb-4">Create Your First Project</h3>
        <p className="text-gray-400 mb-6">Follow these steps to create your first window project</p>
      </div>

      <div className="space-y-4">
        {GUIDED_STEPS.map((step, index) => (
          <Card
            key={step.id}
            className={`bg-gray-800 border-gray-700 ${
              completedSteps.has(index) ? 'border-green-600' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    completedSteps.has(index)
                      ? 'bg-green-600'
                      : index === currentStep
                      ? 'bg-blue-600'
                      : 'bg-gray-700'
                  }`}>
                    {completedSteps.has(index) ? (
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    ) : (
                      <span className="text-white">{step.id}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{step.title}</div>
                    <div className="text-sm text-gray-400">{step.description}</div>
                  </div>
                </div>
                {index === currentStep && !completedSteps.has(index) && (
                  <Button
                    size="sm"
                    onClick={() => {
                      markStepComplete(index);
                      if (index < GUIDED_STEPS.length - 1) {
                        setCurrentStep(index + 1);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Complete Step
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.firstProject.completed && (
        <div className="p-4 bg-green-900/20 border border-green-600 rounded-lg">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Congratulations! Your first project is complete.</span>
          </div>
        </div>
      )}
    </div>
  );
};

