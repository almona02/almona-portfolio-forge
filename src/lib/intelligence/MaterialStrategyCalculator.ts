/**
 * MaterialStrategyCalculator - Chooses Materials Based on Shape Complexity
 * 
 * Determines optimal material selection based on:
 * - Shape complexity
 * - Machine capabilities
 * - Workshop preferences
 * - Egyptian market factors
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

import type { ShapeType, ShapePattern } from './ShapePatterns';
import type { MaterialStrategy } from './ShapeInferenceEngine';

export interface MachineCapabilities {
  hasWelding: boolean;
  hasBending: boolean;
  hasCNC: boolean;
  hasCrimping: boolean;
  maxBendRadius?: number; // mm
}

export interface MaterialRecommendation {
  material: 'aluminum' | 'upvc';
  systemPackId: string;
  reasoning: string;
  reasoningArabic: string;
  alternatives?: Array<{
    material: 'aluminum' | 'upvc';
    systemPackId: string;
    reason: string;
  }>;
}

/**
 * MaterialStrategyCalculator - Calculates optimal material strategy
 */
export class MaterialStrategyCalculator {
  /**
   * Choose material for shape complexity
   */
  chooseMaterialForShape(
    shapeType: ShapeType,
    complexityLevel: MaterialStrategy['complexityLevel'],
    machineCapabilities?: MachineCapabilities,
    workshopPreferences?: {
      preferredMaterial?: 'aluminum' | 'upvc';
      preferredSystem?: string;
    }
  ): MaterialRecommendation {
    // Workshop preference override
    if (workshopPreferences?.preferredMaterial) {
      return {
        material: workshopPreferences.preferredMaterial,
        systemPackId: workshopPreferences.preferredSystem || this.getDefaultSystem(workshopPreferences.preferredMaterial),
        reasoning: 'Based on workshop preference',
        reasoningArabic: 'بناءً على تفضيل الورشة'
      };
    }
    
    // Complexity-based recommendation
    if (complexityLevel === 'complex') {
      // Complex shapes typically require aluminum for structural integrity
      return {
        material: 'aluminum',
        systemPackId: 'rock60', // Strong system for complex shapes
        reasoning: 'Complex shapes require aluminum for structural integrity',
        reasoningArabic: 'الأشكال المعقدة تحتاج ألومنيوم للمتانة الهيكلية',
        alternatives: [
          {
            material: 'upvc',
            systemPackId: 'veka_70_softline',
            reason: 'UPVC alternative with corner connectors'
          }
        ]
      };
    }
    
    if (complexityLevel === 'medium') {
      // Medium complexity: check machine capabilities
      if (machineCapabilities?.hasWelding) {
        return {
          material: 'aluminum',
          systemPackId: 'panda-50',
          reasoning: 'Medium complexity with welding capability - aluminum recommended',
          reasoningArabic: 'تعقيد متوسط مع إمكانية اللحام - الألومنيوم موصى به'
        };
      } else {
        return {
          material: 'upvc',
          systemPackId: 'veka_70_softline',
          reasoning: 'Medium complexity without welding - UPVC with corner connectors',
          reasoningArabic: 'تعقيد متوسط بدون لحام - UPVC مع وصلات زاوية'
        };
      }
    }
    
    // Simple shapes: either material works
    return {
      material: 'aluminum',
      systemPackId: 'panda-50',
      reasoning: 'Simple shape - aluminum or UPVC both suitable',
      reasoningArabic: 'شكل بسيط - الألومنيوم أو UPVC مناسبان',
      alternatives: [
        {
          material: 'upvc',
          systemPackId: 'veka_70_softline',
          reason: 'UPVC alternative for simple shapes'
        }
      ]
    };
  }
  
  /**
   * Get default system for material
   */
  private getDefaultSystem(material: 'aluminum' | 'upvc'): string {
    if (material === 'aluminum') {
      return 'panda-50';
    } else {
      return 'veka_70_softline';
    }
  }
  
  /**
   * Assess if special tools are required
   */
  requiresSpecialTools(
    shapeType: ShapeType,
    material: 'aluminum' | 'upvc',
    machineCapabilities?: MachineCapabilities
  ): boolean {
    if (shapeType === 'l_shape' || shapeType === 'u_shape') {
      if (material === 'aluminum') {
        return !machineCapabilities?.hasWelding; // Needs welding for aluminum
      } else {
        return false; // UPVC uses corner connectors, no special tools needed
      }
    }
    
    if (shapeType === 'irregular' || shapeType === 'arched') {
      return true; // Always needs special tools for irregular shapes
    }
    
    return false;
  }
  
  /**
   * Estimate assembly time based on shape and material
   */
  estimateAssemblyTime(
    shapeType: ShapeType,
    material: 'aluminum' | 'upvc',
    complexityLevel: MaterialStrategy['complexityLevel']
  ): number {
    let baseTime = 30; // minutes for simple rectangular
    
    // Complexity multiplier
    if (complexityLevel === 'medium') baseTime *= 2;
    if (complexityLevel === 'complex') baseTime *= 4;
    
    // Shape-specific adjustments
    if (shapeType === 'l_shape') baseTime += 30; // Extra time for corner joining
    if (shapeType === 'u_shape') baseTime += 45; // Extra time for two corners
    if (shapeType === 'irregular') baseTime += 60; // Extra time for custom cuts
    
    // Material-specific adjustments
    if (material === 'upvc') {
      baseTime *= 0.8; // UPVC assembly is typically faster
    }
    
    return Math.round(baseTime);
  }
}

