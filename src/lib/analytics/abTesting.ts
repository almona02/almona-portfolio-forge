// A/B Testing Framework for ALMONA Services
// Provides experiment management, user assignment, and conversion tracking

import { track } from './index';

export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  trafficAllocation: number; // 0-1, percentage of users to include
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  targetAudience?: string[];
  conversionEvents: string[];
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1, relative weight for traffic allocation
  config: Record<string, unknown>;
}

export interface UserAssignment {
  userId: string;
  experimentId: string;
  variantId: string;
  assignedAt: Date;
  converted: boolean;
  conversionEvents: string[];
}

// Active experiments configuration
const EXPERIMENTS: Experiment[] = [
  {
    id: 'package-calculator-placement',
    name: 'Package Calculator Placement',
    description: 'Test different placements of the package calculator on the services page',
    variants: [
      {
        id: 'control',
        name: 'Control',
        description: 'Calculator below hero section (current)',
        weight: 0.5,
        config: { placement: 'below-hero' }
      },
      {
        id: 'above-packages',
        name: 'Above Packages',
        description: 'Calculator above service packages',
        weight: 0.5,
        config: { placement: 'above-packages' }
      }
    ],
    trafficAllocation: 1.0,
    startDate: new Date('2024-01-01'),
    isActive: true,
    conversionEvents: ['package_selected', 'quote_requested', 'contact_initiated']
  },
  {
    id: 'package-card-design',
    name: 'Package Card Design',
    description: 'Test different visual designs for service package cards',
    variants: [
      {
        id: 'control',
        name: 'Control',
        description: 'Current gradient design',
        weight: 0.5,
        config: { design: 'gradient', animation: 'hover-scale' }
      },
      {
        id: 'minimal',
        name: 'Minimal Design',
        description: 'Clean minimal design with subtle borders',
        weight: 0.5,
        config: { design: 'minimal', animation: 'fade-in' }
      }
    ],
    trafficAllocation: 0.8,
    startDate: new Date('2024-01-01'),
    isActive: true,
    conversionEvents: ['package_selected', 'package_viewed']
  },
  {
    id: 'whatsapp-cta',
    name: 'WhatsApp CTA',
    description: 'Test different WhatsApp call-to-action messages',
    variants: [
      {
        id: 'control',
        name: 'Control',
        description: 'Standard "Get Support" message',
        weight: 0.5,
        config: { message: 'Get Support', urgency: 'normal' }
      },
      {
        id: 'urgent',
        name: 'Urgent CTA',
        description: 'Urgent "Need Help Now?" message',
        weight: 0.5,
        config: { message: 'Need Help Now?', urgency: 'urgent' }
      }
    ],
    trafficAllocation: 0.6,
    startDate: new Date('2024-01-01'),
    isActive: true,
    conversionEvents: ['whatsapp_clicked', 'whatsapp_message_sent']
  }
];

// User assignments storage (in production, this would be in a database)
const userAssignments = new Map<string, UserAssignment[]>();

// Generate consistent user ID for testing (in production, use actual user ID)
function generateUserId(): string {
  // Try to get from localStorage first
  let userId = localStorage.getItem('ab_test_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('ab_test_user_id', userId);
  }
  return userId;
}

// Hash function for consistent user assignment
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Assign user to experiment variant
export function assignUserToExperiment(experimentId: string, userId?: string): string | null {
  const user = userId || generateUserId();
  const experiment = EXPERIMENTS.find(exp => exp.id === experimentId && exp.isActive);
  
  if (!experiment) {
    return null;
  }

  // Check if user is already assigned
  const existingAssignments = userAssignments.get(user) || [];
  const existingAssignment = existingAssignments.find(assignment => assignment.experimentId === experimentId);
  
  if (existingAssignment) {
    return existingAssignment.variantId;
  }

  // Check if user should be included in experiment (traffic allocation)
  const userHash = hashString(`${user}_${experimentId}`);
  const userAllocation = (userHash % 100) / 100;
  
  if (userAllocation > experiment.trafficAllocation) {
    return null; // User not included in experiment
  }

  // Assign user to variant based on weights
  const variantHash = hashString(`${user}_${experimentId}_variant`);
  const variantAllocation = (variantHash % 100) / 100;
  
  let cumulativeWeight = 0;
  let selectedVariant: ExperimentVariant | null = null;
  
  for (const variant of experiment.variants) {
    cumulativeWeight += variant.weight;
    if (variantAllocation <= cumulativeWeight) {
      selectedVariant = variant;
      break;
    }
  }

  if (!selectedVariant) {
    selectedVariant = experiment.variants[0]; // Fallback to first variant
  }

  // Store assignment
  const assignment: UserAssignment = {
    userId: user,
    experimentId,
    variantId: selectedVariant.id,
    assignedAt: new Date(),
    converted: false,
    conversionEvents: []
  };

  existingAssignments.push(assignment);
  userAssignments.set(user, existingAssignments);

  // Track assignment
  track('experiment_assigned', {
    experiment_id: experimentId,
    variant_id: selectedVariant.id,
    user_id: user,
    timestamp: assignment.assignedAt.toISOString()
  });

  return selectedVariant.id;
}

// Get user's variant for an experiment
export function getUserVariant(experimentId: string, userId?: string): string | null {
  const user = userId || generateUserId();
  const assignments = userAssignments.get(user) || [];
  const assignment = assignments.find(a => a.experimentId === experimentId);
  return assignment ? assignment.variantId : null;
}

// Track conversion event
export function trackConversion(experimentId: string, eventName: string, userId?: string): void {
  const user = userId || generateUserId();
  const assignments = userAssignments.get(user) || [];
  const assignment = assignments.find(a => a.experimentId === experimentId);
  
  if (!assignment) {
    return; // User not in experiment
  }

  const experiment = EXPERIMENTS.find(exp => exp.id === experimentId);
  if (!experiment || !experiment.conversionEvents.includes(eventName)) {
    return; // Event not tracked for this experiment
  }

  // Update assignment
  if (!assignment.conversionEvents.includes(eventName)) {
    assignment.conversionEvents.push(eventName);
  }
  
  if (!assignment.converted) {
    assignment.converted = true;
  }

  // Track conversion
  track('experiment_conversion', {
    experiment_id: experimentId,
    variant_id: assignment.variantId,
    event_name: eventName,
    user_id: user,
    timestamp: new Date().toISOString()
  });
}

// Get experiment configuration
export function getExperimentConfig(experimentId: string, variantId: string): Record<string, unknown> | null {
  const experiment = EXPERIMENTS.find(exp => exp.id === experimentId);
  if (!experiment) return null;
  
  const variant = experiment.variants.find(v => v.id === variantId);
  return variant ? variant.config : null;
}

// Get all active experiments
export function getActiveExperiments(): Experiment[] {
  return EXPERIMENTS.filter(exp => exp.isActive);
}

// Get experiment results (for analytics dashboard)
export function getExperimentResults(experimentId: string): {
  experiment: Experiment;
  variants: Array<{
    variant: ExperimentVariant;
    assignments: number;
    conversions: number;
    conversionRate: number;
  }>;
} | null {
  const experiment = EXPERIMENTS.find(exp => exp.id === experimentId);
  if (!experiment) return null;

  const allAssignments = Array.from(userAssignments.values()).flat();
  const experimentAssignments = allAssignments.filter(a => a.experimentId === experimentId);

  const variants = experiment.variants.map(variant => {
    const variantAssignments = experimentAssignments.filter(a => a.variantId === variant.id);
    const conversions = variantAssignments.filter(a => a.converted).length;
    
    return {
      variant,
      assignments: variantAssignments.length,
      conversions,
      conversionRate: variantAssignments.length > 0 ? conversions / variantAssignments.length : 0
    };
  });

  return { experiment, variants };
}

// Initialize A/B testing
export function initABTesting(): void {
  // Initialize analytics if not already done
  track('ab_testing_initialized', {
    timestamp: new Date().toISOString(),
    active_experiments: EXPERIMENTS.filter(exp => exp.isActive).length
  });
}

// Utility function to check if user should see feature
export function shouldShowFeature(featureFlag: string, userId?: string): boolean {
  // This could be extended to support feature flags beyond A/B tests
  const user = userId || generateUserId();
  const userHash = hashString(`${user}_${featureFlag}`);
  return (userHash % 100) < 50; // 50% rollout by default
}
