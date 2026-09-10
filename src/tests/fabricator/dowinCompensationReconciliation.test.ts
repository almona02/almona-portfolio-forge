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
  DOWIN_ASDD_BASELINE_REPRODUCTION_RUN,
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
  classifyBaselineSettingsSnapshot,
  evaluateBaselineReproduction,
  computePieceLayerDeltas,
  emptyObservedSettings,
  ingestOperatorCalibrationRun,
  isBaselineSettingsSnapshotClassified,
  isCausalIsolationAuthorized,
  uniquePackedMinusNominalMm,
} from '@/lib/fabricator/dowinParity/dowinCompensationEvidence';

describe('FP-024B DoWin compensation reconciliation', () => {
  it('registers multiple fixture runs without filling unknown settings', () => {
    expect(DOWIN_CALIBRATION_RUNS).toHaveLength(6);
    expect(DOWIN_CALIBRATION_RUNS.filter((r) => r.isolationVariable === 'baseline')).toHaveLength(1);
    expect(DOWIN_CALIBRATION_RUNS.filter((r) => r.runKind === 'BASELINE_REPRODUCTION_RUN')).toHaveLength(1);
    expect(DOWIN_CALIBRATION_RUNS.filter((r) => r.status === 'PENDING_OPERATOR_RUN')).toHaveLength(4);
    expect(
      DOWIN_CALIBRATION_RUNS.filter((r) => r.runKind === 'SINGLE_SETTING_ISOLATION')
    ).toHaveLength(3);
    expect(DOWIN_CALIBRATION_RUNS.filter((r) => r.runKind === 'CONTROL_FIXTURE')).toHaveLength(1);
    expect(SINGLE_SETTING_ISOLATION_VARIABLES).toEqual(['weldingWaste', 'sawThickness', 'trimCut']);
    expect(calibrationRunKind('baselineReproduction')).toBe('BASELINE_REPRODUCTION_RUN');
    expect(calibrationRunKind('ninetyDegreeControl')).toBe('CONTROL_FIXTURE');
    expect(calibrationRunKind('weldingWaste')).toBe('SINGLE_SETTING_ISOLATION');
    expect(REQUIRED_ISOLATION_MACHINE_ID).toBe('DC-600');
    expect(isBaselineSettingsSnapshotClassified(DOWIN_ASDD_BASELINE_RUN.observedSettings)).toBe(true);
    expect(isCausalIsolationAuthorized()).toBe(true);
    expect(DOWIN_ASDD_BASELINE_REPRODUCTION_RUN.reproductionVerdict).toBe('REPRODUCED');
    expect(
      evaluateBaselineReproduction(DOWIN_ASDD_BASELINE_RUN, DOWIN_ASDD_BASELINE_REPRODUCTION_RUN).verdict
    ).toBe('REPRODUCED');
    expect(classifyBaselineSettingsSnapshot(DOWIN_ASDD_BASELINE_RUN.observedSettings).interpretation).toBe(
      'AMBIGUOUS'
    );
    const empty = emptyObservedSettings(null);
    expect(empty.weldingWasteMm).toBeNull();
    expect(empty.sawThicknessMm).toBeNull();
    expect(empty.trimCutMm).toBeNull();
    expect(DOWIN_ASDD_BASELINE_RUN.observedSettings.weldingWasteMm).toBe(3);
    expect(DOWIN_ASDD_BASELINE_RUN.observedSettings.sawThicknessMm).toBe(4);
    expect(DOWIN_ASDD_BASELINE_RUN.observedSettings.trimCutMm).toBe(0);
    expect(DOWIN_ASDD_BASELINE_RUN.observedSettings.sashOffsetMm).toBe(7);
    expect(DOWIN_ASDD_BASELINE_RUN.observedSettings.glazingClearanceMm).toBe(2.5);
    expect(DOWIN_ASDD_BASELINE_RUN.observedSettings.machineId).toBe('DC-600');
    expect(DOWIN_ASDD_BASELINE_RUN.observedSettings.compLessThan90LeftMm).toBeNull();
  });

  it('keeps settings snapshots fixture-specific', () => {
    const weld = DOWIN_CALIBRATION_RUNS.find((r) => r.fixtureId === 'dowin-asdd-weld-0-pending');
    const saw = DOWIN_CALIBRATION_RUNS.find((r) => r.fixtureId === 'dowin-asdd-saw-plus-1-pending');
    const reproduction = DOWIN_CALIBRATION_RUNS.find((r) => r.fixtureId === 'BASELINE_REPRODUCTION_RUN');
    expect(weld?.observedSettings).toEqual(emptyObservedSettings(null));
    expect(weld?.intendedIsolation?.instructedToMm).toBe(0);
    expect(saw?.intendedIsolation?.instructedToMm).toBe(5);
    expect(reproduction?.runKind).toBe('BASELINE_REPRODUCTION_RUN');
    expect(reproduction?.status).toBe('MEASURED');
    expect(reproduction?.reproductionVerdict).toBe('REPRODUCED');
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
    expect(a).toHaveLength(6);
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
    expect(frame.candidates.find((c) => c.termId === 'canonicalKerfIfSawThicknessKnown')?.mm).toBe(16);
    expect(frame.candidates.find((c) => c.termId === 'trimIfThisRunKnown')?.mm).toBe(0);
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
    expect(isolation).toHaveLength(6);
    expect(isolation.filter((r) => r.status === 'PENDING_OPERATOR_RUN')).toHaveLength(4);
    expect(isolation.filter((r) => r.interpretation === 'NOT MEASURED')).toHaveLength(4);
    expect(isolation.filter((r) => r.runKind === 'CONTROL_FIXTURE')[0]?.interpretation).toBe(
      'NOT MEASURED'
    );
    const report = buildOperatorIsolationReport();
    expect(report.deltaTable).toEqual(isolation);
    expect(report.baselineClassification.interpretation).toBe('AMBIGUOUS');
    expect(report.reproductionVerdict).toBe('REPRODUCED');
    expect(report.causalIsolationAuthorized).toBe(true);
    expect(report.knownExportIdentifiers.generalSettingsScreenshotSha256).toBe(
      '95652321b98d682eb07cc46d1e13e464fee21ee31e323e83089231688a72c18a'
    );
    expect(report.knownExportIdentifiers.files['asdasd_2026.09.09_18.15.mdb']).toBe(
      '6d5932947327db0272e5de92de4d47e4320ecb1aeadbc6a268f2bbd383a3f82d'
    );
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
        isolationBeforeBaselineSettings.reasons.some((r) => r.includes('MDB was generated but SHA-256'))
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

  it('accepts SINGLE_SETTING_ISOLATION only after BASELINE_REPRODUCTION_RUN reproduces', () => {
    const sameAsOriginal = evaluateBaselineReproduction(DOWIN_ASDD_BASELINE_RUN, DOWIN_ASDD_BASELINE_RUN);
    expect(sameAsOriginal.verdict).toBe('REPRODUCED');
    expect(sameAsOriginal.missingPairs).toEqual([]);
    expect(sameAsOriginal.remainderMismatches).toEqual([]);

    const hashes = {
      generalSettingsScreenshot: 's',
      designPreview: 'a',
      assemblyLabels: 'b',
      optimization: 'c',
    };

    const classifiedButNoReproduction = ingestOperatorCalibrationRun(
      DOWIN_ASDD_BASELINE_RUN,
      {
        runId: 'weld-0-before-reproduction',
        timestampIso: '2026-09-09T19:00:00.000Z',
        generalSettingsScreenshotNote: 'live snapshot classified; 1B not run',
        changedSettingNote: 'Welding Waste 3 → 0',
        controlFixtureNote: null,
        changedSetting: { field: 'weldingWasteMm', oldValue: 3, newValue: 0 },
        sourceHashesSha256: hashes,
        mdbGenerated: false,
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
      },
      { runs: [DOWIN_ASDD_BASELINE_RUN] }
    );
    expect(classifiedButNoReproduction.ok).toBe(false);
    if (!classifiedButNoReproduction.ok) {
      expect(
        classifiedButNoReproduction.reasons.some((r) => r.includes('BASELINE_REPRODUCTION_RUN must reproduce'))
      ).toBe(true);
    }

    const failedPieces = DOWIN_ASDD_BASELINE_RUN.pieces.map((p) =>
      p.category === 'sash_horizontal'
        ? { ...p, expectedPackedSegmentMm: 999, expectedMachineLengthMm: 999 }
        : p
    );
    const failedReproduction = ingestOperatorCalibrationRun(DOWIN_ASDD_BASELINE_RUN, {
      runId: 'BASELINE_REPRODUCTION_RUN-failed',
      timestampIso: '2026-09-09T19:10:00.000Z',
      generalSettingsScreenshotNote: 'Weld=3 / Saw=4 / Trim=0 unchanged; lengths did not match',
      changedSettingNote: null,
      controlFixtureNote: null,
      changedSetting: null,
      sourceHashesSha256: hashes,
      mdbGenerated: false,
      isolationVariable: 'baselineReproduction',
      observedSettings: { ...DOWIN_ASDD_BASELINE_RUN.observedSettings },
      widthMm: 1000,
      heightMm: 1500,
      profileSystem: DOWIN_ASDD_BASELINE_RUN.profileSystem,
      pieces: failedPieces,
      bars: [...DOWIN_ASDD_BASELINE_RUN.bars],
    });
    expect(failedReproduction.ok).toBe(true);
    if (failedReproduction.ok) {
      expect(failedReproduction.run.reproductionVerdict).toBe('REPRODUCTION_FAILED');
      expect(
        isCausalIsolationAuthorized([DOWIN_ASDD_BASELINE_RUN, failedReproduction.run])
      ).toBe(false);
    }

    const reproduced = ingestOperatorCalibrationRun(DOWIN_ASDD_BASELINE_RUN, {
      runId: 'BASELINE_REPRODUCTION_RUN',
      timestampIso: '2026-09-09T19:20:00.000Z',
      generalSettingsScreenshotNote: 'Weld=3 / Saw=4 / Trim=0 unchanged; DC-600; same asdd 1000×1500',
      changedSettingNote: null,
      controlFixtureNote: null,
      changedSetting: null,
      sourceHashesSha256: hashes,
      mdbGenerated: false,
      isolationVariable: 'baselineReproduction',
      observedSettings: { ...DOWIN_ASDD_BASELINE_RUN.observedSettings },
      widthMm: 1000,
      heightMm: 1500,
      profileSystem: DOWIN_ASDD_BASELINE_RUN.profileSystem,
      pieces: DOWIN_ASDD_BASELINE_RUN.pieces,
      bars: [...DOWIN_ASDD_BASELINE_RUN.bars],
    });
    expect(reproduced.ok).toBe(true);
    if (!reproduced.ok) throw new Error(reproduced.reasons.join('; '));
    expect(reproduced.run.runKind).toBe('BASELINE_REPRODUCTION_RUN');
    expect(reproduced.run.reproductionVerdict).toBe('REPRODUCED');
    expect(isCausalIsolationAuthorized([DOWIN_ASDD_BASELINE_RUN, reproduced.run])).toBe(true);

    const table = buildIsolationDeltaTable([DOWIN_ASDD_BASELINE_RUN, reproduced.run]);
    const reproductionRow = table.find((r) => r.runKind === 'BASELINE_REPRODUCTION_RUN');
    expect(reproductionRow?.interpretation).toBe('AMBIGUOUS');
    expect(reproductionRow?.note).toContain('Tests 2–4 may proceed');

    const weldIsolation = ingestOperatorCalibrationRun(
      DOWIN_ASDD_BASELINE_RUN,
      {
        runId: 'weld-0-after-reproduction',
        timestampIso: '2026-09-09T19:30:00.000Z',
        generalSettingsScreenshotNote: 'synthetic 1B REPRODUCED for ingest-gate test only',
        changedSettingNote: 'Welding Waste 3 → 0',
        controlFixtureNote: null,
        changedSetting: { field: 'weldingWasteMm', oldValue: 3, newValue: 0 },
        sourceHashesSha256: hashes,
        mdbGenerated: false,
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
      },
      { runs: [DOWIN_ASDD_BASELINE_RUN, reproduced.run] }
    );
    expect(weldIsolation.ok).toBe(true);
    if (weldIsolation.ok) {
      expect(weldIsolation.run.runKind).toBe('SINGLE_SETTING_ISOLATION');
    }

    const weldAfterFailedReproduction = ingestOperatorCalibrationRun(
      DOWIN_ASDD_BASELINE_RUN,
      {
        runId: 'weld-0-after-failed-reproduction',
        timestampIso: '2026-09-09T19:40:00.000Z',
        generalSettingsScreenshotNote: '1B failed; isolation must stay closed',
        changedSettingNote: 'Welding Waste 3 → 0',
        controlFixtureNote: null,
        changedSetting: { field: 'weldingWasteMm', oldValue: 3, newValue: 0 },
        sourceHashesSha256: hashes,
        mdbGenerated: false,
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
      },
      { runs: [DOWIN_ASDD_BASELINE_RUN, failedReproduction.ok ? failedReproduction.run : DOWIN_ASDD_BASELINE_RUN] }
    );
    expect(weldAfterFailedReproduction.ok).toBe(false);
  });
});
