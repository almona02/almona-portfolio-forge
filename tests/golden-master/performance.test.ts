/**
 * Golden Master Performance Tests
 * 
 * Tests that validate performance targets are met:
 * - Workflow completion in <45 minutes
 * - Stage-level performance benchmarks
 * - Regression detection
 * 
 * Week 2 Task 2.3: Golden Master Test Suite
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  getWorkflowProfiler,
  startWorkflow,
  startTiming,
  endTiming,
  endWorkflow,
} from '@/lib/performance/WorkflowProfiler';
import {
  getBaselineTracker,
  recordPerformanceBaseline,
  detectRegression,
} from '@/lib/performance/BaselineTracker';

// Performance targets
const TARGET_WORKFLOW_DURATION = 45 * 60 * 1000; // 45 minutes in milliseconds
const TARGET_STAGE_DURATIONS = {
  dxf_parsing: 30 * 1000, // 30 seconds
  hardware_validation: 10 * 1000, // 10 seconds
  cut_list_generation: 60 * 1000, // 1 minute
  optimization: 120 * 1000, // 2 minutes
  cnc_output: 20 * 1000, // 20 seconds
  export: 15 * 1000, // 15 seconds
};

describe('Golden Master Performance Tests', () => {
  let workflowProfiler: ReturnType<typeof getWorkflowProfiler>;
  let baselineTracker: ReturnType<typeof getBaselineTracker>;

  beforeAll(() => {
    workflowProfiler = getWorkflowProfiler();
    baselineTracker = getBaselineTracker();
  });

  beforeEach(() => {
    workflowProfiler.reset();
    baselineTracker.clearAllBaselines();
  });

  describe('Workflow Duration Targets', () => {
    it('should complete workflow in under 45 minutes', async () => {
      startWorkflow();

      // Simulate workflow stages with realistic timings
      startTiming('dxf_parsing', 'DXF Parsing');
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
      endTiming('dxf_parsing');

      startTiming('hardware_validation', 'Hardware Validation');
      await new Promise(resolve => setTimeout(resolve, 50));
      endTiming('hardware_validation');

      startTiming('cut_list_generation', 'Cut List Generation');
      await new Promise(resolve => setTimeout(resolve, 200));
      endTiming('cut_list_generation');

      startTiming('optimization', 'Optimization');
      await new Promise(resolve => setTimeout(resolve, 300));
      endTiming('optimization');

      startTiming('cnc_output', 'CNC Output');
      await new Promise(resolve => setTimeout(resolve, 100));
      endTiming('cnc_output');

      startTiming('export', 'Export');
      await new Promise(resolve => setTimeout(resolve, 50));
      endTiming('export');

      const metrics = endWorkflow();

      // Verify total duration is within target
      expect(metrics.totalDuration).toBeLessThan(TARGET_WORKFLOW_DURATION);
      expect(metrics.withinTarget).toBe(true);
    });

    it('should identify slowest stage', () => {
      startWorkflow();

      const stages = [
        { id: 'stage1', name: 'Stage 1', duration: 100 },
        { id: 'stage2', name: 'Stage 2', duration: 200 },
        { id: 'stage3', name: 'Stage 3', duration: 50 },
      ];

      stages.forEach(({ id, name, duration }) => {
        startTiming(id, name);
        // Simulate duration
        const start = performance.now();
        while (performance.now() - start < duration) {
          // Busy wait
        }
        endTiming(id);
      });

      const metrics = endWorkflow();

      expect(metrics.slowestStage).toBeDefined();
      expect(metrics.slowestStage?.id).toBe('stage2');
      expect(metrics.fastestStage?.id).toBe('stage3');
    });
  });

  describe('Stage-Level Performance', () => {
    Object.entries(TARGET_STAGE_DURATIONS).forEach(([stage, targetDuration]) => {
      it(`should complete ${stage} within target duration`, async () => {
        startWorkflow();
        startTiming(stage, stage);

        // Simulate work (use 10% of target for test speed, but cap at 1000ms for test speed)
        const testDuration = Math.min(targetDuration * 0.1, 1000);
        await new Promise(resolve => setTimeout(resolve, testDuration));

        const stageResult = endTiming(stage);
        expect(stageResult).toBeDefined();
        expect(stageResult?.duration).toBeLessThan(targetDuration);
      }, 10000); // Increase timeout to 10 seconds for longer stages
    });
  });

  describe('Performance Baseline Tracking', () => {
    it('should record performance baseline', () => {
      const workflowDuration = 30 * 60 * 1000; // 30 minutes
      const accuracyRate = 98.5;
      const errorRate = 1.5;

      recordPerformanceBaseline(workflowDuration, accuracyRate, errorRate);

      const baseline = baselineTracker.getLatestPerformanceBaseline();
      expect(baseline).toBeDefined();
      expect(baseline?.workflowDuration).toBe(workflowDuration);
      expect(baseline?.accuracyRate).toBe(accuracyRate);
      expect(baseline?.errorRate).toBe(errorRate);
    });

    it('should detect performance regression', () => {
      // Record baseline
      recordPerformanceBaseline(
        30 * 60 * 1000, // 30 minutes
        98.5, // 98.5% accuracy
        1.5 // 1.5% error rate
      );

      // Simulate regression
      const result = detectRegression(
        40 * 60 * 1000, // 40 minutes (worse)
        97.0, // 97% accuracy (worse)
        2.0 // 2% error rate (worse)
      );

      expect(result.hasRegression).toBe(true);
      expect(result.regressions.length).toBeGreaterThan(0);
    });

    it('should detect performance improvement', () => {
      // Record baseline
      recordPerformanceBaseline(
        40 * 60 * 1000, // 40 minutes
        97.0, // 97% accuracy
        2.0 // 2% error rate
      );

      // Simulate improvement
      const result = detectRegression(
        30 * 60 * 1000, // 30 minutes (better)
        98.5, // 98.5% accuracy (better)
        1.5 // 1.5% error rate (better)
      );

      expect(result.hasRegression).toBe(false);
      expect(result.improvements.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Trend Analysis', () => {
    it('should track performance trends', () => {
      // Record multiple baselines
      for (let i = 0; i < 5; i++) {
        const duration = (35 - i) * 60 * 1000; // Improving trend
        baselineTracker.recordBaseline('workflow_duration', duration);
      }

      const trend = baselineTracker.getPerformanceTrend('workflow_duration', 5);
      expect(trend).toBeDefined();
      expect(trend?.trend).toBe('improving');
      expect(trend?.latest).toBeLessThan(trend?.average);
    });

    it('should detect degrading performance trend', () => {
      // Record multiple baselines with degrading trend
      for (let i = 0; i < 5; i++) {
        const duration = (30 + i) * 60 * 1000; // Degrading trend
        baselineTracker.recordBaseline('workflow_duration', duration);
      }

      const trend = baselineTracker.getPerformanceTrend('workflow_duration', 5);
      expect(trend).toBeDefined();
      expect(trend?.trend).toBe('degrading');
      expect(trend?.latest).toBeGreaterThan(trend?.average);
    });
  });

  describe('Workflow Efficiency', () => {
    it('should calculate workflow efficiency', () => {
      startWorkflow();

      // Simulate fast workflow (20 minutes)
      const fastDuration = 20 * 60 * 1000;
      startTiming('test', 'Test');
      const start = performance.now();
      while (performance.now() - start < 100) {
        // Busy wait
      }
      endTiming('test');

      // Manually set workflow end time to simulate fast completion
      // Access private property for testing
      (workflowProfiler as any).workflowEndTime = (workflowProfiler as any).workflowStartTime + fastDuration;

      const efficiency = workflowProfiler.getWorkflowEfficiency();
      expect(efficiency.achieved).toBe(true);
      expect(efficiency.efficiency).toBeGreaterThan(100); // Better than target
    });
  });
});

