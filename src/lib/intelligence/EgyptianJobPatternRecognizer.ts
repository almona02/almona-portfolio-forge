/**
 * EgyptianJobPatternRecognizer - Learns from Workshop History
 * 
 * Recognizes patterns from workshop project history:
 * - Common shapes in this workshop
 * - Typical sizes for different room types
 * - Material preferences by shape
 * - Time patterns (when they work on what)
 * - Success patterns (what designs had fewest issues)
 * - Regional pattern recognition (Cairo vs Alexandria vs Upper Egypt)
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

import type { WindowUnit } from '@/types/fabricator';
import type { ShapeType } from './ShapePatterns';
import { ShapeInferenceEngine } from './ShapeInferenceEngine';

export interface JobPatterns {
  // Most common shapes in this workshop
  commonShapes: Array<{
    shapeType: ShapeType;
    frequency: number;
    percentage: number;
  }>;
  
  // Typical sizes for different room types
  sizePatterns: Record<string, {
    widthRange: [number, number]; // mm
    heightRange: [number, number]; // mm
    averageArea: number; // m²
    count: number;
  }>;
  
  // Material preferences by shape
  materialPreferences: Record<ShapeType, {
    aluminum: number;
    upvc: number;
    preferred: 'aluminum' | 'upvc';
  }>;
  
  // Time patterns (when they work on what)
  timePatterns: {
    byDayOfWeek: Record<string, number>; // Projects per day
    byTimeOfDay: {
      morning: number;
      midday: number;
      afternoon: number;
      evening: number;
    };
    peakHours: string[];
  };
  
  // Success patterns (what designs had fewest issues)
  successPatterns: Array<{
    shapeType: ShapeType;
    systemPackId: string;
    successRate: number; // 0-1
    averageAccuracy: number; // 0-1
    issueCount: number;
  }>;
  
  // Egyptian regional variations
  regionalAdaptations: {
    location: string;
    commonShapes: ShapeType[];
    preferredMaterials: string[];
    typicalSizes: Record<string, any>;
  };
}

export interface ProjectInput {
  roomType?: 'kitchen' | 'bathroom' | 'living' | 'bedroom' | 'commercial' | 'villa';
  dimensions?: {
    width: number;
    height: number;
  };
  location?: string;
  description?: string;
}

export interface OptimizationSuggestions {
  // "Customers in your area prefer this glass for L-shaped windows"
  materialSuggestions: Array<{
    material: 'aluminum' | 'upvc';
    systemPackId: string;
    reason: string;
    reasonArabic: string;
    confidence: number;
  }>;
  
  // "This segmentation worked well for similar projects"
  segmentationSuggestions: Array<{
    segmentation: string;
    reason: string;
    reasonArabic: string;
    successRate: number;
  }>;
  
  // "Order these materials now to avoid delays"
  procurementAdvice: Array<{
    material: string;
    quantity: number;
    urgency: 'low' | 'medium' | 'high';
    reason: string;
    reasonArabic: string;
  }>;
  
  // "Schedule installation on Thursday to allow Friday adjustments"
  schedulingAdvice: {
    recommendedDay: string;
    recommendedTime: string;
    reason: string;
    reasonArabic: string;
  };
}

/**
 * EgyptianJobPatternRecognizer - Recognizes patterns from workshop history
 */
export class EgyptianJobPatternRecognizer {
  private shapeEngine: ShapeInferenceEngine;
  
  constructor() {
    this.shapeEngine = new ShapeInferenceEngine();
  }
  
  /**
   * Recognize daily patterns from workshop history
   */
  async recognizeDailyPatterns(workshopId: string): Promise<JobPatterns> {
    // TODO: Load from database when workshop history is available
    // For now, return empty patterns structure
    const history: WindowUnit[] = await this.getWorkshopHistory(workshopId);
    
    // Process all pattern identification in parallel for better performance
    const [commonShapes, sizePatterns, materialPreferences, timePatterns, successPatterns, regionalAdaptations] = 
      await Promise.all([
        this.identifyCommonShapes(history),
        Promise.resolve(this.extractSizePatterns(history)),
        Promise.resolve(this.learnMaterialChoices(history)),
        Promise.resolve(this.analyzeWorkTiming(history)),
        Promise.resolve(this.identifySuccessfulPatterns(history)),
        Promise.resolve(this.identifyRegionalPatterns(history))
      ]);
    
    return {
      commonShapes,
      sizePatterns,
      materialPreferences,
      timePatterns,
      successPatterns,
      regionalAdaptations
    };
  }
  
  /**
   * Get workshop history (placeholder - will be replaced with database query)
   */
  private async getWorkshopHistory(workshopId: string): Promise<WindowUnit[]> {
    // TODO: Query database for workshop projects
    // SELECT * FROM window_units WHERE workshop_id = ? ORDER BY created_at DESC LIMIT 100
    return [];
  }
  
  /**
   * Identify common shapes in workshop history
   */
  private async identifyCommonShapes(history: WindowUnit[]): Promise<JobPatterns['commonShapes']> {
    const shapeCounts: Record<ShapeType, number> = {
      'rectangular': 0,
      'l_shape': 0,
      'u_shape': 0,
      'irregular': 0,
      'multi_segment': 0,
      'arched': 0,
      'geometric_grid': 0,
      'curtain_wall': 0,
      'room_divider': 0
    };
    
    // Analyze each project (process in parallel for better performance)
    const shapePromises = history.map(async (project) => {
      try {
        const inferred = await this.shapeEngine.inferNonSymmetricShape({
          description: project.type,
          dimensions: {
            width: project.overallWidth,
            height: project.overallHeight
          }
        });
        return inferred.shapeType;
      } catch (error) {
        console.error('Error inferring shape:', error);
        return 'rectangular' as ShapeType; // Default to rectangular if inference fails
      }
    });
    
    const inferredShapes = await Promise.all(shapePromises);
    
    // Count shapes
    inferredShapes.forEach(shapeType => {
      shapeCounts[shapeType] = (shapeCounts[shapeType] || 0) + 1;
    });
    
    const total = history.length || 1;
    const shapes = Object.entries(shapeCounts)
      .map(([shapeType, count]) => ({
        shapeType: shapeType as ShapeType,
        frequency: count,
        percentage: (count / total) * 100
      }))
      .filter(s => s.frequency > 0)
      .sort((a, b) => b.frequency - a.frequency);
    
    return shapes;
  }
  
  /**
   * Extract size patterns by room type
   */
  private extractSizePatterns(history: WindowUnit[]): JobPatterns['sizePatterns'] {
    const patterns: JobPatterns['sizePatterns'] = {};
    
    // Group by room type (if available in project metadata)
    const byRoomType: Record<string, WindowUnit[]> = {};
    
    history.forEach(project => {
      const roomType = (project as any).roomType || 'unknown';
      if (!byRoomType[roomType]) {
        byRoomType[roomType] = [];
      }
      byRoomType[roomType].push(project);
    });
    
    // Calculate patterns for each room type
    Object.entries(byRoomType).forEach(([roomType, projects]) => {
      if (projects.length === 0) return;
      
      const widths = projects.map(p => p.overallWidth);
      const heights = projects.map(p => p.overallHeight);
      const areas = projects.map(p => (p.overallWidth * p.overallHeight) / 1000000);
      
      patterns[roomType] = {
        widthRange: [Math.min(...widths), Math.max(...widths)] as [number, number],
        heightRange: [Math.min(...heights), Math.max(...heights)] as [number, number],
        averageArea: areas.reduce((a, b) => a + b, 0) / areas.length,
        count: projects.length
      };
    });
    
    return patterns;
  }
  
  /**
   * Learn material choices from history
   */
  private learnMaterialChoices(history: WindowUnit[]): JobPatterns['materialPreferences'] {
    const preferences: JobPatterns['materialPreferences'] = {} as any;
    
    // Initialize all shape types
    const shapeTypes: ShapeType[] = ['rectangular', 'l_shape', 'u_shape', 'irregular', 'multi_segment'];
    shapeTypes.forEach(shapeType => {
      preferences[shapeType] = {
        aluminum: 0,
        upvc: 0,
        preferred: 'aluminum'
      };
    });
    
    // Analyze each project
    history.forEach(project => {
      const material = (project as any).material || 'aluminum';
      const shapeType = 'rectangular'; // Default, would be inferred in real implementation
      
      if (preferences[shapeType]) {
        if (material === 'aluminum') {
          preferences[shapeType].aluminum++;
        } else if (material === 'upvc') {
          preferences[shapeType].upvc++;
        }
      }
    });
    
    // Determine preferred material for each shape
    Object.keys(preferences).forEach(shapeType => {
      const pref = preferences[shapeType as ShapeType];
      pref.preferred = pref.aluminum >= pref.upvc ? 'aluminum' : 'upvc';
    });
    
    return preferences;
  }
  
  /**
   * Analyze work timing patterns
   */
  private analyzeWorkTiming(history: WindowUnit[]): JobPatterns['timePatterns'] {
    const byDayOfWeek: Record<string, number> = {
      'Sunday': 0,
      'Monday': 0,
      'Tuesday': 0,
      'Wednesday': 0,
      'Thursday': 0,
      'Friday': 0,
      'Saturday': 0
    };
    
    const byTimeOfDay = {
      morning: 0,
      midday: 0,
      afternoon: 0,
      evening: 0
    };
    
    history.forEach(project => {
      const createdAt = project.createdAt || new Date();
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][createdAt.getDay()];
      byDayOfWeek[dayOfWeek]++;
      
      const hour = createdAt.getHours();
      if (hour >= 7 && hour < 10) byTimeOfDay.morning++;
      else if (hour >= 10 && hour < 14) byTimeOfDay.midday++;
      else if (hour >= 14 && hour < 18) byTimeOfDay.afternoon++;
      else byTimeOfDay.evening++;
    });
    
    // Find peak hours
    const peakHours = Object.entries(byTimeOfDay)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([time]) => time);
    
    return {
      byDayOfWeek,
      byTimeOfDay,
      peakHours
    };
  }
  
  /**
   * Identify successful patterns
   */
  private identifySuccessfulPatterns(history: WindowUnit[]): JobPatterns['successPatterns'] {
    // TODO: Analyze projects with optimization results to determine success
    // For now, return empty array
    return [];
  }
  
  /**
   * Identify regional patterns
   */
  private identifyRegionalPatterns(history: WindowUnit[]): JobPatterns['regionalAdaptations'] {
    // TODO: Group by location and identify regional patterns
    // For now, return default
    return {
      location: 'Cairo',
      commonShapes: ['rectangular'],
      preferredMaterials: ['aluminum'],
      typicalSizes: {}
    };
  }
  
  /**
   * Suggest optimizations for new project
   */
  async suggestForNewProject(
    newProject: ProjectInput,
    patterns: JobPatterns
  ): Promise<OptimizationSuggestions> {
    const [materialSuggestions, segmentationSuggestions, procurementAdvice, schedulingAdvice] = 
      await Promise.all([
        this.suggestMaterials(newProject, patterns),
        Promise.resolve(this.suggestSegmentation(newProject, patterns)),
        Promise.resolve(this.suggestProcurement(newProject, patterns)),
        Promise.resolve(this.suggestSchedule(newProject, patterns))
      ]);
    
    return {
      materialSuggestions,
      segmentationSuggestions,
      procurementAdvice,
      schedulingAdvice
    };
  }
  
  /**
   * Suggest materials based on patterns
   */
  private async suggestMaterials(
    newProject: ProjectInput,
    patterns: JobPatterns
  ): Promise<OptimizationSuggestions['materialSuggestions']> {
    const suggestions: OptimizationSuggestions['materialSuggestions'] = [];
    
    // Infer shape from new project
    try {
      const inferred = await this.shapeEngine.inferNonSymmetricShape({
        description: newProject.description,
        dimensions: newProject.dimensions,
        roomType: newProject.roomType
      });
      
      const shapeType = inferred.shapeType;
      const materialPref = patterns.materialPreferences[shapeType];
      
      if (materialPref) {
        suggestions.push({
          material: materialPref.preferred,
          systemPackId: materialPref.preferred === 'aluminum' ? 'panda-50' : 'veka_70_softline',
          reason: `This material worked well for ${shapeType} windows in your workshop`,
          reasonArabic: `هذه المادة عملت بشكل جيد لنوافذ ${shapeType} في ورشتك`,
          confidence: 0.8
        });
      }
    } catch (error) {
      console.error('Error inferring shape for material suggestions:', error);
    }
    
    return suggestions;
  }
  
  /**
   * Suggest segmentation based on patterns
   */
  private suggestSegmentation(
    newProject: ProjectInput,
    patterns: JobPatterns
  ): OptimizationSuggestions['segmentationSuggestions'] {
    // TODO: Analyze successful segmentations from history
    return [];
  }
  
  /**
   * Suggest procurement based on patterns
   */
  private suggestProcurement(
    newProject: ProjectInput,
    patterns: JobPatterns
  ): OptimizationSuggestions['procurementAdvice'] {
    // TODO: Analyze material needs and suggest procurement
    return [];
  }
  
  /**
   * Suggest scheduling based on patterns
   */
  private suggestSchedule(
    newProject: ProjectInput,
    patterns: JobPatterns
  ): OptimizationSuggestions['schedulingAdvice'] {
    // Egyptian work week: Sunday-Thursday, Friday off
    // Recommend Thursday for installation to allow Friday adjustments
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    let recommendedDay = 'Thursday';
    let recommendedTime = '10:00';
    
    if (dayOfWeek === 4) { // Thursday
      recommendedDay = 'Thursday';
      recommendedTime = '10:00';
    } else if (dayOfWeek < 4) { // Sunday-Wednesday
      recommendedDay = 'Thursday';
      recommendedTime = '10:00';
    } else { // Friday or Saturday
      recommendedDay = 'Sunday';
      recommendedTime = '10:00';
    }
    
    return {
      recommendedDay,
      recommendedTime,
      reason: 'Schedule installation on Thursday to allow Friday adjustments if needed',
      reasonArabic: 'جدولة التركيب يوم الخميس للسماح بالتعديلات يوم الجمعة إذا لزم الأمر'
    };
  }
}

