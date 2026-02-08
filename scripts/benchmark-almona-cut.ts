/**
 * Benchmark: ALMONA Cut Optimisation vs industry baseline
 *
 * Builds sample cut lists, runs AlmonaCuttingEngine.buildReportFromOptimizedCutList,
 * and logs utilization vs industry baseline (97.6%). Run: npx tsx scripts/benchmark-almona-cut.ts
 */

import { AlmonaCuttingEngine } from '../src/lib/fabricator/AlmonaCuttingEngine';
import { generateOptimizedCutList } from '../src/lib/fabricator/UPVCCuttingEngine';
import type { Profile, WindowUnit } from '../src/types/fabricator';

const INDUSTRY_BASELINE = 0.976;

function makeSampleWindowUnit(overallWidth: number, overallHeight: number): WindowUnit {
  return {
    id: 'bench-1',
    orderNumber: 'ORD-001',
    posNumber: '1',
    type: 'casement',
    components: [],
    overallWidth,
    overallHeight,
    color: 'RAL 7012',
    glazing: {},
    hardware: [],
    status: 'design',
    optimization: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    systemPackId: 'bench-pack',
  } as WindowUnit;
}

function makeSampleProfiles(): Profile[] {
  return [
    {
      id: 'p-frame',
      name: 'Frame 60mm',
      profileRole: 'frame',
      width: 60,
      thickness: 2.5,
      material: 'upvc',
      color: 'RAL 7012',
      costPerMeter: 100,
      cuttingAllowance: 3,
      stockQuantity: 100,
      minStockLevel: 10,
      supplier: 'Bench',
    } as Profile,
  ];
}

function runScenario(
  engine: AlmonaCuttingEngine,
  width: number,
  height: number,
  barLength: number
): { utilization: number; improvement: number; barsUsed: number } {
  const unit = makeSampleWindowUnit(width, height);
  const profiles = makeSampleProfiles();
  const cutList = generateOptimizedCutList(unit, profiles, { burnOffMm: 3, coolingFactorPercent: 2.5 }, barLength);
  const report = engine.buildReportFromOptimizedCutList(cutList, {
    name: 'Benchmark Project',
    jobNumber: 'BENCH-1',
    barLengthMm: barLength,
    sawKerfMm: 10,
    endDeductionMm: 20,
  });
  const improvement = report.metrics.improvementOverBaseline;
  return {
    utilization: report.metrics.utilization,
    improvement,
    barsUsed: report.metrics.barsUsed,
  };
}

function main(): void {
  console.log('ALMONA Cut Optimisation vs industry baseline (97.6% utilization)\n');

  const engine = new AlmonaCuttingEngine({
    barLengthMm: 6500,
    sawKerfMm: 10,
    endDeductionMm: 20,
  });

  const scenarios = [
    [1200, 1400],
    [900, 1200],
    [1800, 2100],
    [600, 900],
    [2400, 2400],
  ] as [number, number][];

  let totalImprovement = 0;
  let count = 0;

  scenarios.forEach(([w, h], i) => {
    const r = runScenario(engine, w, h, 6500);
    totalImprovement += r.improvement;
    count += 1;
    console.log(
      `Scenario ${i + 1} (${w}×${h}): utilization ${(r.utilization * 100).toFixed(1)}%, bars ${r.barsUsed}, vs baseline ${r.improvement >= 0 ? '+' : ''}${r.improvement.toFixed(1)}%`
    );
  });

  const avgImprovement = count > 0 ? totalImprovement / count : 0;
  console.log('\n---');
  console.log(`Average improvement vs baseline: ${avgImprovement >= 0 ? '+' : ''}${avgImprovement.toFixed(2)}%`);
  console.log('Benchmark complete.');
}

main();
