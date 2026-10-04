/**
 * FP-028 / Phase 5 / D1 — Physics UI authority classification.
 *
 * Standards-verification language is forbidden unless every required
 * manufacturing-approved input is present. Assumption-backed numbers are
 * estimate-only.
 */

export type PhysicsAuthorityStatus = 'estimate_only' | 'standards_verified';

export interface PhysicsAuthorityInputs {
  readonly hasApprovedSystemPack: boolean;
  readonly hasApprovedProfilePhysics: boolean;
  readonly hasApprovedWindPressure: boolean;
  readonly hasApprovedDeflectionLimit: boolean;
  readonly hasApprovedGlazingUValue: boolean;
  readonly hasApprovedFrameArea: boolean;
  readonly hasApprovedGlassArea: boolean;
  readonly hasApprovedEdgePsi: boolean;
}

export interface PhysicsAuthorityAssessment {
  readonly status: PhysicsAuthorityStatus;
  readonly canClaimStandardsVerification: boolean;
  readonly missingInputs: readonly string[];
  readonly description: string;
  readonly structuralBadgeLabel: 'ESTIMATE' | 'INPUTS INCOMPLETE' | 'CONFORMANT' | 'CRITICAL';
  readonly thermalLabelSuffix: 'estimate' | 'verified';
}

const REQUIRED: ReadonlyArray<{ key: keyof PhysicsAuthorityInputs; label: string }> = [
  { key: 'hasApprovedSystemPack', label: 'approved system pack' },
  { key: 'hasApprovedProfilePhysics', label: 'approved profile physics (Ix/Uf)' },
  { key: 'hasApprovedWindPressure', label: 'approved site wind pressure' },
  { key: 'hasApprovedDeflectionLimit', label: 'approved deflection limit' },
  { key: 'hasApprovedGlazingUValue', label: 'approved glazing U-value (Ug)' },
  { key: 'hasApprovedFrameArea', label: 'approved frame area (Af)' },
  { key: 'hasApprovedGlassArea', label: 'approved glass area (Ag)' },
  { key: 'hasApprovedEdgePsi', label: 'approved edge Psi' },
];

/**
 * Classify whether physics UI may claim Eurocode/ISO verification.
 * Fail closed: any missing approved input → estimate_only.
 */
export function assessPhysicsAuthority(
  inputs: PhysicsAuthorityInputs,
  structuralOutcome?: { readonly isSafe: boolean } | null
): PhysicsAuthorityAssessment {
  const missingInputs = REQUIRED.filter((item) => !inputs[item.key]).map((item) => item.label);
  const canClaimStandardsVerification = missingInputs.length === 0;

  if (!canClaimStandardsVerification) {
    const hasAnyPhysics =
      inputs.hasApprovedSystemPack && inputs.hasApprovedProfilePhysics;
    return {
      status: 'estimate_only',
      canClaimStandardsVerification: false,
      missingInputs,
      description: hasAnyPhysics
        ? `Estimate only — missing: ${missingInputs.join(', ')}. Not verified against Eurocode 1 or ISO 10077-1.`
        : 'Inputs incomplete — physics estimates unavailable until an approved system and profile physics are selected.',
      structuralBadgeLabel: hasAnyPhysics ? 'ESTIMATE' : 'INPUTS INCOMPLETE',
      thermalLabelSuffix: 'estimate',
    };
  }

  return {
    status: 'standards_verified',
    canClaimStandardsVerification: true,
    missingInputs: [],
    description: 'Verified against Eurocode 1 & ISO 10077-1 using approved project inputs.',
    structuralBadgeLabel: structuralOutcome?.isSafe === false ? 'CRITICAL' : 'CONFORMANT',
    thermalLabelSuffix: 'verified',
  };
}

/**
 * Current EngineeringBay physics path uses catalog/default assumptions.
 * Document those defaults so the UI cannot claim verification.
 */
export function engineeringBayAssumptionInputs(args: {
  readonly activeSystemPackId: string | null | undefined;
  readonly hasProfilePhysics: boolean;
}): PhysicsAuthorityInputs {
  return {
    hasApprovedSystemPack: Boolean(args.activeSystemPackId),
    hasApprovedProfilePhysics: args.hasProfilePhysics,
    // Hardcoded in EngineeringBay today — never treat as approved authority
    hasApprovedWindPressure: false,
    hasApprovedDeflectionLimit: false,
    hasApprovedGlazingUValue: false,
    hasApprovedFrameArea: false,
    hasApprovedGlassArea: false,
    hasApprovedEdgePsi: false,
  };
}
