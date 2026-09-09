/**
 * FP-024B — external compensation reconciliation. Not accepted as formula authority.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateKFactor } from '@/lib/fabricator/UPVCCuttingEngine';
import {
  PLATFORM_MANUFACTURING_DEFAULTS,
  YILMAZCAD_PARITY_MANUFACTURING_SETTINGS,
  resolveManufacturingSettings,
} from '@/lib/fabricator/ManufacturingSettings';
import {
  DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION,
  compareDowinGoldenLengths,
  dowinMachineParityPasses,
  dowinParityGatePasses,
} from '@/lib/fabricator/golden/dowinPhysicalLengthFixture';
import { almonaParityActualsForAsdd } from '@/lib/fabricator/dowinParity/DowinParityLengthEngine';
import {
  DOWIN_ASDD_BASELINE_RUN,
  DOWIN_ASDD_MDB_TABLE1_EVIDENCE,
  DOWIN_CALIBRATION_RUNS,
  DOWIN_COMPENSATION_TERM_AUTHORITY,
  OPERATOR_EVIDENCE_PACKAGE_CHECKLIST,
  REQUIRED_ISOLATION_MACHINE_ID,
  SINGLE_SETTING_ISOLATION_VARIABLES,
  asddFrameBarResidual,
  asddMullionBarResidual,
  asddSashBarResidual,
  buildCompensationMatrix,
  buildIsolationDeltaTable,
  buildOperatorIsolationReport,
  calibrationRunKind,
  computePieceLayerDeltas,
  emptyObservedSettings,
  ingestOperatorCalibrationRun,
  uniquePackedMinusNominalMm,
} from '@/lib/fabricator/dowinParity/dowinCompensationEvidence';

describe('FP-024B DoWin compensation reconciliation', () => {
  it('registers multiple fixture runs without filling unknown settings', () => {
    expect(DOWIN_CALIBRATION_RUNS).toHaveLength(5);
    expect(DOWIN_CALIBRATION_RUNS.filter((r) => r.isolationVariable === 'baseline')).toHaveLength(1);
    expect(DOWIN_CALIBRATION_RUNS.filter((r) => r.status === 'PENDING_OPERATOR_RUN')).toHaveLength(4);
    expect(
      DOWIN_CALIBRATION_RUNS.filter((r) => r.runKind === 'SINGLE_SETTING_ISOLATION')
    ).toHaveLength(3);
    expect(DOWIN_CALIBRATION_RUNS.filter((r) => r.runKind === 'CONTROL_FIXTURE')).toHaveLength(1);
    expect(SINGLE_SETTING_ISOLATION_VARIABLES).toEqual(['weldingWaste', 'sawThickness', 'trimCut']);
    expect(calibrationRunKind('ninetyDegreeControl')).toBe('CONTROL_FIXTURE');
    expect(calibrationRunKind('weldingWaste')).toBe('SINGLE_SETTING_ISOLATION');
    expect(REQUIRED_ISOLATION_MACHINE_ID).toBe('DC-600');
    const empty = emptyObservedSettings(null);
    expect(empty.weldingWasteMm).toBeNull();
    expect(empty.sawThicknessMm).toBeNull();
    expect(empty.trimCutMm).toBeNull();
    expect(DOWIN_ASDD_BASELINE_RUN.observedSettings.weldingWasteMm).toBeNull();
    expect(DOWIN_ASDD_BASELINE_RUN.observedSettings.sawThicknessMm).toBeNull();
    expect(DOWIN_ASDD_BASELINE_RUN.observedSettings.glazingClearanceMm).toBeNull();
    expect(DOWIN_ASDD_BASELINE_RUN.observedSettings.machineId).toBe('DC-600');
    expect(DOWIN_ASDD_BASELINE_RUN.observedSettings).not.toEqual(
      expect.objectContaining({
        weldingWasteMm: YILMAZCAD_PARITY_MANUFACTURING_SETTINGS.weldingWasteMm,
        sawThicknessMm: YILMAZCAD_PARITY_MANUFACTURING_SETTINGS.sawKerfMm,
      })
    );
  });

  it('keeps settings snapshots fixture-specific', () => {
    const weld = DOWIN_CALIBRATION_RUNS.find((r) => r.fixtureId === 'dowin-asdd-weld-0-pending');
    expect(weld?.observedSettings).toEqual(emptyObservedSettings(null));
    expect(weld?.intendedIsolation?.instructedToMm).toBe(0);
    expect(weld?.observedSettings.weldingWasteMm).toBeNull();
    expect(weld?.observedSettings).not.toBe(DOWIN_ASDD_BASELINE_RUN.observedSettings);
  });

  it('keeps nominal, packed and machine layers separate on the baseline', () => {
    const frame = DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows.find((r) => r.pieceId === 'asdd.Frame.Top');
    const bead = DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows.find((r) => r.pieceId === 'asdd.Left.Bead.Top');
    const mullion = DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows.find((r) => r.pieceId === 'asdd.Mullion.Vertical');
    const frameDelta = computePieceLayerDeltas(frame!);
    const beadDelta = computePieceLayerDeltas(bead!);
    const mullionDelta = computePieceLayerDeltas(mullion!);
    expect(frameDelta.packedMinusNominalMm).toBe(3);
    expect(frameDelta.machineMinusPackedMm).toBe(0);
    expect(beadDelta.machineMm).toBeNull();
    expect(beadDelta.machineMinusPackedMm).toBeNull();
    expect(mullionDelta.packedMinusNominalMm).toBe(0);
    expect(uniquePackedMinusNominalMm(DOWIN_ASDD_BASELINE_RUN)).toEqual([0, 3]);
    const evidence = readFileSync(
      resolve(process.cwd(), 'src/lib/fabricator/dowinParity/dowinCompensationEvidence.ts'),
      'utf8'
    );
    expect(evidence).not.toMatch(/packedLength\s*=\s*nominalLength\s*\+\s*3/);
    expect(evidence).not.toMatch(/magicAllowanceMm/);
    expect(evidence).not.toMatch(/\+\s*7\s*\*\s*piece/);
  });

  it('builds a deterministic difference matrix', () => {
    const a = buildCompensationMatrix();
    const b = buildCompensationMatrix();
    expect(a).toEqual(b);
    expect(a).toHaveLength(5);
    const baseline = a.find((r) => r.variableChanged === 'baseline');
    expect(baseline?.interpretation).toBe('AMBIGUOUS');
    expect(baseline?.packedMinusNominalValuesMm).toEqual([0, 3]);
    expect(baseline?.machineDeltaMm).toBe(0);
    expect(a.filter((r) => r.interpretation === 'NOT MEASURED')).toHaveLength(4);
    expect(a.every((r) => r.interpretation !== 'PROVEN EFFECT')).toBe(true);
  });

  it('does not let external fixture settings alter runtime ALMONA calculations', () => {
    const before = resolveManufacturingSettings();
    const clone = {
      ...DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.jobSettings,
      weldingWasteMm: 99,
      sawThicknessMm: 11,
    };
    expect(clone.weldingWasteMm).toBe(99);
    expect(resolveManufacturingSettings()).toEqual(before);
    expect(resolveManufacturingSettings().weldingWasteMm).toBe(
      PLATFORM_MANUFACTURING_DEFAULTS.weldingWasteMm
    );
    expect(
      calculateKFactor({ profileWidthMm: 70, wallThicknessMm: 2.5, miterAngleDegrees: 45 })
    ).toBeGreaterThan(0);
    const upvc = readFileSync(resolve(process.cwd(), 'src/lib/fabricator/UPVCCuttingEngine.ts'), 'utf8');
    const almona = readFileSync(
      resolve(process.cwd(), 'src/lib/fabricator/AlmonaCuttingEngine.ts'),
      'utf8'
    );
    const linear = readFileSync(resolve(process.cwd(), 'src/lib/algorithms/LinearOptimizer.ts'), 'utf8');
    expect(upvc).not.toContain('dowinCompensationEvidence');
    expect(almona).not.toContain('dowinCompensationEvidence');
    expect(linear).not.toContain('dowinCompensationEvidence');
    expect(upvc).not.toContain('dowinPhysicalLengthFixture');
  });

  it('null machine length cannot pass machine parity; MDB evidence stays transcribed Table1', () => {
    const bead = computePieceLayerDeltas(
      DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows.find((r) => r.pieceId === 'asdd.Left.Bead.Top')!
    );
    expect(dowinMachineParityPasses({ expectedMm: bead.machineMm, actualMm: 334, deltaMm: null, withinTolerance: true })).toBe(
      false
    );
    expect(DOWIN_ASDD_MDB_TABLE1_EVIDENCE.tableName).toBe('Table1');
    expect(DOWIN_ASDD_MDB_TABLE1_EVIDENCE.rows).toHaveLength(13);
    expect(DOWIN_ASDD_MDB_TABLE1_EVIDENCE.rows.every((r) => r.FRAME_X === 1000 && r.FRAME_Y === 1500)).toBe(
      true
    );
    expect(DOWIN_ASDD_MDB_TABLE1_EVIDENCE.rows.some((r) => r.STOCK_CODE.includes('CITA'))).toBe(false);
  });

  it('surfaces KASA/KANAT leftover instead of absorbing a hidden +7 mm', () => {
    const frame = asddFrameBarResidual();
    const sash = asddSashBarResidual();
    const mullion = asddMullionBarResidual();
    const leftover = (r: typeof frame) =>
      r.candidates.find((c) => c.termId === 'unexplainedAfterPackedAndNamedParityKerf');
    expect(leftover(frame)?.mm).toBe(7);
    expect(leftover(frame)?.status).toBe('HYPOTHESIS');
    expect(leftover(sash)?.mm).toBe(7);
    expect(leftover(mullion)?.mm).toBe(0);
    expect(frame.externalBarParity).toBe('CONDITIONAL');
    expect(sash.externalBarParity).toBe('CONDITIONAL');
    expect(mullion.externalBarParity).toBe('RECONCILED');
    expect(frame.candidates.find((c) => c.termId === 'canonicalKerfIfSawThicknessKnown')?.mm).toBeNull();
    expect(frame.candidates.find((c) => c.termId === 'trimIfThisRunKnown')?.mm).toBeNull();
    expect(DOWIN_COMPENSATION_TERM_AUTHORITY.every((t) => t.authority !== 'PROVEN')).toBe(true);
    expect(DOWIN_COMPENSATION_TERM_AUTHORITY.every((t) => t.proposedForFp024c === false)).toBe(true);
  });

  it('keeps FP-024A failure honest', () => {
    const compared = compareDowinGoldenLengths(
      DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION,
      almonaParityActualsForAsdd()
    );
    expect(dowinParityGatePasses(compared)).toBe(false);
    expect(compared.categoryScorecard.sash_horizontal).toBe('FAIL');
    expect(compared.categoryScorecard.glass).toBe('UNPROVEN');
  });

  it('rejects incomplete operator packages and multi-setting isolation', () => {
    expect(OPERATOR_EVIDENCE_PACKAGE_CHECKLIST).toHaveLength(11);
    const isolation = buildIsolationDeltaTable();
    expect(isolation).toHaveLength(5);
    expect(isolation.filter((r) => r.interpretation === 'NOT MEASURED')).toHaveLength(4);
    expect(isolation.filter((r) => r.runKind === 'CONTROL_FIXTURE')[0]?.interpretation).toBe(
      'NOT MEASURED'
    );
    const report = buildOperatorIsolationReport();
    expect(report.deltaTable).toEqual(isolation);
    expect(report.termAuthority.every((t) => t.proposedForFp024c === false)).toBe(true);

    const incomplete = ingestOperatorCalibrationRun(DOWIN_ASDD_BASELINE_RUN, {
      runId: 'weld-0-incomplete',
      timestampIso: null,
      generalSettingsScreenshotNote: null,
      changedSettingNote: null,
      controlFixtureNote: null,
      changedSetting: null,
      sourceHashesSha256: {},
      mdbGenerated: false,
      isolationVariable: 'weldingWaste',
      observedSettings: {
        ...DOWIN_ASDD_BASELINE_RUN.observedSettings,
        weldingWasteMm: 0,
      },
      widthMm: 1000,
      heightMm: 1500,
      profileSystem: DOWIN_ASDD_BASELINE_RUN.profileSystem,
      pieces: [],
      bars: [],
    });
    expect(incomplete.ok).toBe(false);

    const twoSettings = ingestOperatorCalibrationRun(DOWIN_ASDD_BASELINE_RUN, {
      runId: 'weld-and-saw',
      timestampIso: '2026-09-09T18:00:00.000Z',
      generalSettingsScreenshotNote: 'settings-before.png (not committed)',
      changedSettingNote: 'changed weld and saw',
      controlFixtureNote: null,
      changedSetting: {
        field: 'weldingWasteMm',
        oldValue: null,
        newValue: 0,
      },
      sourceHashesSha256: {
        generalSettingsScreenshot: 's',
        designPreview: 'a',
        assemblyLabels: 'b',
        optimization: 'c',
      },
      mdbGenerated: false,
      isolationVariable: 'weldingWaste',
      observedSettings: {
        ...DOWIN_ASDD_BASELINE_RUN.observedSettings,
        weldingWasteMm: 0,
        sawThicknessMm: 5,
      },
      widthMm: 1000,
      heightMm: 1500,
      profileSystem: DOWIN_ASDD_BASELINE_RUN.profileSystem,
      pieces: DOWIN_ASDD_BASELINE_RUN.pieces,
      bars: [...DOWIN_ASDD_BASELINE_RUN.bars],
    });
    expect(twoSettings.ok).toBe(false);
    if (!twoSettings.ok) {
      expect(twoSettings.reasons.some((r) => r.includes('exactly one setting'))).toBe(true);
    }

    const geometryChanged = ingestOperatorCalibrationRun(DOWIN_ASDD_BASELINE_RUN, {
      runId: 'weld-0-resized',
      timestampIso: '2026-09-09T18:00:00.000Z',
      generalSettingsScreenshotNote: 'settings-before.png (not committed)',
      changedSettingNote: 'Welding Waste → 0',
      controlFixtureNote: null,
      changedSetting: {
        field: 'weldingWasteMm',
        oldValue: null,
        newValue: 0,
      },
      sourceHashesSha256: {
        generalSettingsScreenshot: 's',
        designPreview: 'a',
        assemblyLabels: 'b',
        optimization: 'c',
      },
      mdbGenerated: false,
      isolationVariable: 'weldingWaste',
      observedSettings: {
        ...DOWIN_ASDD_BASELINE_RUN.observedSettings,
        weldingWasteMm: 0,
      },
      widthMm: 1100,
      heightMm: 1500,
      profileSystem: DOWIN_ASDD_BASELINE_RUN.profileSystem,
      pieces: DOWIN_ASDD_BASELINE_RUN.pieces,
      bars: [...DOWIN_ASDD_BASELINE_RUN.bars],
    });
    expect(geometryChanged.ok).toBe(false);
    if (!geometryChanged.ok) {
      expect(geometryChanged.reasons.some((r) => r.includes('Do not change geometry'))).toBe(true);
    }

    const isolationBeforeBaselineSettings = ingestOperatorCalibrationRun(DOWIN_ASDD_BASELINE_RUN, {
      runId: 'weld-0-too-soon',
      timestampIso: '2026-09-09T18:00:00.000Z',
      generalSettingsScreenshotNote: 'settings-before.png (not committed)',
      changedSettingNote: 'Welding Waste  ? → 0',
      controlFixtureNote: null,
      changedSetting: {
        field: 'weldingWasteMm',
        oldValue: null,
        newValue: 0,
      },
      sourceHashesSha256: {
        generalSettingsScreenshot: 's',
        designPreview: 'a',
        assemblyLabels: 'b',
        optimization: 'c',
      },
      mdbGenerated: true,
      isolationVariable: 'weldingWaste',
      observedSettings: {
        ...DOWIN_ASDD_BASELINE_RUN.observedSettings,
        weldingWasteMm: 0,
      },
      widthMm: 1000,
      heightMm: 1500,
      profileSystem: DOWIN_ASDD_BASELINE_RUN.profileSystem,
      pieces: DOWIN_ASDD_BASELINE_RUN.pieces,
      bars: [...DOWIN_ASDD_BASELINE_RUN.bars],
    });
    expect(isolationBeforeBaselineSettings.ok).toBe(false);
    if (!isolationBeforeBaselineSettings.ok) {
      expect(
        isolationBeforeBaselineSettings.reasons.some((r) => r.includes('Baseline General Settings still missing'))
      ).toBe(true);
    }
  });

  it('ingests a 90° CONTROL_FIXTURE with different geometry and unchanged settings', () => {
    const control = ingestOperatorCalibrationRun(DOWIN_ASDD_BASELINE_RUN, {
      runId: 'dowin-90-control-asdd-sibling',
      timestampIso: '2026-09-09T18:30:00.000Z',
      generalSettingsScreenshotNote: 'asdd General Settings still not fully transcribed; control keeps the same snapshot',
      changedSettingNote: null,
      controlFixtureNote: 'Separate 90°/90° fixture. Settings unchanged. Geometry/cut-angle differ.',
      changedSetting: null,
      sourceHashesSha256: {
        generalSettingsScreenshot: 's',
        designPreview: 'a',
        assemblyLabels: 'b',
        optimization: 'c',
        mdb: 'm',
      },
      mdbGenerated: true,
      isolationVariable: 'ninetyDegreeControl',
      observedSettings: { ...DOWIN_ASDD_BASELINE_RUN.observedSettings },
      widthMm: 800,
      heightMm: 800,
      profileSystem: DOWIN_ASDD_BASELINE_RUN.profileSystem,
      pieces: [DOWIN_ASDD_BASELINE_RUN.pieces[0]],
      bars: [
        {
          ...DOWIN_ASDD_BASELINE_RUN.bars[0],
          id: 'control-bar',
          packedSegmentMm: [800],
          remainingMm: 5200,
        },
      ],
    });
    expect(control.ok).toBe(true);
    if (control.ok) {
      expect(control.run.runKind).toBe('CONTROL_FIXTURE');
      expect(control.run.widthMm).toBe(800);
      const table = buildIsolationDeltaTable([DOWIN_ASDD_BASELINE_RUN, control.run]);
      const row = table.find((r) => r.runKind === 'CONTROL_FIXTURE');
      expect(row?.interpretation).toBe('AMBIGUOUS');
      expect(row?.interpretation).not.toBe('PROVEN EFFECT');
    }

    const controlWithSettingChange = ingestOperatorCalibrationRun(DOWIN_ASDD_BASELINE_RUN, {
      runId: 'dowin-90-control-illegal-weld',
      timestampIso: '2026-09-09T18:30:00.000Z',
      generalSettingsScreenshotNote: 'settings',
      changedSettingNote: null,
      controlFixtureNote: '90° control',
      changedSetting: null,
      sourceHashesSha256: {
        generalSettingsScreenshot: 's',
        designPreview: 'a',
        assemblyLabels: 'b',
        optimization: 'c',
      },
      mdbGenerated: false,
      isolationVariable: 'ninetyDegreeControl',
      observedSettings: {
        ...DOWIN_ASDD_BASELINE_RUN.observedSettings,
        weldingWasteMm: 0,
      },
      widthMm: 800,
      heightMm: 800,
      profileSystem: DOWIN_ASDD_BASELINE_RUN.profileSystem,
      pieces: [DOWIN_ASDD_BASELINE_RUN.pieces[0]],
      bars: [...DOWIN_ASDD_BASELINE_RUN.bars],
    });
    expect(controlWithSettingChange.ok).toBe(false);
    if (!controlWithSettingChange.ok) {
      expect(
        controlWithSettingChange.reasons.some((r) => r.includes('CONTROL_FIXTURE must keep General Settings'))
      ).toBe(true);
    }
  });
});
