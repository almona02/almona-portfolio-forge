import { describe, it, expect } from 'vitest';
import { calculateROI, maintenanceRules, generateMockCuttingMachines, generateMockMillingMachines } from '../data';

describe('Predictive Data Utilities', () => {
  describe('calculateROI', () => {
    it('should calculate positive ROI for typical manufacturing', () => {
      const roi = calculateROI(1000);

      expect(roi.annualSavings).toBe(96000);
      expect(roi.roiPercentage).toBeGreaterThan(0);
      expect(roi.paybackPeriod).toBeLessThan(2);
    });

    it('should handle different downtime costs', () => {
      const highCostROI = calculateROI(2000);

      expect(highCostROI.annualSavings).toBe(192000);
      expect(highCostROI.roiPercentage).toBeGreaterThan(250);
    });
  });

  describe('maintenanceRules', () => {
    it('should contain rules for critical parameters', () => {
      const parameters = maintenanceRules.map((rule) => rule.parameter);

      expect(parameters).toContain('Vibration RMS');
      expect(parameters).toContain('Bearing Temperature');
      expect(parameters).toContain('Spindle Runout');
      expect(parameters).toContain('Acoustic Noise');
    });

    it('should have proper threshold escalation', () => {
      const vibrationRule = maintenanceRules.find((rule) => rule.parameter === 'Vibration RMS');

      expect(vibrationRule).toBeDefined();
      expect(vibrationRule!.warning).toBe('>2.5 mm/s');
      expect(vibrationRule!.alert).toBe('>4.0 mm/s');
      expect(vibrationRule!.critical).toBe('>6.0 mm/s');
      expect(vibrationRule!.action).toContain('bearings');
    });
  });

  describe('mock data generators', () => {
    it('should generate realistic cutting machines', () => {
      const machines = generateMockCuttingMachines();

      expect(machines).toHaveLength(1);
      expect(machines[0].type).toBe('double_head');
      expect(machines[0].healthScore).toBeLessThanOrEqual(100);
      expect(machines[0].healthScore).toBeGreaterThan(0);
      expect(machines[0].sensorData).toHaveLength(3);
    });

    it('should generate realistic milling machines', () => {
      const machines = generateMockMillingMachines();

      expect(machines).toHaveLength(1);
      expect(machines[0].type).toBe('vertical_router');
      expect(machines[0].spindleHealth).toBeDefined();
      expect(machines[0].toolWear).toBeDefined();
    });
  });
});


