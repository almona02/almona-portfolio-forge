/**
 * ComplexAssemblySequencer - Generates Assembly Sequences for Irregular Shapes
 * 
 * Creates step-by-step assembly sequences for complex shapes with:
 * - Tool requirements
 * - Time estimates
 * - Quality checkpoints
 * - Egyptian workshop workflow
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

import type { ShapeType, ShapePattern } from './ShapePatterns';
import type { SegmentationPlan } from './ShapeInferenceEngine';

export interface AssemblySequence {
  steps: Array<{
    step: number;
    description: string;
    descriptionArabic: string;
    segmentIds: string[];
    tools: string[];
    estimatedTime: number; // minutes
    critical: boolean;
    qualityCheckpoint?: string;
  }>;
  totalTime: number; // minutes
  requiredTools: string[];
  qualityCheckpoints: Array<{
    step: number;
    check: string;
    checkArabic: string;
    critical: boolean;
  }>;
}

/**
 * ComplexAssemblySequencer - Generates assembly sequences
 */
export class ComplexAssemblySequencer {
  /**
   * Generate assembly sequence for complex shape
   */
  generateComplexAssemblySequence(
    shapeType: ShapeType,
    segmentation: SegmentationPlan,
    pattern: ShapePattern | null
  ): AssemblySequence {
    const steps = this.generateSteps(shapeType, segmentation, pattern);
    const totalTime = steps.reduce((sum, step) => sum + step.estimatedTime, 0);
    
    // Collect required tools
    const requiredTools = new Set<string>();
    steps.forEach(step => {
      step.tools.forEach(tool => requiredTools.add(tool));
    });
    
    // Define quality checkpoints
    const qualityCheckpoints = this.defineQualityCheckpoints(shapeType, steps);
    
    return {
      steps,
      totalTime,
      requiredTools: Array.from(requiredTools),
      qualityCheckpoints
    };
  }
  
  /**
   * Generate assembly steps
   */
  private generateSteps(
    shapeType: ShapeType,
    segmentation: SegmentationPlan,
    pattern: ShapePattern | null
  ): AssemblySequence['steps'] {
    const _steps: AssemblySequence['steps'] = [];
    
    if (shapeType === 'l_shape' && pattern?.type === 'l_shape') {
      return this.generateLShapeSteps(pattern, segmentation);
    }
    
    if (shapeType === 'u_shape' && pattern?.type === 'u_shape') {
      return this.generateUShapeSteps(pattern, segmentation);
    }
    
    if (shapeType === 'multi_segment' && pattern?.type === 'multi_segment') {
      return this.generateMultiSegmentSteps(pattern, segmentation);
    }
    
    // Default sequence
    return this.generateDefaultSteps(segmentation);
  }
  
  /**
   * Generate steps for L-shape
   */
  private generateLShapeSteps(
    _pattern: ShapePattern & { type: 'l_shape' },
    _segmentation: SegmentationPlan
  ): AssemblySequence['steps'] {
    return [
      {
        step: 1,
        description: 'Cut and prepare leg 1 frame pieces',
        descriptionArabic: 'قطع وإعداد قطع إطار الرجل الأولى',
        segmentIds: ['leg1'],
        tools: ['saw', 'miter_box', 'measuring_tape'],
        estimatedTime: 15,
        critical: true,
        qualityCheckpoint: 'Verify leg 1 dimensions match specifications'
      },
      {
        step: 2,
        description: 'Cut and prepare leg 2 frame pieces',
        descriptionArabic: 'قطع وإعداد قطع إطار الرجل الثانية',
        segmentIds: ['leg2'],
        tools: ['saw', 'miter_box', 'measuring_tape'],
        estimatedTime: 15,
        critical: true,
        qualityCheckpoint: 'Verify leg 2 dimensions match specifications'
      },
      {
        step: 3,
        description: 'Assemble leg 1 frame with corner cleats',
        descriptionArabic: 'تجميع إطار الرجل الأولى مع وصلات الزاوية',
        segmentIds: ['leg1'],
        tools: ['corner_cleats', 'screws', 'screwdriver'],
        estimatedTime: 10,
        critical: true,
        qualityCheckpoint: 'Check leg 1 frame squareness'
      },
      {
        step: 4,
        description: 'Assemble leg 2 frame with corner cleats',
        descriptionArabic: 'تجميع إطار الرجل الثانية مع وصلات الزاوية',
        segmentIds: ['leg2'],
        tools: ['corner_cleats', 'screws', 'screwdriver'],
        estimatedTime: 10,
        critical: true,
        qualityCheckpoint: 'Check leg 2 frame squareness'
      },
      {
        step: 5,
        description: 'Join legs at corner with reinforcement',
        descriptionArabic: 'ربط الأرجل عند الزاوية مع التعزيز',
        segmentIds: ['leg1', 'leg2'],
        tools: ['corner_reinforcement', 'welding_equipment', 'clamps'],
        estimatedTime: 20,
        critical: true,
        qualityCheckpoint: 'Verify corner angle is exactly 90 degrees'
      },
      {
        step: 6,
        description: 'Install sliding hardware on both legs',
        descriptionArabic: 'تركيب الأكسسوارات المنزلقة على كلا الرجلين',
        segmentIds: ['leg1', 'leg2'],
        tools: ['roller_kit', 'track', 'drill'],
        estimatedTime: 15,
        critical: true
      },
      {
        step: 7,
        description: 'Install handles at 1100mm height',
        descriptionArabic: 'تركيب المقابض على ارتفاع 1100 مم',
        segmentIds: ['leg1', 'leg2'],
        tools: ['handle', 'drill', 'screws'],
        estimatedTime: 10,
        critical: true,
        qualityCheckpoint: 'Verify handle height matches Egyptian standard (1100mm)'
      },
      {
        step: 8,
        description: 'Install glazing in both legs',
        descriptionArabic: 'تركيب الزجاج في كلا الرجلين',
        segmentIds: ['leg1', 'leg2'],
        tools: ['glazing_tools', 'gaskets', 'glazing_beads'],
        estimatedTime: 20,
        critical: true,
        qualityCheckpoint: 'Check glazing fit and seal quality'
      },
      {
        step: 9,
        description: 'Final quality inspection',
        descriptionArabic: 'فحص الجودة النهائي',
        segmentIds: ['leg1', 'leg2'],
        tools: ['measuring_tape', 'level'],
        estimatedTime: 10,
        critical: true,
        qualityCheckpoint: 'Final inspection: dimensions, squareness, hardware, glazing'
      }
    ];
  }
  
  /**
   * Generate steps for U-shape
   */
  private generateUShapeSteps(
    _pattern: ShapePattern & { type: 'u_shape' },
    _segmentation: SegmentationPlan
  ): AssemblySequence['steps'] {
    return [
      {
        step: 1,
        description: 'Cut and prepare base frame pieces',
        descriptionArabic: 'قطع وإعداد قطع إطار القاعدة',
        segmentIds: ['base'],
        tools: ['saw', 'miter_box', 'measuring_tape'],
        estimatedTime: 15,
        critical: true
      },
      {
        step: 2,
        description: 'Cut and prepare left leg frame pieces',
        descriptionArabic: 'قطع وإعداد قطع إطار الرجل اليسرى',
        segmentIds: ['left-leg'],
        tools: ['saw', 'miter_box', 'measuring_tape'],
        estimatedTime: 10,
        critical: true
      },
      {
        step: 3,
        description: 'Cut and prepare right leg frame pieces',
        descriptionArabic: 'قطع وإعداد قطع إطار الرجل اليمنى',
        segmentIds: ['right-leg'],
        tools: ['saw', 'miter_box', 'measuring_tape'],
        estimatedTime: 10,
        critical: true
      },
      {
        step: 4,
        description: 'Assemble base frame',
        descriptionArabic: 'تجميع إطار القاعدة',
        segmentIds: ['base'],
        tools: ['corner_cleats', 'screws', 'screwdriver'],
        estimatedTime: 15,
        critical: true,
        qualityCheckpoint: 'Check base frame squareness'
      },
      {
        step: 5,
        description: 'Join left leg to base with reinforcement',
        descriptionArabic: 'ربط الرجل اليسرى بالقاعدة مع التعزيز',
        segmentIds: ['left-leg', 'base'],
        tools: ['corner_reinforcement', 'welding_equipment', 'clamps'],
        estimatedTime: 15,
        critical: true,
        qualityCheckpoint: 'Verify left corner angle is 90 degrees'
      },
      {
        step: 6,
        description: 'Join right leg to base with reinforcement',
        descriptionArabic: 'ربط الرجل اليمنى بالقاعدة مع التعزيز',
        segmentIds: ['right-leg', 'base'],
        tools: ['corner_reinforcement', 'welding_equipment', 'clamps'],
        estimatedTime: 15,
        critical: true,
        qualityCheckpoint: 'Verify right corner angle is 90 degrees'
      },
      {
        step: 7,
        description: 'Install hardware on all segments',
        descriptionArabic: 'تركيب الأكسسوارات على جميع الأقسام',
        segmentIds: ['base', 'left-leg', 'right-leg'],
        tools: ['hardware', 'drill', 'screws'],
        estimatedTime: 20,
        critical: true
      },
      {
        step: 8,
        description: 'Install glazing in all segments',
        descriptionArabic: 'تركيب الزجاج في جميع الأقسام',
        segmentIds: ['base', 'left-leg', 'right-leg'],
        tools: ['glazing_tools', 'gaskets', 'glazing_beads'],
        estimatedTime: 25,
        critical: true
      },
      {
        step: 9,
        description: 'Final quality inspection',
        descriptionArabic: 'فحص الجودة النهائي',
        segmentIds: ['base', 'left-leg', 'right-leg'],
        tools: ['measuring_tape', 'level'],
        estimatedTime: 10,
        critical: true
      }
    ];
  }
  
  /**
   * Generate steps for multi-segment
   */
  private generateMultiSegmentSteps(
    pattern: ShapePattern & { type: 'multi_segment' },
    segmentation: SegmentationPlan
  ): AssemblySequence['steps'] {
    const steps: AssemblySequence['steps'] = [];
    
    // Step 1: Cut all frame pieces
    steps.push({
      step: 1,
      description: 'Cut frame pieces for all segments',
      descriptionArabic: 'قطع قطع الإطار لجميع الأقسام',
      segmentIds: segmentation.segments.map(s => s.id),
      tools: ['saw', 'miter_box', 'measuring_tape'],
      estimatedTime: 30,
      critical: true
    });
    
    // Step 2: Assemble each segment
    segmentation.segments.forEach((segment, index) => {
      steps.push({
        step: 2 + index,
        description: `Assemble frame for segment ${segment.id}`,
        descriptionArabic: `تجميع إطار القسم ${segment.id}`,
        segmentIds: [segment.id],
        tools: ['corner_cleats', 'screws', 'screwdriver'],
        estimatedTime: 10,
        critical: true
      });
    });
    
    // Step 3: Join segments with mullions
    const mullionStep = steps.length + 1;
    steps.push({
      step: mullionStep,
      description: 'Join segments with mullions',
      descriptionArabic: 'ربط الأقسام بالأعمدة',
      segmentIds: segmentation.segments.map(s => s.id),
      tools: ['mullion_profiles', 'connectors', 'screws'],
      estimatedTime: 20,
      critical: true,
      qualityCheckpoint: 'Verify mullion alignment and spacing'
    });
    
    // Step 4: Install hardware
    steps.push({
      step: mullionStep + 1,
      description: 'Install hardware on all segments',
      descriptionArabic: 'تركيب الأكسسوارات على جميع الأقسام',
      segmentIds: segmentation.segments.map(s => s.id),
      tools: ['hardware', 'drill', 'screws'],
      estimatedTime: 25,
      critical: true
    });
    
    // Step 5: Install glazing
    steps.push({
      step: mullionStep + 2,
      description: 'Install glazing in all segments',
      descriptionArabic: 'تركيب الزجاج في جميع الأقسام',
      segmentIds: segmentation.segments.map(s => s.id),
      tools: ['glazing_tools', 'gaskets', 'glazing_beads'],
      estimatedTime: 30,
      critical: true
    });
    
    // Step 6: Final inspection
    steps.push({
      step: mullionStep + 3,
      description: 'Final quality inspection',
      descriptionArabic: 'فحص الجودة النهائي',
      segmentIds: segmentation.segments.map(s => s.id),
      tools: ['measuring_tape', 'level'],
      estimatedTime: 15,
      critical: true
    });
    
    return steps;
  }
  
  /**
   * Generate default steps for rectangular or other shapes
   */
  private generateDefaultSteps(segmentation: SegmentationPlan): AssemblySequence['steps'] {
    return [
      {
        step: 1,
        description: 'Cut frame pieces',
        descriptionArabic: 'قطع قطع الإطار',
        segmentIds: segmentation.segments.map(s => s.id),
        tools: ['saw', 'miter_box', 'measuring_tape'],
        estimatedTime: 20,
        critical: true,
        qualityCheckpoint: 'Verify all cut lengths match specifications'
      },
      {
        step: 2,
        description: 'Assemble frame',
        descriptionArabic: 'تجميع الإطار',
        segmentIds: segmentation.segments.map(s => s.id),
        tools: ['corner_cleats', 'screws', 'screwdriver'],
        estimatedTime: 15,
        critical: true,
        qualityCheckpoint: 'Check frame squareness and dimensions'
      },
      {
        step: 3,
        description: 'Install hardware',
        descriptionArabic: 'تركيب الأكسسوارات',
        segmentIds: segmentation.segments.map(s => s.id),
        tools: ['hardware', 'drill', 'screws'],
        estimatedTime: 15,
        critical: true
      },
      {
        step: 4,
        description: 'Install glazing',
        descriptionArabic: 'تركيب الزجاج',
        segmentIds: segmentation.segments.map(s => s.id),
        tools: ['glazing_tools', 'gaskets', 'glazing_beads'],
        estimatedTime: 20,
        critical: true
      },
      {
        step: 5,
        description: 'Final quality inspection',
        descriptionArabic: 'فحص الجودة النهائي',
        segmentIds: segmentation.segments.map(s => s.id),
        tools: ['measuring_tape', 'level'],
        estimatedTime: 10,
        critical: true
      }
    ];
  }
  
  /**
   * Define quality checkpoints
   */
  private defineQualityCheckpoints(
    shapeType: ShapeType,
    steps: AssemblySequence['steps']
  ): AssemblySequence['qualityCheckpoints'] {
    const checkpoints: AssemblySequence['qualityCheckpoints'] = [];
    
    // Checkpoint after cutting
    checkpoints.push({
      step: 1,
      check: 'Verify all cut lengths match specifications',
      checkArabic: 'التحقق من تطابق جميع أطوال القطع مع المواصفات',
      critical: true
    });
    
    // Checkpoint after frame assembly
    const assemblyStep = steps.find(s => s.description.toLowerCase().includes('assemble'));
    if (assemblyStep) {
      checkpoints.push({
        step: assemblyStep.step,
        check: 'Check frame squareness and dimensions',
        checkArabic: 'فحص استقامة الإطار والأبعاد',
        critical: true
      });
    }
    
    // Special checkpoints for complex shapes
    if (shapeType === 'l_shape' || shapeType === 'u_shape') {
      const cornerStep = steps.find(s => s.description.toLowerCase().includes('corner') || s.description.toLowerCase().includes('join'));
      if (cornerStep) {
        checkpoints.push({
          step: cornerStep.step,
          check: 'Verify corner reinforcement is properly installed',
          checkArabic: 'التحقق من تركيب تعزيز الزاوية بشكل صحيح',
          critical: true
        });
        
        checkpoints.push({
          step: cornerStep.step,
          check: 'Check corner angles are exactly 90 degrees',
          checkArabic: 'فحص زوايا الزاوية أنها 90 درجة بالضبط',
          critical: true
        });
      }
    }
    
    // Final checkpoint
    const finalStep = steps[steps.length - 1];
    if (finalStep) {
      checkpoints.push({
        step: finalStep.step,
        check: 'Final inspection: hardware, glazing, and overall quality',
        checkArabic: 'الفحص النهائي: الأكسسوارات والزجاج والجودة العامة',
        critical: true
      });
    }
    
    return checkpoints;
  }
}

