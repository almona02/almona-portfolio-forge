/**
 * @file validation_envelopes/index.ts
 * @description Validation envelopes and deterministic constraints.
 * 
 * AICS-001 Reference: Section 4.2 (Validation Envelopes)
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */


export interface DeterministicConstraint {
  constraintId: string;
  ruleId: string;
  description: string;
  source: 'AICS-001' | 'Engineering Standard' | 'Machine Limit' | 'Regulatory';
  deterministic: boolean; // AICS-001: "Deterministic constraints are non-negotiable"
  validationFn: (input: unknown) => boolean;
}

export interface ExecutionBoundary {
  boundaryId: string;
  description: string;
  enforced: boolean;
  failureMode: 'fail-loud' | 'warn' | 'inform';
}

export interface ValidationEnvelope {
  envelopeId: string;
  constraints: DeterministicConstraint[];
  boundaries: ExecutionBoundary[];
  mode: 'sandbox' | 'production' | 'certified';
}

// Re-export consequence mapper (moved from lib/authority)
export type {
    Consequence, ConsequenceType, ValidationErrorWithConsequences
} from './consequenceMapper';

export {
    enhanceValidationWithConsequences, mapErrorToConsequences
} from './consequenceMapper';

