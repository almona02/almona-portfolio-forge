/**
 * OnboardingWizard - 5-Step Onboarding Wizard
 * 
 * Structured onboarding for new workshops:
 * 1. Workshop Profile
 * 2. Material Suppliers
 * 3. System Pack Selection
 * 4. Sample Project Import
 * 5. Guided First Project
 * 
 * @since Phase 5: Pre-Pilot Hardening (Week 26)
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Step1WorkshopProfile } from './steps/Step1WorkshopProfile';
import { Step2MaterialSuppliers } from './steps/Step2MaterialSuppliers';
import { Step3SystemPacks } from './steps/Step3SystemPacks';
import { Step4SampleProjects } from './steps/Step4SampleProjects';
import { Step5GuidedProject } from './steps/Step5GuidedProject';
import { CheckCircle2, Circle } from 'lucide-react';

export interface OnboardingData {
  workshopProfile: {
    name: string;
    location: 'Cairo' | 'Alexandria' | 'Upper_Egypt' | 'Other';
    size: 'small' | 'medium' | 'large';
    specialization: string[];
    machines: string[];
    primaryMaterial: 'aluminum' | 'upvc' | 'both';
  };
  suppliers: {
    aluminum: Array<{ name: string; contact: string }>;
    upvc: Array<{ name: string; contact: string }>;
    glass: Array<{ name: string; contact: string }>;
    hardware: Array<{ name: string; contact: string }>;
  };
  systemPack: string;
  sampleProject: string | null;
  firstProject: {
    completed: boolean;
    projectId: string | null;
  };
}

interface OnboardingWizardProps {
  onComplete?: (data: OnboardingData) => void;
  onSkip?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    workshopProfile: {
      name: '',
      location: 'Cairo',
      size: 'medium',
      specialization: [],
      machines: [],
      primaryMaterial: 'aluminum'
    },
    suppliers: {
      aluminum: [],
      upvc: [],
      glass: [],
      hardware: []
    },
    systemPack: '',
    sampleProject: null,
    firstProject: {
      completed: false,
      projectId: null
    }
  });

  const steps = [
    { id: 1, title: 'Workshop Profile', component: Step1WorkshopProfile },
    { id: 2, title: 'Material Suppliers', component: Step2MaterialSuppliers },
    { id: 3, title: 'System Pack', component: Step3SystemPacks },
    { id: 4, title: 'Sample Projects', component: Step4SampleProjects },
    { id: 5, title: 'First Project', component: Step5GuidedProject }
  ];

  const updateData = (stepData: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...stepData }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete?.(onboardingData);
    // Mark onboarding as complete
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('onboarding_data', JSON.stringify(onboardingData));
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-900 border-gray-800 card-dark">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to Almona Portfolio Forge</CardTitle>
            <p className="text-gray-400">Let's get you set up in just 5 steps (15 minutes)</p>
          </CardHeader>
          <CardContent>
            {/* Progress Indicator */}
            <div className="flex justify-between mb-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      index < currentStep
                        ? 'bg-green-600 text-white'
                        : index === currentStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {index < currentStep ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <Circle className="h-6 w-6" />
                      )}
                    </div>
                    <div className={`text-xs mt-2 text-center ${
                      index <= currentStep ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`h-1 flex-1 mx-2 ${
                      index < currentStep ? 'bg-green-600' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="mb-6">
              <CurrentStepComponent
                data={onboardingData}
                onUpdate={updateData}
              />
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <div>
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    className="bg-gray-800 border-gray-700"
                  >
                    Previous
                  </Button>
                )}
                {onSkip && (
                  <Button
                    variant="ghost"
                    onClick={onSkip}
                    className="ml-4 text-gray-400"
                  >
                    Skip Onboarding
                  </Button>
                )}
              </div>
              <Button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

