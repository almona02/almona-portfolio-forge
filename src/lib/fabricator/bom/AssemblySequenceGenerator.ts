/**
 * AssemblySequenceGenerator - Step-by-Step Assembly
 * 
 * Generates assembly sequences with:
 * - Pattern-based assembly sequences
 * - Egyptian workshop constraints
 * - Time and worker estimates
 * - Quality checkpoints
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 13)
 */

import { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { FabricationData, WindowUnit } from '@/types/fabricator';
import { ASSEMBLY_TIME_ESTIMATES } from './assemblySequenceConstants';

/**
 * AssemblySequenceGenerator - Assembly sequence generation engine
 */
export class AssemblySequenceGenerator {
  /**
   * Generate assembly sequence from pattern and BOM
   */
  async generateAssemblySequence(
    windowUnit: WindowUnit,
    pattern: EgyptianPattern,
    bom: {
      profiles: FabricationData['profiles'];
      hardware: FabricationData['hardware'];
      glazing: FabricationData['glazing'];
    }
  ): Promise<FabricationData['productionSequence']> {
    const sequence: FabricationData['productionSequence'] = [];
    let stepNumber = 1;

    // Step 1: Material Preparation & Cutting
    if (bom.profiles.length > 0) {
      const totalProfiles = bom.profiles.reduce((sum, p) => sum + p.quantity, 0);
      sequence.push({
        step: stepNumber++,
        operation: 'Cut frame and sash profiles',
        station: 'cutting',
        estimatedTime: Math.ceil(totalProfiles * ASSEMBLY_TIME_ESTIMATES.PER_PROFILE_MINUTES),
        toolsRequired: ['saw', 'measuring_tape', 'miter_box'],
        skillsRequired: 'basic',
        qualityGates: [
          'Verify cut lengths match specifications',
          'Check miter angles (45° for corners, 90° for straight)',
          'Inspect cut quality (no burrs, clean edges)'
        ]
      });
    }

    // Step 2: Frame Assembly
    const hasFrame = bom.profiles.some(p => p.role === 'frame');
    if (hasFrame) {
      sequence.push({
        step: stepNumber++,
        operation: 'Assemble frame with corner keys',
        station: 'assembly',
        estimatedTime: ASSEMBLY_TIME_ESTIMATES.FRAME_ASSEMBLY_MINUTES,
        toolsRequired: ['rubber_mallet', 'corner_keys', 'square'],
        skillsRequired: 'intermediate',
        qualityGates: [
          'Check frame squareness (diagonal measurements)',
          'Verify corner joints are tight',
          'Inspect frame for twists or warping'
        ]
      });
    }

    // Step 3: Mullion & Transom Installation
    const hasMullions = bom.profiles.some(p => p.role === 'mullion' || p.role === 'transom');
    if (hasMullions) {
      sequence.push({
        step: stepNumber++,
        operation: 'Install mullions and transoms',
        station: 'assembly',
        estimatedTime: ASSEMBLY_TIME_ESTIMATES.MULLION_TRANSOM_INSTALLATION_MINUTES,
        toolsRequired: ['drill', 'screws', 'level'],
        skillsRequired: 'intermediate',
        qualityGates: [
          'Verify mullion/transom positions match grid',
          'Check vertical/horizontal alignment',
          'Ensure secure attachment to frame'
        ]
      });
    }

    // Step 4: Sash Assembly
    const hasSashes = bom.profiles.some(p => p.role === 'sash');
    if (hasSashes) {
      sequence.push({
        step: stepNumber++,
        operation: 'Assemble sashes',
        station: 'assembly',
        estimatedTime: ASSEMBLY_TIME_ESTIMATES.SASH_ASSEMBLY_MINUTES,
        toolsRequired: ['corner_keys', 'rubber_mallet', 'square'],
        skillsRequired: 'intermediate',
        qualityGates: [
          'Check sash squareness',
          'Verify sash fits within frame opening',
          'Test sash movement (if applicable)'
        ]
      });
    }

    // Step 5: Hardware Installation
    if (bom.hardware.length > 0) {
      const totalHardware = bom.hardware.reduce((sum, h) => sum + h.quantity, 0);
      sequence.push({
        step: stepNumber++,
        operation: 'Install hardware (hinges, locks, handles)',
        station: 'assembly',
        estimatedTime: Math.ceil(totalHardware * ASSEMBLY_TIME_ESTIMATES.PER_HARDWARE_ITEM_MINUTES),
        toolsRequired: ['drill', 'screwdriver', 'torque_wrench'],
        skillsRequired: 'intermediate',
        qualityGates: [
          'Verify hardware positions match specifications',
          'Check hardware operation (smooth movement)',
          'Test lock mechanism (if applicable)',
          'Verify torque specifications (if applicable)'
        ]
      });
    }

    // Step 6: Glazing
    if (bom.glazing.length > 0) {
      const totalPanes = bom.glazing.length;
      sequence.push({
        step: stepNumber++,
        operation: 'Install glazing (glass panes)',
        station: 'glazing',
        estimatedTime: Math.ceil(totalPanes * ASSEMBLY_TIME_ESTIMATES.PER_GLAZING_PANE_MINUTES),
        toolsRequired: ['glazing_beads', 'rubber_mallet', 'safety_equipment'],
        skillsRequired: 'expert',
        qualityGates: [
          'Verify glass dimensions match specifications',
          'Check edge clearance (standard: 5mm per side)',
          'Inspect glass for defects (scratches, chips)',
          'Verify glazing bead installation (secure, flush)',
          'Check safety rating compliance (if applicable)'
        ]
      });
    }

    // Step 7: Quality Control & Final Inspection
    sequence.push({
      step: stepNumber++,
      operation: 'Final quality control and inspection',
      station: 'qc',
      estimatedTime: ASSEMBLY_TIME_ESTIMATES.QUALITY_CONTROL_MINUTES,
      toolsRequired: ['measuring_tape', 'level', 'square', 'checklist'],
      skillsRequired: 'expert',
      qualityGates: [
        'Verify overall dimensions match order',
        'Check all hardware functions correctly',
        'Inspect for visual defects (scratches, dents, misalignment)',
        'Test opening/closing mechanism (if applicable)',
        'Verify glazing is secure and properly sealed',
        'Check frame squareness and flatness',
        'Document any deviations or issues'
      ]
    });

    return sequence;
  }
}


