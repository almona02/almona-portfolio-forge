
import { describe, it, expect } from 'vitest';
import { validateMeasurements, getConstraintsForSystemPack } from '@/lib/fabricatorValidation';
import { calculateGlassPocket, generateMuntinBarGeometry, ProfileCrossSection } from '@/lib/3d/windowGeometry';
import * as THREE from 'three';

// Mock the SYSTEM_PACKS if needed, but for now we rely on the real ones or pass constraints explicitly

describe('Fabricator Pro Reliability Tests', () => {

  describe('1. Data Verification: Impossible Dimensions', () => {
    it('should reject extremely small width (below default min)', () => {
      const result = validateMeasurements({
        width: '10', // 10mm
        height: '1000',
        windowType: 'sliding_window',
        glazingType: 'double'
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'width')).toBe(true);
    });

    it('should reject negative height', () => {
      const result = validateMeasurements({
        width: '1000',
        height: '-500',
        windowType: 'sliding_window',
        glazingType: 'double'
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'height')).toBe(true);
    });

    it('should validate correct dimensions', () => {
      const result = validateMeasurements({
        width: '1000',
        height: '1000',
        windowType: 'sliding_window',
        glazingType: 'double'
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('2. System Pack Constraints', () => {
    it('should respect custom constraints when provided', () => {
      const customConstraints = {
        minWidthMm: 500,
        maxWidthMm: 2000,
        minHeightMm: 500,
        maxHeightMm: 2000
      };
      
      // Test below custom min
      const resultLow = validateMeasurements({
        width: '400',
        height: '1000',
        windowType: 'sliding_window',
        glazingType: 'double'
      }, customConstraints);
      expect(resultLow.isValid).toBe(false);
      expect(resultLow.errors[0].message).toContain('at least 500mm');

      // Test above custom max
      const resultHigh = validateMeasurements({
        width: '2500',
        height: '1000',
        windowType: 'sliding_window',
        glazingType: 'double'
      }, customConstraints);
      expect(resultHigh.isValid).toBe(false);
      expect(resultHigh.errors[0].message).toContain('exceed 2000mm');
    });
  });

  describe('3. Visual Realism: Glass Pocket Logic', () => {
    const mockProfile: ProfileCrossSection = {
      outerWidth: 50,
      outerHeight: 50,
      wallThickness: 2,
      glassPocket: {
        width: 20,
        depth: 30,
        bottomClearance: 2
      },
      glazingBead: {
        width: 5,
        height: 20,
        clearance: 1
      },
      weatherSeal: { width: 5, depth: 5, position: 5 },
      hardwareMounts: []
    };

    it('should calculate correct layers for Single Glazing', () => {
      const result = calculateGlassPocket(mockProfile, 'single', 6);
      expect(result.glassLayers).toHaveLength(1);
      expect(result.glassLayers[0].thickness).toBe(6);
      expect(result.spacers).toHaveLength(0);
    });

    it('should calculate correct layers for Double Glazing', () => {
      const result = calculateGlassPocket(mockProfile, 'double', 6);
      // Should have 2 glass layers + 1 spacer (spacer is in separate array in the return object)
      expect(result.glassLayers).toHaveLength(2);
      expect(result.spacers).toHaveLength(1);
      
      // Check glass thickness
      expect(result.glassLayers[0].thickness).toBe(6);
      expect(result.glassLayers[1].thickness).toBe(6);
      
      // Check spacer logic (default spacer is 12mm)
      expect(result.spacers[0].thickness).toBe(12);
    });

    it('should calculate correct layers for Triple Glazing', () => {
      const result = calculateGlassPocket(mockProfile, 'triple', 4);
      // Should have 3 glass layers + 2 spacers
      expect(result.glassLayers).toHaveLength(3);
      expect(result.spacers).toHaveLength(2);
    });
  });

  describe('4. Geometry Stability: Dense Muntin Grid', () => {
    it('should generate geometry for dense grid without crashing', () => {
      // 10x10 grid on a 1m x 1m window
      const config = {
        type: 'grid' as const,
        pattern: { rows: 10, cols: 10 },
        width: 18,
        thickness: 5
      };

      const geometry = generateMuntinBarGeometry(1000, 1000, config);
      
      expect(geometry).toBeDefined();
      expect(geometry).not.toBeNull();
      
      if (geometry) {
        // Basic check that we have vertices
        expect(geometry.attributes.position.count).toBeGreaterThan(0);
        
        // 10 rows + 10 cols = 20 bars
        // Each bar is a Box (cube) -> 24 vertices (if not indexed) or 8 (if indexed)?
        // The current implementation uses BoxGeometry and merges them.
        // BoxGeometry usually has unique vertices for each face for normals, so 24 per box.
        // 20 bars * 24 vertices = 480 vertices approx.
        expect(geometry.attributes.position.count).toBeGreaterThanOrEqual(480);
      }
    });

    it('should return null for "none" type', () => {
      const config = { type: 'none' as const };
      const geometry = generateMuntinBarGeometry(1000, 1000, config);
      expect(geometry).toBeNull();
    });
  });

});
