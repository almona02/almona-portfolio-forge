/**
 * Unit tests for BentProfileEngine
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 23)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BentProfileEngine } from '@/lib/presets/BentProfileEngine';

describe('BentProfileEngine', () => {
  let engine: BentProfileEngine;

  beforeEach(() => {
    engine = new BentProfileEngine();
  });

  it('should generate bent profile design', () => {
    const design = engine.generateBentProfile(
      1500, // 1500mm radius
      90, // 90 degrees
      'aluminum',
      70, // 70mm profile width
      50 // 50mm profile depth
    );

    expect(design).toBeDefined();
    expect(design.curve.radius).toBe(1500);
    expect(design.curve.angle).toBe(90);
    expect(design.manufacturing).toBeDefined();
  });

  it('should generate dome window design', () => {
    const design = engine.generateDomeWindow(
      2000, // 2000mm diameter
      'aluminum',
      70,
      50
    );

    expect(design).toBeDefined();
    expect(design.curve.angle).toBe(180); // Semi-circle
    expect(design.curve.radius).toBe(1000); // Half of diameter
  });

  it('should generate arch window design', () => {
    const design = engine.generateArchWindow(
      1500,
      90,
      'aluminum',
      70,
      50
    );

    expect(design).toBeDefined();
    expect(design.curve.radius).toBe(1500);
    expect(design.curve.angle).toBe(90);
  });

  it('should calculate chord length correctly', () => {
    const design = engine.generateBentProfile(
      1000,
      90,
      'aluminum',
      70,
      50
    );

    // For 90° arc with 1000mm radius, chord length should be ~1414mm
    expect(design.curve.chordLength).toBeGreaterThan(1400);
    expect(design.curve.chordLength).toBeLessThan(1420);
  });

  it('should calculate arc length correctly', () => {
    const design = engine.generateBentProfile(
      1000,
      90,
      'aluminum',
      70,
      50
    );

    // For 90° arc with 1000mm radius, arc length should be ~1571mm
    expect(design.curve.arcLength).toBeGreaterThan(1570);
    expect(design.curve.arcLength).toBeLessThan(1580);
  });

  it('should determine segmented bend for tight radius', () => {
    const design = engine.generateBentProfile(
      500, // Tight radius (may require segmentation)
      90,
      'aluminum',
      70,
      50
    );

    // Should determine if segmented or continuous
    expect(design.manufacturing.bendingMethod).toBeDefined();
  });
});

