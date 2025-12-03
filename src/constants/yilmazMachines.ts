// Define types locally as the import is failing.
export type Certification = 'CE' | 'ISO9001';

export type SafetyStandard = 'TwoHandOperation' | 'AutomaticGuards' | 'EmergencyStop';

export interface PowerSpecification {
  voltage: string;
  frequency: string;
  phase: string;
  consumption: string;
}

export interface Machine {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  specPdf: string;
  youtubeUrl?: string;
  modelPath?: string;
  has3DModel?: boolean;
  category: string;
  subcategory?: string; // e.g., "copy-routers", "end-milling", "cnc-routers"
  featured: boolean;
  releaseDate: string;
  type: string;
  powerSpec: PowerSpecification;
  airSpec?: {
    consumption: string;
    pressure?: string;
  };
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  weight?: {
    net: string;
    gross: string;
  };
  workingCapacity?: {
    x1?: string;
    x2?: string;
    y1?: string;
    y2?: string;
    z1?: string;
    z2?: string;
  };
  spindleSpeed?: string;
  cutterBits?: string;
  tags: string[];
  specifications: string[];
  standardAccessories?: string[];
  optionalAccessories?: string[];
  certifications: Certification[];
  safetyFeatures: SafetyStandard[];
  egyptianCompliance?: {
    standard: string;
    certificateNumber: string;
    issueDate: string;
  };
}

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
    name: "ALM 6510",
    description: "Aluminium Profile Machining Center - 8-axis CNC servo control for milling, drilling, and cutting operations on four sides of profiles",
    imageUrl: "/images/machines/cutting-machine.jpg",
    specPdf: "/documents/specs/ALM-6510.pdf",
    youtubeUrl: "https://www.youtube.com/watch?v=CeGDjE9QCqQ",
    category: "processing-centers",
    featured: true,
    releaseDate: "2023-05-15",
    type: "Aluminium Profile Machining Center",
    powerSpec: {
      voltage: '400V AC',
      frequency: '50-60Hz',
      phase: '3',
      consumption: '29 kW',
      amperage: '58A'
    },
    airSpec: {
      consumption: '250 L/min',
      pressure: '6-8 bar'
    },
    dimensions: {
      width: '2000mm',
      length: '11720mm',
      height: '2310mm'
    },
    weight: {
      net: '3650 kg',
      gross: '4106 kg'
    },
    sawBlade: {
      diameter: 'Ø550 mm',
      bore: 'Ø30 mm',
      speed: '3,000 RPM',
      motorPower: '2.2 kW'
    },
    spindleSpeed: '12,000 RPM',
    cncAxes: 8,
    processingCapacity: '1,600-1,800 running meters / 8 hours',
    profileCapacity: {
      minLength: '700mm',
      maxLength: '6,500mm',
      minProfile: '40 x 40 mm',
      maxProfile: '130 x 180 mm',
      loadingCapacity: '7 profiles'
    },
    cuttingCapacity: {
      minLength: '400mm',
      at90deg: '130 x 180 mm',
      at45deg: '130 x 180 mm',
      at30deg: '130 x 180 mm'
    },
    angularCapacity: {
      pivotingInward: '45°',
      pivotingOutward: '135°',
      compound: '45° to 135° servo controlled'
    },
    axisSpeed: 'X: 40 m/min, Y: 40 m/min, Z: 40 m/min',
    infeedSpeed: '100 m/min',
    tags: ["8-Axis CNC", "Aluminium", "PVC", "Machining Center", "Servo Control", "Windows PC", "Touch Screen", "Remote Support", "Automatic"],
    specifications: [
      "8-axis CNC servo control system",
      "Fully automated feeding, carrying, positioning, cutting and transferring",
      "Operations on four sides: milling, key holes, hinge holes, handle holes, marking, cutting",
      "Pneumatic gripper for accurate profile positioning",
      "Automatic horizontal and vertical clamping system",
      "Processing capacity: 1,600-1,800 running meters / 8 hours",
      "Automatic conveyor with 7 profile loading capacity",
      "Ø550mm servo controlled down-cutting saw (45° to 135°)",
      "Windows based PC with 15.6'' LCD touch screen",
      "Remote desktop connection for technical support",
      "Simultaneous milling and cutting operations",
      "CAD program compatible interface software",
      "Automatic frame and sash profile recognition",
      "Automatic profile dimension control system",
      "Automatic lubrication and tool spray cooling",
      "Low pressure safety control",
      "Interior LED lighting"
    ],
    standardAccessories: [
      "8 milling tools (4x Ø5mm + 4x Ø8mm)",
      "Barcode printer",
      "Safety fence around machine",
      "Keyboard & mouse"
    ],
    optionalAccessories: [
      "Angled swarf conveyor",
      "KP 3500 chip vacuum extractor",
      "Workshop logistic equipment",
      "Spare saw blade Ø550mm",
      "Spare Ø5 and Ø8 cutter bits"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop', 'LowPressureControl', 'SafetyFence'],
    egyptianCompliance: {
      standard: 'ES1109',
      certificateNumber: 'ES-ALM6510-2023',
      issueDate: '2023-05-15'
    }
  },
  {
    id: "ym-002",
    name: "DC-421-PBS",
    description: "Full Automatic Double Head Mitre Saw Machine - Windows based industrial PC with 15'' LCD touch screen, automatic tilting to 90° and 45° inwards",
    imageUrl: "/images/machines/DC-421-PBS.jpg",
    specPdf: "/documents/specs/DC-421-PBS.pdf",
    youtubeUrl: "https://www.youtube.com/watch?v=1B5elf1hDG4",
    category: "cutting-machines",
    featured: true,
    releaseDate: "2012-05-10",
    type: "Full Automatic Double Head Mitre Saw",
    powerSpec: {
      voltage: '400V AC',
      frequency: '50-60Hz',
      phase: '3',
      consumption: '5 kW',
      amperage: '4A'
    },
    airSpec: {
      consumption: '165 L/min',
      pressure: '6-8 bar'
    },
    dimensions: {
      width: '1450mm',
      length: '4510mm',
      height: '1670mm'
    },
    weight: {
      net: '888 kg',
      gross: '965 kg'
    },
    sawBlade: {
      diameter: 'Ø420 mm',
      bore: 'Ø30-32 mm',
      speed: '2,900 RPM',
      motorPower: '5 kW'
    },
    angularCapacity: {
      tilting: '90° and 45° inward (automatic)',
      pivotingInward: '90° to 45° (manual for intermediate)',
      compound: 'Automatic slicing at 90° and 45° inward'
    },
    tags: ["Full Automatic", "Double Head", "Industrial PC", "Touch Screen", "Barcode", "Windows Based", "Remote Support"],
    specifications: [
      "Automatic tilting to 90° and 45° inwards for both angles",
      "Manual adjustment for intermediate angles (90° to 45°)",
      "Windows based industrial PC with 15'' LCD touch screen",
      "Obtains cutting dimensions and angles from cut list (automatic mode)",
      "USB and network transfer of cutting lists (mdb/csv formats)",
      "Technical support via remote connection",
      "Automatic slicing feature at 90° and 45° inward",
      "Solid steel construction body",
      "Automatically closing safety guards",
      "Hydro-pneumatic saw blade feed",
      "Cutting accuracy: ±0.2 mm",
      "Two-hand safety operation"
    ],
    standardAccessories: [
      "2x Ø420 mm saw blades",
      "Roller conveyor & 2x pneumatic profile supports",
      "Spray saw blade lubrication system",
      "4x pneumatic horizontal clamps",
      "2x pneumatic vertical clamps",
      "Barcode printer",
      "Air gun"
    ],
    optionalAccessories: [
      "DKN 71 short cut system (with ruler)",
      "Mould heights for special profiles",
      "Machine with 5m length",
      "Machine with 6m length",
      "VCE 1570 chip vacuum extractor",
      "DLG 200 digital length gauge",
      "DLG 300 digital length gauge",
      "Spare saw blade Ø420 mm"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop', 'AutoClosingGuards']
  },
  {
    id: "ym-003",
    name: "DK 502",
    description: "Double Corner PVC Welding Machine - Fully automatic two corner welding of PVC window profiles at 90° with single head welding possibility",
    imageUrl: "/images/machines/DK-502.jpg",
    specPdf: "/documents/specs/DK-502.pdf",
    youtubeUrl: "https://youtu.be/jOLX0XMXC9A?si=U6F-JPhfUVARqUx1",
    category: "welding-machines",
    featured: true,
    releaseDate: "2012-05-10",
    type: "Double Corner PVC Welding",
    powerSpec: {
      voltage: '230V AC',
      frequency: '50-60Hz',
      phase: '1',
      consumption: '3 kW'
    },
    airSpec: {
      consumption: '180 L/min',
      pressure: '6-8 bar'
    },
    dimensions: {
      width: '4100mm',
      length: '1700mm',
      height: '800mm'
    },
    weight: {
      net: '611 kg',
      gross: '700 kg'
    },
    weldingCapacity: {
      heightMax: '180mm',
      heightMin: '30mm',
      widthMax: '140mm',
      widthMin: '30mm',
      angleRange: '30° - 180°'
    },
    temperatureRange: '0° - 300°C',
    weldingOptions: 'Standard (2mm) or Seamless (0.2mm)',
    tags: ["Double Corner", "PVC Welding", "Automatic", "90° Welding", "Single Head Option", "Seamless Welding", "Electronic Thermostat"],
    specifications: [
      "Fully automatic two corner welding at 90°",
      "Single head welding possibility",
      "Precise welding of profiles between 30°-180° on left head",
      "Independent control of melting time, welding time, and pressure",
      "Linear rails for continuous welding precision",
      "Welds two corners of frame or sash in one cycle",
      "Practical teflon change with roller system",
      "Most practical mold change system in the market",
      "Adjustable clamp and welding pressure per profile type",
      "Electronic thermostat: 0-300°C heat adjustment",
      "Standard (2mm) or seamless (0.2mm) welding options",
      "Movable right unit moves manually with brake system",
      "Automatic welding after profile clamping",
      "Low pressure control system for safety"
    ],
    standardAccessories: [
      "2x support arms"
    ],
    optionalAccessories: [
      "Special welding molds on demand"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['AutomaticGuards', 'EmergencyStop', 'LowPressureControl']
  },
  {
    id: "ym-004",
    name: "KM 212",
    description: "Portable End Milling Machine - High quality end-milling operations with manual controls for aluminum and PVC profiles",
    imageUrl: "/images/machines/KM-212.jpg",
    specPdf: "/documents/specs/KM-212.pdf",
    youtubeUrl: "https://youtu.be/1iiAfHwLhsQ?si=UQYOLQVwQq5N9143",
    category: "end-milling",
    featured: true,
    releaseDate: "2012-05-10",
    type: "Portable End Milling",
    powerSpec: {
      voltage: '230V AC',
      frequency: '50-60Hz',
      phase: '1',
      consumption: '800 W'
    },
    dimensions: {
      width: '570mm',
      length: '510mm',
      height: '420mm'
    },
    weight: {
      net: '26 kg',
      gross: '28 kg'
    },
    sawBlade: {
      diameter: 'Ø120 mm (max)',
      bore: 'Ø30 mm',
      speed: '3,000 RPM'
    },
    clampingCapacity: {
      widthMax: '160mm',
      heightMax: '65mm'
    },
    millingCapacity: {
      widthMax: '160mm',
      heightMax: '65mm'
    },
    tags: ["Portable", "End Milling", "Manual", "Compact", "Lightweight", "PVC", "Aluminum"],
    specifications: [
      "High quality end-milling with manual operations",
      "Firm workpiece fixing with manual vertical and horizontal clamps",
      "Practical cutter adjustment with spacers",
      "Profile clamping capacity: H: 65mm x W: 160mm",
      "Max end-milling capacity: H: 65mm x W: 160mm",
      "Max saw blade diameter: Ø120 mm",
      "Spindle speed: 3,000 RPM",
      "Compact and portable design (26 kg)"
    ],
    standardAccessories: [
      "1x manual horizontal clamp",
      "1x manual vertical clamp"
    ],
    optionalAccessories: [
      "H: 80mm x W: 160mm clamping capacity version (on demand)",
      "Milling cutter set",
      "Machine stand"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['EmergencyStop']
  },
  {
    id: "ym-005",
    name: "KD-402-S",
    description: "Double Head Mitre Saw Machine - Semi-automatic with two circular saws for flat or angled cutting of PVC, aluminium and wooden materials",
    imageUrl: "/images/machines/KD-402-S.jpg",
    specPdf: "/documents/specs/KD-402-S.pdf",
    youtubeUrl: "https://youtu.be/3GTWyawzxMw?si=6E8Xa5UsjBEcoUYG",
    category: "cutting-machines",
    featured: true,
    releaseDate: "2023-05-15",
    type: "Double Head Mitre Saw",
    powerSpec: {
      voltage: '400V AC',
      frequency: '50-60Hz',
      phase: '3',
      consumption: '4.5 kW',
      amperage: '9A'
    },
    airSpec: {
      consumption: '46 L/min',
      pressure: '6-8 bar'
    },
    dimensions: {
      width: '1290mm',
      length: '5560mm',
      height: '1440mm'
    },
    weight: {
      net: '530 kg',
      gross: '593 kg'
    },
    sawBlade: {
      diameter: 'Ø400 mm',
      bore: 'Ø30-32 mm',
      speed: '2,900 RPM',
      motorPower: '4.5 kW'
    },
    cuttingCapacity: {
      maxLength5m: '3,455mm',
      minLength: '530mm',
      maxWidth90: '482mm',
      maxWidth45: '593mm'
    },
    angularCapacity: {
      pivotingInward: '+45° inward',
      pivotingOutward: '-45° outward',
      presetAngles: '0°, 15°, 22.5°, 30°, 45° (both sides)'
    },
    tags: ["Double Head", "Semi-Automatic", "Mitre Saw", "PVC", "Aluminum", "Wood", "Hydro-Pneumatic", "Digital Display"],
    specifications: [
      "Semi-automatic miter saw with two circular saws",
      "Left cutting unit fixed, right unit manually positioned",
      "Digital display for accurate distance adjustment",
      "Pivoting range: +45° to -45° infinitely adjustable",
      "Preset angles: 0°, 15°, 22.5°, 30°, 45° (left and right)",
      "Max cut length: 3,455mm, Min cut length: 530mm",
      "Pressure control valves for profile fixing adjustment",
      "Hydro-pneumatic saw feed",
      "Pneumatic head fixing feature",
      "On/off switch for horizontal clamp",
      "Two-hand safety operation"
    ],
    standardAccessories: [
      "2x Ø400 mm saw blades",
      "Digital display indicating cutting length",
      "Pneumatic spray mist lubrication system",
      "3x pneumatic horizontal clamps",
      "2x pneumatic vertical clamps",
      "Profile support mechanism",
      "Air gun"
    ],
    optionalAccessories: [
      "Two-step head speed control system (patented)",
      "VCE 1570 chip vacuum extractor & accessories",
      "DLG 200 digital profile length gauge",
      "DLG 300 digital profile length gauge",
      "Machine with 5m length",
      "Spare saw blade Ø400 mm"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop', 'PressureControlValves']
  },
  {
    id: "ym-006",
    name: "FR-221-S",
    description: "Pneumatic Template Copy Router - For opening locks, drilling handles, hinges, espagnolette and barrel holes on PVC and aluminium profiles",
    imageUrl: "/images/machines/FR-221-S.jpg",
    specPdf: "/documents/specs/FR-221-S.pdf",
    youtubeUrl: "https://www.youtube.com/watch?v=CeGDjE9QCqQ",
    category: "copy-routers",
    featured: true,
    releaseDate: "2023-05-15",
    type: "Template Copy Router",
    powerSpec: {
      voltage: '400V AC',
      frequency: '50-60Hz',
      phase: '3',
      consumption: '750 W'
    },
    airSpec: {
      consumption: '5 L/min',
      pressure: '6-8 bar'
    },
    dimensions: {
      width: '550mm',
      length: '580mm',
      height: '1335mm'
    },
    weight: {
      net: '77 kg',
      gross: '103 kg'
    },
    workingCapacity: {
      x1: '270mm',
      y1: '110mm',
      z1: '130mm'
    },
    spindleSpeed: '14,000 RPM',
    cutterBits: 'Ø5 x L60 mm',
    clampingCapacity: {
      widthMax: '130mm',
      widthMin: '10mm',
      heightMax: '130mm',
      heightMin: '20mm'
    },
    tags: ["Pneumatic", "Template Copy Router", "PVC", "Aluminum", "Lock Machining", "Hinge Drilling", "Compact"],
    specifications: [
      "For locks, handles, hinges, espagnolette and barrel holes",
      "Working capacity: X: 270mm, Y: 110mm, Z: 130mm",
      "Clamping capacity: W: 10-130mm, H: 20-130mm",
      "Spindle speed: 14,000 RPM",
      "Corrosion proof bearing shaft",
      "Robust steel sheet machine stand",
      "Electroplated copy template",
      "Cast aluminium structure",
      "2x tracer pins for template following"
    ],
    standardAccessories: [
      "Ø5 x L60 mm router bit installed",
      "2x left and right profile stops",
      "2x pneumatic horizontal clamps",
      "Spray tool lubrication system",
      "Air gun"
    ],
    optionalAccessories: [
      "Spare Ø5 x L60 mm router bits",
      "Special copy templates",
      "MA 240 centring apparatus",
      "MKN 150 roller conveyor"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['AutomaticGuards', 'EmergencyStop']
  },
  // New machines from catalogue
  {
    id: "ym-007",
    name: "PIM 6509",
    description: "PVC Profile Machining and Cutting Center - 8-axis CNC servo control for milling, water slots, drilling, and cutting operations on four sides",
    imageUrl: "/images/machines/PIM-6509.jpg",
    specPdf: "/documents/specs/PIM-6509.pdf",
    youtubeUrl: "https://youtu.be/lQlX-jXfegU?si=_N5SbMJyFHa1obiG",
    category: "processing-centers",
    featured: true,
    releaseDate: "2023-01-01",
    type: "PVC Profile Machining Center",
    powerSpec: {
      voltage: '400V AC',
      frequency: '50-60Hz',
      phase: '3',
      consumption: '17 kW',
      amperage: '34A'
    },
    airSpec: {
      consumption: '250 L/min',
      pressure: '6-8 bar'
    },
    dimensions: {
      width: '2790mm',
      length: '13440mm',
      height: '2310mm'
    },
    weight: {
      net: '3650 kg',
      gross: '4106 kg'
    },
    sawBlade: {
      diameter: 'Ø550 mm',
      bore: 'Ø30 mm',
      speed: '2,440 RPM',
      motorPower: '2.2 kW'
    },
    spindleSpeed: '18,000 RPM',
    cncAxes: 8,
    millingMotors: 10,
    tripleHoleMotor: 1,
    processingCapacity: '2,200-2,400 running meters / 8 hours',
    profileCapacity: {
      minLength: '700mm',
      maxLength: '6,500mm',
      minProfile: '40 x 40 mm',
      maxProfile: '130 x 180 mm',
      loadingCapacity: '7 profiles'
    },
    cuttingCapacity: {
      minLength: '400mm',
      at90deg: '130 x 180 mm',
      at45deg: '130 x 180 mm',
      at30deg: '130 x 180 mm'
    },
    angularCapacity: {
      pivotingInward: '30°',
      pivotingOutward: '150°',
      compound: '30° to 150° servo controlled'
    },
    axisSpeed: 'X: 40 m/min, Y: 40 m/min, Z: 40 m/min',
    infeedSpeed: '100 m/min',
    tags: ["8-Axis CNC", "PVC", "Machining Center", "Servo Control", "Windows PC", "Touch Screen", "Remote Support", "Water Slots", "Triple Hole"],
    specifications: [
      "8-axis CNC servo control system",
      "Fully automated feeding, carrying, positioning, cutting and transferring",
      "Operations on four sides: milling, water slots, key holes, hinge holes, handle holes, marking, cutting",
      "Pneumatic gripper moving in three axes for accurate positioning",
      "Horizontal and vertical clamping during sawing",
      "Processing capacity: 2,200-2,400 running meters / 8 hours",
      "Automatic conveyor with 7 profile loading capacity",
      "Ø550mm servo controlled down-cutting saw (30° to 150°)",
      "Windows based PC with 15.6'' LCD touch screen",
      "Remote desktop connection for technical support",
      "CAD program compatible interface software",
      "Simultaneous milling and cutting operations",
      "Easy integration with CNC welding, corner cleaning, screwing machines",
      "Automatic frame and sash profile recognition",
      "Automatic profile dimension control system",
      "Automatic lubrication system",
      "Low pressure safety control for saw blade",
      "Interior LED lighting",
      "10 milling motors + 1 triple hole motor"
    ],
    standardAccessories: [
      "11 milling and drilling tools",
      "Safety fence around machine",
      "Keyboard & mouse",
      "Barcode printer"
    ],
    optionalAccessories: [
      "Workshop logistic equipment",
      "Spare cutter bits",
      "KP 3500 chip vacuum extractor",
      "Spare Ø550mm saw blade",
      "Angled swarf conveyor"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop', 'LowPressureControl', 'SafetyFence']
  },
  {
    id: "ym-008",
    name: "CCL 1661",
    description: "PVC Welding and Corner Cleaning Line - Complete automated production line with 4-head welding, CNC corner cleaning, and robot transfer system",
    imageUrl: "/images/machines/CCL-1661.jpg",
    specPdf: "/documents/specs/CCL-1661.pdf",
    youtubeUrl: "https://youtu.be/feWx5BXMSn0?si=1b5AP3moNi37475i",
    category: "fabrication-equipment",
    featured: true,
    releaseDate: "2023-01-01",
    type: "PVC Welding and Corner Cleaning Line",
    powerSpec: {
      voltage: '400V AC',
      frequency: '50-60Hz',
      phase: '3',
      consumption: '14 kW'
    },
    airSpec: {
      consumption: '180 L/min',
      pressure: '6-8 bar'
    },
    dimensions: {
      width: '4720mm',
      length: '11730mm',
      height: '2070mm'
    },
    weight: {
      net: '3156 kg',
      gross: '3931 kg'
    },
    spindleSpeed: '18,000 RPM',
    cleaningTools: 11,
    sawBlade: {
      diameter: 'Ø250 mm',
      bore: 'Ø30-32 mm',
      speed: '6,000 RPM'
    },
    weldingCapacity: {
      heightMax: '180mm',
      heightMin: '30mm',
      widthMax: '130mm',
      widthMin: '30mm'
    },
    frameCapacity: {
      maxFrame: '3,100 x 2,700 mm (welding)',
      minFrame: '400 x 400 mm',
      maxRobotFrame: '2,200 x 2,200 mm',
      maxCleaningFrame: '2,200 x 2,200 mm'
    },
    processingCapacity: '220 frames/8hrs (CNC 609) or 270 frames/8hrs (CNC 611)',
    weldingOptions: '0.2mm to 2.0mm automatic transition',
    tags: ["Production Line", "4-Head Welding", "CNC Cleaning", "Robot Transfer", "Automated", "Windows PC", "Touch Screen", "Barcode"],
    specifications: [
      "Complete automated welding and corner cleaning line",
      "DK 540 Four Head Welding Machine included",
      "CNC 609 or CNC 611 Corner Cleaning Machine",
      "SA 261 Robot transfer mechanism",
      "SA 251 Cooling unit",
      "11 automatic profile cleaning knives",
      "Separate knives for color and white profiles",
      "Automatic sash and frame profile recognition",
      "Profile width and height measurement system",
      "Windows based touch screen control",
      "USB program transfer capability",
      "Remote connection for technical support",
      "Movable control panel",
      "Speed change during process",
      "Processing: 220-270 frames / 8 hours",
      "Automatic 0.2-2mm welding transition (Yılmaz exclusive)",
      "Barcode reader integration for automatic operation",
      "Lame sash door welding capability",
      "1,000 profile recipes storage",
      "Millimeter or inch operation modes",
      "Phase and low pressure control systems"
    ],
    standardAccessories: [
      "CNC 609 or CNC 611 Corner Cleaning Machine",
      "DK 540 Four Head Welding Machine",
      "SA 251 Cooling Unit",
      "SA 261 Robot Unit"
    ],
    optionalAccessories: [
      "Welding fixture set for lame sash",
      "Special welding moulds on demand",
      "CS 240 gasket pressing system",
      "SA 255 window buffer station"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop', 'PhaseControl', 'LowPressureControl']
  },
  {
    id: "ym-009",
    name: "CDC 600",
    description: "Full Automatic Double Head Compound Cutting Machine - 2x Ø600mm saw blades with compound cuts (45°x45°) pivoting and tilting on both heads",
    imageUrl: "/images/machines/CDC-600.jpg",
    specPdf: "/documents/specs/CDC-600.pdf",
    youtubeUrl: "https://youtu.be/GywonVe7yMk?si=WBR_PUqDDJB6f8Bb",
    category: "cutting-machines",
    featured: true,
    releaseDate: "2022-01-01",
    type: "Double Head Compound Cutting",
    powerSpec: {
      voltage: '400V',
      frequency: '50-60Hz',
      phase: '3',
      consumption: '12.5 kW',
      amperage: '25A'
    },
    airSpec: {
      consumption: '60 L/min',
      pressure: '6-8 bar'
    },
    dimensions: {
      width: '2510mm',
      length: '1560mm',
      height: '1160mm'
    },
    weight: {
      net: '2350 kg',
      gross: '2500 kg'
    },
    sawBlade: {
      diameter: 'Ø600 mm',
      bore: 'Ø30 mm',
      speed: '2,300 RPM',
      motorPower: '2x 4 kW'
    },
    cuttingCapacity: {
      maxLength5m: '5,000mm (90°/45°)',
      maxLength7m: '7,000mm (90°/45°)',
      at90deg: '485mm',
      at45degInward: '840mm',
      at45degOutward: '750mm',
      minLength: '150mm',
      maxWidth90: '200mm',
      maxWidth45: '100mm'
    },
    angularCapacity: {
      tilting: '0° to 45° inward',
      pivotingInward: '+22.5° inward',
      pivotingOutward: '-140° outward',
      compound: '45° x 45° (pivoting & tilting)'
    },
    tags: ["Double Head", "Compound Cuts", "Automatic", "Servo Control", "45x45", "Industrial PC", "Touch Screen", "Barcode"],
    specifications: [
      "2x Ø600mm diameter saw blades with 2,300 RPM",
      "Saw blade motor power: 2x 4 kW",
      "Compound cuts (45° x 45°) pivoting and tilting on both heads",
      "Pivoting: 22.5° inward to 140° outward",
      "Tilting: 0° to 45° inward on both saws",
      "Windows based industrial PC with 15\" color touch screen",
      "Automatic servo control for all angle and linear movements",
      "Automatic precise angle adjustment at all angles",
      "USB and network transfer of cutting lists (mdb/csv formats)",
      "Profile lifting system prevents surface scratching",
      "Short length cuts by automatic slicing feature",
      "Saw movement controlled by electrical cylinder",
      "Arrow cutting feature for mullion profiles",
      "Remote connection for technical support",
      "User-friendly graphical software",
      "Two-hand safety operation"
    ],
    standardAccessories: [
      "2x Ø600 mm saw blades",
      "2x pneumatic pop-up supports",
      "2x pneumatic horizontal clamps",
      "4x pneumatic vertical clamps",
      "Spray saw blade cooling system",
      "Profile support conveyor",
      "Keyboard & mouse set",
      "Barcode printer"
    ],
    optionalAccessories: [
      "Machine with 7m cutting length",
      "VCE 1570 Vacuum chip extraction system",
      "Chip conveyor belt"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop', 'ProfileLiftingSystem']
  },
  {
    id: "ym-010",
    name: "DC-421-PSD",
    description: "Full Automatic Double Head Mitre Saw Machine - 9'' touch screen with automatic tilting to 90° and 45° inwards, USB cutting list transfer",
    imageUrl: "/images/machines/DC-421-PSD.jpg",
    specPdf: "/documents/specs/DC-421-PSD.pdf",
    youtubeUrl: "https://youtu.be/5pluTvKsQs4?si=YwmMnIQDV_g9kLH6",
    category: "cutting-machines",
    featured: true,
    releaseDate: "2022-01-01",
    type: "Full Automatic Double Head Mitre Saw",
    powerSpec: {
      voltage: '400V AC',
      frequency: '50-60Hz',
      phase: '3',
      consumption: '5 kW'
    },
    airSpec: {
      consumption: '80 L/min',
      pressure: '6-8 bar'
    },
    dimensions: {
      width: '1450mm',
      length: '4510mm',
      height: '1670mm'
    },
    weight: {
      net: '830 kg',
      gross: '949 kg'
    },
    sawBlade: {
      diameter: 'Ø420 mm',
      bore: 'Ø30-32 mm',
      speed: '2,900 RPM',
      motorPower: '5 kW'
    },
    angularCapacity: {
      tilting: '90° and 45° inward (automatic)',
      pivotingInward: '90° to 45° (manual for intermediate)',
      compound: 'Automatic slicing at 90° and 45° inward'
    },
    tags: ["Full Automatic", "Double Head", "Touch Screen", "USB Transfer", "Short Cut System", "High Precision"],
    specifications: [
      "Automatic tilting to 90° and 45° inwards for both angles",
      "Manual adjustment for intermediate angles (90° to 45°)",
      "9'' touch screen operator panel",
      "Obtains cutting dimensions and angles from cut list (automatic mode)",
      "USB cutting list transfer in CSV format",
      "Automatic slicing feature at 90° and 45° inward",
      "Solid steel construction body",
      "Automatically closing safety guards",
      "Hydro-pneumatic saw blade feed",
      "Cutting accuracy: ±0.2 mm",
      "Two-hand safety operation"
    ],
    standardAccessories: [
      "2x Ø420 mm saw blades",
      "Roller conveyor & 2x pneumatic profile supports",
      "Spray saw blade lubrication system",
      "4x pneumatic horizontal clamps",
      "Air gun"
    ],
    optionalAccessories: [
      "DKN 80 Arrow Cut System for mullion profiles",
      "DKN 71 short cut system (with ruler)",
      "Mould heights for special profiles",
      "Machine with 5m length",
      "Machine with 6m length",
      "VCE 1570 chip vacuum extractor",
      "2x pneumatic vertical clamps",
      "DLG 200 digital length gauge",
      "DLG 300 digital length gauge",
      "Spare saw blade Ø420 mm",
      "Barcode printer"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop', 'AutoClosingGuards']
  },
  {
    id: "ym-011",
    name: "ACK-420-S",
    description: "Up-Cutting Saw Machine for specialized operations",
    imageUrl: "/images/machines/ACK-420-S.jpg",
    specPdf: "/documents/specs/ACK-420-S.pdf",
    youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
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
    airSpec: {
      consumption: '180 L/min',
      pressure: '4 bar'
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
    name: "FR-226-S",
    description: "Automatic Copy Router Machine for precision operations",
    imageUrl: "/images/machines/FR-226-S.jpg",
    specPdf: "/documents/specs/FR-226-S.pdf",
    youtubeUrl: "https://youtu.be/IAy11Z3XeZY?si=HGpR2n8R1rSZrv5V",
    category: "processing-centers",
    featured: false,
    releaseDate: "2023-01-01",
    type: "Routing Machine",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '1.5 kW'
    },
    airSpec: {
      consumption: '120 L/min',
      pressure: '4 bar'
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
    name: "NCR 300",
    description: "4 Axis Numerical Controlled NC Router Machine - Designed for daily operations on PVC, aluminium and low alloy materials to machine four surfaces simultaneously",
    imageUrl: "/images/machines/NCR-300.jpg",
    specPdf: "/documents/specs/NCR-300.pdf",
    youtubeUrl: "https://youtu.be/ThfN9iUPsnU?si=863zRTryzWJhHbgH",
    category: "routers",
    featured: true,
    releaseDate: "2023-01-01",
    type: "NC Router",
    powerSpec: {
      voltage: '400V AC',
      frequency: '50-60Hz',
      phase: '3',
      consumption: '5.5 kW'
    },
    airSpec: {
      consumption: '110 L/min',
      pressure: '6-8 bar'
    },
    dimensions: {
      width: '1635mm',
      length: '2810mm',
      height: '2180mm'
    },
    weight: {
      net: '520 kg',
      gross: '600 kg'
    },
    workingCapacity: {
      x1: '300mm',
      y1: '120mm',
      z1: '115mm'
    },
    spindleSpeed: '12,000 RPM',
    spindlePower: '2.2 kW',
    cutterBits: 'Ø8 x L120 mm',
    toolCollet: 'ER 16',
    clampingCapacity: {
      widthMax: '120mm',
      widthMin: '30mm',
      heightMax: '115mm',
      heightMin: '30mm',
      lengthMax: '2750mm',
      lengthMin: '400mm'
    },
    tags: ["NC", "4-Axis", "Numerical Control", "PVC", "Aluminum", "Multi-Surface", "Servo Control", "PLC"],
    specifications: [
      "Machines four surfaces of profiles simultaneously",
      "Servo-controlled table mechanism for 0°/90°/180°/270° angles",
      "Multi pop-up length stops for profiles up to 2,750mm",
      "Machining capacity: X: 300mm, Y: 120mm, Z: 115mm",
      "Profile clamping width: 120mm max / 30mm min",
      "Profile clamping height: 115mm max / 30mm min",
      "Profile clamping length: 2,750mm max / 400mm min",
      "Electronic and pneumatic braking system for head and table",
      "ER 16 tool collet",
      "2.2 kW, 3P, 400V Spindle motor (12,000 RPM)",
      "PLC control system"
    ],
    standardAccessories: [
      "Ø8 x L120 mm cutter bit installed",
      "2x horizontal and 2x pneumatic vertical clamps",
      "Spray tool lubrication system",
      "Multiple left and right profile stops",
      "Service spanners (22 mm)",
      "Collet wrench",
      "LED lighting equipment",
      "Extending parts for clamps",
      "Profile centring apparatus",
      "Air gun"
    ],
    optionalAccessories: [
      "Spare Ø8 x L120 carbide single lip cutter bits",
      "Spare Ø8 x L63 carbide single lip cutter bits",
      "Spare Ø8 x L120 carbide double lip cutter bits",
      "Spare ER16 collets for Ø8 mm cutter bits"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop', 'ElectronicBraking', 'PneumaticBraking']
  },
  {
    id: "ym-014",
    name: "TK 505",
    description: "Single Corner PVC Welding Machine",
    imageUrl: "/images/machines/TK-505.jpg",
    specPdf: "/documents/specs/TK-505.pdf",
    youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
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
    airSpec: {
      consumption: '90 L/min',
      pressure: '3 bar'
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
    name: "KM-215-S",
    description: "Semi Automatic End Milling Machine for aluminum profiles",
    imageUrl: "/images/machines/KM-215-S.jpg",
    specPdf: "/documents/specs/KM-215-S.pdf",
    youtubeUrl: "https://youtu.be/VThz1mkR7o8?si=yv7IHffK1lGY4w7G",
    category: "processing-centers",
    featured: false,
    releaseDate: "2023-01-01",
    type: "End Milling Machine",
    powerSpec: {
      voltage: '400V',
      frequency: '50Hz',
      phase: '3',
      consumption: '1.2 kW'
    },
    airSpec: {
      consumption: '100 L/min',
      pressure: '4 bar'
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
    name: "CRM-250-S",
    description: "3 Spindle Copy Router Machine - 1x vertical and 2x horizontal spindle motors for complex aluminium profile operations on 3 sides without releasing",
    imageUrl: "/images/machines/CRM-250-S.jpg",
    specPdf: "/documents/specs/CRM-250-S.pdf",
    youtubeUrl: "https://youtu.be/cipBYN8sKG4?si=UlU-2KoUWpvEoeRg",
    category: "copy-routers",
    featured: true,
    releaseDate: "2023-01-01",
    type: "Template Copy Router",
    powerSpec: {
      voltage: '220/230V',
      frequency: '50-60Hz',
      phase: '1',
      consumption: '3.3 kW'
    },
    airSpec: {
      consumption: '24 L/min',
      pressure: '6-8 bar'
    },
    dimensions: {
      width: '1260mm',
      length: '2900mm',
      height: '1870mm'
    },
    weight: {
      net: '328 kg',
      gross: '373 kg'
    },
    workingCapacity: {
      x1: '650mm',
      x2: '350mm',
      y1: '180mm',
      y2: '230mm',
      z1: '170mm',
      z2: '150mm'
    },
    spindleSpeed: '12,000 RPM',
    cutterBits: '2x Ø10xL100mm / Ø5xL100mm',
    tags: ["3-Spindle", "Multi-function", "Template Copy Router", "Aluminum", "PVC", "Heavy Duty", "Mass Production"],
    specifications: [
      "1x vertical and 2x horizontal spindle motors",
      "Operations on 3 sides of aluminium profile without releasing",
      "2x pneumatic horizontal clamps + 2x pneumatic vertical clamps",
      "Horizontal and vertical pneumatic tracers with Ø5, Ø8, Ø10 mm diameters",
      "Horizontal & vertical templates with standard figures for Aluminum and PVC profiles",
      "High precision bearing mechanism with gas shock absorbers",
      "Ergonomic arm design for easy operation",
      "1 meter roller tables on right and left sides",
      "Manually adjustable profile stops on both sides",
      "Spray tool cooling system",
      "Spindle speed: 12,000 RPM"
    ],
    standardAccessories: [
      "1x Ø5 x L100 mm and 2x Ø10 x L100 mm cutter bits installed",
      "2x profile stops (left and right)",
      "Spray tool lubrication system",
      "2x pneumatic horizontal clamps",
      "2x pneumatic vertical clamps",
      "Air gun"
    ],
    optionalAccessories: [
      "Spare cutter bits Ø5 x L100 mm (for copy routing)",
      "Spare cutter bits Ø10 x L100 mm (for copy routing)",
      "Spare collets for Ø5 mm cutter bit",
      "Spare collets for Ø10 mm cutter bit",
      "Special custom templates"
    ],
    certifications: ['CE', 'ISO9001'],
    safetyFeatures: ['TwoHandOperation', 'AutomaticGuards', 'EmergencyStop']
  },
  {
    id: "ym-017",
    name: "ST 264",
    description: "Automatic PVC Water Slot Machine",
    imageUrl: "/images/machines/ST-264.jpg",
    specPdf: "/documents/specs/ST-264.pdf",
    youtubeUrl: "https://youtu.be/yYJ9NYoYKGI?si=P9Kfcl-1LRZVJGF1",
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
    airSpec: {
      consumption: '60 L/min',
      pressure: '3 bar'
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
    name: "SDT 275",
    description: "Reinforcement Steel and Square Profile Cutting Saw",
    imageUrl: "/images/machines/SDT-275.jpg",
    specPdf: "/documents/specs/SDT-275.pdf",
    youtubeUrl: "https://youtu.be/i3A8_92iNjA?si=LjXpb1R_nUuJT9qE",
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
    airSpec: {
      consumption: '140 L/min',
      pressure: '4 bar'
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
  name: "MK 450",
  description: "Single Head Cutting Machine with versatile angle options",
  imageUrl: "/images/machines/MK-450.jpg",
  specPdf: "/documents/specs/MK-450.pdf",
  youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
  category: "cutting-machines",
  featured: false,
  releaseDate: "2021-01-01",
  type: "Cutting Machine",
  powerSpec: {
    voltage: '230V',
    frequency: '50Hz',
    phase: '1',
    consumption: '2.2 kW'
  },
  airSpec: {
    consumption: '160 L/min',
    pressure: '4 bar'
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
  name: "RYK-420-W",
  description: "Radial Saw Machine with ergonomic design",
  imageUrl: "/images/machines/RYK-420-W.jpg",
  specPdf: "/documents/specs/RYK-420-W.pdf",
  youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
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
  airSpec: {
    consumption: '170 L/min',
    pressure: '4 bar'
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
  name: "SCM-420-L4",
  description: "Servo Controlled Serial Cutting Machine (3.6m stroke)",
  imageUrl: "/images/machines/SCM-420-L4.jpg",
  specPdf: "/documents/specs/SCM-420-L4.pdf",
  youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
  category: "cutting-machines",
  featured: false,
  releaseDate: "2022-01-01",
  type: "Serial Cutting Machine",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '2.2 kW'
  },
  airSpec: {
    consumption: '180 L/min',
    pressure: '4 bar'
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
  name: "CK 412",
  description: "PVC Glazing Bead Saw for precise cutting",
  imageUrl: "/images/machines/CK-412.jpg",
  specPdf: "/documents/specs/CK-412.pdf",
  youtubeUrl: "https://youtu.be/xXFc1Jc8m6U?si=gNbbV-Y-03xfo5Bk",
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
  airSpec: {
    consumption: '40 L/min',
    pressure: '3 bar'
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
  name: "DK 540",
  description: "Four Head Welding Machine for PVC profiles",
  imageUrl: "/images/machines/DK-540.jpg",
  specPdf: "/documents/specs/DK-540.pdf",
  youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
  category: "welding-machines",
  featured: false,
  releaseDate: "2022-01-01",
  type: "Welding Machine",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '5.0 kW'
  },
  airSpec: {
    consumption: '220 L/min',
    pressure: '5 bar'
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
  name: "CNC 608",
  description: "Corner Cleaning Machine with CNC control",
  imageUrl: "/images/machines/CNC-608.jpg",
  specPdf: "/documents/specs/CNC-608.pdf",
  youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
  category: "processing-centers",
  featured: false,
  releaseDate: "2022-01-01",
  type: "CNC Cleaning Machine",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '12.0 kW'
  },
  airSpec: {
    consumption: '280 L/min',
    pressure: '5 bar'
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
  name: "KD 305",
  description: "Mitre Saw Machine with manual operation",
  imageUrl: "/images/machines/KD-305.jpg",
  specPdf: "/documents/specs/KD-305.pdf",
  youtubeUrl: "https://youtu.be/zaLEsyS-fo8?si=Ole803MbU5SXmBbT",
  category: "cutting-machines",
  featured: false,
  releaseDate: "2020-01-01",
  type: "Mitre Saw",
  powerSpec: {
    voltage: '230V',
    frequency: '50Hz',
    phase: '1',
    consumption: '0.74 kW'
  },
  airSpec: {
    consumption: '50 L/min',
    pressure: '3 bar'
  },
  dimensions: {
    length: '700mm',
    width: '840mm',
    height: '670mm'
  },
  tags: ["Manual", "Precision"],
  specifications: [
    "Location points at 45°, 30°, 22.5°, 15°, 0° both left and right",
    "Pivoting range from 45° left to 45° right",
    "Aluminium construction body",
    "Ø305 mm saw blade not included"
  ],
  certifications: ['CE'],
  safetyFeatures: ['EmergencyStop']
},
{
  id: "ym-026",
  name: "KD-350-PS",
  description: "Mitre Saw Machine with pneumatic system",
  imageUrl: "/images/machines/KD-350-PS.jpg",
  specPdf: "/documents/specs/KD-350-PS.pdf",
  youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
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
  airSpec: {
    consumption: '120 L/min',
    pressure: '4 bar'
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
  name: "KD-350-M",
  description: "Compact Mitre Saw Machine",
  imageUrl: "/images/machines/KD-350-M.jpg",
  specPdf: "/documents/specs/KD-350-M.pdf",
  youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
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
  airSpec: {
    consumption: '110 L/min',
    pressure: '4 bar'
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
  name: "FR 223",
  description: "Portable Template Copy Router",
  imageUrl: "/images/machines/FR-223.jpg",
  specPdf: "/documents/specs/FR-223.pdf",
  youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
  modelPath: "/models/demo-machine.glb",
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
  airSpec: {
    consumption: '70 L/min',
    pressure: '3 bar'
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
  name: "FR-223-S",
  description: "Portable Template Copy Router with spray cooling",
  imageUrl: "/images/machines/FR-223-S.jpg",
  specPdf: "/documents/specs/FR-223-S.pdf",
  youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
  modelPath: "/models/demo-machine.glb",
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
  airSpec: {
    consumption: '80 L/min',
    pressure: '3 bar'
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
  name: "FR 222",
  description: "Economical Portable Template Copy Router",
  imageUrl: "/images/machines/FR-222.jpg",
  specPdf: "/documents/specs/FR-222.pdf",
  youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
  modelPath: "/models/FR-222.glb",
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
  airSpec: {
    consumption: '90 L/min',
    pressure: '3 bar'
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
  name: "KM-211-S",
  description: "Manual End Milling Machine with pneumatic clamps",
  imageUrl: "/images/machines/KM-211-S.jpg",
  specPdf: "/documents/specs/KM-211-S.pdf",
  youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
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
  airSpec: {
    consumption: '110 L/min',
    pressure: '4 bar'
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
  name: "SA 250",
  description: "Cooling Unit for welding systems",
  imageUrl: "/images/machines/SA-250.jpg",
  specPdf: "/documents/specs/SA-250.pdf",
  youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
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
  airSpec: {
    consumption: '30 L/min',
    pressure: '2 bar'
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
  name: "SA 260",
  description: "Robot Unit for profile transfer",
  imageUrl: "/images/machines/SA-260.jpg",
  specPdf: "/documents/specs/SA-260.pdf",
  youtubeUrl: "https://www.youtube.com/watch?v=PLACEHOLDER",
  category: "accessories",
  featured: false,
  releaseDate: "2021-01-01",
  type: "Robot Unit",
  powerSpec: {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: '0.85 kW'
  },
  airSpec: {
    consumption: '50 L/min',
    pressure: '3 bar'
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
  safetyFeatures: ['EmergencyStop']
}
];


// Utilities to support comparison summaries
export const getTotalPowerKw = (machines: Machine[]) => machines.reduce((sum, m) => {
  const match = m.powerSpec?.consumption?.match(/([0-9]+(?:\.[0-9]+)?)/);
  return sum + (match ? parseFloat(match[1]) : 0);
}, 0);

export const getTotalAirConsumption = (machines: Machine[]) => machines.reduce((sum, m) => {
  const air = m.airSpec?.consumption;
  const match = air?.match(/([0-9]+(?:\.[0-9]+)?)/);
  return sum + (match ? parseFloat(match[1]) : 0);
}, 0);

// Export legacy format for backward compatibility
export const yilmazMachinesLegacy = yilmazMachines.map(machine => ({
  ...machine,
  category: 'machines',
  power: `${machine.powerSpec.consumption}`,
  dimensions: `${machine.dimensions.length} × ${machine.dimensions.width} × ${machine.dimensions.height}`
}));