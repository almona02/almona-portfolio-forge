/**
 * Micron Engine - Phase 1: Foundational Precision
 * 
 * Core precision calculations for 99.8% accuracy:
 * - Saw blade kerf (4.2mm default)
 * - Bar end trim (15mm per end)
 * - Transom milling (profile-specific)
 * 
 * This is the ENGINE that saves the business.
 * No UI, no empire, just math that works.
 */

/**
 * Micron Configuration
 */
export interface MicronConfig {
  sawBladeKerf: number; // mm - Yilmaz/Elumatec standard (4.2mm)
  barEndTrim: number; // mm per end (15mm standard)
  barNominalLength: number; // mm (6000mm standard aluminum bar)
  machineClampSafety: number; // mm (50mm safety factor for CNC clamp)
}

/**
 * Micron Engine
 * 
 * Handles the three critical precision factors:
 * 1. Saw kerf (material lost per cut)
 * 2. Bar end trim (oxidized/damaged ends)
 * 3. Transom milling (profile-specific depth addition)
 */
export class MicronEngine {
  private config: MicronConfig;

  constructor(config?: Partial<MicronConfig>) {
    this.config = {
      sawBladeKerf: 4.2,
      barEndTrim: 15,
      barNominalLength: 6000,
      machineClampSafety: 50, // Safety factor for CNC clamp
      ...config
    };
  }

  /**
   * Calculate usable bar length
   * 
   * Formula: Nominal - (Trim × 2) - Machine_Clamp_Safety
   * 
   * Example: 6000 - (15 × 2) - 50 = 5920mm usable
   * 
   * @returns Usable length in mm
   */
  calculateUsableBarLength(): number {
    // Correction 3: Bar Utilization Safety Factor
    // The clamp on the CNC machine needs 50mm to hold the bar
    // Without this, the machine hits the clamp on the last cut
    return this.config.barNominalLength - 
           (this.config.barEndTrim * 2) - 
           this.config.machineClampSafety;
  }

  /**
   * Calculate total material needed with kerf
   * 
   * CRITICAL: Kerf applies to N-1 cuts (not N)
   * The last cut doesn't need kerf (no material left after cut)
   * 
   * @param cutLengths - Array of cut lengths in mm
   * @returns Total material needed including kerf
   */
  calculateTotalCutsWithKerf(cutLengths: number[]): number {
    if (cutLengths.length === 0) return 0;

    // Correction 1: Floating Point Precision
    // JavaScript is bad at math - round to 0.01mm precision
    const toPrecision = (num: number) => Math.round(num * 100) / 100;

    const totalMaterialNeeded = cutLengths.reduce((sum, length, index) => {
      // Last cut doesn't need kerf (no material left after cut)
      const kerf = index === cutLengths.length - 1 ? 0 : this.config.sawBladeKerf;
      return toPrecision(sum + length + kerf);
    }, 0);

    return totalMaterialNeeded;
  }

  /**
   * Calculate transom milling length
   * 
   * Transoms connect to frames/mullions with a T-joint.
   * The miller removes 2.5mm (or 3.0mm) from each side.
   * If we don't add this, the visible glass area is correct,
   * but the physical aluminum falls out of the frame.
   * 
   * @param daylightWidth - Visible daylight width in mm
   * @param profileId - Profile ID to determine milling depth
   * @returns Required cut length including milling
   */
  calculateTransomMillingLength(daylightWidth: number, profileId: string): number {
    // Profile-specific milling depths
    const millingDepths: Record<string, number> = {
      'rock-60': 2.5,
      'rock60': 2.5,
      'panda-50': 2.5,
      'panda50': 2.5,
      'panda-100': 2.5,
      'panda100': 2.5,
      'jumbo-100': 3.0,
      'jumbo100': 3.0,
      'generic': 2.0
    };

    const millingDepth = millingDepths[profileId.toLowerCase()] || 2.0;
    
    // Formula: Cut_Length = Daylight_Width + (Milling_Depth × 2)
    // Correction 1: Floating Point Precision
    const toPrecision = (num: number) => Math.round(num * 100) / 100;
    
    return toPrecision(daylightWidth + (millingDepth * 2));
  }

  /**
   * Calculate screen sash dimensions with adapter offset (Panda system)
   * 
   * CRITICAL: The screen adapter pushes the screen sash outward by 12-18mm
   * If we don't account for this, every screen sash needs trimming on site
   * 
   * @param frameWidth - Frame outer dimension in mm
   * @param frameHeight - Frame outer dimension in mm
   * @param adapterOffset - Adapter offset in mm (default 15mm)
   * @param clearance - Clearance factor in mm (default 10mm)
   * @returns Screen sash dimensions
   */
  calculateScreenSashDimensions(
    frameWidth: number,
    frameHeight: number,
    adapterOffset: number = 15,
    clearance: number = 10
  ): {
    width: number;
    height: number;
    offset: number;
  } {
    // Correction 1: Floating Point Precision
    const toPrecision = (num: number) => Math.round(num * 100) / 100;

    // CRITICAL FORMULA: Screen_Sash = Frame + (Adapter_Offset × 2) - Clearance
    return {
      width: toPrecision(frameWidth + (adapterOffset * 2) - clearance),
      height: toPrecision(frameHeight + (adapterOffset * 2) - clearance),
      offset: adapterOffset
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MicronConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MicronConfig {
    return { ...this.config };
  }
}

// Export singleton instance with default config
export const micronEngine = new MicronEngine();

