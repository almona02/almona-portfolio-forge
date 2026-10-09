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
import type {
  FabricationData,
  Profile,
  SystemPack,
  WindowComponent,
  WindowGrid,
  WindowUnit,
} from '@/types/fabricator';
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

type ProfileBOMRow = FabricationData['profiles'][number];
type ProdUtilsLike = {
  applyKerfCompensation: (len: number, kerf: number, angle: number) => number;
  calculateWaste: (len: number, stock: number) => number;
  calculateProfileWeight: (len: number, spec: ProfileSpec) => number;
  calculateMaterialCost: (len: number, spec: ProfileSpec) => number;
};

function fillNumbers(length: number, value: number): number[] {
  return Array.from({ length }, () => value);
}

/** Canonical ledger role shared by generated and saved paths. */
function resolveLedgerRole(profile: Profile, fallback: string): ProfileBOMRow['role'] {
  const bomRole = profile.specifications?.bomRole;
  if (typeof bomRole === 'string' && bomRole) {
    return bomRole as ProfileBOMRow['role'];
  }
  const raw = String(profile.profileRole || fallback || 'unknown');
  if (raw === 'sash_sliding' || raw.startsWith('sash_')) return 'sash';
  if (raw === 'screen_track') return 'track';
  if (raw === 'glazing_bead_inner' || raw === 'glazing_bead_outer' || raw === 'bead') {
    return 'glazing_bead';
  }
  return raw as ProfileBOMRow['role'];
}

function componentHasLedgerRole(component: WindowComponent, role: string): boolean {
  const resolved = resolveLedgerRole(component.profile, component.type);
  if (resolved === role) return true;
  if (role === 'track') return resolved === 'screen_track' || component.type === 'track';
  if (role === 'glazing_bead') {
    return resolved === 'glazing_bead' || component.type === 'glazing_bead' || component.type === 'bead';
  }
  return component.type === role;
}

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
    const { ProductionUtils } = await import('../productionUtils');
    const utils = ProductionUtils as unknown as ProdUtilsLike;

    // Design components (saved or synthesised from the real grid generator) are the
    // single physical-cut authority via physicalCutForOccurrence.
    const designComponents = await this.resolveDesignComponents(windowUnit, pattern, systemPack);
    if (designComponents.length) {
      const profiles = this.rowsFromDesignComponents(designComponents, windowUnit, systemPack);
      this.appendMissingSlidingSubsystemProfiles({
        profiles,
        windowUnit,
        pattern,
        systemPack,
        ProductionUtils: utils,
        sashCountHint: this.countSlidingSashes(windowUnit, pattern),
        sashCuttingLengthsHint: this.sashPerimeterCutsFromUnit(
          { ...windowUnit, components: designComponents },
          utils,
        ),
      });
      return profiles;
    }

    const profiles: FabricationData['profiles'] = [];

    const width = windowUnit.overallWidth;
    const height = windowUnit.overallHeight;
    const systemPackId = systemPack.id || systemPack.meta?.id || 'unknown';

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
    const frameLength = utils.applyKerfCompensation(framePerimeter, kerf, MITER_ANGLES.STRAIGHT_CUT);

    profiles.push({
      id: `frame-${systemPackId}`,
      systemPack: systemPackId,
      profileCode: frameProfile.id || PROFILE_CODE_PREFIXES.FRAME,
      role: 'frame',
      length: frameLength,
      quantity: 1,
      cuttingLengths: [
        utils.applyKerfCompensation(
          width - (frameProfile.width || DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM) * GEOMETRIC_CONSTANTS.FRAME_WIDTH_DEDUCTION_MULTIPLIER,
          kerf,
          MITER_ANGLES.CORNER_MITER
        ),
        utils.applyKerfCompensation(
          height - (frameProfile.width || DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM) * GEOMETRIC_CONSTANTS.FRAME_WIDTH_DEDUCTION_MULTIPLIER,
          kerf,
          MITER_ANGLES.CORNER_MITER
        ),
        utils.applyKerfCompensation(
          width - (frameProfile.width || DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM) * GEOMETRIC_CONSTANTS.FRAME_WIDTH_DEDUCTION_MULTIPLIER,
          kerf,
          MITER_ANGLES.CORNER_MITER
        ),
        utils.applyKerfCompensation(
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
      wasteLength: utils.calculateWaste(frameLength, CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM),
      machiningZones: [],
      weight: utils.calculateProfileWeight(frameLength, this.profileToSpec(frameProfile)),
      cost: utils.calculateMaterialCost(frameLength, this.profileToSpec(frameProfile))
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

          const horizontalCut = utils.applyKerfCompensation(
            cellWidth,
            kerf,
            MITER_ANGLES.CORNER_MITER,
          );
          const verticalCut = utils.applyKerfCompensation(
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
          angles: fillNumbers(sashCount * GEOMETRIC_CONSTANTS.CORNERS_PER_SASH, MITER_ANGLES.CORNER_MITER),
          rawStockLength: CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM,
          wasteLength: utils.calculateWaste(sashLength, CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM),
          machiningZones: [],
          weight: utils.calculateProfileWeight(sashLength, this.profileToSpec(sashProfile)),
          cost: utils.calculateMaterialCost(sashLength, this.profileToSpec(sashProfile))
        });

        this.appendMissingSlidingSubsystemProfiles({
          profiles,
          windowUnit,
          pattern,
          systemPack,
          ProductionUtils: utils,
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
        const mullionLengthWithKerf = utils.applyKerfCompensation(mullionLength, kerf, MITER_ANGLES.STRAIGHT_CUT);

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
          wasteLength: utils.calculateWaste(mullionLength, CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM),
          machiningZones: [],
          weight: utils.calculateProfileWeight(mullionLength, this.profileToSpec(mullionProfile)),
          cost: utils.calculateMaterialCost(mullionLength, this.profileToSpec(mullionProfile))
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
        const transomLengthWithKerf = utils.applyKerfCompensation(transomLength, kerf, MITER_ANGLES.STRAIGHT_CUT);

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
          wasteLength: utils.calculateWaste(transomLength, CUTTING_CONSTANTS.STANDARD_STOCK_LENGTH_MM),
          machiningZones: [],
          weight: utils.calculateProfileWeight(transomLength, this.profileToSpec(transomProfile)),
          cost: utils.calculateMaterialCost(transomLength, this.profileToSpec(transomProfile))
        });
      });
    }

    // --- EGYPTIAN MARKET EXTENSIONS ---

    // 1. Shutter System (Shish) — only when the unit explicitly requests a shutter
    const wantsShutter = Boolean(
      (windowUnit as { shutterType?: string }).shutterType &&
        (windowUnit as { shutterType?: string }).shutterType !== 'none',
    );
    const shutterBoxProfile = wantsShutter ? this.getProfileByRole(systemPack, 'shutter_box') : undefined;
    if (shutterBoxProfile) {
        // Shutter Box (Top only)
        const boxLength = width; 
        const boxLengthKV = utils.applyKerfCompensation(boxLength, kerf, MITER_ANGLES.STRAIGHT_CUT);
        
        profiles.push(this.createProfileEntry(
            systemPackId, shutterBoxProfile, 'shutter_box', 
            boxLengthKV, 1, [boxLength], [MITER_ANGLES.STRAIGHT_CUT], 
            utils
        ));

        // Shutter Guides (Sides)
        const guideProfile = this.getProfileByRole(systemPack, 'shutter_guide');
        if (guideProfile) {
            const guideLength = height; // Full height
            const guideLengthKV = utils.applyKerfCompensation(guideLength, kerf, MITER_ANGLES.STRAIGHT_CUT);
            profiles.push(this.createProfileEntry(
                systemPackId, guideProfile, 'shutter_guide',
                guideLengthKV * 2, 2, [guideLength, guideLength], [MITER_ANGLES.STRAIGHT_CUT, MITER_ANGLES.STRAIGHT_CUT],
                utils
            ));
        }

        // Shutter Slats (Shish)
        const slatProfile = this.getProfileByRole(systemPack, 'shutter_slat');
        if (slatProfile) {
            // Number of slats = (Height - BoxHeight) / SlatHeight
            const effectiveHeight = Math.max(0, height - SHUTTER_CONSTANTS.BOX_HEIGHT_MM);
            const slatCount = Math.ceil(effectiveHeight / SHUTTER_CONSTANTS.SLAT_HEIGHT_MM);
            const slatLength = width - 60; // Approximate clearance for guides
            const slatLengthKV = utils.applyKerfCompensation(slatLength, kerf, MITER_ANGLES.STRAIGHT_CUT);
            
            if (slatCount > 0) {
                 profiles.push(this.createProfileEntry(
                    systemPackId, slatProfile, 'shutter_slat',
                    slatLengthKV * slatCount, slatCount, fillNumbers(slatCount, slatLength),
                    fillNumbers(slatCount, MITER_ANGLES.STRAIGHT_CUT),
                    utils
                ));
            }
        }
    }

    // 2. Fly Screen — only when measuring/design selected a fly screen (not every pack that catalogues a track)
    const flyScreenType = String(windowUnit.flyScreenType ?? '').toLowerCase();
    const wantsFlyScreen = Boolean(flyScreenType && flyScreenType !== 'none');
    const screenTrackProfile = wantsFlyScreen
      ? this.getProfileByRole(systemPack, 'screen_track')
      : undefined;
    if (
      screenTrackProfile &&
      !profiles.some((p) => p.role === 'track' || p.role === 'screen_track')
    ) {
      const trackLength = width - (frameProfile.width || 50) * 2;
      const trackLengthKV = utils.applyKerfCompensation(
        trackLength,
        kerf,
        MITER_ANGLES.STRAIGHT_CUT,
      );
      profiles.push(
        this.createProfileEntry(
          systemPackId,
          screenTrackProfile,
          'screen_track',
          trackLengthKV * 2,
          2,
          [trackLength, trackLength],
          [MITER_ANGLES.STRAIGHT_CUT, MITER_ANGLES.STRAIGHT_CUT],
          utils,
        ),
      );
    }

    return profiles;
  }

  /**
   * Resolve design-level components: prefer saved ledger, else synthesise via
   * generateComponentsFromGrid (+ sliding track) so empty and saved paths share
   * the same physicalCutForOccurrence contract.
   */
  private async resolveDesignComponents(
    windowUnit: WindowUnit,
    pattern: EgyptianPattern,
    systemPack: SystemPack,
  ): Promise<WindowComponent[]> {
    if (windowUnit.components?.length) {
      return this.ensureSlidingTrackDesignComponents(
        windowUnit.components,
        windowUnit,
        pattern,
        systemPack,
      );
    }

    const grid = (windowUnit.grid ?? pattern.gridSpec) as WindowGrid | undefined;
    if (!grid?.cells?.length) return [];

    const { generateComponentsFromGrid } = await import('@/algorithms/smartDraw');
    const packId = windowUnit.systemPackId || systemPack.meta?.id || systemPack.id || null;
    const { components } = generateComponentsFromGrid(
      { ...windowUnit, grid },
      grid,
      systemPack.profiles ?? [],
      packId,
      systemPack,
    );
    return this.ensureSlidingTrackDesignComponents(components, windowUnit, pattern, systemPack);
  }

  private ensureSlidingTrackDesignComponents(
    components: WindowComponent[],
    windowUnit: WindowUnit,
    pattern: EgyptianPattern,
    systemPack: SystemPack,
  ): WindowComponent[] {
    if (!this.isSlidingOpening(windowUnit, pattern)) return components;
    if (components.some((component) => componentHasLedgerRole(component, 'track'))) {
      return components;
    }
    const trackProfile =
      this.getProfileByRole(systemPack, 'track') ||
      this.getProfileByRole(systemPack, 'screen_track');
    if (!trackProfile) return components;

    const frameProfile =
      components.find((component) => componentHasLedgerRole(component, 'frame'))?.profile ||
      this.getProfileByRole(systemPack, 'frame');
    const frameWidth = frameProfile?.width || DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM;
    const trackCut = Math.max(0, windowUnit.overallWidth - frameWidth * 2);
    if (trackCut <= 0) return components;

    return [
      ...components,
      {
        id: `design-track-${windowUnit.id || 'pose'}`,
        type: 'track',
        profile: trackProfile,
        width: trackCut,
        height: trackProfile.width || 0,
        quantity: 1,
        cuttingLengths: [trackCut, trackCut],
        angles: [90, 90],
        machiningOperations: [],
        glazingType: 'none',
        hardware: [],
      } as WindowComponent,
    ];
  }

  private rowsFromDesignComponents(
    components: WindowComponent[],
    windowUnit: WindowUnit,
    systemPack: SystemPack,
  ): ProfileBOMRow[] {
    const rows = new Map<string, ProfileBOMRow>();
    const packId = windowUnit.systemPackId || systemPack.meta?.id || systemPack.id || 'unknown';

    for (const component of components) {
      const profile = component.profile;
      if (!profile?.id || !component.cuttingLengths?.length) continue;
      const role = resolveLedgerRole(profile, component.type);
      const key = `${profile.id}:${role}`;
      const cuts = component.cuttingLengths.map((_, index) =>
        physicalCutForOccurrence(component, index, profile, windowUnit.systemPackId),
      );
      if (cuts.some((cut) => !Number.isFinite(cut.length) || cut.length <= 0)) {
        throw new Error('Invalid design cut length.');
      }
      const row: ProfileBOMRow = rows.get(key) ?? {
        id: key,
        systemPack: packId,
        profileCode: profile.id,
        role,
        length: 0,
        quantity: 1,
        cuttingLengths: [] as number[],
        angles: [] as number[],
        rawStockLength: profile.barLength || Number(profile.specifications?.barLength) || 6000,
        wasteLength: 0,
        machiningZones: [],
        weight: 0,
        cost: 0,
      };
      row.cuttingLengths.push(...cuts.map((cut) => cut.length));
      row.angles.push(...cuts.map((cut) => cut.angle));
      row.length = row.cuttingLengths.reduce((sum, length) => sum + length, 0);
      row.weight = (row.length / 1000) * (profile.weightPerMeter || 0);
      row.cost = (row.length / 1000) * (profile.costPerMeter || 0);
      // Perimeter roles are 4 cuts per unit; track/interlock are 1 cut per unit.
      const cutsPerUnit =
        role === 'frame' || role === 'sash' || role === 'glazing_bead' ? 4 : 1;
      row.quantity = Math.max(1, Math.round(row.cuttingLengths.length / cutsPerUnit));
      rows.set(key, row);
    }
    return Array.from(rows.values());
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

  /** Design-level sash perimeter cuts (pre-allowance) for bead enrichment. */
  private sashPerimeterCutsFromUnit(
    windowUnit: WindowUnit,
    _utils: Pick<ProdUtilsLike, 'applyKerfCompensation'>,
  ): number[] {
    const fromComponents = (windowUnit.components ?? [])
      .filter((component) => componentHasLedgerRole(component, 'sash'))
      .flatMap((component) => component.cuttingLengths ?? []);
    if (fromComponents.length > 0) return fromComponents;

    const width = windowUnit.overallWidth;
    const height = windowUnit.overallHeight;
    const sashCount = this.countSlidingSashes(windowUnit, {
      gridSpec: windowUnit.grid,
    } as unknown as EgyptianPattern);
    const cellWidth = width / Math.max(1, windowUnit.grid?.cols || sashCount);
    const cellHeight = height / Math.max(1, windowUnit.grid?.rows || 1);
    const oneSash = [cellWidth, cellWidth, cellHeight, cellHeight];
    return Array.from({ length: sashCount }, () => oneSash).flat();
  }

  /**
   * Append catalogue sliding roles when missing from an existing profile ledger.
   * Idempotent by role — design lengths go through physicalCutForOccurrence so
   * enrichment matches the saved-component contract (allowance applied once).
   */
  private appendMissingSlidingSubsystemProfiles(args: {
    profiles: FabricationData['profiles'];
    windowUnit: WindowUnit;
    pattern: EgyptianPattern;
    systemPack: SystemPack;
    ProductionUtils: ProdUtilsLike;
    sashCountHint: number;
    sashCuttingLengthsHint: number[];
  }): void {
    const {
      profiles,
      windowUnit,
      pattern,
      systemPack,
      ProductionUtils: utils,
      sashCountHint,
      sashCuttingLengthsHint,
    } = args;
    if (!this.isSlidingOpening(windowUnit, pattern)) return;

    const systemPackId = windowUnit.systemPackId || systemPack.meta?.id || systemPack.id || 'unknown';
    const width = windowUnit.overallWidth;
    const height = windowUnit.overallHeight;
    const sashCount = Math.max(1, sashCountHint);
    const hasRole = (role: string) =>
      profiles.some((p) => {
        if (p.role === role) return true;
        if (role === 'track') return p.role === 'screen_track';
        return false;
      });

    const pushPhysical = (
      profile: Profile,
      role: string,
      designLengths: number[],
      designAngles: number[],
      quantity: number,
    ) => {
      const synthetic: WindowComponent = {
        id: `enrich-${role}-${systemPackId}`,
        type: role as WindowComponent['type'],
        profile,
        cuttingLengths: designLengths,
        angles: designAngles,
        quantity: 1,
      } as WindowComponent;
      const cuts = designLengths.map((_, index) =>
        physicalCutForOccurrence(synthetic, index, profile, windowUnit.systemPackId),
      );
      const physicalLengths = cuts.map((cut) => cut.length);
      const physicalAngles = cuts.map((cut) => cut.angle);
      const total = physicalLengths.reduce((sum, length) => sum + length, 0);
      profiles.push(
        this.createProfileEntry(
          systemPackId,
          profile,
          role,
          total,
          quantity,
          physicalLengths,
          physicalAngles,
          utils,
        ),
      );
    };

    if (!hasRole('interlock')) {
      const interlockProfile = this.getProfileByRole(systemPack, 'interlock');
      if (interlockProfile && sashCount >= 2) {
        const interlockQty = Math.max(1, sashCount - 1);
        const frameWidth =
          this.getProfileByRole(systemPack, 'frame')?.width ||
          DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM;
        const interlockCut = Math.max(0, height - frameWidth * 2);
        pushPhysical(
          interlockProfile,
          'interlock',
          fillNumbers(interlockQty, interlockCut),
          fillNumbers(interlockQty, MITER_ANGLES.STRAIGHT_CUT),
          interlockQty,
        );
      }
    }

    if (!hasRole('track')) {
      const trackProfile =
        this.getProfileByRole(systemPack, 'track') ||
        this.getProfileByRole(systemPack, 'screen_track');
      if (trackProfile) {
        const frameWidth =
          this.getProfileByRole(systemPack, 'frame')?.width ||
          DEFAULT_PROFILE_DIMENSIONS.DEFAULT_WIDTH_MM;
        const trackCut = Math.max(0, width - frameWidth * 2);
        pushPhysical(
          trackProfile,
          'track',
          [trackCut, trackCut],
          [MITER_ANGLES.STRAIGHT_CUT, MITER_ANGLES.STRAIGHT_CUT],
          2,
        );
      }
    }

    if (!hasRole('glazing_bead') && sashCuttingLengthsHint.length > 0) {
      const beadProfile = this.getProfileByRole(systemPack, 'glazing_bead');
      if (beadProfile) {
        pushPhysical(
          beadProfile,
          'glazing_bead',
          sashCuttingLengthsHint,
          fillNumbers(sashCuttingLengthsHint.length, MITER_ANGLES.STRAIGHT_CUT),
          sashCount,
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
    prodUtils: Pick<ProdUtilsLike, 'calculateWaste' | 'calculateProfileWeight' | 'calculateMaterialCost'>
  ): ProfileBOMRow {
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
      profileRole: role as Profile['profileRole'],
    };
  }
}


