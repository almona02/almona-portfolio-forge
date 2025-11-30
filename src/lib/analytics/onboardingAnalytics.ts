/**
 * Onboarding Analytics
 * ---------------------------------------------------------------------------
 * Analytics tracking for onboarding system
 */

import { track } from './index';

export interface OnboardingAnalyticsEvent {
  event: string;
  stepId?: string;
  stepNumber?: number;
  totalSteps?: number;
  completionTime?: number;
  skipped?: boolean;
  skippedAtStep?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Track onboarding started
 */
export const trackOnboardingStarted = () => {
  track('onboarding_started', {
    timestamp: Date.now(),
  });
};

/**
 * Track onboarding step viewed
 */
export const trackOnboardingStepViewed = (stepId: string, stepNumber: number, totalSteps: number) => {
  track('onboarding_step_viewed', {
    step_id: stepId,
    step_number: stepNumber,
    total_steps: totalSteps,
    timestamp: Date.now(),
  });
};

/**
 * Track onboarding step completed
 */
export const trackOnboardingStepCompleted = (
  stepId: string,
  stepNumber: number,
  totalSteps: number,
  timeOnStep: number
) => {
  track('onboarding_step_completed', {
    step_id: stepId,
    step_number: stepNumber,
    total_steps: totalSteps,
    time_on_step: timeOnStep,
    timestamp: Date.now(),
  });
};

/**
 * Track onboarding completed
 */
export const trackOnboardingCompleted = (
  totalTime: number,
  stepsCompleted: number,
  totalSteps: number,
  skipped: boolean = false
) => {
  track('onboarding_completed', {
    total_time: totalTime,
    steps_completed: stepsCompleted,
    total_steps: totalSteps,
    skipped,
    completion_rate: (stepsCompleted / totalSteps) * 100,
    timestamp: Date.now(),
  });

  // Also send to Google Analytics if available
  if (typeof (window as any).gtag !== 'undefined') {
    (window as any).gtag('event', 'onboarding_completed', {
      event_category: 'Onboarding',
      event_label: skipped ? 'skipped' : 'completed',
      value: totalTime,
      custom_parameters: {
        steps_completed: stepsCompleted,
        total_steps: totalSteps,
        completion_rate: (stepsCompleted / totalSteps) * 100,
      },
    });
  }
};

/**
 * Track onboarding skipped
 */
export const trackOnboardingSkipped = (skippedAtStep: number, totalSteps: number, timeBeforeSkip: number) => {
  track('onboarding_skipped', {
    skipped_at_step: skippedAtStep,
    total_steps: totalSteps,
    time_before_skip: timeBeforeSkip,
    timestamp: Date.now(),
  });

  // Also send to Google Analytics if available
  if (typeof (window as any).gtag !== 'undefined') {
    (window as any).gtag('event', 'onboarding_skipped', {
      event_category: 'Onboarding',
      event_label: `step_${skippedAtStep}`,
      value: timeBeforeSkip,
    });
  }
};

/**
 * Track video played in onboarding
 */
export const trackOnboardingVideoPlayed = (stepId: string, stepNumber: number) => {
  track('onboarding_video_played', {
    step_id: stepId,
    step_number: stepNumber,
    timestamp: Date.now(),
  });
};

/**
 * Track video completed in onboarding
 */
export const trackOnboardingVideoCompleted = (stepId: string, stepNumber: number, videoDuration: number) => {
  track('onboarding_video_completed', {
    step_id: stepId,
    step_number: stepNumber,
    video_duration: videoDuration,
    timestamp: Date.now(),
  });
};

/**
 * Track interactive demo interaction
 */
export const trackOnboardingDemoInteraction = (stepId: string, interactionType: string, metadata?: Record<string, unknown>) => {
  track('onboarding_demo_interaction', {
    step_id: stepId,
    interaction_type: interactionType,
    metadata,
    timestamp: Date.now(),
  });
};

