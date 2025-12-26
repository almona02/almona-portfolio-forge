/**
 * TallWindowSegmenter - Automatic Segmentation Engine
 * 
 * Automatically segments tall windows (>2.4m) with:
 * - Automatic segmentation algorithm
 * - Inter-segment connection design
 * - Hardware synchronization (hinges, handles, locks)
 * - Handle positioning at 1100mm (Egyptian standard)
 * 
 * Target: 99.7% accuracy for tall segmented windows
 * 
 * @since Phase 1: Special Presets (Weeks 5-6)
 */

import type { WindowUnit } from '@/types/fabricator';
import { SegmentReinforcementCalculator } from './SegmentReinforcementCalculator';

export interface SegmentedWindowDesign {
  totalHeight: number;
  segments: Array<{
    segment: number;
    height: number;
    reinforcement: {
      required: boolean;
      type: 'steel' | 'aluminum' | 'none';
      dimensions?: { width: number; height: number };
    };
    hardware: {
      hinges: Array<{
        position: number; // mm from bottom of segment
        type: string;
        loadCapacity: number; // kg
      }>;
      handles: Array<{
        position: number; // mm from bottom of segment
        type: string;
      }>;
      locks: Array<{
        position: number; // mm from bottom of segment
        type: string;
      }>;
    };
    mullionConnection?: {
      type: 'horizontal_mullion' | 'transom';
      position: number; // mm from bottom
      connector: string;
    };
  }>;
  structuralConnections: Array<{
    fromSegment: number;
    toSegment: number;
    type: 'mechanical' | 'welded' | 'thermal_break';
    specifications: Record<string, any>;
  }>;
  assemblySequence: Array<{
    step: number;
    operation: string;
    segment?: number;
    estimatedTime: number; // minutes
  }>;
}

/**
 * TallWindowSegmenter - Automatic segmentation engine
 */
export class TallWindowSegmenter {
  private readonly MAX_SEGMENT_HEIGHT = 2400; // mm (Egyptian standard)
  private readonly EGYPTIAN_HANDLE_HEIGHT = 1100; // mm (standard handle position)
  private reinforcementCalculator: SegmentReinforcementCalculator;

  constructor() {
    this.reinforcementCalculator = new SegmentReinforcementCalculator();
  }

  /**
   * Design tall segmented window
   */
  async designTallSegmentedWindow(
    height: number,
    segmentHeight: number,
    openingType: string,
    windowUnit: WindowUnit
  ): Promise<SegmentedWindowDesign> {
    // Calculate number of segments
    const segments = Math.ceil(height / segmentHeight);
    const remainingHeight = height % segmentHeight;
    const actualSegmentHeight = remainingHeight > 0 
      ? (height - remainingHeight) / (segments - 1) 
      : segmentHeight;

    const segmentDesigns: SegmentedWindowDesign['segments'] = [];

    for (let i = 0; i < segments; i++) {
      const isBottomSegment = i === 0;
      const isTopSegment = i === segments - 1;
      const segmentHeight = i === segments - 1 && remainingHeight > 0 
        ? remainingHeight 
        : actualSegmentHeight;

      // Calculate reinforcement
      const reinforcement = await this.reinforcementCalculator.calculateSegmentReinforcement(
        segmentHeight,
        isBottomSegment,
        isTopSegment,
        windowUnit.overallWidth
      );

      // Determine hardware
      const hardware = this.determineHardwareForSegment(
        i,
        segments,
        segmentHeight,
        openingType
      );

      // Determine mullion connection (if not bottom segment)
      const mullionConnection = i > 0 ? this.designHorizontalMullionConnection() : undefined;

      segmentDesigns.push({
        segment: i + 1,
        height: segmentHeight,
        reinforcement,
        hardware,
        mullionConnection
      });
    }

    // Design inter-segment connections
    const structuralConnections = this.designInterSegmentConnections(segments);

    // Generate assembly sequence
    const assemblySequence = this.generateSegmentedAssemblySequence(segmentDesigns);

    return {
      totalHeight: height,
      segments: segmentDesigns,
      structuralConnections,
      assemblySequence
    };
  }

  /**
   * Determine hardware for segment
   */
  private determineHardwareForSegment(
    segmentIndex: number,
    totalSegments: number,
    segmentHeight: number,
    openingType: string
  ): SegmentedWindowDesign['segments'][0]['hardware'] {
    const hardware: SegmentedWindowDesign['segments'][0]['hardware'] = {
      hinges: [],
      handles: [],
      locks: []
    };

    // Hinges: 2-4 depending on segment height and opening type
    const hingeCount = this.determineHingeQuantity(segmentHeight, openingType);
    const hingeSpacing = segmentHeight / (hingeCount + 1);

    for (let i = 0; i < hingeCount; i++) {
      hardware.hinges.push({
        position: hingeSpacing * (i + 1),
        type: openingType === 'casement' ? 'casement_hinge' : 'standard_hinge',
        loadCapacity: this.calculateHingeLoadCapacity(segmentHeight, openingType)
      });
    }

    // Handle: Position at 1100mm from bottom (Egyptian standard)
    // Adjust for segment position
    const handlePosition = this.positionHandleForSegment(segmentIndex, totalSegments, segmentHeight);
    hardware.handles.push({
      position: handlePosition,
      type: 'standard_handle'
    });

    // Locks: Determine based on opening type
    const lockPositions = this.determineLockingPoints(segmentHeight, openingType);
    lockPositions.forEach(position => {
      hardware.locks.push({
        position,
        type: openingType === 'casement' ? 'casement_lock' : 'standard_lock'
      });
    });

    return hardware;
  }

  /**
   * Determine hinge quantity based on segment height
   */
  private determineHingeQuantity(segmentHeight: number, openingType: string): number {
    if (segmentHeight <= 1200) return 2;
    if (segmentHeight <= 1800) return 3;
    if (segmentHeight <= 2400) return 4;
    return 5; // Very tall segments
  }

  /**
   * Calculate hinge load capacity
   */
  private calculateHingeLoadCapacity(segmentHeight: number, openingType: string): number {
    // Base capacity: 30kg per hinge
    const baseCapacity = 30;
    
    // Adjust for segment height
    const heightFactor = segmentHeight / 1800; // Normalize to 1800mm
    
    // Adjust for opening type
    const typeFactor = openingType === 'casement' ? 1.2 : 1.0;
    
    return Math.ceil(baseCapacity * heightFactor * typeFactor);
  }

  /**
   * Position handle for segment (Egyptian standard: 1100mm from bottom)
   */
  private positionHandleForSegment(
    segmentIndex: number,
    totalSegments: number,
    segmentHeight: number
  ): number {
    // For bottom segment: 1100mm from bottom
    if (segmentIndex === 0) {
      return Math.min(1100, segmentHeight - 100); // Ensure not too close to top
    }

    // For upper segments: Position handle in lower third for accessibility
    return segmentHeight * 0.3; // 30% from bottom
  }

  /**
   * Determine locking points
   */
  private determineLockingPoints(segmentHeight: number, openingType: string): number[] {
    if (openingType === 'casement') {
      // Casement: Lock at handle position and top
      return [
        Math.min(1100, segmentHeight - 100), // Handle position
        segmentHeight - 100 // Top lock
      ];
    } else {
      // Other types: Single lock at handle position
      return [Math.min(1100, segmentHeight - 100)];
    }
  }

  /**
   * Design horizontal mullion connection between segments
   */
  private designHorizontalMullionConnection(): SegmentedWindowDesign['segments'][0]['mullionConnection'] {
    return {
      type: 'horizontal_mullion',
      position: 0, // At the connection point
      connector: 'transom_connector_60mm'
    };
  }

  /**
   * Design inter-segment connections
   */
  private designInterSegmentConnections(
    segmentCount: number
  ): SegmentedWindowDesign['structuralConnections'] {
    const connections: SegmentedWindowDesign['structuralConnections'] = [];

    for (let i = 0; i < segmentCount - 1; i++) {
      connections.push({
        fromSegment: i + 1,
        toSegment: i + 2,
        type: 'mechanical', // Standard mechanical connection
        specifications: {
          connectorType: 'transom_connector',
          connectorSize: '60mm',
          fasteners: 'screws_m6',
          quantity: 4 // 2 per side
        }
      });
    }

    return connections;
  }

  /**
   * Generate assembly sequence for segmented window
   */
  private generateSegmentedAssemblySequence(
    segments: SegmentedWindowDesign['segments']
  ): SegmentedWindowDesign['assemblySequence'] {
    const sequence: SegmentedWindowDesign['assemblySequence'] = [];
    let stepNumber = 1;

    // Step 1: Prepare all segments
    sequence.push({
      step: stepNumber++,
      operation: 'Cut and prepare all segment profiles',
      estimatedTime: segments.length * 10 // 10 minutes per segment
    });

    // Step 2: Assemble segments (bottom to top)
    segments.forEach((segment, index) => {
      sequence.push({
        step: stepNumber++,
        operation: `Assemble segment ${segment.segment} (${segment.height}mm)`,
        segment: segment.segment,
        estimatedTime: 20 // 20 minutes per segment
      });

      // Add reinforcement if needed
      if (segment.reinforcement.required) {
        sequence.push({
          step: stepNumber++,
          operation: `Install reinforcement in segment ${segment.segment}`,
          segment: segment.segment,
          estimatedTime: 15
        });
      }

      // Add hardware installation
      sequence.push({
        step: stepNumber++,
        operation: `Install hardware in segment ${segment.segment}`,
        segment: segment.segment,
        estimatedTime: 15
      });

      // Add inter-segment connection (if not last segment)
      if (index < segments.length - 1) {
        sequence.push({
          step: stepNumber++,
          operation: `Connect segment ${segment.segment} to segment ${segment.segment + 1}`,
          segment: segment.segment,
          estimatedTime: 10
        });
      }
    });

    // Final step: Quality check
    sequence.push({
      step: stepNumber++,
      operation: 'Final quality check and alignment verification',
      estimatedTime: 20
    });

    return sequence;
  }
}


