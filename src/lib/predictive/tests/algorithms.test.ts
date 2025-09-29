import { describe, it, expect } from 'vitest';
import { PredictiveAlgorithms } from '../algorithms';
import type { VibrationAnalysis } from '../types';

describe('PredictiveAlgorithms', () => {
  describe('analyzeVibration', () => {
    it('should calculate correct RMS for simple vibration data', () => {
      const vibrationData = [1, -1, 1, -1];
      const analysis = PredictiveAlgorithms.analyzeVibration(vibrationData);

      expect(analysis.rms).toBeCloseTo(1, 1);
      expect(analysis.peak).toBe(1);
    });

    it('should detect high kurtosis for impact-like data', () => {
      const impactData = [0, 0, 0, 5, 0, 0, 0];
      const analysis = PredictiveAlgorithms.analyzeVibration(impactData);

      expect(analysis.kurtosis).toBeGreaterThan(5);
    });

    it('should analyze frequency domains correctly', () => {
      const vibrationData = Array.from({ length: 128 }, (_, i) =>
        Math.sin((2 * Math.PI * i) / 10)
      );
      const analysis = PredictiveAlgorithms.analyzeVibration(vibrationData);

      expect(analysis.frequencyDomain.lowBand).toBeGreaterThan(0);
      expect(analysis.frequencyDomain.midBand).toBeCloseTo(0, 1);
      expect(analysis.frequencyDomain.highBand).toBeCloseTo(0, 1);
    });
  });

  describe('predictRUL', () => {
    it('should predict lower RUL for high vibration and temperature', () => {
      const highVibration: VibrationAnalysis = {
        rms: 4.5,
        peak: 8.0,
        kurtosis: 4.5,
        frequencyDomain: { lowBand: 1, midBand: 2, highBand: 5 },
      };

      const rul = PredictiveAlgorithms.predictRUL(highVibration, 85, 3000);

      expect(rul.currentHealth).toBeLessThan(50);
      expect(rul.confidence).toBeLessThan(70);
      expect(rul.failureMode).toBe('bearing');
    });

    it('should predict higher RUL for normal conditions', () => {
      const normalVibration: VibrationAnalysis = {
        rms: 1.5,
        peak: 2.5,
        kurtosis: 3.0,
        frequencyDomain: { lowBand: 0.5, midBand: 0.8, highBand: 0.3 },
      };

      const rul = PredictiveAlgorithms.predictRUL(normalVibration, 60, 1000);

      expect(rul.currentHealth).toBeGreaterThan(80);
      expect(rul.confidence).toBeGreaterThan(85);
    });

    it('should provide appropriate recommended actions', () => {
      const alignmentVibration: VibrationAnalysis = {
        rms: 3.0,
        peak: 5.0,
        kurtosis: 3.2,
        frequencyDomain: { lowBand: 0.5, midBand: 3.5, highBand: 0.8 },
      };

      const rul = PredictiveAlgorithms.predictRUL(alignmentVibration, 65, 2000);

      expect(rul.failureMode).toBe('alignment');
      expect(rul.recommendedActions).toContain('Calibrate machine alignment');
      expect(rul.recommendedActions).toContain('Check foundation bolts');
    });
  });

  describe('detectAnomalies', () => {
    it('should detect anomalies in sensor data', () => {
      const normalData = [
        { type: 'vibration' as const, value: 1.2, unit: 'mm/s', status: 'normal' as const, trend: 'stable' as const, timestamp: new Date() },
        { type: 'temperature' as const, value: 55, unit: '°C', status: 'normal' as const, trend: 'stable' as const, timestamp: new Date() },
      ];

      const anomalyScore = PredictiveAlgorithms.detectAnomalies(normalData);
      expect(anomalyScore).toBeLessThan(3);
    });
  });
});


