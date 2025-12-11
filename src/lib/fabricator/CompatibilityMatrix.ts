/**
 * Compatibility Matrix
 * 
 * Defines and validates compatibility relationships between:
 * - Bead-Glass compatibility
 * - Hardware-Profile compatibility
 * - Profile-Profile compatibility
 * - Accessory-System compatibility
 * 
 * This is the "Role Checker" that ensures physically possible assemblies.
 */

import type { Profile } from '@/types/fabricator';
import { EGYPTIAN_HARDWARE_DATABASE } from '@/data/egyptian-hardware-database';

/**
 * Compatibility check result
 */
export interface CompatibilityResult {
  isCompatible: boolean;
  reason?: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Compatibility Matrix
 * 
 * Validates component compatibility to prevent physically impossible designs
 */
export class CompatibilityMatrix {
  /**
   * Check if bead is compatible with glass thickness
   * 
   * @param beadProfile - Bead profile
   * @param glassThickness - Glass thickness in mm
   * @param sashInnerGap - Sash inner gap in mm
   * @returns Compatibility result
   */
  checkBeadGlassCompatibility(
    beadProfile: Profile,
    glassThickness: number,
    sashInnerGap: number
  ): CompatibilityResult {
    const beadSize = beadProfile.width || 10;
    const gasketCompression = 6; // Standard 3mm internal + 3mm external
    const totalPackage = glassThickness + beadSize + gasketCompression;

    if (totalPackage > sashInnerGap) {
      return {
        isCompatible: false,
        reason: `Glass package (${totalPackage}mm) too thick for sash inner gap (${sashInnerGap}mm). Maximum allowed: ${sashInnerGap}mm.`,
        severity: 'error'
      };
    }

    // Check if bead size is in compatible list
    const compatibleBeadSizes = beadProfile.compatibleBeadSizes || [];
    if (compatibleBeadSizes.length > 0 && !compatibleBeadSizes.includes(beadSize)) {
      return {
        isCompatible: false,
        reason: `Bead size (${beadSize}mm) not in compatible list: ${compatibleBeadSizes.join(', ')}mm`,
        severity: 'error'
      };
    }

    return {
      isCompatible: true,
      severity: 'info'
    };
  }

  /**
   * Check if hardware is compatible with profile
   * 
   * @param hardware - Hardware item
   * @param profile - Profile
   * @returns Compatibility result
   */
  checkHardwareProfileCompatibility(
    hardware: { type: string; trackType?: string; maxLoadCapacity: number },
    profile: Profile
  ): CompatibilityResult {
    // Check track type compatibility for rollers
    if (hardware.type === 'roller' && hardware.trackType && profile.trackType) {
      if (hardware.trackType !== profile.trackType) {
        return {
          isCompatible: false,
          reason: `Roller track type (${hardware.trackType}) incompatible with profile track type (${profile.trackType})`,
          severity: 'error'
        };
      }
    }

    // Check load capacity
    if (profile.maxLoadCapacity && hardware.maxLoadCapacity > profile.maxLoadCapacity) {
      return {
        isCompatible: false,
        reason: `Hardware capacity (${hardware.maxLoadCapacity}kg) exceeds profile limit (${profile.maxLoadCapacity}kg)`,
        severity: 'error'
      };
    }

    return {
      isCompatible: true,
      severity: 'info'
    };
  }

  /**
   * Check if profiles can connect (frame-sash, mullion-frame)
   * 
   * @param profile1 - First profile
   * @param profile2 - Second profile
   * @param connectionType - Type of connection
   * @returns Compatibility result
   */
  checkProfileProfileCompatibility(
    profile1: Profile,
    profile2: Profile,
    connectionType: 'frame-sash' | 'mullion-frame' | 'transom-frame'
  ): CompatibilityResult {
    // Frame-Sash compatibility
    if (connectionType === 'frame-sash') {
      if (profile1.profileRole === 'frame' && profile2.profileRole === 'sash') {
        // Check if they're from the same system
        const system1 = profile1.systemPackIds?.[0];
        const system2 = profile2.systemPackIds?.[0];
        
        if (system1 && system2 && system1 !== system2) {
          return {
            isCompatible: false,
            reason: `Frame from system ${system1} cannot connect to sash from system ${system2}`,
            severity: 'error'
          };
        }
      }
    }

    // Transom-Frame compatibility (requires milling)
    if (connectionType === 'transom-frame') {
      if (profile1.profileRole === 'transom' && profile2.profileRole === 'frame') {
        const millingDepth = profile2.transomMillingDepth || 2.5;
        if (!millingDepth) {
          return {
            isCompatible: false,
            reason: 'Transom connection requires milling depth specification',
            severity: 'error'
          };
        }
      }
    }

    return {
      isCompatible: true,
      severity: 'info'
    };
  }

  /**
   * Check if accessory is compatible with system
   * 
   * @param accessoryId - Accessory ID
   * @param systemPackId - System pack ID
   * @returns Compatibility result
   */
  checkAccessorySystemCompatibility(
    accessoryId: string,
    systemPackId: string
  ): CompatibilityResult {
    const accessory = EGYPTIAN_HARDWARE_DATABASE.sliding.find(a => a.id === accessoryId) ||
                     EGYPTIAN_HARDWARE_DATABASE.hinged.find(a => a.id === accessoryId);

    if (!accessory) {
      return {
        isCompatible: false,
        reason: `Accessory ${accessoryId} not found in database`,
        severity: 'error'
      };
    }

    // Check availability in Egypt
    if (!accessory.availableInEgypt) {
      return {
        isCompatible: false,
        reason: `Accessory ${accessory.name} is not available in Egypt`,
        severity: 'warning'
      };
    }

    // System-specific compatibility checks
    if (systemPackId === 'panda-50' || systemPackId === 'panda-100') {
      // Panda system requires specific accessories
      if (accessory.category === 'panda') {
        return {
          isCompatible: true,
          severity: 'info'
        };
      }
    }

    return {
      isCompatible: true,
      severity: 'info'
    };
  }

  /**
   * Check screen sash compatibility (Panda system)
   * 
   * @param screenSashProfile - Screen sash profile
   * @param glassSashProfile - Glass sash profile
   * @param glassSashDimensions - Glass sash dimensions
   * @returns Compatibility result
   */
  checkScreenSashCompatibility(
    screenSashProfile: Profile,
    glassSashProfile: Profile,
    glassSashDimensions: { width: number; height: number }
  ): CompatibilityResult {
    // Screen sash must be smaller than glass sash by at least 10mm
    const screenSashWidth = screenSashProfile.width || 28;
    const requiredClearance = 10; // mm

    if (screenSashWidth >= (glassSashDimensions.width - requiredClearance)) {
      return {
        isCompatible: false,
        reason: `Screen sash width (${screenSashWidth}mm) must be at least ${requiredClearance}mm smaller than glass sash (${glassSashDimensions.width}mm)`,
        severity: 'error'
      };
    }

    return {
      isCompatible: true,
      severity: 'info'
    };
  }

  /**
   * Check if system supports screen sash
   * 
   * @param systemPackId - System pack ID
   * @returns Compatibility result
   */
  checkScreenSashSupport(systemPackId: string): CompatibilityResult {
    const supportsScreenSash = ['panda-50', 'panda-100'].includes(systemPackId);

    if (!supportsScreenSash) {
      return {
        isCompatible: false,
        reason: `System ${systemPackId} does not support integrated screen sash. Only Panda systems support this feature.`,
        severity: 'error'
      };
    }

    return {
      isCompatible: true,
      severity: 'info'
    };
  }

  /**
   * Check if profile can be bent for arches
   * 
   * @param profile - Profile
   * @param bendingRadius - Desired bending radius in mm
   * @returns Compatibility result
   */
  checkBendingCompatibility(
    profile: Profile,
    bendingRadius: number
  ): CompatibilityResult {
    if (!profile.supportsBending) {
      return {
        isCompatible: false,
        reason: `Profile ${profile.name} does not support bending`,
        severity: 'error'
      };
    }

    const minBendingRadius = profile.minBendingRadius || 1000;
    if (bendingRadius < minBendingRadius) {
      return {
        isCompatible: false,
        reason: `Bending radius (${bendingRadius}mm) is less than minimum (${minBendingRadius}mm) for this profile`,
        severity: 'error'
      };
    }

    return {
      isCompatible: true,
      severity: 'info'
    };
  }
}

// Export singleton instance
export const compatibilityMatrix = new CompatibilityMatrix();

