/**
 * HardwareSpecifier - Specifies Hardware for Complex Shapes
 * 
 * Determines hardware requirements for non-symmetric shapes:
 * - Hardware type and quantity per segment
 * - Corner hardware for L-shapes and U-shapes
 * - Structural reinforcements
 * - Egyptian Code 2020 compliance
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

import type { ShapeType, ShapePattern } from './ShapePatterns';
import type { SegmentationPlan } from './ShapeInferenceEngine';

export interface HardwareSpecification {
  hardware: Array<{
    type: string;
    category: string;
    quantity: number;
    position: string;
    specifications: Record<string, any>;
    egyptianCodeCompliant: boolean;
  }>;
  reinforcements: Array<{
    type: string;
    position: string;
    required: boolean;
    specifications: Record<string, any>;
  }>;
}

/**
 * HardwareSpecifier - Specifies hardware for complex shapes
 */
export class HardwareSpecifier {
  /**
   * Specify hardware for complex shape
   */
  specifyHardwareForComplexShape(
    shapeType: ShapeType,
    segmentation: SegmentationPlan,
    _pattern: ShapePattern | null
  ): HardwareSpecification {
    const hardware: HardwareSpecification['hardware'] = [];
    const reinforcements: HardwareSpecification['reinforcements'] = [];
    
    // Hardware per segment
    segmentation.segments.forEach(segment => {
      if (segment.type === 'l_leg' || segment.type === 'u_leg') {
        // Sliding hardware for L-shape and U-shape legs
        hardware.push({
          type: 'roller',
          category: 'sliding',
          quantity: 2, // Per leg
          position: `per ${segment.id}`,
          specifications: {
            loadCapacity: 50, // kg
            trackType: 'V-groove',
            brand: 'Egyptian Standard'
          },
          egyptianCodeCompliant: true
        });
        
        hardware.push({
          type: 'handle',
          category: 'opening',
          quantity: 1,
          position: `per ${segment.id}`,
          specifications: {
            height: 1100, // mm from floor (Egyptian standard)
            type: 'standard',
            material: 'stainless_steel'
          },
          egyptianCodeCompliant: true
        });
      } else if (segment.type === 'rectangular') {
        // Standard hardware for rectangular segments
        hardware.push({
          type: 'handle',
          category: 'opening',
          quantity: 1,
          position: `per ${segment.id}`,
          specifications: {
            height: 1100,
            type: 'standard'
          },
          egyptianCodeCompliant: true
        });
      }
    });
    
    // Corner hardware for L-shape and U-shape
    if (shapeType === 'l_shape' || shapeType === 'u_shape') {
      const cornerCount = segmentation.joints.filter(j => j.type === 'corner').length;
      
      hardware.push({
        type: 'corner_connector',
        category: 'structural',
        quantity: cornerCount,
        position: 'per corner joint',
        specifications: {
          type: 'welded', // For aluminum
          reinforcement: true,
          material: 'aluminum_grade_6063'
        },
        egyptianCodeCompliant: true
      });
      
      // Corner reinforcements
      segmentation.reinforcement.forEach(reinf => {
        if (reinf.type === 'corner') {
          reinforcements.push({
            type: 'corner_reinforcement',
            position: `corner at (${reinf.position.x}, ${reinf.position.y})`,
            required: reinf.required,
            specifications: {
              size: '200x200mm',
              thickness: '2mm',
              material: 'steel'
            }
          });
        }
      });
    }
    
    // Structural reinforcements for large spans
    segmentation.segments.forEach(segment => {
      const area = (segment.width * segment.height) / 1000000; // m²
      
      if (area > 4.0) { // Large area requires reinforcement
        reinforcements.push({
          type: 'structural_mullion',
          position: `center of ${segment.id}`,
          required: true,
          specifications: {
            width: 60, // mm
            material: 'aluminum_grade_6063'
          }
        });
      }
    });
    
    return { hardware, reinforcements };
  }
  
  /**
   * Calculate hardware quantities for multi-segment patterns
   */
  calculateMultiSegmentHardware(
    segmentation: SegmentationPlan,
    openingTypes: Array<'sliding' | 'fixed' | 'casement'>
  ): HardwareSpecification {
    const hardware: HardwareSpecification['hardware'] = [];
    const reinforcements: HardwareSpecification['reinforcements'] = [];
    
    segmentation.segments.forEach((segment, index) => {
      const openingType = openingTypes[index] || 'fixed';
      
      if (openingType === 'sliding') {
        hardware.push({
          type: 'roller',
          category: 'sliding',
          quantity: 2,
          position: `per ${segment.id}`,
          specifications: {
            loadCapacity: 50,
            trackType: 'V-groove'
          },
          egyptianCodeCompliant: true
        });
        
        hardware.push({
          type: 'interlock_kit',
          category: 'sliding',
          quantity: 1,
          position: `per ${segment.id}`,
          specifications: {
            type: 'standard'
          },
          egyptianCodeCompliant: true
        });
      } else if (openingType === 'casement') {
        hardware.push({
          type: 'hinge',
          category: 'opening',
          quantity: 2,
          position: `per ${segment.id}`,
          specifications: {
            loadCapacity: 50,
            type: 'standard'
          },
          egyptianCodeCompliant: true
        });
        
        hardware.push({
          type: 'espagnolette',
          category: 'locking',
          quantity: 1,
          position: `per ${segment.id}`,
          specifications: {
            type: 'standard'
          },
          egyptianCodeCompliant: true
        });
      }
      
      // Handle for all opening types
      if (openingType !== 'fixed') {
        hardware.push({
          type: 'handle',
          category: 'opening',
          quantity: 1,
          position: `per ${segment.id}`,
          specifications: {
            height: 1100,
            type: 'standard'
          },
          egyptianCodeCompliant: true
        });
      }
    });
    
    // Mullions between segments
    segmentation.joints.forEach(joint => {
      if (joint.type === 'mullion') {
        reinforcements.push({
          type: 'mullion',
          position: `between segments at (${joint.position.x}, ${joint.position.y})`,
          required: !joint.reinforcement, // Add if not already reinforced
          specifications: {
            width: 50, // mm
            material: 'aluminum_grade_6063'
          }
        });
      }
    });
    
    return { hardware, reinforcements };
  }
}

