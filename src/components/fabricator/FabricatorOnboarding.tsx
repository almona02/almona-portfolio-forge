/**
 * FabricatorOnboarding Component
 * ---------------------------------------------------------------------------
 * 4-step onboarding tutorial for first-time Fabricator users
 * 
 * Steps:
 * 1. Smart Measuring (2:30)
 * 2. AI-Powered Design (3:45)
 * 3. Cutting Optimization (4:15)
 * 4. CNC Export (2:45)
 * 
 * Features:
 * - Progress indicator
 * - Video player integration
 * - Skip/Complete functionality
 * - localStorage persistence
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle2, Play, SkipForward } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Progress } from '@/shared/ui/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Dialog, DialogContent } from '@/shared/ui/ui/dialog';
import { OnboardingVideoPlayer } from './OnboardingVideoPlayer';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import {
  SmartMeasuringDemo,
  AIDesignDemo,
  OptimizationDemo,
  CNCExportDemo,
} from './onboarding/OnboardingStepDemos';
import {
  trackOnboardingStarted,
  trackOnboardingStepViewed,
  trackOnboardingStepCompleted,
  trackOnboardingCompleted,
  trackOnboardingSkipped,
  trackOnboardingVideoPlayed,
  trackOnboardingVideoCompleted,
} from '@/lib/analytics/onboardingAnalytics';

// Wrapper component to handle video analytics
const OnboardingVideoPlayerWrapper: React.FC<{
  videoUrl: string;
  posterUrl?: string;
  title?: string;
  stepId: string;
  stepNumber: number;
  onVideoEnd: () => void;
  className?: string;
}> = ({ videoUrl, posterUrl, title, stepId, stepNumber, onVideoEnd, className }) => {
  const handleVideoEnd = (duration?: number) => {
    if (duration) {
      trackOnboardingVideoCompleted(stepId, stepNumber, duration);
    }
    onVideoEnd();
  };

  const handlePlay = () => {
    trackOnboardingVideoPlayed(stepId, stepNumber);
  };

  return (
    <OnboardingVideoPlayer
      videoUrl={videoUrl}
      posterUrl={posterUrl}
      title={title}
      onVideoEnd={handleVideoEnd}
      onPlay={handlePlay}
      className={className}
    />
  );
};

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  posterUrl?: string;
  duration: string;
  targetElement?: string; // CSS selector for highlighting
  component?: React.ComponentType; // Interactive demo
}

const ONBOARDING_STORAGE_KEY = 'fabricator_onboarding_completed';
const ONBOARDING_PROGRESS_KEY = 'fabricator_onboarding_progress';

export interface FabricatorOnboardingProps {
  /** Whether onboarding is open */
  open: boolean;
  /** Callback when onboarding is closed */
  onClose: () => void;
  /** Callback when onboarding is completed */
  onComplete?: () => void;
  /** Custom steps (optional, uses default if not provided) */
  steps?: OnboardingStep[];
  /** Skip onboarding button text */
  skipText?: string;
  /** Show skip button */
  showSkip?: boolean;
}

// Default steps with interactive demos
// Helper to get default steps with i18n support
const getDefaultSteps = (t: (key: string, defaultValue?: string) => string): OnboardingStep[] => [
  {
    id: 'measuring',
    title: t('onboarding.steps.measuring.title', 'Smart Measuring'),
    description: t('onboarding.steps.measuring.description', 'Learn how to use our AI-powered measuring tools to quickly and accurately measure window dimensions. Our smart measuring interface guides you through the process step by step.'),
    duration: '2:30',
    // videoUrl: '/videos/onboarding/measuring.mp4', // Placeholder - videos to be added
    component: SmartMeasuringDemo,
  },
  {
    id: 'design',
    title: t('onboarding.steps.design.title', 'AI-Powered Design'),
    description: t('onboarding.steps.design.description', 'Discover how our AI design assistant helps you create optimal window configurations. The system suggests profiles, accessories, and layouts based on your measurements.'),
    duration: '3:45',
    // videoUrl: '/videos/onboarding/design.mp4',
    component: AIDesignDemo,
  },
  {
    id: 'optimization',
    title: t('onboarding.steps.optimization.title', 'Cutting Optimization'),
    description: t('onboarding.steps.optimization.description', 'Master the cutting optimization engine that minimizes waste and maximizes efficiency. Learn how to configure optimization parameters and interpret results.'),
    duration: '4:15',
    // videoUrl: '/videos/onboarding/optimization.mp4',
    component: OptimizationDemo,
  },
  {
    id: 'export',
    title: t('onboarding.steps.export.title', 'CNC Export'),
    description: t('onboarding.steps.export.description', 'Export your optimized cutting plans to CNC machines. Generate DXF files, cutting lists, and production reports with a single click.'),
    duration: '2:45',
    // videoUrl: '/videos/onboarding/export.mp4',
    component: CNCExportDemo,
  },
];

export const FabricatorOnboarding: React.FC<FabricatorOnboardingProps> = ({
  open,
  onClose,
  onComplete,
  steps: customSteps,
  skipText,
  showSkip = true,
}) => {
  const { t } = useTranslation('fabricator');
  const defaultSteps = getDefaultSteps(t);
  const steps = customSteps || defaultSteps;
  const finalSkipText = skipText || t('onboarding.skip', 'Skip Tutorial');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [startTime] = useState(Date.now());
  const [stepStartTimes] = useState<Map<number, number>>(new Map());

  // Track onboarding started
  useEffect(() => {
    if (open) {
      trackOnboardingStarted();
    }
  }, [open]);

  // Track step viewed
  useEffect(() => {
    if (open && steps[currentStep]) {
      const stepStartTime = Date.now();
      stepStartTimes.set(currentStep, stepStartTime);
      
      trackOnboardingStepViewed(
        steps[currentStep].id,
        currentStep + 1,
        steps.length
      );
    }
  }, [open, currentStep, steps]);

  // Load progress from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedProgress = localStorage.getItem(ONBOARDING_PROGRESS_KEY);
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setCurrentStep(progress.currentStep || 0);
        setCompletedSteps(new Set(progress.completedSteps || []));
      }
    } catch (error) {
      console.warn('Failed to load onboarding progress:', error);
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = (step: number, completed: Set<string>) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify({
        currentStep: step,
        completedSteps: Array.from(completed),
      }));
    } catch (error) {
      console.warn('Failed to save onboarding progress:', error);
    }
  };

  const handleNext = () => {
    // Track step completion
    const stepStartTime = stepStartTimes.get(currentStep);
    const timeOnStep = stepStartTime ? Date.now() - stepStartTime : 0;
    
    trackOnboardingStepCompleted(
      steps[currentStep].id,
      currentStep + 1,
      steps.length,
      timeOnStep
    );

    const nextStep = currentStep + 1;
    const newCompleted = new Set(completedSteps);
    newCompleted.add(steps[currentStep].id);
    
    setCompletedSteps(newCompleted);
    saveProgress(nextStep, newCompleted);

    if (nextStep >= steps.length) {
      handleComplete();
    } else {
      setCurrentStep(nextStep);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      saveProgress(currentStep - 1, completedSteps);
    }
  };

  const handleSkip = () => {
    handleComplete(true);
  };

  const handleComplete = (skipped = false) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      
      // Track completion analytics
      const completionTime = Date.now() - startTime;
      const completedStepsList = Array.from(completedSteps);
      
      if (skipped) {
        trackOnboardingSkipped(currentStep + 1, steps.length, completionTime);
      } else {
        trackOnboardingCompleted(
          completionTime,
          completedStepsList.length,
          steps.length,
          skipped
        );
      }
    }

    // Clear progress
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ONBOARDING_PROGRESS_KEY);
    }

    onComplete?.();
    onClose();
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="relative">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{t('onboarding.title', 'Welcome to Fabricator Pro')}</h2>
                <p className="text-orange-100 text-sm mt-1">
                  {t('onboarding.subtitle', "Let's get you started with a quick tutorial")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-orange-800"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t('onboarding.step_of', 'Step {current} of {total}', { current: currentStep + 1, total: steps.length })}</span>
                <span>{t('onboarding.complete_percent', '{percent}% Complete', { percent: Math.round(progress) })}</span>
              </div>
              <Progress value={progress} className="h-2 bg-orange-800/50" />
            </div>
          </div>

          {/* Step Indicators */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                        index < currentStep
                          ? 'bg-green-500 border-green-500 text-white'
                          : index === currentStep
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-gray-200 border-gray-300 text-gray-400'
                      )}
                    >
                      {index < currentStep ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <span className={cn(
                      'text-xs mt-2 text-center max-w-[80px]',
                      index === currentStep ? 'font-semibold text-gray-900' : 'text-gray-500'
                    )}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      'h-0.5 flex-1 mx-2',
                      index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    )} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Step Title and Description */}
              <div>
                <h3 className="text-2xl font-semibold mb-2">{currentStepData.title}</h3>
                <p className="text-gray-600 mb-4">{currentStepData.description}</p>
                {currentStepData.duration && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Play className="h-4 w-4" />
                    <span>Duration: {currentStepData.duration}</span>
                  </div>
                )}
              </div>

              {/* Video Player */}
              {currentStepData.videoUrl ? (
                <OnboardingVideoPlayerWrapper
                  videoUrl={currentStepData.videoUrl}
                  posterUrl={currentStepData.posterUrl}
                  title={currentStepData.title}
                  stepId={currentStepData.id}
                  stepNumber={currentStep + 1}
                  onVideoEnd={handleNext}
                  className="rounded-lg"
                />
              ) : (
                <div className="bg-gray-100 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                      <Play className="h-8 w-8 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-gray-600 font-medium">{t('onboarding.video_coming_soon', 'Video Tutorial Coming Soon')}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {t('onboarding.video_placeholder', 'Interactive video content for "{title}" will be available here.', { title: currentStepData.title })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive Demo (if provided) */}
              {currentStepData.component && (
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-4">{t('onboarding.try_yourself', 'Try it yourself:')}</h4>
                  <currentStepData.component />
                </div>
              )}
            </div>
          </CardContent>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t p-6 flex items-center justify-between">
            <div>
              {showSkip && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-gray-600"
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  {finalSkipText}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstStep}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t('onboarding.previous', 'Previous')}
              </Button>
              <Button
                onClick={handleNext}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isLastStep ? t('onboarding.complete', 'Complete Tutorial') : t('onboarding.next', 'Next')}
                {!isLastStep && <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
};

/**
 * Reset onboarding (for testing or re-onboarding)
 */
export const resetOnboarding = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  localStorage.removeItem(ONBOARDING_PROGRESS_KEY);
};

export default FabricatorOnboarding;

