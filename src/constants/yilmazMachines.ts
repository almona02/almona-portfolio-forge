import { 
  Machine, 
  PowerSpecification, 
  Certification, 
  SafetyStandard
} from '../types';

// Helper function to parse dimensions
const parseDimensions = (dimensionStr: string) => {
  const parts = dimensionStr.split(' × ');
  return {
    length: parts[0] as `${number}mm`,
    width: parts[1] as `${number}mm`, 
    height: parts[2] as `${number}mm`
  };
};

// Helper function to create power specification
const createPowerSpec = (powerStr: string): PowerSpecification => {
  const powerMatch = powerStr.match(/([\d.]+)\s*kW/);
  const power = powerMatch ? `${powerMatch[1]} kW` as const : '0 kW' as const;
  
  return {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: power
  };
};

export const yilmazMachines: Machine[] = [
  {
    id: "ym-001",
    name: "YILMAZ ALM6510",
    description: "High-precision CNC cutting and processing machine for aluminum profiles",
    imageUrl: "/images/machines/cutting-machine.jpg",
    specPdf: "/documents/specs/cnc-cutting-machine.pdf",
    youtubeUrl: "https://www.youtube.com/watch?v=CeGDjE9QCqQ",
    category: "cutting-machines",
    featured: true,
    releaseDate: "2023-05-15",
    type: "CNC Cutting and Processing Center",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '32.0 kW'
    },
    dimensions: {
      length: '7500mm',
      width: '2200mm',
      height: '1800mm'
    },
    tags: ["New", "TOP TECHNOLOGY"],
    specifications: [
      "Cutting accuracy: ±0.1mm",
      "Max cutting length: 6500mm",
      "Programmable cutting angles"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop'],
    egyptianCompliance: {
      standard: 'ES1109',
      certificateNumber: 'ES-ALM6510-2023',
      issueDate: '2023-05-15'
    }
  },
  {
    id: "ym-002",
    name: "YILMAZ DC-421-PBS",
    description: "High-precision Double Head cutting machine for aluminum profiles",
    imageUrl: "/images/machines/DC-421-PBS.jpg",
    specPdf: "/documents/specs/cnc-cutting-machine.pdf",
    youtubeUrl: "https://www.youtube.com/watch?v=1B5elf1hDG4",
    category: "cutting-machines",
    featured: true,
    releaseDate: "2012-05-10",
    type: "Double Head Cutting Machine",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '32.0 kW'
    },
    dimensions: {
      length: '4000mm',
      width: '2200mm',
      height: '1800mm'
    },
    tags: ["New", "Best Sales"],
    specifications: [
      "Cutting accuracy: ±0.1mm",
      "Max cutting length: 6500mm",
      "Programmable cutting angles"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards']
  },
  {
    id: "ym-003",
    name: "YILMAZ DK502",
    description: "High-Quality Double Head Welding machine for UPVC profiles",
    imageUrl: "/images/machines/DK-502.jpg",
    specPdf: "/documents/specs/DK-502.pdf",
    youtubeUrl: "https://youtu.be/jOLX0XMXC9A?si=U6F-JPhfUVARqUx1",
    category: "welding-machines",
    featured: true,
    releaseDate: "2012-05-10",
    type: "Double Head WELDING Machine",
    powerSpec: {
      voltage: '230V',
      frequency: '50Hz',
      phase: '1',
      consumption: '2.2 kW'
    },
    dimensions: {
      length: '3500mm',
      width: '1200mm',
      height: '1800mm'
    },
    tags: ["New", "Best Sales"],
    specifications: [
      "Machine is ideal for welding process of PVC plastic profiles at two corners.",
      "Practical setting of standard (2 mm) or seamless (0.2 mm for free of flashes) welding options",
      "Max welding square is 3530 mm"
    ],
    certifications: ['CE'],
    safetyFeatures: ['AutomaticGuards', 'EmergencyStop']
  },
  {
    id: "ym-004",
    name: "YILMAZ KM212",
    description: "Portable End Milling Machine for aluminum profiles",
    imageUrl: "/images/machines/KM-212.jpg",
    specPdf: "/documents/specs/KM-212.pdf",
    youtubeUrl: "https://www.youtube.com/watch?v=1B5elf1hDG4",
    category: "processing-centers",
    featured: true,
    releaseDate: "2012-05-10",
    type: "End Milling Machine",
    powerSpec: {
      voltage: '230V',
      frequency: '50Hz',
      phase: '1',
      consumption: '0.75 kW'
    },
    dimensions: {
      length: '600mm',
      width: '500mm',
      height: '400mm'
    },
    tags: ["Portable", "Precision"],
    specifications: [
      "Max end-milling capacity: 65mm × 160mm",
      "Max saw blade diameter: Ø120mm",
      "Manual vertical and horizontal clamps"
    ],
    certifications: ['CE'],
    safetyFeatures: ['EmergencyStop']
  },
  {
    id: "ym-005",
    name: "YILMAZ KD-402",
    description: "RELIABLE DOUBLE HEAD CUTTING machine for aluminum profiles",
    imageUrl: "/images/machines/KD-402-S.jpg",
    specPdf: "/documents/specs/KD-402-S.pdf",
    youtubeUrl: "https://www.youtube.com/watch?v=CeGDjE9QCqQ",
    category: "cutting-machines",
    featured: true,
    releaseDate: "2023-05-15",
    type: "DOUBLE HEAD CUTTING MACHINE",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '4.4 kW'
    },
    dimensions: {
      length: '3500mm',
      width: '1200mm',
      height: '1300mm'
    },
    tags: ["New", "RELIABLE"],
    specifications: [
      "Cutting accuracy: ±0.1mm",
      "Max cutting length: 6500mm",
      "Programmable cutting angles"
    ],
    certifications: ['CE'],
    safetyFeatures: ['AutomaticGuards']
  },
  {
    id: "ym-006",
    name: "YILMAZ FR-221-S",
    description: "High-QUALITY COPY ROUTER machine for aluminum profiles",
    imageUrl: "/images/machines/FR-221-S.jpg",
    specPdf: "/documents/specs/FR-221-S.pdf",
    youtubeUrl: "https://www.youtube.com/watch?v=CeGDjE9QCqQ",
    category: "processing-centers",
    featured: true,
    releaseDate: "2023-05-15",
    type: "COPY ROUTER",
    powerSpec: {
      voltage: '230V',
      frequency: '50Hz',
      phase: '1',
      consumption: '0.740 kW'
    },
    dimensions: {
      length: '1000mm',
      width: '1500mm',
      height: '800mm'
    },
    tags: ["New", "RELIABLE"],
    specifications: [
      "Cutting accuracy: ±0.1mm",
      "Max cutting length: 6500mm",
      "Programmable cutting angles"
    ],
    certifications: ['CE'],
    safetyFeatures: ['AutomaticGuards']
  },
  // New machines from catalogue
  {
    id: "ym-007",
    name: "YILMAZ PIM 6509",
    description: "PVC Profile Machining and Cutting Center with 8-axis CNC control",
    imageUrl: "/images/machines/PIM-6509.jpg",
    specPdf: "/documents/specs/PIM-6509.pdf",
    category: "processing-centers",
    featured: true,
    releaseDate: "2023-01-01",
    type: "CNC Machining Center",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '17.0 kW'
    },
    dimensions: {
      length: '2790mm',
      width: '13440mm',
      height: '2310mm'
    },
    tags: ["CNC", "Multi-function"],
    specifications: [
      "8-axis CNC control system",
      "Max profile length: 6500mm",
      "Min profile length: 700mm",
      "Saw blade diameter: 550mm",
      "10 milling motors",
      "Automatic conveyor unit"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop']
  },
  {
    id: "ym-008",
    name: "YILMAZ CCL 1660",
    description: "PVC Welding and Corner Cleaning Line with automated production",
    imageUrl: "/images/machines/CCL-1660.jpg",
    specPdf: "/documents/specs/CCL-1660.pdf",
    category: "fabrication-equipment",
    featured: true,
    releaseDate: "2023-01-01",
    type: "Welding and Cleaning Line",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '14.0 kW'
    },
    dimensions: {
      length: '5000mm',
      width: '2500mm',
      height: '2000mm'
    },
    tags: ["Automated", "Production Line"],
    specifications: [
      "Includes CNC 608/610 Corner Cleaning Machine",
      "DK 540 Four Head Welding Machine",
      "SA 250 Cooling Unit",
      "SA 260 Robot Unit",
      "Max frame size: 2200mm × 2200mm"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop']
  },
  {
    id: "ym-009",
    name: "YILMAZ KD 402 S",
    description: "Double Head Mitre Saw Machine with hydro-pneumatic feed",
    imageUrl: "/images/machines/KD-402-S.jpg",
    specPdf: "/documents/specs/KD-402-S.pdf",
    category: "cutting-machines",
    featured: false,
    releaseDate: "2022-01-01",
    type: "Cutting Machine",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '4.5 kW'
    },
    dimensions: {
      length: '3500mm',
      width: '1500mm',
      height: '1500mm'
    },
    tags: ["Precision", "Double Head"],
    specifications: [
      "Max cut length: 3455mm",
      "Min cut length: 530mm",
      "Hydro-pneumatic saw feed",
      "Cutting accuracy +/- 0.2mm",
      "Digital display for cutting length"
    ],
    certifications: ['CE'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards']
  },
  {
    id: "ym-010",
    name: "YILMAZ DC 421 PSD",
    description: "Full Automatic Double Head Mitre Saw Machine with touch screen",
    imageUrl: "/images/machines/DC-421-PSD.jpg",
    specPdf: "/documents/specs/DC-421-PSD.pdf",
    category: "cutting-machines",
    featured: true,
    releaseDate: "2022-01-01",
    type: "Cutting Machine",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '5.0 kW'
    },
    dimensions: {
      length: '4000mm',
      width: '2000mm',
      height: '1800mm'
    },
    tags: ["Automatic", "High Precision"],
    specifications: [
      "Tilting automatically to 90° and 45°",
      "9\" touch screen operator panel",
      "Cutting list transfer via USB",
      "Cutting accuracy +/- 0.2mm",
      "Barcode printer included"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop']
  },
  {
    id: "ym-011",
    name: "YILMAZ ACK 420 S",
    description: "Up-Cutting Saw Machine for specialized operations",
    imageUrl: "/images/machines/ACK-420-S.jpg",
    specPdf: "/documents/specs/ACK-420-S.pdf",
    category: "cutting-machines",
    featured: false,
    releaseDate: "2021-01-01",
    type: "Cutting Machine",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '2.2 kW'
    },
    dimensions: {
      length: '2000mm',
      width: '1500mm',
      height: '1500mm'
    },
    tags: ["Specialized", "Under-cut"],
    specifications: [
      "Location points from 27° to 45°",
      "Hydro-pneumatic saw feed",
      "Adjustable saw blade feeding speed",
      "Interior LED lighting",
      "Manual safety guard"
    ],
    certifications: ['CE'],
    safetyFeatures: ['TwoHandOperation', 'EmergencyStop']
  },
  {
    id: "ym-012",
    name: "YILMAZ FR 226 S",
    description: "Automatic Copy Router Machine for precision operations",
    imageUrl: "/images/machines/FR-226-S.jpg",
    specPdf: "/documents/specs/FR-226-S.pdf",
    category: "processing-centers",
    featured: true,
    releaseDate: "2023-01-01",
    type: "Routing Machine",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '1.5 kW'
    },
    dimensions: {
      length: '850mm',
      width: '560mm',
      height: '1470mm'
    },
    tags: ["Automatic", "Precision"],
    specifications: [
      "Opening locks, drilling handles, hinges",
      "14,000 RPM spindle speed",
      "Hydro-pneumatic triple hole drilling",
      "Robust steel construction",
      "Spray tool lubrication system"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop']
  },
  {
    id: "ym-013",
    name: "YILMAZ NCR 300",
    description: "4 Axis Numerical Controlled NC Router Machine",
    imageUrl: "/images/machines/NCR-300.jpg",
    specPdf: "/documents/specs/NCR-300.pdf",
    category: "processing-centers",
    featured: true,
    releaseDate: "2023-01-01",
    type: "CNC Router",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '5.5 kW'
    },
    dimensions: {
      length: '1835mm',
      width: '2810mm',
      height: '2180mm'
    },
    tags: ["CNC", "4-Axis"],
    specifications: [
      "Machines four surfaces simultaneously",
      "Servo-controlled table mechanism",
      "Max profile length: 2750mm",
      "12,000 RPM spindle",
      "PLC control system"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop']
  },
  {
    id: "ym-014",
    name: "YILMAZ TK 505",
    description: "Single Corner PVC Welding Machine",
    imageUrl: "/images/machines/TK-505.jpg",
    specPdf: "/documents/specs/TK-505.pdf",
    category: "welding-machines",
    featured: false,
    releaseDate: "2022-01-01",
    type: "Welding Machine",
    powerSpec: {
      voltage: '230V',
      frequency: '50Hz',
      phase: '1',
      consumption: '1.5 kW'
    },
    dimensions: {
      length: '1500mm',
      width: '1000mm',
      height: '1200mm'
    },
    tags: ["PVC", "Welding"],
    specifications: [
      "Max profile height: 180mm",
      "Min profile height: 30mm",
      "Angle range: 30° - 180°",
      "Compact design",
      "Manual operation"
    ],
    certifications: ['CE'],
    safetyFeatures: ['EmergencyStop']
  },
  // Additional machines from catalogue
  {
    id: "ym-015",
    name: "YILMAZ KM 215 S",
    description: "Semi Automatic End Milling Machine for aluminum profiles",
    imageUrl: "/images/machines/KM-215-S.jpg",
    specPdf: "/documents/specs/KM-215-S.pdf",
    category: "processing-centers",
    featured: true,
    releaseDate: "2023-01-01",
    type: "End Milling Machine",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '1.2 kW'
    },
    dimensions: {
      length: '1200mm',
      width: '800mm',
      height: '1500mm'
    },
    tags: ["Semi-Automatic", "Precision"],
    specifications: [
      "Max cutter diameter: Ø160mm",
      "Profile clamping capacity: 160mm × 225mm",
      "Hydro-pneumatic system",
      "Quick tool change system"
    ],
    certifications: ['CE'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards']
  },
  {
    id: "ym-016",
    name: "YILMAZ CRM 250 S",
    description: "3 Spindle Copy Router Machine for complex operations",
    imageUrl: "/images/machines/CRM-250-S.jpg",
    specPdf: "/documents/specs/CRM-250-S.pdf",
    category: "processing-centers",
    featured: true,
    releaseDate: "2023-01-01",
    type: "Copy Router",
    powerSpec: {
      voltage: '230V',
      frequency: '50Hz',
      phase: '1',
      consumption: '3.3 kW'
    },
    dimensions: {
      length: '1860mm',
      width: '2900mm',
      height: '1670mm'
    },
    tags: ["3-Spindle", "Multi-function"],
    specifications: [
      "1x vertical and 2x horizontal spindle motors",
      "Max profile dimension: 200mm × 150mm",
      "Pneumatic clamps",
      "Spray tool lubrication system"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop']
  },
  {
    id: "ym-017",
    name: "YILMAZ ST 264",
    description: "Automatic PVC Water Slot Machine",
    imageUrl: "/images/machines/ST-264.jpg",
    specPdf: "/documents/specs/ST-264.pdf",
    category: "processing-centers",
    featured: false,
    releaseDate: "2022-01-01",
    type: "Slotting Machine",
    powerSpec: {
      voltage: '220V',
      frequency: '50Hz',
      phase: '1',
      consumption: '0.66 kW'
    },
    dimensions: {
      length: '730mm',
      width: '610mm',
      height: '1300mm'
    },
    tags: ["PVC", "Water Slot"],
    specifications: [
      "Water slot opening process",
      "3-axis operation",
      "Adjustable water slot length and depth",
      "Speed-adjustable motor"
    ],
    certifications: ['CE'],
    safetyFeatures: ['TwoHandOperation', 'EmergencyStop']
  },
  {
    id: "ym-018",
    name: "YILMAZ SDT 275",
    description: "Reinforcement Steel and Square Profile Cutting Saw",
    imageUrl: "/images/machines/SDT-275.jpg",
    specPdf: "/documents/specs/SDT-275.pdf",
    category: "cutting-machines",
    featured: false,
    releaseDate: "2021-01-01",
    type: "Cutting Machine",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '1.8 kW'
    },
    dimensions: {
      length: '1500mm',
      width: '1000mm',
      height: '1200mm'
    },
    tags: ["Steel", "Reinforcement"],
    specifications: [
      "Cutting capacity: 70mm × 70mm square profile",
      "Double-speed motor (45/50 RPM)",
      "Pivoting range 45° left and right",
      "Manual material clamping"
    ],
    certifications: ['CE'],
    safetyFeatures: ['EmergencyStop']
  }, 
  {
  id: "ym-019",
  name: "YILMAZ MK 420",
  description: "Single Head Cutting Machine with versatile angle options",
  imageUrl: "/images/machines/MK-420.jpg",
  specPdf: "/documents/specs/MK-420.pdf",
  category: "cutting-machines",
  featured: false,
  releaseDate: "2021-01-01",
  type: "Cutting Machine",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '2.2 kW'
  },
  dimensions: {
    length: '1500mm',
    width: '800mm',
    height: '1200mm'
  },
  tags: ["Versatile", "Precision"],
  specifications: [
    "Location points at 60°, 45°, 30°, 22.5°, 15°, 0°",
    "Pivoting range from 45° left to 45° right",
    "Aluminium construction body",
    "Strong spring system and protective shield"
  ],
  certifications: ['CE'],
  safetyFeatures: ['EmergencyStop']
},
{
  id: "ym-020",
  name: "YILMAZ RYK 420 W",
  description: "Radial Saw Machine with ergonomic design",
  imageUrl: "/images/machines/RYK-420-W.jpg",
  specPdf: "/documents/specs/RYK-420-W.pdf",
  category: "cutting-machines",
  featured: false,
  releaseDate: "2021-01-01",
  type: "Radial Saw",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '2.2 kW'
  },
  dimensions: {
    length: '900mm',
    width: '800mm',
    height: '1200mm'
  },
  tags: ["Radial", "Ergonomic"],
  specifications: [
    "Pivoting range from 45° right to 60° left",
    "2.2 kW, 3,000 RPM motor",
    "Cast iron construction",
    "Laser marking for cutting line"
  ],
  certifications: ['CE'],
  safetyFeatures: ['TwoHandOperation', 'EmergencyStop']
},
{
  id: "ym-021",
  name: "YILMAZ SCM 420 L4",
  description: "Servo Controlled Serial Cutting Machine (3.6m stroke)",
  imageUrl: "/images/machines/SCM-420-L4.jpg",
  specPdf: "/documents/specs/SCM-420-L4.pdf",
  category: "cutting-machines",
  featured: true,
  releaseDate: "2022-01-01",
  type: "Serial Cutting Machine",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '2.2 kW'
  },
  dimensions: {
    length: '1130mm',
    width: '5250mm',
    height: '1360mm'
  },
  tags: ["Servo", "Precision"],
  specifications: [
    "3.6m pushing stroke",
    "300mm conveyor width",
    "7\" HMI touch screen monitor",
    "Cutting accuracy ±0.2mm"
  ],
  certifications: ['CE', 'ISO9001'],
  safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop']
},
{
  id: "ym-022",
  name: "YILMAZ CK 412",
  description: "PVC Glazing Bead Saw for precise cutting",
  imageUrl: "/images/machines/CK-412.jpg",
  specPdf: "/documents/specs/CK-412.pdf",
  category: "cutting-machines",
  featured: false,
  releaseDate: "2021-01-01",
  type: "Glazing Bead Saw",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '0.24 kW'
  },
  dimensions: {
    length: '1035mm',
    width: '485mm',
    height: '1050mm'
  },
  tags: ["PVC", "Glazing"],
  specifications: [
    "Equipped with 1x Ø200 and 1x Ø103 mm saw blades",
    "Pneumatic saw feed by pushing button",
    "Automatic return to start point",
    "2x pneumatic vertical clamps"
  ],
  certifications: ['CE'],
  safetyFeatures: ['EmergencyStop']
},
{
  id: "ym-023",
  name: "YILMAZ DK 540",
  description: "Four Head Welding Machine for PVC profiles",
  imageUrl: "/images/machines/DK-540.jpg",
  specPdf: "/documents/specs/DK-540.pdf",
  category: "welding-machines",
  featured: true,
  releaseDate: "2022-01-01",
  type: "Welding Machine",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '5.0 kW'
  },
  dimensions: {
    length: '3000mm',
    width: '2000mm',
    height: '1800mm'
  },
  tags: ["Four Head", "PVC"],
  specifications: [
    "Max machinable profile height: 180mm",
    "Min machinable profile height: 30mm",
    "Axis speed: 10.6 m/min",
    "Power of axis motor: 0.37 kW"
  ],
  certifications: ['CE', 'ISO9001'],
  safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop']
},
{
  id: "ym-024",
  name: "YILMAZ CNC 608",
  description: "Corner Cleaning Machine with CNC control",
  imageUrl: "/images/machines/CNC-608.jpg",
  specPdf: "/documents/specs/CNC-608.pdf",
  category: "processing-centers",
  featured: true,
  releaseDate: "2022-01-01",
  type: "CNC Cleaning Machine",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '12.0 kW'
  },
  dimensions: {
    length: '2500mm',
    width: '2000mm',
    height: '1800mm'
  },
  tags: ["CNC", "Corner Cleaning"],
  specifications: [
    "11 cleaning tools",
    "Max machinable profile height: 170mm",
    "Speed of saw blade motor: 6,000 RPM",
    "Speed of milling motors: 18,000 RPM"
  ],
  certifications: ['CE', 'ISO9001'],
  safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop']
},
{
  id: "ym-025",
  name: "YILMAZ KD 350 D",
  description: "Mitre Saw Machine with manual operation",
  imageUrl: "/images/machines/KD-350-D.jpg",
  specPdf: "/documents/specs/KD-350-D.pdf",
  category: "cutting-machines",
  featured: false,
  releaseDate: "2020-01-01",
  type: "Mitre Saw",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '2.2 kW'
  },
  dimensions: {
    length: '720mm',
    width: '760mm',
    height: '1570mm'
  },
  tags: ["Manual", "Precision"],
  specifications: [
    "Location points at 45°, 30°, 22.5°, 15°, 0° both left and right",
    "Pivoting range from 45° left to 45° right",
    "Aluminium construction body",
    "Ø350 mm saw blade included"
  ],
  certifications: ['CE'],
  safetyFeatures: ['EmergencyStop']
},
{
  id: "ym-026",
  name: "YILMAZ KD 350 PS",
  description: "Mitre Saw Machine with pneumatic system",
  imageUrl: "/images/machines/KD-350-PS.jpg",
  specPdf: "/documents/specs/KD-350-PS.pdf",
  category: "cutting-machines",
  featured: false,
  releaseDate: "2020-01-01",
  type: "Mitre Saw",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '2.2 kW'
  },
  dimensions: {
    length: '720mm',
    width: '760mm',
    height: '1570mm'
  },
  tags: ["Pneumatic", "Precision"],
  specifications: [
    "Location points at 45°, 30°, 22.5°, 15°, 0° both left and right",
    "Pivoting range from 45° left to 45° right",
    "2x pneumatic horizontal clamps",
    "Spray saw blade lubrication system"
  ],
  certifications: ['CE'],
  safetyFeatures: ['TwoHandOperation', 'EmergencyStop']
},
{
  id: "ym-027",
  name: "YILMAZ KD 350 M",
  description: "Compact Mitre Saw Machine",
  imageUrl: "/images/machines/KD-350-M.jpg",
  specPdf: "/documents/specs/KD-350-M.pdf",
  category: "cutting-machines",
  featured: false,
  releaseDate: "2020-01-01",
  type: "Mitre Saw",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '2.2 kW'
  },
  dimensions: {
    length: '620mm',
    width: '760mm',
    height: '785mm'
  },
  tags: ["Compact", "Portable"],
  specifications: [
    "Location points at 45°, 30°, 22.5°, 15°, 0° both left and right",
    "Pivoting range from 45° left to 45° right",
    "Ø350 mm saw blade included",
    "2x manual horizontal clamps"
  ],
  certifications: ['CE'],
  safetyFeatures: ['EmergencyStop']
},
{
  id: "ym-028",
  name: "YILMAZ FR 223",
  description: "Portable Template Copy Router",
  imageUrl: "/images/machines/FR-223.jpg",
  specPdf: "/documents/specs/FR-223.pdf",
  modelPath: "/models/AR-Code-Object-Capture-app-1752786892 (1).glb",
  category: "processing-centers",
  featured: false,
  releaseDate: "2021-01-01",
  type: "Copy Router",
  powerSpec: {
    voltage: '230V',
    frequency: '50Hz',
    phase: '1',
    consumption: '0.75 kW'
  },
  dimensions: {
    length: '590mm',
    width: '530mm',
    height: '465mm'
  },
  tags: ["Portable", "Template"],
  specifications: [
    "Working area: 270mm × 110mm × 110mm",
    "14,000 RPM spindle speed",
    "2x manual horizontal clamps",
    "Electroplated copy template included"
  ],
  certifications: ['CE'],
  safetyFeatures: ['EmergencyStop']
},
{
  id: "ym-029",
  name: "YILMAZ FR 223 S",
  description: "Portable Template Copy Router with spray cooling",
  imageUrl: "/images/machines/FR-223-S.jpg",
  specPdf: "/documents/specs/FR-223-S.pdf",
  modelPath: "/models/AR-Code-Object-Capture-app-1752786892 (1).glb",
  category: "processing-centers",
  featured: false,
  releaseDate: "2021-01-01",
  type: "Copy Router",
  powerSpec: {
    voltage: '230V',
    frequency: '50Hz',
    phase: '1',
    consumption: '0.75 kW'
  },
  dimensions: {
    length: '590mm',
    width: '560mm',
    height: '465mm'
  },
  tags: ["Portable", "Cooling System"],
  specifications: [
    "Working area: 270mm × 110mm × 110mm",
    "Electrically working spray cooling system",
    "14,000 RPM spindle speed",
    "2x manual horizontal clamps"
  ],
  certifications: ['CE'],
  safetyFeatures: ['EmergencyStop']
},
{
  id: "ym-030",
  name: "YILMAZ FR 222",
  description: "Economical Portable Template Copy Router",
  imageUrl: "/images/machines/FR-222.jpg",
  specPdf: "/documents/specs/FR-222.pdf",
  modelPath: "/models/AR-Code-Object-Capture-app-1752786892 (1).glb",
  category: "processing-centers",
  featured: false,
  releaseDate: "2020-01-01",
  type: "Copy Router",
  powerSpec: {
    voltage: '230V',
    frequency: '50Hz',
    phase: '1',
    consumption: '1.2 kW'
  },
  dimensions: {
    length: '500mm',
    width: '450mm',
    height: '400mm'
  },
  tags: ["Economical", "Portable"],
  specifications: [
    "Ø5 router bit included",
    "Electroplated copy template",
    "Cast aluminium structure",
    "2x horizontal clamps"
  ],
  certifications: ['CE'],
  safetyFeatures: ['EmergencyStop']
},
{
  id: "ym-031",
  name: "YILMAZ KM 211 S",
  description: "Manual End Milling Machine with pneumatic clamps",
  imageUrl: "/images/machines/KM-211-S.jpg",
  specPdf: "/documents/specs/KM-211-S.jpg",
  category: "processing-centers",
  featured: false,
  releaseDate: "2020-01-01",
  type: "End Milling Machine",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '1.2 kW'
  },
  dimensions: {
    length: '440mm',
    width: '740mm',
    height: '1160mm'
  },
  tags: ["Manual", "Pneumatic"],
  specifications: [
    "Max cutter diameter: Ø170mm",
    "Profile clamping capacity: 160mm × 150mm",
    "2x pneumatic horizontal clamps",
    "1x pneumatic vertical clamp"
  ],
  certifications: ['CE'],
  safetyFeatures: ['EmergencyStop']
},
{
  id: "ym-032",
  name: "YILMAZ SA 250",
  description: "Cooling Unit for welding systems",
  imageUrl: "/images/machines/SA-250.jpg",
  specPdf: "/documents/specs/SA-250.pdf",
  category: "accessories",
  featured: false,
  releaseDate: "2021-01-01",
  type: "Cooling Unit",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '0.5 kW'
  },
  dimensions: {
    length: '1000mm',
    width: '800mm',
    height: '1200mm'
  },
  tags: ["Cooling", "Welding"],
  specifications: [
    "For use with welding systems",
    "Integrated in production lines",
    "Automatic operation",
    "Low maintenance"
  ],
  certifications: ['CE'],
  safetyFeatures: []
},
{
  id: "ym-033",
  name: "YILMAZ SA 260",
  description: "Robot Unit for profile transfer",
  imageUrl: "/images/machines/SA-260.jpg",
  specPdf: "/documents/specs/SA-260.pdf",
  category: "accessories",
  featured: true,
  releaseDate: "2021-01-01",
  type: "Robot Unit",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '0.85 kW'
  },
  dimensions: {
    length: '1500mm',
    width: '1200mm',
    height: '1800mm'
  },
  tags: ["Automation", "Transfer"],
  specifications: [
    "Max transfer frame size: 2200mm × 2200mm",
    "Max profile height: 130mm",
    "Min profile height: 30mm",
    "Automatic operation"
  ],
  certifications: ['CE', 'ISO9001'],
  safetyFeatures: ['EmergencyStop', 'EmergencyStop']
}
];

// Export legacy format for backward compatibility
export const yilmazMachinesLegacy = yilmazMachines.map(machine => ({
  ...machine,
  category: 'machines',
  power: `${machine.powerSpec.consumption}`,
  dimensions: `${machine.dimensions.length} × ${machine.dimensions.width} × ${machine.dimensions.height}`
}));