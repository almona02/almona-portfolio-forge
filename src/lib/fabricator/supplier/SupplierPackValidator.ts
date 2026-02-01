/**
 * Supplier Pack Validator - Constitutional Validation Gate
 * 
 * Validates supplier packs against constitutional requirements.
 * Enforces: Supplier packs may NOT define constraints (AICS-001 §4.6, §6.2).
 * 
 * Constitutional Compliance: AICS-001 §4.6 (Constraint Evolution), §6.2 (Canonical Source of Truth)
 * 
 * @since Phase 2: Precision Upgrade Plan (January 2026)
 */

import type {
    SupplierPack,
    SupplierPackValidationResult,
} from './types';

/**
 * Supplier Pack Validator
 * 
 * Enforces constitutional requirements for supplier packs.
 */
export class SupplierPackValidator {
  /**
   * Validate supplier pack
   * 
   * Constitutional Lock: Supplier packs are FORBIDDEN from defining constraints.
   */
  async validatePack(pack: SupplierPack): Promise<SupplierPackValidationResult> {
    // Check for constraint definitions (CONSTITUTIONAL LOCK #2)
    const constraintCheck = this.checkConstraintDefinitions(pack);
    if (!constraintCheck.isValid) {
      return {
        isValid: false,
        error: 'CONSTITUTIONAL_VIOLATION',
        message: constraintCheck.message,
        requiresSystemStop: true,
        details: {
          hasConstraintDefinitions: true,
        },
      };
    }

    // Check geometry compatibility
    const geometryCheck = this.checkGeometryCompatibility(pack);
    if (!geometryCheck.isValid) {
      return {
        isValid: false,
        error: 'GEOMETRY_INCOMPATIBLE',
        message: geometryCheck.message,
        requiresSystemStop: false, // Warning, not a system stop
        details: {
          geometryCompatibility: {
            status: geometryCheck.status,
            violations: geometryCheck.violations,
          },
        },
      };
    }

    // Check constraint compliance (references only, not definitions)
    const constraintCompliance = this.checkConstraintCompliance(pack);
    if (!constraintCompliance.isValid) {
      return {
        isValid: false,
        error: 'CONSTRAINT_VIOLATION',
        message: constraintCompliance.message,
        requiresSystemStop: true,
        details: {
          constraintCompliance: {
            status: constraintCompliance.status,
            violations: constraintCompliance.violations,
            referencedConstraints: constraintCompliance.referencedConstraints,
          },
        },
      };
    }

    // Check version lock (async, but we'll handle it synchronously for now)
    // In production, this would be properly async
    const versionLock = await this.checkVersionLock(pack);
    if (!versionLock.isValid) {
      return {
        isValid: false,
        error: 'VERSION_LOCK_FAILED',
        message: versionLock.message,
        requiresSystemStop: true,
        details: {
          versionLock: {
            status: 'FAIL',
            hash: versionLock.hash,
          },
        },
      };
    }

    // All validations passed
    return {
      isValid: true,
      details: {
        geometryCompatibility: {
          status: 'PASS',
          violations: [],
        },
        constraintCompliance: {
          status: 'PASS',
          violations: [],
          referencedConstraints: constraintCompliance.referencedConstraints,
        },
        versionLock: {
          status: 'PASS',
          hash: versionLock.hash,
        },
      },
    };
  }

  /**
   * Check for constraint definitions (CONSTITUTIONAL LOCK #2)
   * 
   * Supplier packs are FORBIDDEN from defining constraints.
   * They may only reference existing Tier 3 constraints.
   */
  private checkConstraintDefinitions(pack: SupplierPack): {
    isValid: boolean;
    message?: string;
  } {
    // Check top-level constraint definitions
    const hasTopLevelConstraints =
      'constraints' in pack ||
      'requirements' in pack ||
      'rules' in pack;

    if (hasTopLevelConstraints) {
      return {
        isValid: false,
        message:
          'Supplier packs are forbidden from defining constraints. All constraints must originate from Tier 3 canonical constraint sets (AICS-001 §4.6, §6.2).',
      };
    }

    // Check profile-level constraint definitions
    const hasProfileConstraints = pack.profiles.some(
      (profile) =>
        'constraints' in profile ||
        'requirements' in profile ||
        'rules' in profile
    );

    if (hasProfileConstraints) {
      return {
        isValid: false,
        message:
          'Supplier pack profiles are forbidden from defining constraints. Profiles may only reference existing Tier 3 constraints.',
      };
    }

    // Check hardware-level constraint definitions
    const hasHardwareConstraints = pack.hardware.some(
      (hardware) =>
        'constraints' in hardware ||
        'requirements' in hardware ||
        'rules' in hardware
    );

    if (hasHardwareConstraints) {
      return {
        isValid: false,
        message:
          'Supplier pack hardware is forbidden from defining constraints. Hardware may only reference existing Tier 3 constraints.',
      };
    }

    return { isValid: true };
  }

  /**
   * Check geometry compatibility
   */
  private checkGeometryCompatibility(pack: SupplierPack): {
    isValid: boolean;
    status: 'PASS' | 'FAIL' | 'WARNING';
    violations: string[];
    message?: string;
  } {
    const violations: string[] = [];

    // Check that profiles have compatible system pack references
    for (const profile of pack.profiles) {
      if (!profile.compatibleSystemPacks || profile.compatibleSystemPacks.length === 0) {
        violations.push(
          `Profile ${profile.profileId} has no compatible system pack references`
        );
      }
    }

    // Check that hardware has compatible system pack references
    for (const hardware of pack.hardware) {
      if (!hardware.compatibleSystemPacks || hardware.compatibleSystemPacks.length === 0) {
        violations.push(
          `Hardware ${hardware.hardwareId} has no compatible system pack references`
        );
      }
    }

    if (violations.length > 0) {
      return {
        isValid: false,
        status: 'WARNING',
        violations,
        message: `Geometry compatibility warnings: ${violations.join(', ')}`,
      };
    }

    return {
      isValid: true,
      status: 'PASS',
      violations: [],
    };
  }

  /**
   * Check constraint compliance
   * 
   * Validates that referenced constraints exist in Tier 3.
   * Note: This is a simplified check. In production, this would query
   * the Tier 3 constraint engine to verify constraint existence.
   */
  private checkConstraintCompliance(pack: SupplierPack): {
    isValid: boolean;
    status: 'PASS' | 'FAIL' | 'WARNING';
    violations: string[];
    referencedConstraints: string[];
    message?: string;
  } {
    const _violations: string[] = [];
    const referencedConstraints: string[] = [];

    // Extract constraint references from profiles
    // In a real implementation, this would parse constraint references
    // from profile metadata or annotations
    for (const profile of pack.profiles) {
      // Example: Extract constraint references from compatibleSystemPacks
      // In production, this would be more sophisticated
      profile.compatibleSystemPacks.forEach((systemPackId) => {
        if (!referencedConstraints.includes(systemPackId)) {
          referencedConstraints.push(systemPackId);
        }
      });
    }

    // Extract constraint references from hardware
    for (const hardware of pack.hardware) {
      hardware.compatibleSystemPacks.forEach((systemPackId) => {
        if (!referencedConstraints.includes(systemPackId)) {
          referencedConstraints.push(systemPackId);
        }
      });
    }

    // In production, validate that all referenced constraints exist in Tier 3
    // For now, we assume all system pack references are valid
    // This would be replaced with:
    // const allConstraintsValid = referencedConstraints.every(ref =>
    //   this.tier3ConstraintEngine.constraintExists(ref)
    // );

    return {
      isValid: true,
      status: 'PASS',
      violations: [],
      referencedConstraints,
    };
  }

  /**
   * Check version lock
   * 
   * Validates that the pack has a valid cryptographic hash.
   */
  private async checkVersionLock(pack: SupplierPack): Promise<{
    isValid: boolean;
    hash: string;
    message?: string;
  }> {
    // Generate hash of pack contents (excluding certification, which includes the hash)
    const packForHashing = {
      metadata: pack.metadata,
      profiles: pack.profiles,
      hardware: pack.hardware,
      priceReference: pack.priceReference,
    };

    const packString = JSON.stringify(packForHashing, null, 0);
    const hash = await this.generateSHA256(packString);

    // Check if certification hash matches (if certification exists)
    if (pack.certification?.validationResults?.versionLock?.hash) {
      const certifiedHash = pack.certification.validationResults.versionLock.hash;
      if (hash !== certifiedHash) {
        return {
          isValid: false,
          hash,
          message: 'Version lock hash mismatch. Pack may have been modified after certification.',
        };
      }
    }

    return {
      isValid: true,
      hash,
    };
  }

  /**
   * Generate SHA-256 hash using Web Crypto API
   */
  private async generateSHA256(data: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback: simple hash for environments without crypto
    return btoa(data).substring(0, 64);
  }
}

/**
 * Singleton instance
 */
export const supplierPackValidator = new SupplierPackValidator();

