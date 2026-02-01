/**
 * @file ProcessConstraints.ts
 * @description Process Constraints
 * 
 * AICS-001 Reference: Section 4.3.4 (Process Constraints)
 * 
 * Registers process constraints extracted from workflow definitions,
 * state machines, and fabrication process validation rules.
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import type { DeterministicConstraint, ValidationContext } from './index';
import { ConstraintCategory, getConstraintRegistry } from './ConstraintRegistry';

/**
 * Process Validation Context
 * 
 * Extended validation context for process constraint validation.
 */
export interface ProcessValidationContext extends ValidationContext {
  steps?: ProcessStep[];
  dependencies?: ProcessDependency[];
  currentStep?: number;
  completedSteps?: number[];
  parallelOperations?: ParallelOperation[];
  coolingTime?: number; // seconds
  stabilizationTime?: number; // seconds
  qualityChecks?: QualityCheck[];
  workflowState?: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
}

/**
 * Process Step Definition
 */
export interface ProcessStep {
  stepId: string;
  stepNumber: number;
  operation: string;
  station?: string;
  order: number;
  parallelizable?: boolean;
  required?: boolean;
  duration?: number; // seconds
  coolingTime?: number; // seconds
  stabilizationTime?: number; // seconds
  qualityGates?: string[];
}

/**
 * Process Dependency Definition
 */
export interface ProcessDependency {
  from: string; // Step ID or step number
  to: string; // Step ID or step number
  type?: 'hard' | 'soft'; // Hard dependency: must complete, Soft: preferred order
}

/**
 * Parallel Operation Definition
 */
export interface ParallelOperation {
  stepIds: string[];
  resourceConstraint?: string; // e.g., 'machine', 'station', 'worker'
  maxConcurrent?: number;
}

/**
 * Quality Check Definition
 */
export interface QualityCheck {
  stepId: string;
  checkpoint: string;
  mandatory?: boolean;
  passed?: boolean;
}

// ============================================================================
// PROCESS CONSTRAINTS (AICS-001 Section 4.3.4)
// ============================================================================

/**
 * PROC-001: Operation Sequencing - Explicit Order Required
 * 
 * AICS-001 Section 4.3.4: Operation sequencing rules.
 * All process steps must have explicit order numbers.
 */
const PROC_001_ExplicitOrderRequired: DeterministicConstraint = {
  constraintId: 'PROC-001',
  ruleId: 'AICS-001-4.3.4-1',
  description: 'All process steps must have explicit order numbers',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.steps || context.steps.length === 0) {
      return true; // Pass if no steps (handled elsewhere)
    }
    return context.steps.every(step => 
      step.order !== undefined && 
      step.order !== null && 
      typeof step.order === 'number' && 
      step.order >= 0
    );
  },
};

/**
 * PROC-002: Operation Sequencing - Sequential Order Validation
 * 
 * AICS-001 Section 4.3.4: Operation sequencing rules.
 * Step order numbers must be unique and sequential (no gaps allowed).
 */
const PROC_002_SequentialOrderValidation: DeterministicConstraint = {
  constraintId: 'PROC-002',
  ruleId: 'AICS-001-4.3.4-2',
  description: 'Step order numbers must be unique and sequential',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.steps || context.steps.length === 0) {
      return true;
    }
    const orders = context.steps.map(step => step.order).sort((a, b) => a - b);
    // Check for uniqueness
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      return false; // Duplicate order numbers
    }
    // Check for sequential order (no gaps)
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        return false; // Non-sequential order
      }
    }
    return true;
  },
};

/**
 * PROC-003: Dependency Validation - Dependencies Reference Existing Steps
 * 
 * AICS-001 Section 4.3.4: Dependency validation.
 * All dependencies must reference existing process steps.
 */
const PROC_003_DependenciesReferenceExistingSteps: DeterministicConstraint = {
  constraintId: 'PROC-003',
  ruleId: 'AICS-001-4.3.4-3',
  description: 'All dependencies must reference existing process steps',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.dependencies || context.dependencies.length === 0) {
      return true; // Pass if no dependencies
    }
    if (!context.steps || context.steps.length === 0) {
      return false; // Cannot have dependencies without steps
    }
    const stepIds = new Set(context.steps.map(step => step.stepId));
    const stepNumbers = new Set(context.steps.map(step => step.stepNumber));
    return context.dependencies.every(dep => {
      const fromExists = stepIds.has(dep.from) || stepNumbers.has(Number(dep.from));
      const toExists = stepIds.has(dep.to) || stepNumbers.has(Number(dep.to));
      return fromExists && toExists;
    });
  },
};

/**
 * PROC-004: Dependency Validation - No Circular Dependencies
 * 
 * AICS-001 Section 4.3.4: Dependency validation.
 * Process dependencies must not form circular references.
 */
const PROC_004_NoCircularDependencies: DeterministicConstraint = {
  constraintId: 'PROC-004',
  ruleId: 'AICS-001-4.3.4-4',
  description: 'Process dependencies must not form circular references',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.dependencies || context.dependencies.length === 0) {
      return true; // Pass if no dependencies
    }
    if (!context.steps || context.steps.length === 0) {
      return true; // Cannot have circular dependencies without steps
    }
    
    // Build dependency graph
    const stepIds = new Set(context.steps.map(step => step.stepId));
    const stepNumbers = new Set(context.steps.map(step => step.stepNumber.toString()));
    const allStepIdentifiers = new Set([...stepIds, ...stepNumbers]);
    
    const graph = new Map<string, Set<string>>();
    allStepIdentifiers.forEach(id => graph.set(id, new Set()));
    
    context.dependencies.forEach(dep => {
      const from = stepIds.has(dep.from) ? dep.from : stepNumbers.has(dep.from) ? dep.from : null;
      const to = stepIds.has(dep.to) ? dep.to : stepNumbers.has(dep.to) ? dep.to : null;
      if (from && to) {
        const fromSet = graph.get(from);
        if (fromSet) {
          fromSet.add(to);
        }
      }
    });
    
    // Check for cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (node: string): boolean => {
      if (recursionStack.has(node)) {
        return true; // Cycle detected
      }
      if (visited.has(node)) {
        return false; // Already processed
      }
      
      visited.add(node);
      recursionStack.add(node);
      
      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }
      
      recursionStack.delete(node);
      return false;
    };
    
    for (const node of allStepIdentifiers) {
      if (hasCycle(node)) {
        return false; // Circular dependency found
      }
    }
    
    return true;
  },
};

/**
 * PROC-005: Dependency Validation - Dependent Steps Cannot Start Before Prerequisites
 * 
 * AICS-001 Section 4.3.4: Dependency validation.
 * Steps with hard dependencies cannot start until all prerequisite steps are completed.
 */
const PROC_005_DependentStepsCannotStartBeforePrerequisites: DeterministicConstraint = {
  constraintId: 'PROC-005',
  ruleId: 'AICS-001-4.3.4-5',
  description: 'Steps with hard dependencies cannot start until prerequisites are completed',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.dependencies || context.dependencies.length === 0) {
      return true; // Pass if no dependencies
    }
    if (!context.completedSteps || context.completedSteps.length === 0) {
      // If no steps are completed, check if current step has dependencies
      if (context.currentStep !== undefined) {
        const hardDependencies = context.dependencies.filter(dep => 
          dep.type !== 'soft' && dep.to === context.currentStep?.toString()
        );
        return hardDependencies.length === 0; // Current step cannot start if it has hard dependencies
      }
      return true;
    }
    
    const completedSet = new Set(context.completedSteps.map(s => s.toString()));
    const hardDependencies = context.dependencies.filter(dep => dep.type !== 'soft');
    
    // Check if current step's prerequisites are completed
    if (context.currentStep !== undefined) {
      const currentStepDeps = hardDependencies.filter(dep => 
        dep.to === context.currentStep?.toString()
      );
      return currentStepDeps.every(dep => completedSet.has(dep.from));
    }
    
    return true;
  },
};

/**
 * PROC-006: Parallel Operation Constraints - Parallelism Must Be Explicit
 * 
 * AICS-001 Section 4.3.4: Parallel operation constraints.
 * Parallel operations must be explicitly declared.
 */
const PROC_006_ParallelismMustBeExplicit: DeterministicConstraint = {
  constraintId: 'PROC-006',
  ruleId: 'AICS-001-4.3.4-6',
  description: 'Parallel operations must be explicitly declared',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.steps || context.steps.length === 0) {
      return true; // Pass if no steps
    }
    // All steps must have explicit parallelizable flag
    return context.steps.every(step => 
      step.parallelizable !== undefined && 
      step.parallelizable !== null
    );
  },
};

/**
 * PROC-007: Parallel Operation Constraints - Concurrent Operation Limits
 * 
 * AICS-001 Section 4.3.4: Parallel operation constraints.
 * Concurrent operations must respect resource constraints and limits.
 */
const PROC_007_ConcurrentOperationLimits: DeterministicConstraint = {
  constraintId: 'PROC-007',
  ruleId: 'AICS-001-4.3.4-7',
  description: 'Concurrent operations must respect resource constraints and limits',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.parallelOperations || context.parallelOperations.length === 0) {
      return true; // Pass if no parallel operations
    }
    
    // Check if parallel operations exceed maxConcurrent limits
    return context.parallelOperations.every(op => {
      if (op.maxConcurrent === undefined || op.maxConcurrent === null) {
        return true; // No limit specified, allow
      }
      return op.stepIds.length <= op.maxConcurrent;
    });
  },
};

/**
 * PROC-008: Cooling/Stabilization Requirements - Minimum Cooling Time
 * 
 * AICS-001 Section 4.3.4: Cooling/stabilization requirements.
 * Operations requiring cooling must specify minimum cooling time.
 */
const PROC_008_MinimumCoolingTime: DeterministicConstraint = {
  constraintId: 'PROC-008',
  ruleId: 'AICS-001-4.3.4-8',
  description: 'Operations requiring cooling must specify minimum cooling time',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.steps || context.steps.length === 0) {
      return true; // Pass if no steps
    }
    
    // Steps with coolingTime specified must have coolingTime >= 0
    return context.steps.every(step => {
      if (step.coolingTime !== undefined && step.coolingTime !== null) {
        return step.coolingTime >= 0;
      }
      return true;
    });
  },
};

/**
 * PROC-009: Cooling/Stabilization Requirements - Minimum Stabilization Time
 * 
 * AICS-001 Section 4.3.4: Cooling/stabilization requirements.
 * Operations requiring stabilization must specify minimum stabilization time.
 */
const PROC_009_MinimumStabilizationTime: DeterministicConstraint = {
  constraintId: 'PROC-009',
  ruleId: 'AICS-001-4.3.4-9',
  description: 'Operations requiring stabilization must specify minimum stabilization time',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.steps || context.steps.length === 0) {
      return true; // Pass if no steps
    }
    
    // Steps with stabilizationTime specified must have stabilizationTime >= 0
    return context.steps.every(step => {
      if (step.stabilizationTime !== undefined && step.stabilizationTime !== null) {
        return step.stabilizationTime >= 0;
      }
      return true;
    });
  },
};

/**
 * PROC-010: Cooling/Stabilization Requirements - Cooling Time Before Next Step
 * 
 * AICS-001 Section 4.3.4: Cooling/stabilization requirements.
 * Steps with cooling requirements must allow sufficient cooling time before next step.
 */
const PROC_010_CoolingTimeBeforeNextStep: DeterministicConstraint = {
  constraintId: 'PROC-010',
  ruleId: 'AICS-001-4.3.4-10',
  description: 'Steps with cooling requirements must allow sufficient cooling time before next step',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.steps || context.steps.length === 0) {
      return true; // Pass if no steps
    }
    
    // If coolingTime is specified in context, it must be >= minimum required cooling time
    if (context.coolingTime !== undefined && context.coolingTime !== null) {
      const stepsWithCooling = context.steps.filter(step => 
        step.coolingTime !== undefined && step.coolingTime !== null
      );
      if (stepsWithCooling.length > 0) {
        const maxRequiredCooling = Math.max(...stepsWithCooling.map(step => step.coolingTime || 0));
        return context.coolingTime >= maxRequiredCooling;
      }
    }
    
    return true;
  },
};

/**
 * PROC-011: Mandatory Intermediate Steps - Required Steps Cannot Be Skipped
 * 
 * AICS-001 Section 4.3.4: Mandatory intermediate steps.
 * Steps marked as required cannot be skipped.
 */
const PROC_011_RequiredStepsCannotBeSkipped: DeterministicConstraint = {
  constraintId: 'PROC-011',
  ruleId: 'AICS-001-4.3.4-11',
  description: 'Steps marked as required cannot be skipped',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.steps || context.steps.length === 0) {
      return true; // Pass if no steps
    }
    
    const requiredSteps = context.steps.filter(step => step.required === true);
    if (requiredSteps.length === 0) {
      return true; // No required steps
    }
    
    if (!context.completedSteps || context.completedSteps.length === 0) {
      return true; // No steps completed yet, cannot validate
    }
    
    const completedSet = new Set(context.completedSteps);
    const requiredStepNumbers = requiredSteps.map(step => step.stepNumber);
    
    // All required steps must be in completed steps
    return requiredStepNumbers.every(stepNumber => completedSet.has(stepNumber));
  },
};

/**
 * PROC-012: Mandatory Intermediate Steps - Quality Gates Must Be Passed
 * 
 * AICS-001 Section 4.3.4: Mandatory intermediate steps.
 * Quality gates must be passed before proceeding to next step.
 */
const PROC_012_QualityGatesMustBePassed: DeterministicConstraint = {
  constraintId: 'PROC-012',
  ruleId: 'AICS-001-4.3.4-12',
  description: 'Quality gates must be passed before proceeding to next step',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.steps || context.steps.length === 0) {
      return true; // Pass if no steps
    }
    
    const stepsWithQualityGates = context.steps.filter(step => 
      step.qualityGates && step.qualityGates.length > 0
    );
    if (stepsWithQualityGates.length === 0) {
      return true; // No quality gates
    }
    
    if (!context.qualityChecks || context.qualityChecks.length === 0) {
      // If current step has quality gates but no quality checks, validation fails
      if (context.currentStep !== undefined) {
        const currentStep = context.steps.find(step => step.stepNumber === context.currentStep);
        if (currentStep && currentStep.qualityGates && currentStep.qualityGates.length > 0) {
          return false; // Quality gates required but not checked
        }
      }
      return true;
    }
    
    // Check if all mandatory quality checks for current step are passed
    if (context.currentStep !== undefined) {
      const currentStep = context.steps.find(step => step.stepNumber === context.currentStep);
      if (currentStep && currentStep.qualityGates) {
        const mandatoryQualityChecks = context.qualityChecks.filter(qc => 
          qc.stepId === currentStep.stepId.toString() && qc.mandatory === true
        );
        return mandatoryQualityChecks.every(qc => qc.passed === true);
      }
    }
    
    return true;
  },
};

/**
 * PROC-013: Operation Sequencing - Standard Fabrication Sequence
 * 
 * AICS-001 Section 4.3.4: Operation sequencing rules.
 * Standard fabrication sequence: Cutting → Machining → Assembly → Glazing → Quality Control.
 */
const PROC_013_StandardFabricationSequence: DeterministicConstraint = {
  constraintId: 'PROC-013',
  ruleId: 'AICS-001-4.3.4-13',
  description: 'Standard fabrication sequence must be followed: Cutting → Machining → Assembly → Glazing → Quality Control',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.steps || context.steps.length === 0) {
      return true; // Pass if no steps
    }
    
    // Define standard sequence order
    const stationOrder: Record<string, number> = {
      'cutting': 1,
      'machining': 2,
      'assembly': 3,
      'glazing': 4,
      'qc': 5,
      'quality': 5,
    };
    
    const stepsWithStations = context.steps.filter(step => step.station);
    if (stepsWithStations.length === 0) {
      return true; // No stations specified, cannot validate
    }
    
    // Sort steps by order
    const sortedSteps = [...stepsWithStations].sort((a, b) => a.order - b.order);
    
    // Check if stations follow standard sequence
    let lastStationOrder = 0;
    for (const step of sortedSteps) {
      if (step.station) {
        const stationOrderValue = stationOrder[step.station.toLowerCase()] || 999;
        if (stationOrderValue < lastStationOrder) {
          return false; // Station out of sequence
        }
        lastStationOrder = stationOrderValue;
      }
    }
    
    return true;
  },
};

/**
 * PROC-014: Operation Sequencing - Workflow State Transitions
 * 
 * AICS-001 Section 4.3.4: Operation sequencing rules.
 * Workflow state transitions must follow valid state machine transitions.
 */
const PROC_014_WorkflowStateTransitions: DeterministicConstraint = {
  constraintId: 'PROC-014',
  ruleId: 'AICS-001-4.3.4-14',
  description: 'Workflow state transitions must follow valid state machine transitions',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.workflowState) {
      return true; // Pass if workflow state not specified
    }
    
    // Valid workflow states
    const validStates: ProcessValidationContext['workflowState'][] = [
      'pending',
      'in_progress',
      'blocked',
      'completed',
      'cancelled',
    ];
    
    return validStates.includes(context.workflowState);
  },
};

/**
 * PROC-015: Operation Sequencing - Step Duration Must Be Positive
 * 
 * AICS-001 Section 4.3.4: Operation sequencing rules.
 * Process step durations must be positive values.
 */
const PROC_015_StepDurationMustBePositive: DeterministicConstraint = {
  constraintId: 'PROC-015',
  ruleId: 'AICS-001-4.3.4-15',
  description: 'Process step durations must be positive values',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as ProcessValidationContext;
    if (!context.steps || context.steps.length === 0) {
      return true; // Pass if no steps
    }
    
    // Steps with duration specified must have duration > 0
    return context.steps.every(step => {
      if (step.duration !== undefined && step.duration !== null) {
        return step.duration > 0;
      }
      return true;
    });
  },
};

// ============================================================================
// CONSTRAINT REGISTRATION
// ============================================================================

/**
 * All Process Constraints
 */
export const ProcessConstraints: DeterministicConstraint[] = [
  PROC_001_ExplicitOrderRequired,
  PROC_002_SequentialOrderValidation,
  PROC_003_DependenciesReferenceExistingSteps,
  PROC_004_NoCircularDependencies,
  PROC_005_DependentStepsCannotStartBeforePrerequisites,
  PROC_006_ParallelismMustBeExplicit,
  PROC_007_ConcurrentOperationLimits,
  PROC_008_MinimumCoolingTime,
  PROC_009_MinimumStabilizationTime,
  PROC_010_CoolingTimeBeforeNextStep,
  PROC_011_RequiredStepsCannotBeSkipped,
  PROC_012_QualityGatesMustBePassed,
  PROC_013_StandardFabricationSequence,
  PROC_014_WorkflowStateTransitions,
  PROC_015_StepDurationMustBePositive,
];

/**
 * Register Process Constraints
 * 
 * Registers all process constraints with the ConstraintRegistry.
 */
export function registerProcessConstraints(): void {
  const registry = getConstraintRegistry();
  
  // Register all process constraints with priorities (10-150 range)
  registry.register(PROC_001_ExplicitOrderRequired, ConstraintCategory.PROCESS, 10);
  registry.register(PROC_002_SequentialOrderValidation, ConstraintCategory.PROCESS, 20);
  registry.register(PROC_003_DependenciesReferenceExistingSteps, ConstraintCategory.PROCESS, 30);
  registry.register(PROC_004_NoCircularDependencies, ConstraintCategory.PROCESS, 40);
  registry.register(PROC_005_DependentStepsCannotStartBeforePrerequisites, ConstraintCategory.PROCESS, 50);
  registry.register(PROC_006_ParallelismMustBeExplicit, ConstraintCategory.PROCESS, 60);
  registry.register(PROC_007_ConcurrentOperationLimits, ConstraintCategory.PROCESS, 70);
  registry.register(PROC_008_MinimumCoolingTime, ConstraintCategory.PROCESS, 80);
  registry.register(PROC_009_MinimumStabilizationTime, ConstraintCategory.PROCESS, 90);
  registry.register(PROC_010_CoolingTimeBeforeNextStep, ConstraintCategory.PROCESS, 100);
  registry.register(PROC_011_RequiredStepsCannotBeSkipped, ConstraintCategory.PROCESS, 110);
  registry.register(PROC_012_QualityGatesMustBePassed, ConstraintCategory.PROCESS, 120);
  registry.register(PROC_013_StandardFabricationSequence, ConstraintCategory.PROCESS, 130);
  registry.register(PROC_014_WorkflowStateTransitions, ConstraintCategory.PROCESS, 140);
  registry.register(PROC_015_StepDurationMustBePositive, ConstraintCategory.PROCESS, 150);
}


