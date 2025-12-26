/**
 * Unit Tests for TallWindowSegmenter
 * 
 * Tests automatic segmentation, hardware synchronization, and inter-segment connections
 * 
 * @since Phase 1: Special Presets (Weeks 5-6)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TallWindowSegmenter } from '@/lib/presets/TallWindowSegmenter';
import type { WindowUnit } from '@/types/fabricator';

describe('TallWindowSegmenter', () => {
  let segmenter: TallWindowSegmenter;
  let mockWindowUnit: WindowUnit;

  beforeEach(() => {
    segmenter = new TallWindowSegmenter();
    mockWindowUnit = {
      id: 'test-window-1',
      orderNumber: 'ORD-001',
      posNumber: 'POS-001',
      type: 'sliding_window',
      components: [],
      overallWidth: 1800,
      overallHeight: 3000, // 3m - requires segmentation
      color: 'Silver',
      glazing: { type: 'double', thickness: 24 },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      systemPackId: 'rock60'
    };
  });

  describe('designTallSegmentedWindow', () => {
    it('should segment tall window into multiple segments', async () => {
      const design = await segmenter.designTallSegmentedWindow(
        3000, // 3m height
        2400, // 2.4m per segment
        'sliding_window',
        mockWindowUnit
      );

      expect(design.segments.length).toBeGreaterThan(1);
      expect(design.totalHeight).toBe(3000);
    });

    it('should handle exact segment height division', async () => {
      const design = await segmenter.designTallSegmentedWindow(
        4800, // 4.8m = 2 × 2.4m
        2400,
        'sliding_window',
        mockWindowUnit
      );

      expect(design.segments.length).toBe(2);
      expect(design.segments[0].height).toBe(2400);
      expect(design.segments[1].height).toBe(2400);
    });

    it('should handle non-divisible height', async () => {
      const design = await segmenter.designTallSegmentedWindow(
        3000, // 3m
        2400, // 2.4m per segment
        'sliding_window',
        mockWindowUnit
      );

      // Should have 2 segments: one 2400mm, one 600mm
      expect(design.segments.length).toBe(2);
      expect(design.segments[0].height).toBeGreaterThan(0);
      expect(design.segments[1].height).toBeGreaterThan(0);
      expect(design.segments[0].height + design.segments[1].height).toBeCloseTo(3000, 0);
    });

    it('should position handle at 1100mm for bottom segment', async () => {
      const design = await segmenter.designTallSegmentedWindow(
        3000,
        2400,
        'sliding_window',
        mockWindowUnit
      );

      const bottomSegment = design.segments[0];
      const handle = bottomSegment.hardware.handles[0];
      expect(handle.position).toBe(1100); // Egyptian standard
    });

    it('should calculate reinforcement for tall segments', async () => {
      const design = await segmenter.designTallSegmentedWindow(
        3000,
        2400,
        'sliding_window',
        mockWindowUnit
      );

      // Segments > 2400mm should have reinforcement
      design.segments.forEach(segment => {
        if (segment.height > 2400) {
          expect(segment.reinforcement.required).toBe(true);
        }
      });
    });

    it('should generate inter-segment connections', async () => {
      const design = await segmenter.designTallSegmentedWindow(
        4800, // 2 segments
        2400,
        'sliding_window',
        mockWindowUnit
      );

      expect(design.structuralConnections.length).toBe(1);
      expect(design.structuralConnections[0].fromSegment).toBe(1);
      expect(design.structuralConnections[0].toSegment).toBe(2);
    });

    it('should generate assembly sequence', async () => {
      const design = await segmenter.designTallSegmentedWindow(
        3000,
        2400,
        'sliding_window',
        mockWindowUnit
      );

      expect(design.assemblySequence.length).toBeGreaterThan(0);
      expect(design.assemblySequence[0].step).toBe(1);
      
      // Should have sequential steps
      const stepNumbers = design.assemblySequence.map(s => s.step);
      expect(stepNumbers).toEqual([...stepNumbers].sort((a, b) => a - b));
    });

    it('should determine correct hinge quantity', async () => {
      const design = await segmenter.designTallSegmentedWindow(
        3000,
        2400,
        'casement',
        mockWindowUnit
      );

      design.segments.forEach(segment => {
        // Segments around 2400mm should have 4 hinges
        if (segment.height >= 2400) {
          expect(segment.hardware.hinges.length).toBeGreaterThanOrEqual(4);
        }
      });
    });

    it('should include mullion connections for upper segments', async () => {
      const design = await segmenter.designTallSegmentedWindow(
        4800,
        2400,
        'sliding_window',
        mockWindowUnit
      );

      // Upper segments should have mullion connections
      const upperSegments = design.segments.filter(s => s.segment > 1);
      upperSegments.forEach(segment => {
        expect(segment.mullionConnection).toBeDefined();
      });
    });
  });
});


