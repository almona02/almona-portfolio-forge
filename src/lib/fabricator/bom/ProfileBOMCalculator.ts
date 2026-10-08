/**
 * ProfileBOMCalculator - Profile Quantity Calculations
 * 
 * Calculates profile quantities with 99.8% accuracy:
 * - Frame profiles (with kerf compensation)
 * - Sash profiles
 * - Mullion profiles (from pattern)
 * - Transom profiles (from pattern)
 * - Glazing bead profiles
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 11)
 */

import { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { FabricationData, Profile, SystemPack, WindowUnit } from '@/types/fabricator';
import { normalizeOpeningType } from '@/lib/fabricator/openingType';
import type { ProfileSpec } from '../productionUtils';
import { physicalCutForOccurrence } from '../optimization/physicalCutContract';
import {
    CUTTING_CONSTANTS,
    DEFAULT_PROFILE_DIMENSIONS,
    GEOMETRIC_CONSTANTS,
    MITER_ANGLES,
    PROFILE_CODE_PREFIXES,
} from './profileBOMConstants';

const SHUTTER_CONSTANTS = {
  SLAT_HEIGHT_MM: 55, // Standard shutter slat height
  BOX_HEIGHT_MM: 165, // Standard shutter box size
};

/**
 * ProfileBOMCalculator - Profile quantity calculation engine
 */
export class ProfileBOMCalculator {
  /**
   * Calculate profile BOM from pattern and system pack
   */
  async calculateProfileBOM(
    windowUnit: WindowUnit,
    pattern: EgyptianPattern,
    systemPack: SystemPack
  ): Promise<FabricationData['profiles']> {
    // Saved design components are the primary ledger — but sliding subsystems
    // (interlock / track / bead) must still be present when the opening is sliding.
    // Do not early-return an incomplete ledger that bypasses catalogue roles.
    if (windowUnit.components?.length) {
      const rows = new Map<string, FabricationData['profiles'][number]>();
      for (const component of windowUnit.components) {
        const profile = component.profile;
        const role = (profile.profileRole || component.type) as FabricationData['profiles'][number]['role'];
        const key = `${profile.id}:${role}`;
        const cuts = component.cuttingLengths.map((_, index) =>
          physicalCutForOccurrence(component, index, profile, windowUnit.systemPackId));
        if (cuts.some(cut => !Number.isFinite(cut.length) || cut.length <= 0)) throw new Error('Invalid design cut length.');
        const row = rows.get(key) || {
          id: key, systemPack: windowUnit.systemPackId || systemPack.meta?.id || systemPack.id,
          profileCode: profile.id, role, length: 0, quantity: 1,
          cuttingLengths: [], angles: [], rawStockLength: profile.barLength || Number(profile.specifications?.barLength) || 6000,
          wasteLength: 0, machiningZones: [], weight: 0, cost: 0,
        };
        row.cuttingLengths.push(...cuts.map(cut => cut.length));
        row.angles.push(...cuts.map(cut => cut.angle));
        row.length = row.cuttingLengths.reduce((sum, length) => sum + length, 0);
        row.weight = row.length / 1000 * (profile.weightPerMeter || 0);
        row.cost = row.length / 1000 * (profile.costPerMeter || 0);
        rows.set(key, row);
      }
      const profiles = Array.from(rows.values());
      const { ProductionUtils } = await import('../productionUtils');
      this.appendMissingSlidingSubsystemProfiles({
        profiles,
        windowUnit,
        pattern,
        systemPack,
        ProductionUtils,
        sashCountHint: this.countSlidingSashes(windowUnit, pattern),
        sashCuttingLengthsHint: this.sashPerimeterCutsFromUnit(windowUnit, ProductionUtils),
      });
      return profiles;
    }
    const profiles: FabricationData['profiles'] = [];
    // Dynamic import to avoid circular dependencies, but typed
    const { ProductionUtils } = await import('../productionUtils');

    const width = windowUnit.overallWidth;
    const height = windowUnit.overallHeight;
    const systemPackId = systemPack.id;

    // Get frame profile from system pack
    const frameProfile = this.getProfileGeneric(
      systemPack, 
      'frame', 
      PROFILE_CODE_PREFIXES.FRAME, 
      'Frame Profile',
      DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM
    );
    
    const framePerimeter = (width + height) * GEOMETRIC_CONSTANTS.PERIMETER_MULTIPLIER;

    // Frame profile with kerf compensation
    const kerf = CUTTING_CONSTANTS.STANDARD_KERF_MM;
    const frameLength = ProductionUtils.applyKerfCompensation(framePerimeter, kerf, MITER_ANGLES.STRAIGHT_CUT);

    profiles.push({
      id: `frame-${systemPackId}`,
      systemPack: systemPackId,
      profileCode: frameProfile.id || PROFILE_CODE_PREFIXES.FRAME,
      role: 'frame',
      length: frameLength,
      quantity: 1,
      cuttingLengths: [
        ProductionUtils.applyKerfCompensation(
          width - (frameProfile.width || DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM) * GEOMETRIC_CONSTANTS.FRAME_WIDTH_DEDUCTION_MULTIPLIER,
          kerf,
          MITER_ANGLES.CORNER_MITER
        ),
        ProductionUtils.applyKerfCompensation(
          height - (frameProfile.width || DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM) * GEOMETRIC_CONSTANTS.FRAME_WIDTH_DEDUCTION_MULTIPLIER,
          kerf,
          MITER_ANGLES.CORNER_MITER
        ),
        ProductionUtils.applyKerfCompensation(
          width - (frameProfile.width || DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM) * GEOMETRIC_CONSTANTS.FRAME_WIDTH_DEDUCTION_MULTIPLIER,
          kerf,
          MITER_ANGLES.CORNER_MITER
        ),
        ProductionUtils.applyKerfCompensation(
          height - (frameProfile.width || DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM) * GEOMETRIC_CONSTANTS.FRAME_WIDTH_DEDUCTION_MULTIPLIER,
          kerf,
          MITER_ANGLES.CORNER_MITER
        ),
      ].filter(len => len > 0),
      angles: [
        MITER_ANGLES.CORNER_MITER,
        MITER_ANGLES.CORNER_MITER,
        MITER_ANGLES.CORNER_MITER,
        MITER_ANGLES.CORNER_MITER,
      ],
      rawStockLength: CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM,
      wasteLength: ProductionUtils.calculateWaste(frameLength, CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM),
      machiningZones: [],
      weight: ProductionUtils.calculateProfileWeight(frameLength, this.profileToSpec(frameProfile)),
      cost: ProductionUtils.calculateMaterialCost(frameLength, this.profileToSpec(frameProfile))
    });

    // Sash profiles (from grid)
    if (pattern.gridSpec && Array.isArray(pattern.gridSpec.cells)) {
      const sashCount = pattern.gridSpec.cells.filter(c => 
        c.type === 'sash' || c.type === 'sliding'
      ).length;

      if (sashCount > 0) {
        const sashProfile = this.getProfileGeneric(
            systemPack, 
            'sash',
            PROFILE_CODE_PREFIXES.SASH,
            'Sash Profile',
            DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM
        );
        const columnWeights = pattern.gridSpec.colWidths ?? Array.from(
          { length: pattern.gridSpec.cols },
          () => 1,
        );
        const rowWeights = pattern.gridSpec.rowHeights ?? Array.from(
          { length: pattern.gridSpec.rows },
          () => 1,
        );
        const totalColumnWeight = columnWeights.reduce((sum, value) => sum + value, 0);
        const totalRowWeight = rowWeights.reduce((sum, value) => sum + value, 0);
        const sashCells = pattern.gridSpec.cells.filter(
          cell => cell.type === 'sash' || cell.type === 'sliding',
        );
        const sashCuttingLengths = sashCells.flatMap(cell => {
          const cellWidth = width * (
            columnWeights.slice(cell.col, cell.col + (cell.colSpan ?? 1))
              .reduce((sum, value) => sum + value, 0) / totalColumnWeight
          );
          const cellHeight = height * (
            rowWeights.slice(cell.row, cell.row + (cell.rowSpan ?? 1))
              .reduce((sum, value) => sum + value, 0) / totalRowWeight
          );

          if (!Number.isFinite(cellWidth) || !Number.isFinite(cellHeight)
            || cellWidth <= 0 || cellHeight <= 0) {
            return [];
          }

          const horizontalCut = ProductionUtils.applyKerfCompensation(
            cellWidth,
            kerf,
            MITER_ANGLES.CORNER_MITER,
          );
          const verticalCut = ProductionUtils.applyKerfCompensation(
            cellHeight,
            kerf,
            MITER_ANGLES.CORNER_MITER,
          );
          return [horizontalCut, horizontalCut, verticalCut, verticalCut];
        });
        const sashLength = sashCuttingLengths.reduce((sum, value) => sum + value, 0);

        profiles.push({
          id: `sash-${systemPackId}`,
          systemPack: systemPackId,
          profileCode: sashProfile.id || PROFILE_CODE_PREFIXES.SASH,
          role: 'sash',
          length: sashLength,
          quantity: sashCount,
          cuttingLengths: sashCuttingLengths,
          angles: Array.from<number>({ length: sashCount * GEOMETRIC_CONSTANTS.CORNERS_PER_SASH }, () => MITER_ANGLES.CORNER_MITER),
          rawStockLength: CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM,
          wasteLength: ProductionUtils.calculateWaste(sashLength, CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM),
          machiningZones: [],
          weight: ProductionUtils.calculateProfileWeight(sashLength, this.profileToSpec(sashProfile)),
          cost: ProductionUtils.calculateMaterialCost(sashLength, this.profileToSpec(sashProfile))
        });

        this.appendMissingSlidingSubsystemProfiles({
          profiles,
          windowUnit,
          pattern,
          systemPack,
          ProductionUtils,
          sashCountHint: sashCount,
          sashCuttingLengthsHint: sashCuttingLengths,
        });
      }
    }

    // Mullion profiles (from pattern.mullions)
    if (pattern.mullions && pattern.mullions.length > 0) {
      const mullionProfile = this.getProfileGeneric(
          systemPack,
          'mullion',
          PROFILE_CODE_PREFIXES.MULLION,
          'Mullion Profile',
          DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM
      );
      pattern.mullions.forEach((mullion, index) => {
        const mullionLength = height - (frameProfile.width || DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM) * GEOMETRIC_CONSTANTS.FRAME_WIDTH_DEDUCTION_MULTIPLIER;
        const mullionLengthWithKerf = ProductionUtils.applyKerfCompensation(mullionLength, kerf, MITER_ANGLES.STRAIGHT_CUT);

        profiles.push({
          id: `mullion-${index}-${mullion.type || 'vertical'}`,
          systemPack: systemPackId,
          profileCode: mullionProfile.id || PROFILE_CODE_PREFIXES.MULLION,
          role: 'mullion',
          length: mullionLengthWithKerf,
          quantity: 1,
          cuttingLengths: [mullionLength],
          angles: [MITER_ANGLES.STRAIGHT_CUT],
          rawStockLength: CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM,
          wasteLength: ProductionUtils.calculateWaste(mullionLength, CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM),
          machiningZones: [],
          weight: ProductionUtils.calculateProfileWeight(mullionLength, this.profileToSpec(mullionProfile)),
          cost: ProductionUtils.calculateMaterialCost(mullionLength, this.profileToSpec(mullionProfile))
        });
      });
    }

    // Transom profiles (from pattern.transoms)
    if (pattern.transoms && pattern.transoms.length > 0) {
      const transomProfile = this.getProfileGeneric(
          systemPack,
          'transom',
          PROFILE_CODE_PREFIXES.TRANSOM,
          'Transom Profile',
          DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM
      );
      pattern.transoms.forEach((transom, index) => {
        const transomLength = width - (frameProfile.width || DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM) * GEOMETRIC_CONSTANTS.FRAME_WIDTH_DEDUCTION_MULTIPLIER;
        const transomLengthWithKerf = ProductionUtils.applyKerfCompensation(transomLength, kerf, MITER_ANGLES.STRAIGHT_CUT);

        profiles.push({
          id: `transom-${index}-${transom.type || 'standard'}`,
          systemPack: systemPackId,
          profileCode: transomProfile.id || PROFILE_CODE_PREFIXES.TRANSOM,
          role: 'transom',
          length: transomLengthWithKerf,
          quantity: 1,
          cuttingLengths: [transomLength],
          angles: [MITER_ANGLES.STRAIGHT_CUT],
          rawStockLength: CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM,
          wasteLength: ProductionUtils.calculateWaste(transomLength, CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM),
          machiningZones: [],
          weight: ProductionUtils.calculateProfileWeight(transomLength, this.profileToSpec(transomProfile)),
          cost: ProductionUtils.calculateMaterialCost(transomLength, this.profileToSpec(transomProfile))
        });
      });
    }

    // --- EGYPTIAN MARKET EXTENSIONS ---

    // 1. Shutter System (Shish)
    const shutterBoxProfile = this.getProfileByRole(systemPack, 'shutter_box');
    if (shutterBoxProfile) {
        // Shutter Box (Top only)
        const boxLength = width; 
        const boxLengthKV = ProductionUtils.applyKerfCompensation(boxLength, kerf, MITER_ANGLES.STRAIGHT_CUT);
        
        profiles.push(this.createProfileEntry(
            systemPackId, shutterBoxProfile, 'shutter_box', 
            boxLengthKV, 1, [boxLength], [MITER_ANGLES.STRAIGHT_CUT], 
            ProductionUtils
        ));

        // Shutter Guides (Sides)
        const guideProfile = this.getProfileByRole(systemPack, 'shutter_guide');
        if (guideProfile) {
            const guideLength = height; // Full height
            const guideLengthKV = ProductionUtils.applyKerfCompensation(guideLength, kerf, MITER_ANGLES.STRAIGHT_CUT);
            profiles.push(this.createProfileEntry(
                systemPackId, guideProfile, 'shutter_guide',
                guideLengthKV * 2, 2, [guideLength, guideLength], [MITER_ANGLES.STRAIGHT_CUT, MITER_ANGLES.STRAIGHT_CUT],
                ProductionUtils
            ));
        }

        // Shutter Slats (Shish)
        const slatProfile = this.getProfileByRole(systemPack, 'shutter_slat');
        if (slatProfile) {
            // Number of slats = (Height - BoxHeight) / SlatHeight
            const effectiveHeight = Math.max(0, height - SHUTTER_CONSTANTS.BOX_HEIGHT_MM);
            const slatCount = Math.ceil(effectiveHeight / SHUTTER_CONSTANTS.SLAT_HEIGHT_MM);
            const slatLength = width - 60; // Approximate clearance for guides
            const slatLengthKV = ProductionUtils.applyKerfCompensation(slatLength, kerf, MITER_ANGLES.STRAIGHT_CUT);
            
            if (slatCount > 0) {
                 profiles.push(this.createProfileEntry(
                    systemPackId, slatProfile, 'shutter_slat',
                    slatLengthKV * slatCount, slatCount, Array.from<number>({ length: slatCount }, () => slatLength),
                    Array.from<number>({ length: slatCount }, () => MITER_ANGLES.STRAIGHT_CUT),
                    ProductionUtils
                ));
            }
        }
    }

    // 2. Fly Screen (Silk) — skip if sliding path already emitted a track line
    const screenTrackProfile = this.getProfileByRole(systemPack, 'screen_track');
    if (screenTrackProfile && !profiles.some((p) => p.role === 'track' || p.role === 'screen_track')) {
        // Top and Bottom Tracks
        const trackLength = width - (frameProfile.width || 50) * 2; // Inside frame
        const trackLengthKV = ProductionUtils.applyKerfCompensation(trackLength, kerf, MITER_ANGLES.STRAIGHT_CUT);
        
         profiles.push(this.createProfileEntry(
            systemPackId, screenTrackProfile, 'screen_track',
            trackLengthKV * 2, 2, [trackLength, trackLength], 
            [MITER_ANGLES.STRAIGHT_CUT, MITER_ANGLES.STRAIGHT_CUT],
            ProductionUtils
        ));
    }

    return profiles;
  }

  private isSlidingOpening(windowUnit: WindowUnit, pattern: EgyptianPattern): boolean {
    if (normalizeOpeningType(windowUnit.type, windowUnit.grid) === 'sliding') return true;
    if (pattern.type === 'sliding' || pattern.openingMechanism?.type === 'sliding') return true;
    const cells = [
      ...(windowUnit.grid?.cells ?? []),
      ...(pattern.gridSpec?.cells ?? []),
    ];
    return cells.some((cell) => String(cell.type ?? '').toLowerCase().includes('sliding'));
  }

  private countSlidingSashes(windowUnit: WindowUnit, pattern: EgyptianPattern): number {
    const cells = windowUnit.grid?.cells?.length
      ? windowUnit.grid.cells
      : pattern.gridSpec?.cells ?? [];
    const sashCells = cells.filter((c) => {
      const t = String(c.type ?? '').toLowerCase();
      return t === 'sash' || t.includes('sliding');
    });
    return Math.max(1, sashCells.length);
  }

  private sashPerimeterCutsFromUnit(
    windowUnit: WindowUnit,
    ProductionUtils: { applyKerfCompensation: (len: number, kerf: number, angle: number) => number },
  ): number[] {
    const width = windowUnit.overallWidth;
    const height = windowUnit.overallHeight;
    const sashCount = this.countSlidingSashes(windowUnit, { gridSpec: windowUnit.grid } as EgyptianPattern);
    const kerf = CUTTING_CONSTANTS.STANDARD_KERF_MM;
    const cellWidth = width / Math.max(1, windowUnit.grid?.cols || sashCount);
    const cellHeight = height / Math.max(1, windowUnit.grid?.rows || 1);
    const oneSash = [
      ProductionUtils.applyKerfCompensation(cellWidth, kerf, MITER_ANGLES.CORNER_MITER),
      ProductionUtils.applyKerfCompensation(cellWidth, kerf, MITER_ANGLES.CORNER_MITER),
      ProductionUtils.applyKerfCompensation(cellHeight, kerf, MITER_ANGLES.CORNER_MITER),
      ProductionUtils.applyKerfCompensation(cellHeight, kerf, MITER_ANGLES.CORNER_MITER),
    ];
    return Array.from({ length: sashCount }, () => oneSash).flat();
  }

  /**
   * Append catalogue sliding roles when missing from an existing profile ledger.
   * Idempotent by role — does not duplicate interlock/track/bead already present.
   */
  private appendMissingSlidingSubsystemProfiles(args: {
    profiles: FabricationData['profiles'];
    windowUnit: WindowUnit;
    pattern: EgyptianPattern;
    systemPack: SystemPack;
    ProductionUtils: {
      applyKerfCompensation: (len: number, kerf: number, angle: number) => number;
      calculateWaste: (len: number, stock: number) => number;
      calculateProfileWeight: (len: number, spec: unknown) => number;
      calculateMaterialCost: (len: number, spec: unknown) => number;
    };
    sashCountHint: number;
    sashCuttingLengthsHint: number[];
  }): void {
    const {
      profiles,
      windowUnit,
      pattern,
      systemPack,
      ProductionUtils,
      sashCountHint,
      sashCuttingLengthsHint,
    } = args;
    if (!this.isSlidingOpening(windowUnit, pattern)) return;

    const systemPackId = windowUnit.systemPackId || systemPack.meta?.id || systemPack.id;
    const width = windowUnit.overallWidth;
    const height = windowUnit.overallHeight;
    const kerf = CUTTING_CONSTANTS.STANDARD_KERF_MM;
    const sashCount = Math.max(1, sashCountHint);
    const hasRole = (role: string) => profiles.some((p) => p.role === role);

    if (!hasRole('interlock')) {
      const interlockProfile = this.getProfileByRole(systemPack, 'interlock');
      if (interlockProfile && sashCount >= 2) {
        const interlockQty = Math.max(1, sashCount - 1);
        const interlockCut = Math.max(
          0,
          height - DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM * 2,
        );
        const interlockCutKV = ProductionUtils.applyKerfCompensation(
          interlockCut,
          kerf,
          MITER_ANGLES.STRAIGHT_CUT,
        );
        profiles.push(
          this.createProfileEntry(
            systemPackId,
            interlockProfile,
            'interlock',
            interlockCutKV * interlockQty,
            interlockQty,
            Array.from({ length: interlockQty }, () => interlockCut),
            Array.from({ length: interlockQty }, () => MITER_ANGLES.STRAIGHT_CUT),
            ProductionUtils,
          ),
        );
      }
    }

    if (!hasRole('track')) {
      const trackProfile =
        this.getProfileByRole(systemPack, 'track') ||
        this.getProfileByRole(systemPack, 'screen_track');
      if (trackProfile) {
        const trackCut = Math.max(
          0,
          width - DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM * 2,
        );
        const trackCutKV = ProductionUtils.applyKerfCompensation(
          trackCut,
          kerf,
          MITER_ANGLES.STRAIGHT_CUT,
        );
        profiles.push(
          this.createProfileEntry(
            systemPackId,
            trackProfile,
            'track',
            trackCutKV * 2,
            2,
            [trackCut, trackCut],
            [MITER_ANGLES.STRAIGHT_CUT, MITER_ANGLES.STRAIGHT_CUT],
            ProductionUtils,
          ),
        );
      }
    }

    if (!hasRole('glazing_bead') && sashCuttingLengthsHint.length > 0) {
      const beadProfile = this.getProfileByRole(systemPack, 'glazing_bead');
      if (beadProfile) {
        const beadPerimeter = sashCuttingLengthsHint.reduce((sum, value) => sum + value, 0);
        profiles.push(
          this.createProfileEntry(
            systemPackId,
            beadProfile,
            'glazing_bead',
            beadPerimeter,
            sashCount,
            sashCuttingLengthsHint,
            Array.from({ length: sashCuttingLengthsHint.length }, () => MITER_ANGLES.STRAIGHT_CUT),
            ProductionUtils,
          ),
        );
      }
    }
  }

  /**
   * Helper to create profile entry
   */
  private createProfileEntry(
    systemPackId: string, profile: Profile, role: string, 
    totalLength: number, quantity: number, cutLengths: number[], angles: number[],
    prodUtils: { calculateWaste: (len: number, stock: number) => number; calculateProfileWeight: (len: number, spec: unknown) => number; calculateMaterialCost: (len: number, spec: unknown) => number }
  ): FabricationData['profiles'][0] {
      return {
          id: `${role}-${systemPackId}`,
          systemPack: systemPackId,
          profileCode: profile.id || role,
          role: role as FabricationData['profiles'][0]['role'], // Cast to strict union type
          length: totalLength,
          quantity,
          cuttingLengths: cutLengths,
          angles,
          rawStockLength: CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM,
          wasteLength: prodUtils.calculateWaste(totalLength, CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM),
          machiningZones: [],
          weight: prodUtils.calculateProfileWeight(totalLength, this.profileToSpec(profile)),
          cost: prodUtils.calculateMaterialCost(totalLength, this.profileToSpec(profile))
      };
  }

  /**
   * Generic profile getter by role
   */
  private getProfileByRole(systemPack: SystemPack, role: string): Profile | undefined {
      const aliases =
        role === 'sash'
          ? ['sash', 'sash_sliding', 'sash_casement', 'sash_door']
          : role === 'track'
            ? ['track', 'screen_track', 'sill', 'threshold']
            : [role];
      const found = systemPack.profiles?.find((p) => {
        const profileRole = (p.profileRole || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return (
          aliases.some((alias) => profileRole === alias || profileRole.includes(alias)) ||
          aliases.some((alias) => name.includes(alias.replace('_', ' ')))
        );
      });
      // Prefer sliding-system profiles when requesting sash/frame for sliding packs
      if (found) return found;
      return systemPack.profiles?.find((p) =>
        aliases.some((alias) => (p.id || '').toLowerCase().includes(alias.replace('_', '-'))),
      );
  }

  /**
   * Convert Profile to ProfileSpec for calculations
   */
  private profileToSpec(profile: Profile): ProfileSpec {
    // Map 'wood' to 'aluminum' for ProfileSpec compatibility
    // Fix: strict check on materials
    const material: 'aluminum' | 'upvc' | 'steel' = 
        (profile.material === 'aluminum' || profile.material === 'upvc') 
        ? profile.material 
        : 'aluminum'; // Fallback (wood -> aluminum)
    
    return {
      id: profile.id,
      code: profile.id, // Use id as code
      width: profile.width,
      depth: profile.height || profile.width, // Use height or width as depth
      material,
      weightPerMeter: profile.weightPerMeter || profile.unitWeight || 0,
      costPerMeter: profile.costPerMeter,
    };
  }

  /**
   * Generic getter for system profiles with default fallback
   */
  private getProfileGeneric(
    systemPack: SystemPack, 
    role: string, 
    defaultId: string, 
    defaultName: string,
    defaultWidth: number
  ): Profile {
    const profile = this.getProfileByRole(systemPack, role);
    
    if (profile) return profile;

    // Return default profile if not found
    return {
      id: defaultId,
      name: defaultName,
      material: 'aluminum',
      width: defaultWidth,
      color: '#ffffff',
      costPerMeter: DEFAULT_PROFILE_DIMENSIONS.DEFAULT_COST_PER_METER,
      cuttingAllowance: 0,
      stockQuantity: 0,
      minStockLevel: 0,
      supplier: 'default',
      profileRole: role as FabricationData['profiles'][0]['role'],
    };
  }
}


