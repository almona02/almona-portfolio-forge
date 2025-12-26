/**
 * SegmentReinforcementCalculator - Reinforcement Calculations
 * 
 * Calculates reinforcement requirements for tall window segments:
 * - Steel reinforcement for tall/heavy segments
 * - Aluminum reinforcement for medium segments
 * - Load-based calculations
 * 
 * @since Phase 1: Special Presets (Weeks 5-6)
 */

export interface ReinforcementSpec {
  required: boolean;
  type: 'steel' | 'aluminum' | 'none';
  dimensions?: { width: number; height: number };
  loadCapacity: number; // kg
}

/**
 * SegmentReinforcementCalculator - Reinforcement calculation engine
 */
export class SegmentReinforcementCalculator {
  private readonly MAX_HEIGHT_WITHOUT_REINFORCEMENT = 1800; // mm
  private readonly MAX_HEIGHT_ALUMINUM_REINFORCEMENT = 2400; // mm
  private readonly STEEL_REINFORCEMENT_THRESHOLD = 3000; // mm

  /**
   * Calculate reinforcement for segment
   */
  async calculateSegmentReinforcement(
    segmentHeight: number,
    isBottomSegment: boolean,
    isTopSegment: boolean,
    segmentWidth: number
  ): Promise<ReinforcementSpec> {
    // Calculate load (approximate)
    const segmentArea = (segmentHeight * segmentWidth) / 1_000_000; // m²
    const estimatedWeight = segmentArea * 25; // kg (approximate: 25kg/m² for double glazing)

    // Bottom segments typically need more reinforcement (supporting weight above)
    const loadFactor = isBottomSegment ? 1.5 : isTopSegment ? 1.0 : 1.2;

    const totalLoad = estimatedWeight * loadFactor;

    // Determine reinforcement type
    if (segmentHeight > this.STEEL_REINFORCEMENT_THRESHOLD || totalLoad > 150) {
      return {
        required: true,
        type: 'steel',
        dimensions: {
          width: 40, // mm
          height: segmentHeight - 100 // Full height minus clearance
        },
        loadCapacity: 200 // kg
      };
    } else if (segmentHeight > this.MAX_HEIGHT_ALUMINUM_REINFORCEMENT || totalLoad > 100) {
      return {
        required: true,
        type: 'aluminum',
        dimensions: {
          width: 50, // mm
          height: segmentHeight - 100
        },
        loadCapacity: 120 // kg
      };
    } else if (segmentHeight > this.MAX_HEIGHT_WITHOUT_REINFORCEMENT) {
      return {
        required: true,
        type: 'aluminum',
        dimensions: {
          width: 40, // mm
          height: segmentHeight - 100
        },
        loadCapacity: 80 // kg
      };
    }

    return {
      required: false,
      type: 'none',
      loadCapacity: 50 // kg (no reinforcement)
    };
  }
}


