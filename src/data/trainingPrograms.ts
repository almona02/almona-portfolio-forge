import { ReactNode } from 'react';
// We store icon identifiers as strings to keep this file free of JSX; components can map them to actual icons.
export type IconName = 'layers' | 'scissors' | 'thermometer' | 'settings' | 'zap' | 'shield-check' | 'gauge';

export interface FabricationStage {
  title: string;
  description: string;
  icon: IconName;
  duration: string; // human readable range
  keyPoints: string[];
}

export interface TrainingLevel {
  level: string;
  title: string;
  description: string;
  duration: string; // e.g. "5 Days"
  price: string; // numeric string without currency sign for flexibility
  features: string[];
  isPopular?: boolean;
}

// Note: icons kept lightweight; any styling done at usage site.
export const aluminiumStages: FabricationStage[] = [
  {
    title: 'Material Preparation',
    description: 'Proper handling and preparation of aluminum profiles',
  icon: 'layers',
    duration: '2-4 h',
    keyPoints: [
      'Profile storage best practices',
      'Material quality inspection',
      'Optimal cutting techniques',
      'Barcode tracking integration'
    ]
  },
  {
    title: 'Precision Cutting',
    description: 'Achieving perfect cuts for seamless joins',
  icon: 'scissors',
    duration: '4-6 h',
    keyPoints: [
      'CNC cutting machine operation',
      'Angle precision calibration',
      'Waste minimization techniques',
      'Dust extraction systems'
    ]
  },
  {
    title: 'Thermal Break Installation',
    description: 'Ensuring optimal thermal performance',
  icon: 'thermometer',
    duration: '3-5 h',
    keyPoints: [
      'Polyamide strip installation',
      'Thermal barrier testing',
      'Moisture prevention',
      'Structural integrity checks'
    ]
  },
  {
    title: 'Assembly & Glazing',
    description: 'Final assembly and glass installation',
  icon: 'settings',
    duration: '5-8 h',
    keyPoints: [
      'Corner cleaning techniques',
      'Screw pattern optimization',
      'Double glazing installation',
      'Hardware alignment'
    ]
  }
];

export const upvcStages: FabricationStage[] = [
  {
    title: 'Profile Welding',
    description: 'Creating strong, seamless joins in UPVC',
  icon: 'zap',
    duration: '3-5 h',
    keyPoints: [
      'Welding temperature control',
      'Corner cleaning techniques',
      'Weld seam strength testing',
      'Jig setup and alignment'
    ]
  },
  {
    title: 'Hardware Installation',
    description: 'Precision fitting of locks and mechanisms',
  icon: 'settings',
    duration: '4-6 h',
    keyPoints: [
      'Multi-point locking systems',
      'Handle alignment',
      'Weather seal integration',
      'Hardware durability testing'
    ]
  },
  {
    title: 'Glazing & Beading',
    description: 'Secure glass installation for UPVC frames',
  icon: 'shield-check',
    duration: '3-4 h',
    keyPoints: [
      'Gasket selection',
      'Beading techniques',
      'Pressure equalization',
      'Condensation prevention'
    ]
  },
  {
    title: 'Quality Control',
    description: 'Final inspection and testing procedures',
  icon: 'gauge',
    duration: '2-3 h',
    keyPoints: [
      'Air infiltration testing',
      'Water penetration tests',
      'Operational force measurement',
      'Visual inspection standards'
    ]
  }
];

export const trainingLevels: TrainingLevel[] = [
  {
    level: 'basic',
    title: 'Operator Certification',
    description: 'Fundamental machine operation skills',
    duration: '5 Days',
    price: '8500',
    features: [
      'Machine safety protocols',
      'Basic operation training',
      'Quality control fundamentals',
      'Certificate of completion'
    ]
  },
  {
    level: 'advanced',
    title: 'Master Fabricator',
    description: 'Advanced fabrication techniques',
    duration: '10 Days',
    price: '15000',
    features: [
      'Precision measurement techniques',
      'Advanced troubleshooting',
      'Efficiency optimization',
      'Gold certification',
      'Maintenance basics'
    ],
    isPopular: true
  },
  {
    level: 'expert',
    title: 'Production Specialist',
    description: 'Complete production line mastery',
    duration: '15 Days',
    price: '22000',
    features: [
      'Full process optimization',
      'Team leadership training',
      'Custom fabrication techniques',
      'Platinum certification',
      'Maintenance diagnostics'
    ]
  }
];

// Sample rolling cohort start dates generation (next 6 weeks)
export const generateUpcomingCohorts = () => {
  const today = new Date();
  return Array.from({ length: 6 }).map((_, i) => {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i * 7);
    return {
      id: i,
      start,
      month: start.toLocaleString('default', { month: 'short' }),
      day: start.getDate(),
      levels: trainingLevels.map(l => l.level)
    };
  });
};
