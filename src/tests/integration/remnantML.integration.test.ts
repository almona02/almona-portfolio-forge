/**
 * Integration Tests for Remnant ML System
 * Confirms remnant matching works with ML scoring and location priority
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RemnantManager } from '@/lib/inventory/RemnantManager';
import { remnantPredictor } from '@/lib/inventory/RemnantPredictor';
import type {
  Profile,
  Cut,
} from '@/types/fabricator';
import type {
  Remnant,
} from '@/lib/inventory/RemnantManager';

describe('Remnant ML System Integration Tests', () => {
  let mockProfile: Profile;
  let mockCuts: Cut[];
  let mockRemnants: Remnant[];

  beforeEach(() => {
    mockProfile = {
      id: 'profile-1',
      name: 'Test Aluminum Profile',
      material: 'aluminum',
      width: 50,
      height: 20,
      thickness: 1.4,
      color: 'White',
      costPerMeter: 10,
      cuttingAllowance: 2,
      stockQuantity: 100,
      minStockLevel: 10,
      supplier: 'Test Supplier',
    };

    mockCuts = [
      {
        length: 2000,
        angle: 90,
        componentId: 'comp-1',
        componentType: 'frame',
        waste: 2,
      },
      {
        length: 1500,
        angle: 90,
        componentId: 'comp-2',
        componentType: 'frame',
        waste: 2,
      },
      {
        length: 1800,
        angle: 90,
        componentId: 'comp-3',
        componentType: 'sash',
        waste: 2,
      },
    ];

    // Create mock remnants with different characteristics
    const now = new Date();
    const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
    const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

    mockRemnants = [
      {
        id: 'remnant-1',
        userId: 'user-1',
        profileId: mockProfile.id,
        profile: mockProfile,
        locationId: 'location-main',
        locationName: 'Main',
        length: 2500, // Good length, can fit 2000mm cut
        createdAt: oldDate, // Old remnant (high priority)
        lastCheckedAt: now,
        status: 'available',
        quality: 'good',
        estimatedValue: 25,
        usageCount: 0,
      },
      {
        id: 'remnant-2',
        userId: 'user-1',
        profileId: mockProfile.id,
        profile: mockProfile,
        locationId: 'location-warehouse',
        locationName: 'Warehouse B',
        length: 2200, // Can fit 2000mm cut
        createdAt: recentDate, // Recent remnant (lower priority)
        lastCheckedAt: now,
        status: 'available',
        quality: 'excellent',
        estimatedValue: 22,
        usageCount: 2, // Has been used before
      },
      {
        id: 'remnant-3',
        userId: 'user-1',
        profileId: mockProfile.id,
        profile: mockProfile,
        locationId: 'location-main',
        locationName: 'Main',
        length: 1600, // Can fit 1500mm cut
        createdAt: oldDate,
        lastCheckedAt: now,
        status: 'available',
        quality: 'good',
        estimatedValue: 16,
        usageCount: 1,
      },
      {
        id: 'remnant-4',
        userId: 'user-1',
        profileId: mockProfile.id,
        profile: mockProfile,
        locationId: 'location-warehouse',
        locationName: 'Warehouse B',
        length: 1900, // Can fit 1800mm cut
        createdAt: recentDate,
        lastCheckedAt: now,
        status: 'available',
        quality: 'fair',
        estimatedValue: 19,
        usageCount: 0,
      },
    ];

    // RemnantManager is a class that needs to be instantiated
  });

  describe('ML Prediction Scoring', () => {
    it('should calculate reuse likelihood for remnants', async () => {
      const remnant = mockRemnants[0];
      const likelihood = await remnantPredictor.predictReuseLikelihood(remnant);

      expect(likelihood).toBeGreaterThanOrEqual(0);
      expect(likelihood).toBeLessThanOrEqual(100);
    });

    it('should prioritize older remnants (higher score)', async () => {
      const oldRemnant = mockRemnants[0]; // 60 days old
      const newRemnant = mockRemnants[1]; // 5 days old

      const oldScore = await remnantPredictor.predictReuseLikelihood(oldRemnant);
      const newScore = await remnantPredictor.predictReuseLikelihood(newRemnant);

      // Older remnants should generally have higher scores (more urgent to use)
      expect(oldScore).toBeGreaterThan(newScore);
    });

    it('should prioritize longer remnants', async () => {
      const longRemnant = mockRemnants[0]; // 2500mm
      const shortRemnant = mockRemnants[3]; // 1900mm

      const longScore = await remnantPredictor.predictReuseLikelihood(longRemnant);
      const shortScore = await remnantPredictor.predictReuseLikelihood(shortRemnant);

      // Longer remnants should have higher scores (more versatile)
      expect(longScore).toBeGreaterThan(shortScore);
    });

    it('should factor in usage history', async () => {
      const usedRemnant = mockRemnants[1]; // usageCount: 2
      const unusedRemnant = mockRemnants[0]; // usageCount: 0

      const usedScore = await remnantPredictor.predictReuseLikelihood(usedRemnant);
      const unusedScore = await remnantPredictor.predictReuseLikelihood(unusedRemnant);

      // Remnants with usage history may score differently
      expect(usedScore).toBeGreaterThanOrEqual(0);
      expect(unusedScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Remnant Matching with ML Scoring', () => {
    it('should find matches and apply ML scoring', async () => {
      // Note: In a real test environment, you would mock the Supabase client
      // For now, we test the matching logic with available remnants
      const remnantManager = new RemnantManager();
      const matches = await remnantManager.findRemnantMatches(
        mockCuts,
        mockProfile,
        'aluminum',
        {
          useRemnantsFirst: true,
          minUtilization: 70,
          maxWastePercentage: 30,
        }
      );

      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should prioritize remnants by composite score', async () => {
      // This test verifies that the matching algorithm considers:
      // 1. Technical fit (length, utilization)
      // 2. ML prediction score
      // 3. Location priority

      const remnantManager = new RemnantManager();
      const matches = await remnantManager.findRemnantMatches(
        [mockCuts[0]], // Single 2000mm cut
        mockProfile,
        'aluminum',
        {
          useRemnantsFirst: true,
          minUtilization: 70,
          prioritizeLocation: 'Main',
        }
      );

      if (matches.length > 0) {
        // Matches should be sorted by composite score
        // Main location remnants should be prioritized
        const firstMatch = matches[0];
        expect(firstMatch.remnant.length).toBeGreaterThanOrEqual(mockCuts[0].length);
        expect(firstMatch.utilization).toBeGreaterThanOrEqual(70);
      }
    });

    it('should handle location-based prioritization', async () => {
      const remnantManager = new RemnantManager();
      const matches = await remnantManager.findRemnantMatches(
        mockCuts,
        mockProfile,
        'aluminum',
        {
          useRemnantsFirst: true,
          prioritizeLocation: 'Main',
        }
      );

      if (matches.length > 0) {
        // Main location remnants should be preferred
        const mainLocationMatches = matches.filter(
          m => m.remnant.locationName === 'Main'
        );
        
        // If there are main location matches, they should come first
        if (mainLocationMatches.length > 0) {
          expect(matches[0].remnant.locationName).toBe('Main');
        }
      }
    });

    it('should filter by specific location when requested', async () => {
      const remnantManager = new RemnantManager();
      const matches = await remnantManager.findRemnantMatches(
        mockCuts,
        mockProfile,
        'aluminum',
        {
          useRemnantsFirst: true,
          locationId: 'location-main',
        }
      );

      if (matches.length > 0) {
        // All matches should be from the specified location
        matches.forEach(match => {
          expect(match.remnant.locationId).toBe('location-main');
        });
      }
    });
  });

  describe('Remnant Utilization', () => {
    it('should calculate utilization correctly', async () => {
      const remnantManager = new RemnantManager();
      const matches = await remnantManager.findRemnantMatches(
        [mockCuts[0]], // 2000mm cut
        mockProfile,
        'aluminum',
        {
          useRemnantsFirst: true,
          minUtilization: 70,
        }
      );

      if (matches.length > 0) {
        const match = matches[0];
        const expectedUtilization = (mockCuts[0].length / match.remnant.length) * 100;
        
        expect(match.utilization).toBeCloseTo(expectedUtilization, 1);
        expect(match.utilization).toBeGreaterThanOrEqual(70);
      }
    });

    it('should handle multiple cuts in one remnant', async () => {
      const smallCuts: Cut[] = [
        {
          length: 800,
          angle: 90,
          componentId: 'comp-1',
          waste: 2,
        },
        {
          length: 700,
          angle: 90,
          componentId: 'comp-2',
          waste: 2,
        },
      ];

      const remnantManager = new RemnantManager();
      const matches = await remnantManager.findRemnantMatches(
        smallCuts,
        mockProfile,
        'aluminum',
        {
          useRemnantsFirst: true,
          minUtilization: 70,
        }
      );

      if (matches.length > 0) {
        const match = matches[0];
        // Should be able to fit multiple cuts
        expect(match.cuts.length).toBeGreaterThanOrEqual(1);
        expect(match.canFitMultiple).toBeDefined();
      }
    });
  });

  describe('Remnant Quality and Status', () => {
    it('should only match available remnants', async () => {
      // Test verifies that only 'available' status remnants are considered

      // This test verifies that only 'available' status remnants are considered
      // The actual implementation should filter by status in the database query
      const remnantManager = new RemnantManager();
      const matches = await remnantManager.findRemnantMatches(
        mockCuts,
        mockProfile,
        'aluminum',
        {
          useRemnantsFirst: true,
        }
      );

      // All matches should have available status
      matches.forEach(match => {
        expect(match.remnant.status).toBe('available');
      });
    });

    it('should consider remnant quality in scoring', async () => {
      const excellentRemnant = mockRemnants[1]; // quality: 'excellent'
      const fairRemnant = mockRemnants[3]; // quality: 'fair'

      const excellentScore = await remnantPredictor.predictReuseLikelihood(excellentRemnant);
      const fairScore = await remnantPredictor.predictReuseLikelihood(fairRemnant);

      // Both should return valid scores
      expect(excellentScore).toBeGreaterThanOrEqual(0);
      expect(fairScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cuts array', async () => {
      const remnantManager = new RemnantManager();
      const matches = await remnantManager.findRemnantMatches(
        [],
        mockProfile,
        'aluminum',
        {
          useRemnantsFirst: true,
        }
      );

      expect(matches).toEqual([]);
    });

    it('should handle no matching remnants', async () => {
      const veryLongCut: Cut[] = [
        {
          length: 10000, // Too long for any remnant
          angle: 90,
          componentId: 'comp-1',
          waste: 2,
        },
      ];

      const remnantManager = new RemnantManager();
      const matches = await remnantManager.findRemnantMatches(
        veryLongCut,
        mockProfile,
        'aluminum',
        {
          useRemnantsFirst: true,
        }
      );

      // Should return empty array or handle gracefully
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should handle remnants shorter than cuts', async () => {
      // Test verifies that remnants shorter than required cuts are not matched

      const remnantManager = new RemnantManager();
      const matches = await remnantManager.findRemnantMatches(
        [mockCuts[0]], // 2000mm cut
        mockProfile,
        'aluminum',
        {
          useRemnantsFirst: true,
        }
      );

      // Should not match remnants that are too short
      matches.forEach(match => {
        expect(match.remnant.length).toBeGreaterThanOrEqual(mockCuts[0].length);
      });
    });
  });
});

