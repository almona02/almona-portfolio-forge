/**
 * FP-028 / Phase 5 / D1 — standards claims require approved inputs.
 */
import { describe, expect, it } from 'vitest';
import {
  assessPhysicsAuthority,
  engineeringBayAssumptionInputs,
  type PhysicsAuthorityInputs,
} from '../physicsAuthorityStatus';

const allApproved = (): PhysicsAuthorityInputs => ({
  hasApprovedSystemPack: true,
  hasApprovedProfilePhysics: true,
  hasApprovedWindPressure: true,
  hasApprovedDeflectionLimit: true,
  hasApprovedGlazingUValue: true,
  hasApprovedFrameArea: true,
  hasApprovedGlassArea: true,
  hasApprovedEdgePsi: true,
});

describe('FP-028 / Phase 5 / D1 — physics authority status', () => {
  it('fails closed to estimate_only when EngineeringBay uses assumption defaults', () => {
    const inputs = engineeringBayAssumptionInputs({
      activeSystemPackId: 'rock60',
      hasProfilePhysics: true,
    });
    const assessment = assessPhysicsAuthority(inputs, { isSafe: true });

    expect(assessment.status).toBe('estimate_only');
    expect(assessment.canClaimStandardsVerification).toBe(false);
    expect(assessment.structuralBadgeLabel).toBe('ESTIMATE');
    expect(assessment.thermalLabelSuffix).toBe('estimate');
    expect(assessment.description).not.toMatch(/^Verified against/);
    expect(assessment.description).toContain('Estimate only');
    expect(assessment.missingInputs).toEqual(
      expect.arrayContaining([
        'approved site wind pressure',
        'approved glazing U-value (Ug)',
      ])
    );
  });

  it('never allows CONFORMANT badge while assumptions remain', () => {
    const assessment = assessPhysicsAuthority(
      engineeringBayAssumptionInputs({
        activeSystemPackId: 'rock60',
        hasProfilePhysics: true,
      }),
      { isSafe: true }
    );
    expect(assessment.structuralBadgeLabel).not.toBe('CONFORMANT');
    expect(assessment.canClaimStandardsVerification).toBe(false);
  });

  it('allows standards verification only when every approved input is present', () => {
    const safe = assessPhysicsAuthority(allApproved(), { isSafe: true });
    expect(safe.status).toBe('standards_verified');
    expect(safe.canClaimStandardsVerification).toBe(true);
    expect(safe.structuralBadgeLabel).toBe('CONFORMANT');
    expect(safe.description).toMatch(/^Verified against Eurocode 1/);

    const critical = assessPhysicsAuthority(allApproved(), { isSafe: false });
    expect(critical.structuralBadgeLabel).toBe('CRITICAL');
  });

  it('reports inputs incomplete when system/profile physics are absent', () => {
    const assessment = assessPhysicsAuthority(
      engineeringBayAssumptionInputs({
        activeSystemPackId: null,
        hasProfilePhysics: false,
      })
    );
    expect(assessment.structuralBadgeLabel).toBe('INPUTS INCOMPLETE');
    expect(assessment.missingInputs).toContain('approved system pack');
  });
});
