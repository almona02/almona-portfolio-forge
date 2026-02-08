/**
 * ALMONA Cutting Engine tests
 */

import { describe, expect, it } from 'vitest';
import { AlmonaCuttingEngine, generateWorkshopPartIds } from '../AlmonaCuttingEngine';
import type { CutListItem } from '../UPVCCuttingEngine';
import { generateOptimizedCutList, generateOptimizedCutListForBatch } from '../UPVCCuttingEngine';

describe('AlmonaCuttingEngine', () => {
  describe('generateWorkshopPartIds', () => {
    it('should generate WD01-style part IDs from cut list items', () => {
      const items: CutListItem[] = [
        {
          profileId: 'p1',
          profileName: 'Frame',
          role: 'frame',
          cutLengthMm: 1200,
          quantity: 2,
          cuttingAngle: 45,
          barNumber: 1,
          positionOnBarMm: 0,
          wasteAfterMm: 0,
        },
        {
          profileId: 'p1',
          profileName: 'Frame',
          role: 'frame',
          cutLengthMm: 1400,
          quantity: 2,
          cuttingAngle: 45,
          barNumber: 1,
          positionOnBarMm: 0,
          wasteAfterMm: 0,
        },
      ];
      const map = generateWorkshopPartIds(items);
      expect(map.size).toBe(4);
      expect(map.get('0-0')).toBe('W01-1');
      expect(map.get('0-1')).toBe('W01-2');
      expect(map.get('1-0')).toBe('W02-1');
      expect(map.get('1-1')).toBe('W02-2');
    });
  });

  describe('AlmonaCuttingEngine', () => {
    it('should build report from OptimizedCutList and project info', () => {
      const windowUnit = {
        id: 'test',
        orderNumber: 'O1',
        posNumber: '1',
        type: 'casement',
        components: [],
        overallWidth: 1200,
        overallHeight: 1400,
        color: 'RAL 7012',
        glazing: {},
        hardware: [],
        status: 'design',
        optimization: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        systemPackId: 'pack1',
      } as any;
      const profiles = [
        {
          id: 'frame',
          name: 'Frame 60',
          profileRole: 'frame',
          width: 60,
          thickness: 2.5,
        },
      ] as any[];
      const cutList = generateOptimizedCutList(
        windowUnit,
        profiles,
        { burnOffMm: 3, coolingFactorPercent: 2.5 },
        6500
      );
      const engine = new AlmonaCuttingEngine({ barLengthMm: 6500, sawKerfMm: 10, endDeductionMm: 20 });
      const report = engine.buildReportFromOptimizedCutList(cutList, {
        name: 'Villa Z (69:71)',
        jobNumber: '179-2025',
        personInCharge: 'Khaled Ammar',
        directory: 'Badya V3B\\',
        profileType: 'DAW DW 12200/A',
        material: 'Aluminium',
        color: 'RAL 7012',
      });
      expect(report.header.title).toBe('Cut Optimisation');
      expect(report.header.project).toBe('Villa Z (69:71)');
      expect(report.header.jobNumber).toBe('179-2025');
      expect(report.header.sawCutDeduction).toBe('10 mm');
      expect(report.body.bars.length).toBeGreaterThan(0);
      expect(report.metrics.barsUsed).toBe(report.body.bars.length);
      expect(report.metrics.utilization).toBeGreaterThan(0);
      expect(report.metrics.utilization).toBeLessThanOrEqual(1);
    });
  });

  describe('generateOptimizedCutListForBatch', () => {
    it('should generate cut list for 10×1200×2100 + 5×1200×1200', () => {
      const profiles = [
        {
          id: 'frame',
          name: 'Frame 60',
          profileRole: 'frame',
          width: 60,
          thickness: 2.5,
        },
      ] as any[];
      const result = generateOptimizedCutListForBatch(
        [
          { overallWidth: 1200, overallHeight: 2100, quantity: 10 },
          { overallWidth: 1200, overallHeight: 1200, quantity: 5 },
        ],
        profiles,
        { burnOffMm: 3, coolingFactorPercent: 2.5 },
        6500
      );
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.totalBarsUsed).toBeGreaterThan(0);
      const totalCuts = result.items.reduce((s, i) => s + i.quantity, 0);
      expect(totalCuts).toBe(10 * 4 + 5 * 4); // 4 frame cuts per window (2H+2V)
    });
  });
});
