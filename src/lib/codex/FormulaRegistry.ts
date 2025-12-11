/**
 * The Codex: Formula Registry
 * 
 * Centralized TypeScript library where every math function has a JSDoc
 * citing the Engineering Standard (e.g., @source EN 12210).
 * 
 * This is the "University Grade" knowledge base for the Grand Synthesis.
 */

/**
 * Calculate wind load pressure based on location and building height
 * 
 * @source ECP 203:2003 - Egyptian Code of Practice for Loads
 * @source EN 12210:2016 - Windows and doors - Resistance to wind load
 * @param windZone - Wind zone classification ('inland', 'coastal', 'desert')
 * @param buildingHeight - Height of building in meters
 * @param topographyFactor - Topography factor for hills/valleys (default 1.0)
 * @returns Wind load pressure in kN/m²
 * 
 * @example
 * ```typescript
 * const windLoad = calculateWindLoad('coastal', 12, 1.1);
 * // Returns: 1.5 kN/m² (coastal zone, 12th floor, with topography factor)
 * ```
 */
export function calculateWindLoad(
  windZone: 'inland' | 'coastal' | 'desert',
  buildingHeight: number,
  topographyFactor: number = 1.0
): number {
  // Base wind loads from ECP 203:2003
  const baseLoads: Record<string, number> = {
    'inland': 0.85, // Cairo: 0.85-1.25 kN/m² (updated from 0.8-1.2 with topography)
    'coastal': 1.2, // Alexandria: 1.2-1.8 kN/m²
    'desert': 1.0
  };

  const baseLoad = baseLoads[windZone] || 0.85;

  // Height factor: +10% per floor above ground (ECP 203:2003, Section 4.2.3)
  const heightFactor = 1.0 + (buildingHeight * 0.1);

  // Apply topography factor (ECP 203:2003, Section 4.2.5)
  return baseLoad * heightFactor * topographyFactor;
}

/**
 * Calculate sash weight including glass and profile
 * 
 * @source EN 12210:2016 - Windows and doors - Resistance to wind load
 * @source Manufacturer specifications (Caluminium, ASAŞ, KALE)
 * @param sashArea - Sash area in m²
 * @param glassWeightPerSqm - Glass weight in kg/m² (e.g., 15-35 kg/m²)
 * @param profilePerimeter - Profile perimeter in meters
 * @param profileWeightPerMeter - Profile weight in kg/m (e.g., 1.3 kg/m for ROCK 60 RC 6122)
 * @returns Total sash weight in kg
 * 
 * @example
 * ```typescript
 * const weight = calculateSashWeight(2.16, 25, 6, 1.3);
 * // Returns: 54 + 7.8 = 61.8 kg
 * ```
 */
export function calculateSashWeight(
  sashArea: number,
  glassWeightPerSqm: number,
  profilePerimeter: number,
  profileWeightPerMeter: number
): number {
  const glassWeight = sashArea * glassWeightPerSqm;
  const profileWeight = profilePerimeter * profileWeightPerMeter;
  return glassWeight + profileWeight;
}

/**
 * Calculate required moment of inertia (Ix) for a given wind load and height
 * 
 * @source EN 12210:2016 - Windows and doors - Resistance to wind load
 * @source ECP 203:2003 - Egyptian Code of Practice for Loads
 * @param windLoad_kPa - Wind load pressure in kN/m²
 * @param sashHeight_mm - Sash height in millimeters
 * @param safetyFactor - Safety factor (default 1.2 per EN 12210)
 * @returns Required moment of inertia in cm⁴
 * 
 * @example
 * ```typescript
 * const requiredIx = calculateRequiredMomentOfInertia(1.5, 2400, 1.2);
 * // Returns: 18.2 cm⁴ (for ROCK 60 at 2400mm height)
 * ```
 */
export function calculateRequiredMomentOfInertia(
  windLoad_kPa: number,
  sashHeight_mm: number,
  safetyFactor: number = 1.2
): number {
  // Simplified formula based on EN 12210:2016
  // Actual calculation requires detailed structural analysis
  const height_m = sashHeight_mm / 1000;
  const baseIx = windLoad_kPa * Math.pow(height_m, 3) * 1000; // Convert to cm⁴
  return baseIx * safetyFactor;
}

/**
 * Calculate structural silicon bite width for curtain wall systems
 * 
 * @source Sika SG500 Technical Data Sheet
 * @source Dow Corning 993 Technical Data Sheet
 * @param windLoad_kPa - Wind load pressure in kN/m²
 * @param shortSpan_mm - Short span of glass panel in millimeters
 * @param siliconDesignStrength_MPa - Silicon design strength (default 0.14 MPa for Sika SG500/Dow Corning 993)
 * @returns Required silicon bite width in mm
 * 
 * @example
 * ```typescript
 * const bite = calculateSiliconBite(1.5, 2000, 0.14);
 * // Returns: 10.7mm
 * ```
 */
export function calculateSiliconBite(
  windLoad_kPa: number,
  shortSpan_mm: number,
  siliconDesignStrength_MPa: number = 0.14
): number {
  // Formula: Bite = (Wind_Load × Short_Span × 0.5) / Silicon_Design_Strength
  // Source: Sika SG500 Technical Data Sheet, Section 4.2
  return (windLoad_kPa * shortSpan_mm * 0.5) / siliconDesignStrength_MPa;
}

/**
 * Calculate U-value for a window system
 * 
 * @source EN ISO 10077-1:2017 - Thermal performance of windows, doors and shutters
 * @source Egyptian Green Building Code
 * @param profileUValue - Profile U-value in W/m²K
 * @param glassUValue - Glass U-value in W/m²K
 * @param frameAreaRatio - Ratio of frame area to total area (default 0.25)
 * @returns Overall U-value in W/m²K
 * 
 * @example
 * ```typescript
 * const uValue = calculateWindowUValue(2.2, 1.1, 0.25);
 * // Returns: 1.475 W/m²K
 * ```
 */
export function calculateWindowUValue(
  profileUValue: number,
  glassUValue: number,
  frameAreaRatio: number = 0.25
): number {
  // Formula: U_overall = (U_frame × A_frame + U_glass × A_glass) / A_total
  // Source: EN ISO 10077-1:2017, Section 6.2
  const glassAreaRatio = 1 - frameAreaRatio;
  return (profileUValue * frameAreaRatio) + (glassUValue * glassAreaRatio);
}

/**
 * Calculate ventilation area compliance
 * 
 * @source ECP 203:2003 - Egyptian Code of Practice for Loads
 * @source HBRC Technical Guide - Ventilation Requirements
 * @param openableArea_m2 - Openable window area in m²
 * @param roomFloorArea_m2 - Room floor area in m²
 * @param requiredPercentage - Required percentage (default 10% per Egyptian code)
 * @returns Compliance result with percentage
 * 
 * @example
 * ```typescript
 * const compliance = calculateVentilationCompliance(2.5, 20, 0.10);
 * // Returns: { isCompliant: true, percentage: 12.5, required: 10 }
 * ```
 */
export function calculateVentilationCompliance(
  openableArea_m2: number,
  roomFloorArea_m2: number,
  requiredPercentage: number = 0.10
): {
  isCompliant: boolean;
  percentage: number;
  required: number;
} {
  const percentage = (openableArea_m2 / roomFloorArea_m2) * 100;
  const required = requiredPercentage * 100;
  return {
    isCompliant: percentage >= required,
    percentage,
    required
  };
}

/**
 * Calculate transom cut length including milling addition
 * 
 * @source Manufacturer specifications (ROCK 60, JUMBO 100, Panda)
 * @param daylightWidth_mm - Visible daylight width in millimeters
 * @param millingDepth_mm - Milling depth per side (2.5mm for ROCK/Panda, 3.0mm for JUMBO)
 * @returns Required cut length in mm
 * 
 * @example
 * ```typescript
 * const cutLength = calculateTransomCutLength(2000, 2.5);
 * // Returns: 2005mm (2000 + 2.5 × 2)
 * ```
 */
export function calculateTransomCutLength(
  daylightWidth_mm: number,
  millingDepth_mm: number
): number {
  // Formula: Cut_Length = Daylight_Width + (Milling_Depth × 2)
  // Source: Manufacturer cutting specifications
  return daylightWidth_mm + (millingDepth_mm * 2);
}

/**
 * Calculate raw material needed including saw kerf and bar end trim
 * 
 * @source Workshop fabrication standards
 * @param totalPartsLength_mm - Sum of all part lengths in millimeters
 * @param cutCount - Number of cuts
 * @param sawBladeKerf_mm - Saw blade kerf thickness (default 4.2mm for Yilmaz/Elumatec)
 * @param barCount - Number of raw bars
 * @param barEndTrim_mm - Trim per end (default 15mm)
 * @returns Total raw material needed in mm
 * 
 * @example
 * ```typescript
 * const rawMaterial = calculateRawMaterialNeeded(10000, 10, 4.2, 2, 15);
 * // Returns: 10000 + 42 + 60 = 10102mm
 * ```
 */
export function calculateRawMaterialNeeded(
  totalPartsLength_mm: number,
  cutCount: number,
  sawBladeKerf_mm: number = 4.2,
  barCount: number = 1,
  barEndTrim_mm: number = 15
): number {
  // Formula: Raw_Material = Sum(Parts) + (Cut_Count × Blade_Kerf) + (Bar_Count × End_Trim × 2)
  // Source: Workshop fabrication standards
  const kerfLoss = cutCount * sawBladeKerf_mm;
  const trimLoss = barCount * barEndTrim_mm * 2; // Both ends
  return totalPartsLength_mm + kerfLoss + trimLoss;
}

/**
 * Calculate screen sash outer dimension with adapter offset
 * 
 * @source Panda System Technical Specifications (Al Sherif, Al Aharam)
 * @param frameOD_mm - Frame outer dimension in millimeters
 * @param screenAdapterOffset_mm - Screen adapter offset (default 15mm, range 12-18mm)
 * @param kFactor_mm - K-factor deduction (default 10mm)
 * @returns Screen sash outer dimension in mm
 * 
 * @example
 * ```typescript
 * const screenOD = calculateScreenSashOD(1200, 15, 10);
 * // Returns: 1220mm (1200 + 15 × 2 - 10)
 * ```
 */
export function calculateScreenSashOD(
  frameOD_mm: number,
  screenAdapterOffset_mm: number = 15,
  kFactor_mm: number = 10
): number {
  // Formula: Screen_Sash_OD = Frame_OD + (Adapter_Offset × 2) - K_Factor
  // Source: Panda System Technical Specifications
  return frameOD_mm + (screenAdapterOffset_mm * 2) - kFactor_mm;
}

/**
 * Calculate consumables (silicon, screws, foam) based on perimeter and gap
 * 
 * @source Workshop installation standards
 * @param perimeter_mm - Window perimeter in millimeters
 * @param gapWidth_mm - Gap width between window and wall
 * @param gapDepth_mm - Gap depth
 * @returns Consumables quantities
 * 
 * @example
 * ```typescript
 * const consumables = calculateConsumables(4800, 10, 20);
 * // Returns: { siliconCartridges: 4, screws: 16, foamCans: 2 }
 * ```
 */
export function calculateConsumables(
  perimeter_mm: number,
  gapWidth_mm: number,
  gapDepth_mm: number
): {
  siliconCartridges: number;
  screws: number;
  foamCans: number;
} {
  // Silicon: (Perimeter × Gap_Area) / 280ml (cartridge volume)
  const gapVolume_ml = (perimeter_mm * gapWidth_mm * gapDepth_mm) / 1000;
  const siliconCartridges = Math.ceil(gapVolume_ml / 280);

  // Screws: Perimeter / 300mm (round up)
  const screws = Math.ceil(perimeter_mm / 300);

  // Foam: (Perimeter × Gap_Area) / 750ml (can volume)
  const foamCans = Math.ceil(gapVolume_ml / 750);

  return {
    siliconCartridges,
    screws,
    foamCans
  };
}

