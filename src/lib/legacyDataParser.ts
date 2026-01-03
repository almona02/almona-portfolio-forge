import { Profile, WindowComponent } from '@/types/fabricator';

// Mock parsing of legacy data - simplified for demonstration
export function parseLegacyOrderData(): {
  profiles: Profile[];
  components: WindowComponent[];
} {
  try {
    // Mock profiles derived from legacy XML profile entries
    const profiles: Profile[] = [
    {
      id: 'alm_frame_50',
      name: 'Aluminum Frame 50mm',
      type: 'frame',
      material: 'aluminum',
      system: 'SLIDING_50',
      width: 50,
      height: 25,
      thickness: 1.4,
      weightPerMeter: 1.2,
      color: 'Silver',
      supplier: 'Alumax',
      stockQuantity: 500,
      minStockLevel: 100,
      costPerMeter: 8.5,
      cuttingAllowance: 3,
    },
    {
      id: 'upvc_frame_60',
      name: 'UPVC Frame 60mm',
      type: 'frame',
      material: 'upvc',
      system: 'CASEMENT_60',
      width: 60,
      height: 30,
      thickness: 2.5,
      weightPerMeter: 2.1,
      color: 'White',
      supplier: 'Veka',
      stockQuantity: 300,
      minStockLevel: 50,
      costPerMeter: 6.8,
      cuttingAllowance: 2,
    },
  ];

  // Mock components derived from legacy XML cutting entries (Kesim)
  const components: WindowComponent[] = [
    {
      id: 'comp_1',
      type: 'frame',
      profile: profiles[0],
      width: 1200,
      height: 1500,
      quantity: 1,
      cuttingLengths: [1200, 1500],
      angles: [45, 45],
      machiningOperations: [],
      glazingType: 'double',
      hardware: [],
    },
    ];

    return { profiles, components };
  } catch (error) {
    console.error('Error parsing legacy order data:', error);
    
    // Return safe fallback data
    const fallbackProfiles: Profile[] = [
      {
        id: 'fallback_frame_50',
        name: 'Default Frame 50mm',
        type: 'frame',
        material: 'aluminum',
        system: 'DEFAULT_50',
        width: 50,
        height: 25,
        thickness: 1.4,
        weightPerMeter: 1.2,
        color: 'Silver',
        supplier: 'Default Supplier',
        stockQuantity: 100,
        minStockLevel: 20,
        costPerMeter: 8.5,
        cuttingAllowance: 3,
      },
    ];

    const fallbackComponents: WindowComponent[] = [];

    return { profiles: fallbackProfiles, components: fallbackComponents };
  }
}
