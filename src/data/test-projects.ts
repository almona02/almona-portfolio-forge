/**
 * Test Projects for Workshop Validation
 * 
 * These are the exact projects to test in the workshop
 */

export interface TestProject {
  id: string;
  description: string;
  system: 'panda-50' | 'rock-60';
  dimensions: {
    width: number; // mm
    height: number; // mm
  };
  expectedCuts: number;
  material: string;
  validationSteps: string[];
  expectedPatterns: string[];
}

export const TEST_PROJECTS: TestProject[] = [
  {
    id: 'TEST-001',
    description: '2-sash sliding window (Panda 50)',
    system: 'panda-50',
    dimensions: {
      width: 1200,
      height: 1500
    },
    expectedCuts: 12,
    material: 'Panda 50 aluminum',
    validationSteps: [
      '1. Print QR-coded cutting list from software',
      '2. Maalem cuts on CNC using software instructions',
      '3. Measure ACTUAL cut pieces (not CNC display)',
      '4. Enter actual lengths in CalibrationView',
      '5. Check delta patterns immediately'
    ],
    expectedPatterns: [
      'IF all cuts are ~4.2mm short → Kerf correction needed',
      'IF first cut significantly different → Bar trim issue',
      'IF all within ±1.0mm → Engine is already accurate'
    ]
  },
  {
    id: 'TEST-002',
    description: 'Single casement with transom (ROCK 60)',
    system: 'rock-60',
    dimensions: {
      width: 900,
      height: 1200
    },
    expectedCuts: 8,
    material: 'ROCK 60 aluminum',
    validationSteps: [
      '1. Generate cutting list for casement window',
      '2. Include transom in cutting list',
      '3. Verify transom milling (2.5mm) is applied',
      '4. Cut and measure actual pieces',
      '5. Check if transoms fit without gaps'
    ],
    expectedPatterns: [
      'IF transoms cause gaps → Increase milling depth',
      'IF transoms fit perfectly → Milling calculation correct',
      'IF all cuts accurate → Engine validated'
    ]
  },
  {
    id: 'TEST-003',
    description: '3-cut validation (Quick Test)',
    system: 'panda-50',
    dimensions: {
      width: 1200,
      height: 1500
    },
    expectedCuts: 3,
    material: 'Panda 50 aluminum',
    validationSteps: [
      '1. Generate cutting list',
      '2. Select only 3 cuts: Frame Left, Frame Right, Sash Horizontal',
      '3. Cut and measure',
      '4. Enter in CalibrationView',
      '5. Check immediate pattern detection'
    ],
    expectedPatterns: [
      'IF all 3 cuts are ~4.2mm short → Kerf correction needed',
      'IF first cut significantly different → Bar trim issue',
      'IF all within ±1.0mm → Engine is already accurate'
    ]
  }
];

/**
 * Get test project by ID
 */
export function getTestProject(id: string): TestProject | undefined {
  return TEST_PROJECTS.find(p => p.id === id);
}

