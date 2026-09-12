/**
 * FP-024A — Licensed DoWin external golden fixture (asdd, 9 Sep 2026).
 *
 * Three length layers (do not collapse, do not substitute):
 *   expectedNominalLengthMm   — Design Preview / assembly table
 *   expectedPackedSegmentMm   — optimization bar-graphic label
 *   expectedMachineLengthMm   — DC-600 MDB LENGTH only; null if that export lacks the piece
 *
 * Glass and non-square angle compensation are UNPROVEN on this fixture.
 * READY / READY_EXTERNAL_FIXTURE means expected millimetres exist, not acceptance.
 */

export const DOWIN_PARITY_TOLERANCE_MM = 0.1;

export type DowinLengthCategory =
  | 'frame_horizontal'
  | 'frame_vertical'
  | 'sash_horizontal'
  | 'sash_vertical'
  | 'mullion'
  | 'glazing_bead_horizontal'
  | 'glazing_bead_vertical'
  | 'glass'
  | 'angle_compensation';

export const DOWIN_LENGTH_CATEGORIES: readonly DowinLengthCategory[] = [
  'frame_horizontal',
  'frame_vertical',
  'sash_horizontal',
  'sash_vertical',
  'mullion',
  'glazing_bead_horizontal',
  'glazing_bead_vertical',
  'glass',
  'angle_compensation',
] as const;

export const DOWIN_ASDD_REPRESENTED_CATEGORIES: readonly DowinLengthCategory[] = [
  'frame_horizontal',
  'frame_vertical',
  'sash_horizontal',
  'sash_vertical',
  'mullion',
  'glazing_bead_horizontal',
  'glazing_bead_vertical',
] as const;

export type DowinCategoryGate = 'UNPROVEN' | 'PASS' | 'FAIL';

export type DowinGoldenFixtureStatus = 'READY_EXTERNAL_FIXTURE';

export type DowinDiscrepancyClass =
  | 'SASH_OFFSET'
  | 'HORIZONTAL_BASMA'
  | 'VERTICAL_BASMA'
  | 'HORIZONTAL_KAYNAK'
  | 'VERTICAL_KAYNAK'
  | 'WELDING_WASTE'
  | 'MULLION_OFFSET'
  | 'GLAZING_CLEARANCE'
  | 'ANGLE_COMPENSATION'
  | 'PROFILE_GEOMETRY'
  | 'KERF_ACCOUNTING'
  | 'UNKNOWN'
  | 'UNEVIDENCED_FORMULA';

export interface DowinJobObservedSettings {
  sawThicknessMm: number | null;
  weldingWasteMm: number | null;
  sashOffsetMm: number | null;
  trimCutMm: number | null;
  remnantThresholdMm: number | null;
  glazingClearanceMm: number | null;
  robotSafetyLengthMm: number | null;
  profileWasteMarginPercent: number | null;
  compLessThan90LeftMm: number | null;
  compLessThan90RightMm: number | null;
  compGreaterThan90LeftMm: number | null;
  compGreaterThan90RightMm: number | null;
  machineId: string | null;
}

export interface DowinPhysicalLengthGoldenRow {
  pieceId: string;
  externalAssemblyLabel: string;
  profileCode: string;
  category: DowinLengthCategory;
  leftAngleDeg: number | null;
  rightAngleDeg: number | null;
  /** Design Preview / assembly table. */
  expectedNominalLengthMm: number | null;
  /** Optimization bar-graphic label. Not assumed equal to machine. */
  expectedPackedSegmentMm: number | null;
  /** DC-600 MDB LENGTH only. Null unless that export contains the piece. */
  expectedMachineLengthMm: number | null;
  sourceDocument: 'design_preview' | 'assembly_report' | 'optimization_report' | 'machine_export' | null;
  sourcePage: number | null;
}

export type DowinCategoryAvailability = 'READY' | 'PENDING_EXTERNAL_FIXTURE' | 'NOT_APPLICABLE';

export interface DowinProfileOverlap {
  horizontalBasmaMm: number;
  verticalBasmaMm: number;
  horizontalKaynakMm: number;
  verticalKaynakMm: number;
}

export interface DowinPhysicalLengthGoldenFixture {
  id: string;
  status: DowinGoldenFixtureStatus;
  sourceType: 'licensed-dowin-production-export';
  orderNo: string;
  designName: string;
  profileSystem: string;
  material: string;
  reportDate: string;
  elevationNote: string;
  overallWidthMm: number;
  overallHeightMm: number;
  manufacturingProfileId: 'yilmazcad-parity';
  /** Observed on this licensed run only. Unknown fields stay null — no factory-default fill. */
  jobSettings: DowinJobObservedSettings;
  sourceHashesSha256: Record<string, string>;
  /** Dealer-audit overlap used for isolated formula tracing. Not this-run Settings authority. */
  referenceSettings: DowinProfileOverlap & {
    sashOffsetMm: number;
    weldingWasteMm: number;
    sawKerfMm: number;
    glazingClearanceMm: number;
    pvcMullionOffsetMm: number;
    minGlassProductionSizeMm: number;
  };
  categoryAvailability: Record<DowinLengthCategory, DowinCategoryAvailability>;
  rows: DowinPhysicalLengthGoldenRow[];
}

export function isWithinDowinParityTolerance(
  actualMm: number,
  expectedMm: number,
  toleranceMm: number = DOWIN_PARITY_TOLERANCE_MM
): boolean {
  return Math.abs(actualMm - expectedMm) <= toleranceMm + 1e-9;
}

export interface DowinLayerResult {
  expectedMm: number | null;
  actualMm: number | null;
  deltaMm: number | null;
  withinTolerance: boolean | null;
}

export interface DowinGoldenPieceResult {
  pieceId: string;
  externalAssemblyLabel: string;
  category: DowinLengthCategory;
  nominal: DowinLayerResult;
  packed: DowinLayerResult;
  machine: DowinLayerResult;
}

export interface DowinGoldenCompareResult {
  fixtureId: string;
  representedCategoriesPass: boolean;
  fullSuitePasses: boolean;
  categoryScorecard: Record<DowinLengthCategory, DowinCategoryGate>;
  results: DowinGoldenPieceResult[];
}

function layerResult(expectedMm: number | null, actualMm: number | null): DowinLayerResult {
  if (expectedMm == null) {
    return { expectedMm: null, actualMm, deltaMm: null, withinTolerance: null };
  }
  if (actualMm == null) {
    return { expectedMm, actualMm: null, deltaMm: null, withinTolerance: false };
  }
  const deltaMm = actualMm - expectedMm;
  return {
    expectedMm,
    actualMm,
    deltaMm,
    withinTolerance: isWithinDowinParityTolerance(actualMm, expectedMm),
  };
}

export function scoreDowinCategories(
  results: DowinGoldenPieceResult[]
): Record<DowinLengthCategory, DowinCategoryGate> {
  const card = {} as Record<DowinLengthCategory, DowinCategoryGate>;
  for (const category of DOWIN_LENGTH_CATEGORIES) {
    const rows = results.filter((row) => row.category === category);
    if (rows.length === 0) {
      card[category] = 'UNPROVEN';
      continue;
    }
    const unproven = rows.every(
      (row) =>
        row.nominal.expectedMm == null &&
        row.packed.expectedMm == null &&
        row.machine.expectedMm == null
    );
    if (unproven) {
      card[category] = 'UNPROVEN';
      continue;
    }
    const scored = rows.filter(
      (row) =>
        row.nominal.expectedMm != null ||
        row.packed.expectedMm != null ||
        row.machine.expectedMm != null
    );
    const pass = scored.every((row) => {
      const nominalOk = row.nominal.expectedMm == null || row.nominal.withinTolerance === true;
      const packedOk = row.packed.expectedMm == null || row.packed.withinTolerance === true;
      const machineOk = row.machine.expectedMm == null || row.machine.withinTolerance === true;
      return nominalOk && packedOk && machineOk;
    });
    card[category] = pass ? 'PASS' : 'FAIL';
  }
  return card;
}

export function compareDowinGoldenLengths(
  fixture: DowinPhysicalLengthGoldenFixture,
  actuals: Array<{
    pieceId: string;
    nominalLengthMm?: number | null;
    packedSegmentMm?: number | null;
    machineInstructionMm?: number | null;
  }>
): DowinGoldenCompareResult {
  const byId = new Map(actuals.map((a) => [a.pieceId, a]));
  const results: DowinGoldenPieceResult[] = fixture.rows.map((row) => {
    const actual = byId.get(row.pieceId);
    return {
      pieceId: row.pieceId,
      externalAssemblyLabel: row.externalAssemblyLabel,
      category: row.category,
      nominal: layerResult(row.expectedNominalLengthMm, actual?.nominalLengthMm ?? null),
      packed: layerResult(row.expectedPackedSegmentMm, actual?.packedSegmentMm ?? null),
      machine: layerResult(row.expectedMachineLengthMm, actual?.machineInstructionMm ?? null),
    };
  });
  const categoryScorecard = scoreDowinCategories(results);
  const representedCategoriesPass = DOWIN_ASDD_REPRESENTED_CATEGORIES.every(
    (c) => categoryScorecard[c] === 'PASS'
  );
  const fullSuitePasses = DOWIN_LENGTH_CATEGORIES.every((c) => categoryScorecard[c] === 'PASS');
  return {
    fixtureId: fixture.id,
    representedCategoriesPass,
    fullSuitePasses,
    categoryScorecard,
    results,
  };
}

export function dowinParityGatePasses(compared: DowinGoldenCompareResult): boolean {
  return compared.fullSuitePasses;
}

/** Machine-layer PASS requires an external MDB/NCW expected value that matched. Null is not a pass. */
export function dowinMachineParityPasses(layer: DowinLayerResult): boolean {
  return layer.expectedMm != null && layer.withinTolerance === true;
}

export const DOWIN_ASDD_FIXTURE_SLUG = 'deceuninck70-asdd-1000x1500-dowin-2026-09-09';

export const DOWIN_ASDD_JOB = {
  designName: 'asdd',
  orderNo: '10001',
  profileSystem: "Deceuninck 70'lik PVC Sistemi",
  material: 'PVC',
  overallWidthMm: 1000,
  overallHeightMm: 1500,
  sashOuterWidthMm: 437,
  sashOuterHeightMm: 1416,
  weldDeltaOn45DegMm: 3,
} as const;

export const DOWIN_ASDD_SOURCE_HASHES: Record<string, string> = {
  'OptimizationReport_20260909_181432.pdf':
    'e9ce43f736bbe40d037f29100e58d13c9b6f7febc611f51ac6f3a26a1f012ca0',
  'OptimizationReport_20260909_181432_Labels.pdf':
    'd84ba781136a3859980d10866e267c13fe5ad942663df77e76709c6d9c7d05fe',
  'OptimizationReport_20260909_181432_DesignPreview.pdf':
    'f6a00ef01eba45336e1557abd5dcceefbe14bdb70c55f7443a705afd8d9c64b0',
  'asdasd_2026.09.09_18.15.mdb':
    '6d5932947327db0272e5de92de4d47e4320ecb1aeadbc6a268f2bbd383a3f82d',
  /** Live Management Panel → General Settings PNG captured 2026-09-09; file not committed. */
  'dowin-general-settings.png':
    '95652321b98d682eb07cc46d1e13e464fee21ee31e323e83089231688a72c18a',
  /** BASELINE_REPRODUCTION_RUN 2026-09-10 21:25; files not committed. */
  'OptimizationReport_20260910_212450.pdf':
    '609f43ca4e4d643d1d50aae65bf7c3f9c0740e8f955270fdc42e87c76fc3893f',
  'OptimizationReport_20260910_212450_Labels.pdf':
    'fc97f09f83fe03e23aa412705e3c38797bc60608a6a37c1de792afc925bd982e',
  'OptimizationReport_20260910_212450_DesignPreview.pdf':
    'fb27646829c6110c9c661c580b8cc1bc7a2413339cee979ef6c2c22b1238917d',
  'asdasd_2026.09.10_21.26.dw':
    '3ef793742552adc04177d1bd9f80984e43df6f166cb3890663c5e52d997546e7',
  'dowin-1b-general-settings.png':
    '51af280dc2f358853944d58a2847a2da231af9ab0083682c9eb39e8a95ff8405',
  /** SINGLE_SETTING_ISOLATION Welding Waste 3→0 2026-09-10 21:54; files not committed. */
  'OptimizationReport_20260910_215413.pdf':
    '1bd3b0180319663f0306b7d3dc8d52ccc7e35bb0ff1241d6e438b612f1671b9e',
  'OptimizationReport_20260910_215413_Labels.pdf':
    '3ccc22062e9f302d750db5f2a3deee49ebeacf799dff8f728744cb0eff1d29eb',
  'OptimizationReport_20260910_215413_DesignPreview.pdf':
    '26bb4cdebddf2eb7f2c4c9f1b38f9a7bc3210690b15f9e358a2e55dfcf8a2a46',
  'asdasd_2026.09.10_21.56.dw':
    '249ed511f1283133ebf8fb8ea4cb139d4d0143e4c910a704f91e931f911449f3',
  'dowin-t2-general-settings.png':
    'ba20b105029affbf9152130c171f0cf6446175cba7fb20e34ec056eec6653638',
  /** SINGLE_SETTING_ISOLATION Saw Thickness 4→5 2026-09-10 22:21; files not committed. */
  'OptimizationReport_20260910_222128.pdf':
    '747714ab504af7f28eec2bfb8fcf9ba52c7b115b4ba6c21d7285a35fdc287ff6',
  'OptimizationReport_20260910_222128_Labels.pdf':
    'e363241f4b9e8b345f9508bd47d3d1d39c0ca1a3c1011133ef28142928860764',
  'OptimizationReport_20260910_222128_DesignPreview.pdf':
    '88ea8da8821bc8336156177ee88d95027efd6c6b9580cc2ead5d82b561bdf6fa',
  'asdasd_2026.09.10_22.23.dw':
    '32b0897e961744842a77c259b973e4c07ee3edf2ba3f2421b58c5f5aba25ad3f',
  'dowin-t3-general-settings.png':
    'f1d48844a192d0367f134eae706f622b89adefa09c1eabfbcab2af2c04643bad',
  /** SINGLE_SETTING_ISOLATION Trim Cut 0→10 2026-09-10 22:52; files not committed. */
  'OptimizationReport_20260910_225229.pdf':
    '2a07ebdb5cf8c2f2519c8568534c2b2d4fbd310f21fbf8ef182c89c3937ce017',
  'OptimizationReport_20260910_225229_Labels.pdf':
    '6cb08b82eee2c388f4312083d67c34f3dc1cd2af9824c117f429315252d5dde4',
  'OptimizationReport_20260910_225229_DesignPreview.pdf':
    'b1f45764bd89d5387e59a11aa247239ab0b109a6b70e253c0214e49aa2a63812',
  'asdasd_2026.09.10_22.53.dw':
    'fc9e4db440ecead864cc7542a3960dfd0c366bcd16fd0648676facc2f4d8f5aa',
  'dowin-t4-general-settings.png':
    'b17121a62c89d83cb734f094d8c36cbe5bc6d6af164462eef47af7943ed3535a',
  /** BASELINE_RESET_VALIDATION 2026-09-10 23:16; files not committed. Remainders did not recover 1B. */
  'oPTIMIZATIONrEPORT_20260910_232145.pdf':
    'b5c2c03c780519ac126e21ef2cd18fc4b0d7bfa048aea093ddd25f17ce6f1380',
  'oPTIMIZATIONrEPORT_20260910_232145_Labels.pdf':
    'aa74212d2ef79fb6f67a78c86d4b983d14f979d68c5f467fbd32ff72f9ed91ee',
  'oPTIMIZATIONrEPORT_20260910_232145_DesignPreview.pdf':
    '2f6454dcbd7f94ca0d0a107fd8aa2cbe5a1014f78d0a5a2fb6e2dd9b57ebc4c5',
  'ASDASD_2026.09.10_23.16.DW':
    'fc9e4db440ecead864cc7542a3960dfd0c366bcd16fd0648676facc2f4d8f5aa',
  'dowin-reset-general-settings.png':
    '1d4326c1c8d3343fd1362a058a0bd659e6b4a40b5d4ba5a8348216bb14c505a4',
  /** FP-024C.1 Fresh A 2026-09-12 22:00; licensed files not committed. */
  'dowin-fp024c1-fresh-a-general-settings.png':
    '571dc804d0ec43d56969fa3d41d0eb482fd4bffb0e1b96eabf8034bdd2d7f6e9',
  'OptimizationReport_20260912_215949.pdf':
    'd9239261a96962d04569f1fcc6a4b4ef0ab7ea0b262c934c3f48d93d59228b13',
  'OptimizationReport_20260912_215949_Labels.pdf':
    'ce6e5fa5f654ef1f24ef0b0ac429352edd36746f2fde658dcdc2e11a1e34ff41',
  'OptimizationReport_20260912_215949_DesignPreview.pdf':
    '989304b59ca87aa66362f636ad197a7e4ca50b13798635564eda9f0bf077ba88',
  'FP024C1_FRESH_A_2026.09.12_22.02.dw':
    '7c468479c2e1d87b268e38090d7c77faba6a0f59886bd28704a8af3e107bf34c',
};

function piece(
  pieceId: string,
  externalAssemblyLabel: string,
  profileCode: string,
  category: DowinLengthCategory,
  nominal: number | null,
  packed: number | null,
  machine: number | null,
  leftAngleDeg: number | null,
  rightAngleDeg: number | null,
  sourceDocument: DowinPhysicalLengthGoldenRow['sourceDocument'],
  sourcePage: number | null = null
): DowinPhysicalLengthGoldenRow {
  return {
    pieceId,
    externalAssemblyLabel,
    profileCode,
    category,
    leftAngleDeg,
    rightAngleDeg,
    expectedNominalLengthMm: nominal,
    expectedPackedSegmentMm: packed,
    expectedMachineLengthMm: machine,
    sourceDocument,
    sourcePage,
  };
}

export const DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION: DowinPhysicalLengthGoldenFixture = {
  id: 'dowin-deceuninck70z-asdd-1000x1500-20260909',
  status: 'READY_EXTERNAL_FIXTURE',
  sourceType: 'licensed-dowin-production-export',
  orderNo: '10001',
  designName: 'asdd',
  profileSystem: "Deceuninck 70'lik PVC Sistemi",
  material: 'PVC',
  reportDate: '2026-09-09',
  elevationNote:
    'Three-layer asdd fixture: nominal (Design Preview), packed (optimization graphic), machine (DC-600 MDB). Beads have no MDB row so machine stays null. Glass and non-square angle UNPROVEN. Not accepted.',
  overallWidthMm: 1000,
  overallHeightMm: 1500,
  manufacturingProfileId: 'yilmazcad-parity',
  jobSettings: {
    sawThicknessMm: 4,
    weldingWasteMm: 3,
    sashOffsetMm: 7,
    trimCutMm: 0,
    remnantThresholdMm: 500,
    glazingClearanceMm: 2.5,
    robotSafetyLengthMm: null,
    profileWasteMarginPercent: 0,
    compLessThan90LeftMm: null,
    compLessThan90RightMm: null,
    compGreaterThan90LeftMm: null,
    compGreaterThan90RightMm: null,
    machineId: 'DC-600',
  },
  sourceHashesSha256: DOWIN_ASDD_SOURCE_HASHES,
  referenceSettings: {
    horizontalBasmaMm: 12,
    verticalBasmaMm: 16,
    horizontalKaynakMm: 6,
    verticalKaynakMm: 6,
    sashOffsetMm: 7,
    weldingWasteMm: 3,
    sawKerfMm: 4,
    glazingClearanceMm: 2.5,
    pvcMullionOffsetMm: 0,
    minGlassProductionSizeMm: 50,
  },
  categoryAvailability: {
    frame_horizontal: 'READY',
    frame_vertical: 'READY',
    sash_horizontal: 'READY',
    sash_vertical: 'READY',
    mullion: 'READY',
    glazing_bead_horizontal: 'READY',
    glazing_bead_vertical: 'READY',
    glass: 'PENDING_EXTERNAL_FIXTURE',
    angle_compensation: 'NOT_APPLICABLE',
  },
  rows: [
    piece('asdd.Frame.Top', 'asdd.Frame Top', 'Deceuninck-KASA-70', 'frame_horizontal', 1000, 1003, 1003, 45, 45, 'machine_export'),
    piece('asdd.Frame.Bottom', 'asdd.Frame Bottom', 'Deceuninck-KASA-70', 'frame_horizontal', 1000, 1003, 1003, 45, 45, 'machine_export'),
    piece('asdd.Frame.Left', 'asdd.Frame Left', 'Deceuninck-KASA-70', 'frame_vertical', 1500, 1503, 1503, 45, 45, 'machine_export'),
    piece('asdd.Frame.Right', 'asdd.Frame Right', 'Deceuninck-KASA-70', 'frame_vertical', 1500, 1503, 1503, 45, 45, 'machine_export'),
    piece('asdd.Left.Sash.Top', 'asdd.Left Area (Sash).Top', 'Deceuninck-KANAT-70', 'sash_horizontal', 451, 454, 454, 45, 45, 'machine_export'),
    piece('asdd.Left.Sash.Bottom', 'asdd.Left Area (Sash).Bottom', 'Deceuninck-KANAT-70', 'sash_horizontal', 451, 454, 454, 45, 45, 'machine_export'),
    piece('asdd.Right.Sash.Top', 'asdd.Right Area (Sash).Top', 'Deceuninck-KANAT-70', 'sash_horizontal', 451, 454, 454, 45, 45, 'machine_export'),
    piece('asdd.Right.Sash.Bottom', 'asdd.Right Area (Sash).Bottom', 'Deceuninck-KANAT-70', 'sash_horizontal', 451, 454, 454, 45, 45, 'machine_export'),
    piece('asdd.Left.Sash.Left', 'asdd.Left Area (Sash).Left', 'Deceuninck-KANAT-70', 'sash_vertical', 1430, 1433, 1433, 45, 45, 'machine_export'),
    piece('asdd.Left.Sash.Right', 'asdd.Left Area (Sash).Right', 'Deceuninck-KANAT-70', 'sash_vertical', 1430, 1433, 1433, 45, 45, 'machine_export'),
    piece('asdd.Right.Sash.Left', 'asdd.Right Area (Sash).Left', 'Deceuninck-KANAT-70', 'sash_vertical', 1430, 1433, 1433, 45, 45, 'machine_export'),
    piece('asdd.Right.Sash.Right', 'asdd.Right Area (Sash).Right', 'Deceuninck-KANAT-70', 'sash_vertical', 1430, 1433, 1433, 45, 45, 'machine_export'),
    piece('asdd.Mullion.Vertical', 'asdd.Mullion Vertical', 'Deceuninck-ORTA-KAYIT-70', 'mullion', 1416, 1416, 1416, 90, 90, 'machine_export'),
    piece('asdd.Left.Bead.Top', 'asdd.Left Area (Sash).GlazingBead Top', 'Deceuninck-CITA-20', 'glazing_bead_horizontal', 331, 334, null, 45, 45, 'optimization_report'),
    piece('asdd.Left.Bead.Bottom', 'asdd.Left Area (Sash).GlazingBead Bottom', 'Deceuninck-CITA-20', 'glazing_bead_horizontal', 331, 334, null, 45, 45, 'optimization_report'),
    piece('asdd.Right.Bead.Top', 'asdd.Right Area (Sash).GlazingBead Top', 'Deceuninck-CITA-20', 'glazing_bead_horizontal', 331, 334, null, 45, 45, 'optimization_report'),
    piece('asdd.Right.Bead.Bottom', 'asdd.Right Area (Sash).GlazingBead Bottom', 'Deceuninck-CITA-20', 'glazing_bead_horizontal', 331, 334, null, 45, 45, 'optimization_report'),
    piece('asdd.Left.Bead.Left', 'asdd.Left Area (Sash).GlazingBead Left', 'Deceuninck-CITA-20', 'glazing_bead_vertical', 1310, 1313, null, 45, 45, 'optimization_report'),
    piece('asdd.Left.Bead.Right', 'asdd.Left Area (Sash).GlazingBeadRight', 'Deceuninck-CITA-20', 'glazing_bead_vertical', 1310, 1313, null, 45, 45, 'optimization_report'),
    piece('asdd.Right.Bead.Left', 'asdd.Right Area (Sash).GlazingBead Left', 'Deceuninck-CITA-20', 'glazing_bead_vertical', 1310, 1313, null, 45, 45, 'optimization_report'),
    piece('asdd.Right.Bead.Right', 'asdd.Right Area (Sash).GlazingBeadRight', 'Deceuninck-CITA-20', 'glazing_bead_vertical', 1310, 1313, null, 45, 45, 'optimization_report'),
    piece('asdd.Glass.UNPROVEN', 'UNPROVEN', 'GLASS', 'glass', null, null, null, null, null, null),
    piece('asdd.Angle.UNPROVEN', 'UNPROVEN', 'COMP', 'angle_compensation', null, null, null, null, null, null),
  ],
};

/** Backward-compatible alias: DC-600 saw lengths only. */
export const DOWIN_ASDD_MDB_PROFILE_CUTS = DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows
  .filter((r) => r.expectedMachineLengthMm != null)
  .map((r) => ({
    assemblyId: r.externalAssemblyLabel,
    stockCode: r.profileCode,
    lengthMm: r.expectedMachineLengthMm as number,
    leftAngleDeg: r.leftAngleDeg ?? 0,
    rightAngleDeg: r.rightAngleDeg ?? 0,
  }));

/** @deprecated Use READY_EXTERNAL_FIXTURE. Kept so older imports type-check during migration. */
export const DOWIN_GOLDEN_FIXTURE_STATUS = 'READY_EXTERNAL_FIXTURE' as const;
