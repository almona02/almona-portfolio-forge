export interface AdvisoryOutput {
  tier: string;
  suggestion: any;
  constitutionalDisclaimer?: string;
  requiresHumanValidation?: boolean;
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  violations: string[];
  hardenedAdvisory?: AdvisoryOutput;
}
