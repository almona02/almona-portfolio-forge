export interface AdvisoryOutput {
  tier: string;
  suggestion: unknown;
  constitutionalDisclaimer?: string;
  requiresHumanValidation?: boolean;
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  violations: string[];
  hardenedAdvisory?: AdvisoryOutput;
}
