/**
 * TestWindowGenerator - Generate Test Windows for Machine Validation
 * 
 * Creates test windows with ALL Egyptian features for physical validation
 * 
 * @since Phase 4: Machine Testing (Week 24)
 */

import type { WindowUnit } from '@/types/fabricator';

export interface TestWindowConfig {
  type: 'casement_with_fly_screen' | 'sliding_standard' | 'tall_segmented' | 'dome_heritage';
  width: number; // mm
  height: number; // mm
  location: 'cairo' | 'alexandria' | 'upper_egypt';
  features: string[];
}

export interface TestWindowResult {
  windowUnit: WindowUnit;
  testChecklist: {
    hingePositions: { expected: number; tolerance: number };
    handleHeight: { expected: number; tolerance: number };
    glassFit: { expected: number; tolerance: number };
    screenFrame: { clips: number; alignment: boolean };
    assemblyTime: { target: number; max: number };
    materialWaste: { target: number; max: number };
  };
  egyptianTests: {
    thermalExpansion?: { material: string; temperature: number; expansion: number };
    corrosionResistance?: { hardware: string; rating: string };
    sandDustProtection?: { seals: string; filtration: number };
  };
}

/**
 * TestWindowGenerator - Generates test windows for validation
 */
export class TestWindowGenerator {
  /**
   * Generate test window with all Egyptian features
   */
  generateTestWindow(config: TestWindowConfig): TestWindowResult {
    const windowUnit: WindowUnit = {
      id: `test-${config.type}-${Date.now()}`,
      orderNumber: 'TEST-001',
      posNumber: 'POS-001',
      type: config.type.includes('casement') ? 'casement' : 
            config.type.includes('sliding') ? 'sliding_window' : 'fixed_window',
      components: [],
      overallWidth: config.width,
      overallHeight: config.height,
      color: 'Silver',
      glazing: { type: 'double', thickness: 24 },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      systemPackId: 'rock60',
      presetId: config.type.includes('casement') ? 'casement-1s' : 'sliding-2s',
      flyScreenType: config.features.includes('fly_screen_magnetic') ? 'magnetic' : undefined
    };

    // Generate test checklist
    const testChecklist = this.generateTestChecklist(config, windowUnit);

    // Generate Egyptian-specific tests
    const egyptianTests = this.generateEgyptianTests(config);

    return {
      windowUnit,
      testChecklist,
      egyptianTests
    };
  }

  /**
   * Generate test checklist
   */
  private generateTestChecklist(
    config: TestWindowConfig,
    _windowUnit: WindowUnit
  ): TestWindowResult['testChecklist'] {
    return {
      hingePositions: {
        expected: 150, // 150mm from top/bottom (Egyptian Code 2020)
        tolerance: 0.5 // ±0.5mm
      },
      handleHeight: {
        expected: 1100, // 1100mm from bottom (Egyptian standard)
        tolerance: 10 // ±10mm
      },
      glassFit: {
        expected: 25, // 25mm glass pocket
        tolerance: 2 // ±2mm
      },
      screenFrame: {
        clips: config.features.includes('fly_screen_magnetic') ? 8 : 0,
        alignment: true
      },
      assemblyTime: {
        target: 25, // 25 minutes target
        max: 30 // 30 minutes maximum
      },
      materialWaste: {
        target: 12, // 12% target
        max: 15 // 15% maximum
      }
    };
  }

  /**
   * Generate Egyptian-specific tests
   */
  private generateEgyptianTests(
    config: TestWindowConfig
  ): TestWindowResult['egyptianTests'] {
    const tests: TestWindowResult['egyptianTests'] = {};

    // Cairo Summer Window (Thermal expansion)
    if (config.location === 'cairo') {
      tests.thermalExpansion = {
        material: 'Aluminum 6063-T5',
        temperature: 40, // 40°C simulated
        expansion: 1.2 // 1.2mm/m expansion (Egyptian Code)
      };
    }

    // Alexandria Coastal (Corrosion resistance)
    if (config.location === 'alexandria') {
      tests.corrosionResistance = {
        hardware: 'Marine-grade stainless steel',
        rating: 'Class 5' // Egyptian Standard
      };
    }

    // Upper Egypt Desert (Sand/dust protection)
    if (config.location === 'upper_egypt') {
      tests.sandDustProtection = {
        seals: 'Triple-layer gasket system',
        filtration: 95 // 95% dust filtration (Local Standard)
      };
    }

    return tests;
  }

  /**
   * Generate Cairo Summer Window test
   */
  generateCairoSummerWindow(): TestWindowResult {
    return this.generateTestWindow({
      type: 'casement_with_fly_screen',
      width: 1500,
      height: 1800,
      location: 'cairo',
      features: [
        'fly_screen_magnetic',
        'egyptian_hardware_standard',
        'solar_control_glass',
        'thermal_break'
      ]
    });
  }

  /**
   * Generate Alexandria Coastal Window test
   */
  generateAlexandriaCoastalWindow(): TestWindowResult {
    return this.generateTestWindow({
      type: 'sliding_standard',
      width: 2000,
      height: 1500,
      location: 'alexandria',
      features: [
        'corrosion_resistant_hardware',
        'marine_grade_seals',
        'drainage_system'
      ]
    });
  }

  /**
   * Generate Upper Egypt Desert Window test
   */
  generateUpperEgyptDesertWindow(): TestWindowResult {
    return this.generateTestWindow({
      type: 'casement_with_fly_screen',
      width: 1200,
      height: 1600,
      location: 'upper_egypt',
      features: [
        'fly_screen_magnetic',
        'sand_dust_protection',
        'triple_layer_gaskets',
        'desert_mesh'
      ]
    });
  }

  /**
   * Generate Dome Heritage Window test
   */
  generateDomeHeritageWindow(): TestWindowResult {
    return this.generateTestWindow({
      type: 'dome_heritage',
      width: 2000,
      height: 2000,
      location: 'cairo',
      features: [
        'heritage_architecture',
        'bent_profile',
        'custom_gaskets',
        'segmented_glass'
      ]
    });
  }
}

