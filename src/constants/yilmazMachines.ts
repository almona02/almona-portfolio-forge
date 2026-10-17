// Define types locally as the import is failing.
export type Certification = 'CE' | 'ISO9001';

export type SafetyStandard = 
  | 'TwoHandOperation' 
  | 'AutomaticGuards' 
  | 'EmergencyStop'
  | 'LowPressureControl'
  | 'SafetyFence'
  | 'AutoClosingGuards'
  | 'PressureControlValves'
  | 'PhaseControl'
  | 'ProfileLiftingSystem'
  | 'ElectronicBraking'
  | 'PneumaticBraking'
  | 'OperatorSafetyBarrier';

export interface PowerSpecification {
  voltage: string;
  frequency: string;
  phase: string;
  consumption: string;
  amperage?: string;
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
  material?: 'aluminium' | 'pvc' | 'both';
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
    gross?: string;
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
  spindlePower?: string;
  cutterBits?: string;
  toolCollet?: string;
  cncAxes?: number;
  millingMotors?: number;
  tripleHoleMotor?: number;
  cleaningTools?: number;
  millingCapacity?: {
    widthMax?: string;
    heightMax?: string;
  };
  sawBlade?: {
    diameter?: string;
    bore?: string;
    speed?: string;
    motorPower?: string;
  };
  clampingCapacity?: {
    widthMax?: string;
    widthMin?: string;
    heightMax?: string;
    heightMin?: string;
    lengthMax?: string;
    lengthMin?: string;
  };
  weldingCapacity?: {
    heightMax?: string;
    heightMin?: string;
    widthMax?: string;
    widthMin?: string;
    angleRange?: string;
    frameMin?: string;
    frameMax?: string;
  };
  cuttingCapacity?: {
    maxLength5m?: string;
    maxLength7m?: string;
    at90deg?: string;
    at45deg?: string;
    at45degInward?: string;
    at45degOutward?: string;
    at30deg?: string;
    minLength?: string;
    maxWidth90?: string;
    maxWidth45?: string;
    pushingStroke?: string;
    conveyorWidth?: string;
    accuracy?: string;
    heightMax?: string;
    widthMax?: string;
  };
  angularCapacity?: {
    tilting?: string;
    pivotingInward?: string;
    pivotingOutward?: string;
    compound?: string;
    presetAngles?: string;
    pivotingRange?: string;
    automatic?: string;
    manualAngles?: string;
  };
  frameCapacity?: {
    minInner?: string;
    minOuter?: string;
    minOuter30?: string;
    minOuter60?: string;
    maxFrame?: string;
    minFrame?: string;
    maxRobotFrame?: string;
    maxCleaningFrame?: string;
  };
  processingCapacity?: string;
  profileCapacity?: {
    minLength?: string;
    maxLength?: string;
    minProfile?: string;
    maxProfile?: string;
    loadingCapacity?: string;
  };
  axisSpeed?: string;
  infeedSpeed?: string;
  temperatureRange?: string;
  weldingOptions?: string;
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

// Helper function to parse dimensions (unused but kept for potential future use)
const _parseDimensions = (dimensionStr: string) => {
  const parts = dimensionStr.split(' × ');
  return {
    length: parts[0] as `${number}mm`,
    width: parts[1] as `${number}mm`, 
    height: parts[2] as `${number}mm`
  };
};

// Helper function to create power specification (unused but kept for potential future use)
const _createPowerSpec = (powerStr: string): PowerSpecification => {
  const powerMatch = powerStr.match(/([\d.]+)\s*kW/);
  const power = powerMatch ? `${powerMatch[1]} kW` as const : '0 kW' as const;
  
  return {
    voltage: '400V',
    frequency: '50Hz',
    phase: '3',
    consumption: power
  };
};

// DEPRECATED: Use useYilmazMachines() hook instead for async loading
// This export is kept for backward compatibility but will be removed
// The data is now loaded from /data/yilmazMachines.json
let _yilmazMachinesCache: Machine[] | null = null;

export async function getYilmazMachines(): Promise<Machine[]> {
  if (_yilmazMachinesCache) {
    return _yilmazMachinesCache;
  }
  
  try {
    const response = await fetch('/data/yilmazMachines.json');
    if (response.ok) {
      _yilmazMachinesCache = await response.json();
      return _yilmazMachinesCache;
    }
  } catch (error) {
    console.warn('Failed to fetch machines from /data, using fallback:', error);
  }
  
  // Fallback: return empty array (data should be in JSON file)
  return [];
}

// Legacy export - will be removed in future version
// Use getYilmazMachines() or useYilmazMachines() hook instead
export const yilmazMachines: Machine[] = [
  {
    "id": "aim-3410",
    "name": "AIM 3410",
    "description": "4-axis CNC aluminium profile machining center with 24,000 RPM electro spindle, 7+1 automatic tool magazine, and integrated saw operations.",
    "imageUrl": "/images/machines/AIM-3410_1.png",
    "specPdf": "/documents/specs/AIM-3410.pdf",
    "youtubeUrl": "https://youtu.be/qKC5xdpxKyY?si=0mTzSJphFoI_hmVZ",
    "modelPath": "/models/aim-3410.glb",
    "has3DModel": false,
    "category": "processing-centers",
    "subcategory": "profile-machining",
    "featured": true,
    "releaseDate": "2024-05-10",
    "type": "Aluminium Profile Machining Center",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "11.5 kW",
      "amperage": "25A"
    },
    "airSpec": {
      "consumption": "250 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "5160mm",
      "width": "2410mm",
      "height": "2200mm"
    },
    "weight": {
      "net": "1430 kg",
      "gross": "1850 kg"
    },
    "workingCapacity": {
      "x1": "3200mm",
      "y1": "225mm",
      "z1": "300mm"
    },
    "spindleSpeed": "24,000 RPM",
    "cutterBits": "HSK-F63",
    "tags": [
      "CNC",
      "4-Axis",
      "Aluminium",
      "Profile Machining",
      "Automatic Tool Magazine",
      "Touch Screen",
      "Remote Support"
    ],
    "specifications": [
      "4-axis CNC motion with mobile bridge architecture",
      "Automatic tool magazine: 7 cutters + 1 Ø180mm saw blade",
      "Automatic clamp recognition and positioning",
      "PLC-controlled spray tool cooling and cartridge lubrication (X/Y/Z)",
      "15'' color touch screen with ISO G-code and AIMCAM support",
      "Remote technical support and multi-language interface",
      "Sound-insulated safety cabinet with LED lighting",
      "Operator safety barrier and steel gantry construction",
      "Axis speeds: X 60 m/min, Y 50 m/min, Z 50 m/min, A 72°/s",
      "Saw unit: Ø180mm, Ø30mm bore, 3,000 RPM"
    ],
    "standardAccessories": [
      "AIMCAM software",
      "Keyboard & mouse",
      "Safety fence around machine",
      "4x automatic profile clamps",
      "1x pneumatic profile rest (left)",
      "Chip pan in machine frame"
    ],
    "optionalAccessories": [
      "Second reference profile rest (right side)",
      "Automatic tool length measurement",
      "Special saw blade kit",
      "Hand-held controller",
      "Custom cutter tools and holders"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop"
    ],
    "egyptianCompliance": {
      "standard": "ES1109",
      "certificateNumber": "ES-AIM3410-2024",
      "issueDate": "2024-05-10"
    },
    "material": "aluminium"
  },
  {
    "id": "kp-180",
    "name": "KP 180",
    "description": "Hydraulic aluminium corner crimping machine with dual 5-ton heads, adjustable knives, and synchronized hydraulic pressing.",
    "imageUrl": "/images/machines/kp-180.png",
    "specPdf": "/documents/specs/KP-180-00021103.pdf",
    "youtubeUrl": "https://youtu.be/sy5hs4OIBkE?si=lTfXMq59M8afKqKU",
    "category": "corner-crimping",
    "subcategory": "hydraulic-crimping",
    "featured": true,
    "releaseDate": "2023-09-10",
    "type": "Hydraulic Aluminium Corner Crimping Machine",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "1.14 kW"
    },
    "airSpec": {
      "consumption": "10 L/min (hydraulic)",
      "pressure": "6-8 bar (max 100 bar)"
    },
    "dimensions": {
      "width": "930mm",
      "length": "1100mm",
      "height": "1400mm"
    },
    "weight": {
      "net": "436 kg",
      "gross": "436 kg"
    },
    "workingCapacity": {
      "x1": "150mm",
      "y1": "185mm"
    },
    "tags": [
      "Hydraulic",
      "Corner Crimping",
      "Aluminium"
    ],
    "specifications": [
      "Hydraulic crimping system with synchronized dual heads (2 x 5 tons)",
      "Adjustable knives for profile shape/height",
      "Steel construction table with precise stops and milimetric rulers",
      "Hydraulic foot pedal for crimping; pneumatic pedal for clamps",
      "Double-acting 90° bracing clamp returns under table after crimping",
      "Polyamide protection plates to prevent profile scratches",
      "Positioning cylinders close to workpiece to shorten cycle time",
      "Max crimping height: 180 mm; max clamping: H185 x W150 mm",
      "Minimum inner window dimension: 200 mm"
    ],
    "standardAccessories": [
      "2x profile support arms",
      "Crimping knives: 3 mm, 5 mm, 7 mm (sets)",
      "2x pneumatic vertical clamps",
      "Allen keys (4 mm, 5 mm)"
    ],
    "optionalAccessories": [
      "Adjustable multi-knife set",
      "Safety guard (H: 180 mm)",
      "Special crimping knives"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-001",
    "name": "ALM 6510",
    "description": "Aluminium Profile Machining Center - 8-axis CNC servo control for milling, drilling, and cutting operations on four sides of profiles",
    "imageUrl": "/images/machines/cutting-machine.jpg",
    "specPdf": "/documents/specs/ALM-6510.pdf",
    "youtubeUrl": "https://www.youtube.com/watch?v=CeGDjE9QCqQ",
    "category": "processing-centers",
    "featured": true,
    "releaseDate": "2023-05-15",
    "type": "Aluminium Profile Machining Center",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "29 kW",
      "amperage": "58A"
    },
    "airSpec": {
      "consumption": "250 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "11720mm",
      "width": "2000mm",
      "height": "2310mm"
    },
    "weight": {
      "net": "3650 kg",
      "gross": "4106 kg"
    },
    "sawBlade": {
      "diameter": "Ø550 mm",
      "bore": "Ø30 mm",
      "speed": "3,000 RPM",
      "motorPower": "2.2 kW"
    },
    "spindleSpeed": "12,000 RPM",
    "cncAxes": 8,
    "processingCapacity": "1,600-1,800 running meters / 8 hours",
    "profileCapacity": {
      "minLength": "700mm",
      "maxLength": "6,500mm",
      "minProfile": "40 x 40 mm",
      "maxProfile": "130 x 180 mm",
      "loadingCapacity": "7 profiles"
    },
    "cuttingCapacity": {
      "minLength": "400mm",
      "at90deg": "130 x 180 mm",
      "at45deg": "130 x 180 mm",
      "at30deg": "130 x 180 mm"
    },
    "angularCapacity": {
      "pivotingInward": "45°",
      "pivotingOutward": "135°",
      "compound": "45° to 135° servo controlled"
    },
    "axisSpeed": "X: 40 m/min, Y: 40 m/min, Z: 40 m/min",
    "infeedSpeed": "100 m/min",
    "tags": [
      "8-Axis CNC",
      "Aluminium",
      "PVC",
      "Machining Center",
      "Servo Control",
      "Windows PC",
      "Touch Screen",
      "Remote Support",
      "Automatic"
    ],
    "specifications": [
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
    "standardAccessories": [
      "8 milling tools (4x Ø5mm + 4x Ø8mm)",
      "Barcode printer",
      "Safety fence around machine",
      "Keyboard & mouse"
    ],
    "optionalAccessories": [
      "Angled swarf conveyor",
      "KP 3500 chip vacuum extractor",
      "Workshop logistic equipment",
      "Spare saw blade Ø550mm",
      "Spare Ø5 and Ø8 cutter bits"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop",
      "LowPressureControl",
      "SafetyFence"
    ],
    "egyptianCompliance": {
      "standard": "ES1109",
      "certificateNumber": "ES-ALM6510-2023",
      "issueDate": "2023-05-15"
    },
    "material": "aluminium"
  },
  {
    "id": "ym-002",
    "name": "DC-421-PBS",
    "description": "Full Automatic Double Head Mitre Saw Machine - Windows based industrial PC with 15'' LCD touch screen, automatic tilting to 90° and 45° inwards",
    "imageUrl": "/images/machines/DC-421-PBS.jpg",
    "specPdf": "/documents/specs/DC-421-PBS.pdf",
    "youtubeUrl": "https://youtu.be/1B5elf1hDG4?si=PEHCxCA5sUsz2w8G",
    "category": "cutting-machines",
    "featured": true,
    "releaseDate": "2012-05-10",
    "type": "Full Automatic Double Head Mitre Saw",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "5 kW",
      "amperage": "4A"
    },
    "airSpec": {
      "consumption": "165 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "4510mm",
      "width": "1450mm",
      "height": "1670mm"
    },
    "weight": {
      "net": "888 kg",
      "gross": "965 kg"
    },
    "sawBlade": {
      "diameter": "Ø420 mm",
      "bore": "Ø30-32 mm",
      "speed": "2,900 RPM",
      "motorPower": "5 kW"
    },
    "angularCapacity": {
      "tilting": "90° and 45° inward (automatic)",
      "pivotingInward": "90° to 45° (manual for intermediate)",
      "compound": "Automatic slicing at 90° and 45° inward"
    },
    "tags": [
      "Full Automatic",
      "Double Head",
      "Industrial PC",
      "Touch Screen",
      "Barcode",
      "Windows Based",
      "Remote Support"
    ],
    "specifications": [
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
    "standardAccessories": [
      "2x Ø420 mm saw blades",
      "Roller conveyor & 2x pneumatic profile supports",
      "Spray saw blade lubrication system",
      "4x pneumatic horizontal clamps",
      "2x pneumatic vertical clamps",
      "Barcode printer",
      "Air gun"
    ],
    "optionalAccessories": [
      "DKN 71 short cut system (with ruler)",
      "Mould heights for special profiles",
      "Machine with 5m length",
      "Machine with 6m length",
      "VCE 1570 chip vacuum extractor",
      "DLG 200 digital length gauge",
      "DLG 300 digital length gauge",
      "Spare saw blade Ø420 mm"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop",
      "AutoClosingGuards"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-003",
    "name": "DK 502",
    "description": "Double Corner PVC Welding Machine - Fully automatic two corner welding of PVC window profiles at 90° with single head welding possibility",
    "imageUrl": "/images/machines/DK-502.jpg",
    "specPdf": "/documents/specs/DK-502.pdf",
    "youtubeUrl": "https://youtu.be/jOLX0XMXC9A?si=U6F-JPhfUVARqUx1",
    "category": "welding-machines",
    "featured": true,
    "releaseDate": "2012-05-10",
    "type": "Double Corner PVC Welding",
    "powerSpec": {
      "voltage": "230V AC",
      "frequency": "50-60Hz",
      "phase": "1",
      "consumption": "3 kW"
    },
    "airSpec": {
      "consumption": "180 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "4100mm",
      "width": "1700mm",
      "height": "On request"
    },
    "weight": {
      "net": "611 kg",
      "gross": "700 kg"
    },
    "weldingCapacity": {
      "heightMax": "180mm",
      "heightMin": "30mm",
      "widthMax": "140mm",
      "widthMin": "30mm",
      "angleRange": "30° - 180°"
    },
    "temperatureRange": "0° - 300°C",
    "weldingOptions": "Standard (2mm) or Seamless (0.2mm)",
    "tags": [
      "Double Corner",
      "PVC Welding",
      "Automatic",
      "90° Welding",
      "Single Head Option",
      "Seamless Welding",
      "Electronic Thermostat"
    ],
    "specifications": [
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
    "standardAccessories": [
      "2x support arms"
    ],
    "optionalAccessories": [
      "Special welding molds on demand"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "AutomaticGuards",
      "EmergencyStop",
      "LowPressureControl"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-004",
    "name": "KM 212",
    "description": "Portable End Milling Machine - High quality end-milling operations with manual controls for aluminum and PVC profiles",
    "imageUrl": "/images/machines/KM-212.jpg",
    "specPdf": "/documents/specs/KM-212.pdf",
    "youtubeUrl": "https://youtu.be/1iiAfHwLhsQ?si=UQYOLQVwQq5N9143",
    "category": "end-milling",
    "featured": false,
    "releaseDate": "2012-05-10",
    "type": "Portable End Milling",
    "powerSpec": {
      "voltage": "230V AC",
      "frequency": "50-60Hz",
      "phase": "1",
      "consumption": "800 W"
    },
    "dimensions": {
      "length": "510mm",
      "width": "570mm",
      "height": "420mm"
    },
    "weight": {
      "net": "26 kg",
      "gross": "28 kg"
    },
    "sawBlade": {
      "diameter": "Ø120 mm (max)",
      "bore": "Ø30 mm",
      "speed": "3,000 RPM"
    },
    "clampingCapacity": {
      "widthMax": "160mm",
      "heightMax": "65mm"
    },
    "millingCapacity": {
      "widthMax": "160mm",
      "heightMax": "65mm"
    },
    "tags": [
      "Portable",
      "End Milling",
      "Manual",
      "Compact",
      "Lightweight",
      "PVC",
      "Aluminum"
    ],
    "specifications": [
      "High quality end-milling with manual operations",
      "Firm workpiece fixing with manual vertical and horizontal clamps",
      "Practical cutter adjustment with spacers",
      "Profile clamping capacity: H: 65mm x W: 160mm",
      "Max end-milling capacity: H: 65mm x W: 160mm",
      "Max saw blade diameter: Ø120 mm",
      "Spindle speed: 3,000 RPM",
      "Compact and portable design (26 kg)"
    ],
    "standardAccessories": [
      "1x manual horizontal clamp",
      "1x manual vertical clamp"
    ],
    "optionalAccessories": [
      "H: 80mm x W: 160mm clamping capacity version (on demand)",
      "Milling cutter set",
      "Machine stand"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "both"
  },
  {
    "id": "ym-005",
    "name": "KD-402-S",
    "description": "Double Head Mitre Saw Machine - Semi-automatic with two circular saws for flat or angled cutting of PVC, aluminium and wooden materials",
    "imageUrl": "/images/machines/KD-402-S.jpg",
    "specPdf": "/documents/specs/KD-402-S.pdf",
    "youtubeUrl": "https://youtu.be/3GTWyawzxMw?si=6E8Xa5UsjBEcoUYG",
    "category": "cutting-machines",
    "featured": false,
    "releaseDate": "2023-05-15",
    "type": "Double Head Mitre Saw",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "4.5 kW",
      "amperage": "9A"
    },
    "airSpec": {
      "consumption": "46 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "5560mm",
      "width": "1290mm",
      "height": "1440mm"
    },
    "weight": {
      "net": "530 kg",
      "gross": "593 kg"
    },
    "sawBlade": {
      "diameter": "Ø400 mm",
      "bore": "Ø30-32 mm",
      "speed": "2,900 RPM",
      "motorPower": "4.5 kW"
    },
    "cuttingCapacity": {
      "maxLength5m": "3,455mm",
      "minLength": "530mm",
      "maxWidth90": "482mm",
      "maxWidth45": "593mm"
    },
    "angularCapacity": {
      "pivotingInward": "+45° inward",
      "pivotingOutward": "-45° outward",
      "presetAngles": "0°, 15°, 22.5°, 30°, 45° (both sides)"
    },
    "tags": [
      "Double Head",
      "Semi-Automatic",
      "Mitre Saw",
      "PVC",
      "Aluminum",
      "Wood",
      "Hydro-Pneumatic",
      "Digital Display"
    ],
    "specifications": [
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
    "standardAccessories": [
      "2x Ø400 mm saw blades",
      "Digital display indicating cutting length",
      "Pneumatic spray mist lubrication system",
      "3x pneumatic horizontal clamps",
      "2x pneumatic vertical clamps",
      "Profile support mechanism",
      "Air gun"
    ],
    "optionalAccessories": [
      "Two-step head speed control system (patented)",
      "VCE 1570 chip vacuum extractor & accessories",
      "DLG 200 digital profile length gauge",
      "DLG 300 digital profile length gauge",
      "Machine with 5m length",
      "Spare saw blade Ø400 mm"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop",
      "PressureControlValves"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-006",
    "name": "FR-221-S",
    "description": "Pneumatic Template Copy Router - For opening locks, drilling handles, hinges, espagnolette and barrel holes on PVC and aluminium profiles",
    "imageUrl": "/images/machines/FR-221-S.jpg",
    "specPdf": "/documents/specs/FR-221-S.pdf",
    "youtubeUrl": "https://youtu.be/T-yF2tKITb8?si=TuuxsTJYm23LaMHp",
    "category": "copy-routers",
    "featured": false,
    "releaseDate": "2023-05-15",
    "type": "Template Copy Router",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "750 W"
    },
    "airSpec": {
      "consumption": "5 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "580mm",
      "width": "550mm",
      "height": "1335mm"
    },
    "weight": {
      "net": "77 kg",
      "gross": "103 kg"
    },
    "workingCapacity": {
      "x1": "270mm",
      "y1": "110mm",
      "z1": "130mm"
    },
    "spindleSpeed": "14,000 RPM",
    "cutterBits": "Ø5 x L60 mm",
    "clampingCapacity": {
      "widthMax": "130mm",
      "widthMin": "10mm",
      "heightMax": "130mm",
      "heightMin": "20mm"
    },
    "tags": [
      "Pneumatic",
      "Template Copy Router",
      "PVC",
      "Aluminum",
      "Lock Machining",
      "Hinge Drilling",
      "Compact"
    ],
    "specifications": [
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
    "standardAccessories": [
      "Ø5 x L60 mm router bit installed",
      "2x left and right profile stops",
      "2x pneumatic horizontal clamps",
      "Spray tool lubrication system",
      "Air gun"
    ],
    "optionalAccessories": [
      "Spare Ø5 x L60 mm router bits",
      "Special copy templates",
      "MA 240 centring apparatus",
      "MKN 150 roller conveyor"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "AutomaticGuards",
      "EmergencyStop"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-007",
    "name": "PIM 6509",
    "description": "PVC Profile Machining and Cutting Center - 8-axis CNC servo control for milling, water slots, drilling, and cutting operations on four sides",
    "imageUrl": "/images/machines/PIM-6509.jpg",
    "specPdf": "/documents/specs/PIM-6509.pdf",
    "youtubeUrl": "https://youtu.be/lQlX-jXfegU?si=_N5SbMJyFHa1obiG",
    "category": "processing-centers",
    "featured": false,
    "releaseDate": "2023-01-01",
    "type": "PVC Profile Machining Center",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "17 kW",
      "amperage": "34A"
    },
    "airSpec": {
      "consumption": "250 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "13440mm",
      "width": "2790mm",
      "height": "2310mm"
    },
    "weight": {
      "net": "3650 kg",
      "gross": "4106 kg"
    },
    "sawBlade": {
      "diameter": "Ø550 mm",
      "bore": "Ø30 mm",
      "speed": "2,440 RPM",
      "motorPower": "2.2 kW"
    },
    "spindleSpeed": "18,000 RPM",
    "cncAxes": 8,
    "millingMotors": 10,
    "tripleHoleMotor": 1,
    "processingCapacity": "2,200-2,400 running meters / 8 hours",
    "profileCapacity": {
      "minLength": "700mm",
      "maxLength": "6,500mm",
      "minProfile": "40 x 40 mm",
      "maxProfile": "130 x 180 mm",
      "loadingCapacity": "7 profiles"
    },
    "cuttingCapacity": {
      "minLength": "400mm",
      "at90deg": "130 x 180 mm",
      "at45deg": "130 x 180 mm",
      "at30deg": "130 x 180 mm"
    },
    "angularCapacity": {
      "pivotingInward": "30°",
      "pivotingOutward": "150°",
      "compound": "30° to 150° servo controlled"
    },
    "axisSpeed": "X: 40 m/min, Y: 40 m/min, Z: 40 m/min",
    "infeedSpeed": "100 m/min",
    "tags": [
      "8-Axis CNC",
      "PVC",
      "Machining Center",
      "Servo Control",
      "Windows PC",
      "Touch Screen",
      "Remote Support",
      "Water Slots",
      "Triple Hole"
    ],
    "specifications": [
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
    "standardAccessories": [
      "11 milling and drilling tools",
      "Safety fence around machine",
      "Keyboard & mouse",
      "Barcode printer"
    ],
    "optionalAccessories": [
      "Workshop logistic equipment",
      "Spare cutter bits",
      "KP 3500 chip vacuum extractor",
      "Spare Ø550mm saw blade",
      "Angled swarf conveyor"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop",
      "LowPressureControl",
      "SafetyFence"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-008",
    "name": "CCL 1661",
    "description": "PVC Welding and Corner Cleaning Line - Complete automated production line with 4-head welding, CNC corner cleaning, and robot transfer system",
    "imageUrl": "/images/machines/CCL-1661.jpg",
    "specPdf": "/documents/specs/CCL-1661.pdf",
    "youtubeUrl": "https://youtu.be/feWx5BXMSn0?si=1b5AP3moNi37475i",
    "category": "fabrication-equipment",
    "featured": false,
    "releaseDate": "2023-01-01",
    "type": "PVC Welding and Corner Cleaning Line",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "14 kW"
    },
    "airSpec": {
      "consumption": "180 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "11725mm",
      "width": "2472mm",
      "height": "2070mm"
    },
    "weight": {
      "net": "3156 kg",
      "gross": "3931 kg"
    },
    "spindleSpeed": "18,000 RPM",
    "cleaningTools": 11,
    "sawBlade": {
      "diameter": "Ø250 mm",
      "bore": "Ø30-32 mm",
      "speed": "6,000 RPM"
    },
    "weldingCapacity": {
      "heightMax": "180mm",
      "heightMin": "30mm",
      "widthMax": "130mm",
      "widthMin": "30mm"
    },
    "frameCapacity": {
      "maxFrame": "3,100 x 2,700 mm (welding)",
      "minFrame": "400 x 400 mm",
      "maxRobotFrame": "2,200 x 2,200 mm",
      "maxCleaningFrame": "2,200 x 2,200 mm"
    },
    "processingCapacity": "220 frames/8hrs (CNC 609) or 270 frames/8hrs (CNC 611)",
    "weldingOptions": "0.2mm to 2.0mm automatic transition",
    "tags": [
      "Production Line",
      "4-Head Welding",
      "CNC Cleaning",
      "Robot Transfer",
      "Automated",
      "Windows PC",
      "Touch Screen",
      "Barcode"
    ],
    "specifications": [
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
    "standardAccessories": [
      "CNC 609 or CNC 611 Corner Cleaning Machine",
      "DK 540 Four Head Welding Machine",
      "SA 251 Cooling Unit",
      "SA 261 Robot Unit"
    ],
    "optionalAccessories": [
      "Welding fixture set for lame sash",
      "Special welding moulds on demand",
      "CS 240 gasket pressing system",
      "SA 255 window buffer station"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop",
      "PhaseControl",
      "LowPressureControl"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-009",
    "name": "CDC 600",
    "description": "Full Automatic Double Head Compound Cutting Machine - 2x Ø600mm saw blades with compound cuts (45°x45°) pivoting and tilting on both heads",
    "imageUrl": "/images/machines/CDC-600.jpg",
    "specPdf": "/documents/specs/CDC-600.pdf",
    "youtubeUrl": "https://youtu.be/GywonVe7yMk?si=WBR_PUqDDJB6f8Bb",
    "category": "cutting-machines",
    "featured": false,
    "releaseDate": "2022-01-01",
    "type": "Double Head Compound Cutting",
    "powerSpec": {
      "voltage": "400V",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "12.5 kW",
      "amperage": "25A"
    },
    "airSpec": {
      "consumption": "60 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "1560mm",
      "width": "2510mm",
      "height": "1160mm"
    },
    "weight": {
      "net": "2350 kg",
      "gross": "2500 kg"
    },
    "sawBlade": {
      "diameter": "Ø600 mm",
      "bore": "Ø30 mm",
      "speed": "2,300 RPM",
      "motorPower": "2x 4 kW"
    },
    "cuttingCapacity": {
      "maxLength5m": "5,000mm (90°/45°)",
      "maxLength7m": "7,000mm (90°/45°)",
      "at90deg": "485mm",
      "at45degInward": "840mm",
      "at45degOutward": "750mm",
      "minLength": "150mm",
      "maxWidth90": "200mm",
      "maxWidth45": "100mm"
    },
    "angularCapacity": {
      "tilting": "0° to 45° inward",
      "pivotingInward": "+22.5° inward",
      "pivotingOutward": "-140° outward",
      "compound": "45° x 45° (pivoting & tilting)"
    },
    "tags": [
      "Double Head",
      "Compound Cuts",
      "Automatic",
      "Servo Control",
      "45x45",
      "Industrial PC",
      "Touch Screen",
      "Barcode"
    ],
    "specifications": [
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
    "standardAccessories": [
      "2x Ø600 mm saw blades",
      "2x pneumatic pop-up supports",
      "2x pneumatic horizontal clamps",
      "4x pneumatic vertical clamps",
      "Spray saw blade cooling system",
      "Profile support conveyor",
      "Keyboard & mouse set",
      "Barcode printer"
    ],
    "optionalAccessories": [
      "Machine with 7m cutting length",
      "VCE 1570 Vacuum chip extraction system",
      "Chip conveyor belt"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop",
      "ProfileLiftingSystem"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-010",
    "name": "DC-421-PSD",
    "description": "Full Automatic Double Head Mitre Saw Machine - 9'' touch screen with automatic tilting to 90° and 45° inwards, USB cutting list transfer",
    "imageUrl": "/images/machines/DC-421-PSD.jpg",
    "specPdf": "/documents/specs/DC-421-PSD.pdf",
    "youtubeUrl": "https://youtu.be/5pluTvKsQs4?si=YwmMnIQDV_g9kLH6",
    "category": "cutting-machines",
    "featured": false,
    "releaseDate": "2022-01-01",
    "type": "Full Automatic Double Head Mitre Saw",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "5 kW"
    },
    "airSpec": {
      "consumption": "80 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "4510mm",
      "width": "1450mm",
      "height": "1670mm"
    },
    "weight": {
      "net": "830 kg",
      "gross": "949 kg"
    },
    "sawBlade": {
      "diameter": "Ø420 mm",
      "bore": "Ø30-32 mm",
      "speed": "2,900 RPM",
      "motorPower": "5 kW"
    },
    "angularCapacity": {
      "tilting": "90° and 45° inward (automatic)",
      "pivotingInward": "90° to 45° (manual for intermediate)",
      "compound": "Automatic slicing at 90° and 45° inward"
    },
    "tags": [
      "Full Automatic",
      "Double Head",
      "Touch Screen",
      "USB Transfer",
      "Short Cut System",
      "High Precision"
    ],
    "specifications": [
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
    "standardAccessories": [
      "2x Ø420 mm saw blades",
      "Roller conveyor & 2x pneumatic profile supports",
      "Spray saw blade lubrication system",
      "4x pneumatic horizontal clamps",
      "Air gun"
    ],
    "optionalAccessories": [
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
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop",
      "AutoClosingGuards"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-011",
    "name": "ACK-420-S",
    "description": "Up-Cutting Saw Machine for specialized operations",
    "imageUrl": "/images/machines/ACK-420-S.jpg",
    "specPdf": "/documents/specs/ACK-420-S.pdf",
    "youtubeUrl": "https://www.youtube.com/watch?v=PLACEHOLDER",
    "category": "cutting-machines",
    "featured": false,
    "releaseDate": "2021-01-01",
    "type": "Cutting Machine",
    "powerSpec": {
      "voltage": "400V",
      "frequency": "50Hz",
      "phase": "3",
      "consumption": "2.2 kW"
    },
    "airSpec": {
      "consumption": "180 L/min",
      "pressure": "4 bar"
    },
    "dimensions": {
      "length": "4260mm",
      "width": "1130mm",
      "height": "1500mm"
    },
    "tags": [
      "Specialized",
      "Under-cut"
    ],
    "specifications": [
      "Location points from 27° to 45°",
      "Hydro-pneumatic saw feed",
      "Adjustable saw blade feeding speed",
      "Interior LED lighting",
      "Manual safety guard"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "EmergencyStop"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-012",
    "name": "FR-226-S",
    "description": "Automatic Copy Router Machine for precision operations",
    "imageUrl": "/images/machines/FR-226-S.jpg",
    "specPdf": "/documents/specs/FR-226-S.pdf",
    "youtubeUrl": "https://youtu.be/IAy11Z3XeZY?si=HGpR2n8R1rSZrv5V",
    "category": "processing-centers",
    "featured": false,
    "releaseDate": "2023-01-01",
    "type": "Routing Machine",
    "powerSpec": {
      "voltage": "400V",
      "frequency": "50Hz",
      "phase": "3",
      "consumption": "1.5 kW"
    },
    "airSpec": {
      "consumption": "120 L/min",
      "pressure": "4 bar"
    },
    "dimensions": {
      "length": "560mm",
      "width": "850mm",
      "height": "1470mm"
    },
    "tags": [
      "Automatic",
      "Precision"
    ],
    "specifications": [
      "Opening locks, drilling handles, hinges",
      "14,000 RPM spindle speed",
      "Hydro-pneumatic triple hole drilling",
      "Robust steel construction",
      "Spray tool lubrication system"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-013",
    "name": "NCR 300",
    "description": "4 Axis Numerical Controlled NC Router Machine - Designed for daily operations on PVC, aluminium and low alloy materials to machine four surfaces simultaneously",
    "imageUrl": "/images/machines/NCR-300.jpg",
    "specPdf": "/documents/specs/NCR-300.pdf",
    "youtubeUrl": "https://youtu.be/ThfN9iUPsnU?si=863zRTryzWJhHbgH",
    "category": "routers",
    "featured": true,
    "releaseDate": "2023-01-01",
    "type": "NC Router",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "5.5 kW"
    },
    "airSpec": {
      "consumption": "110 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "2810mm",
      "width": "1635mm",
      "height": "On request"
    },
    "weight": {
      "net": "520 kg",
      "gross": "600 kg"
    },
    "workingCapacity": {
      "x1": "300mm",
      "y1": "120mm",
      "z1": "115mm"
    },
    "spindleSpeed": "12,000 RPM",
    "spindlePower": "2.2 kW",
    "cutterBits": "Ø8 x L120 mm",
    "toolCollet": "ER 16",
    "clampingCapacity": {
      "widthMax": "120mm",
      "widthMin": "30mm",
      "heightMax": "115mm",
      "heightMin": "30mm",
      "lengthMax": "2750mm",
      "lengthMin": "400mm"
    },
    "tags": [
      "NC",
      "4-Axis",
      "Numerical Control",
      "PVC",
      "Aluminum",
      "Multi-Surface",
      "Servo Control",
      "PLC"
    ],
    "specifications": [
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
    "standardAccessories": [
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
    "optionalAccessories": [
      "Spare Ø8 x L120 carbide single lip cutter bits",
      "Spare Ø8 x L63 carbide single lip cutter bits",
      "Spare Ø8 x L120 carbide double lip cutter bits",
      "Spare ER16 collets for Ø8 mm cutter bits"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop",
      "ElectronicBraking",
      "PneumaticBraking"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-014",
    "name": "TK 505",
    "description": "Single Corner PVC Welding Machine",
    "imageUrl": "/images/machines/TK-505.jpg",
    "specPdf": "/documents/specs/TK-505.pdf",
    "youtubeUrl": "https://youtu.be/SDWJKEaAB8Y?si=X4drWLgi_Sgwmonf",
    "category": "welding-machines",
    "featured": true,
    "releaseDate": "2022-01-01",
    "type": "Welding Machine",
    "powerSpec": {
      "voltage": "230V",
      "frequency": "50Hz",
      "phase": "1",
      "consumption": "1.5 kW"
    },
    "airSpec": {
      "consumption": "90 L/min",
      "pressure": "3 bar"
    },
    "dimensions": {
      "length": "1945mm",
      "width": "745mm",
      "height": "1200mm"
    },
    "tags": [
      "PVC",
      "Welding"
    ],
    "specifications": [
      "Max profile height: 180mm",
      "Min profile height: 30mm",
      "Angle range: 30° - 180°",
      "Compact design",
      "Manual operation"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-015",
    "name": "KM-215-S",
    "description": "Semi Automatic End Milling Machine for aluminum profiles",
    "imageUrl": "/images/machines/KM-215-S.jpg",
    "specPdf": "/documents/specs/KM-215-S.pdf",
    "youtubeUrl": "https://youtu.be/VThz1mkR7o8?si=yv7IHffK1lGY4w7G",
    "category": "end-milling",
    "featured": true,
    "releaseDate": "2023-01-01",
    "type": "End Milling Machine",
    "powerSpec": {
      "voltage": "400V",
      "frequency": "50Hz",
      "phase": "3",
      "consumption": "1.2 kW"
    },
    "airSpec": {
      "consumption": "100 L/min",
      "pressure": "4 bar"
    },
    "dimensions": {
      "length": "8350mm",
      "width": "420mm",
      "height": "1500mm"
    },
    "tags": [
      "Semi-Automatic",
      "Precision"
    ],
    "specifications": [
      "Max cutter diameter: Ø160mm",
      "Profile clamping capacity: 160mm × 225mm",
      "Hydro-pneumatic system",
      "Quick tool change system"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards"
    ],
    "material": "both"
  },
  {
    "id": "ym-016",
    "name": "CRM-250-S",
    "description": "3 Spindle Copy Router Machine - 1x vertical and 2x horizontal spindle motors for complex aluminium profile operations on 3 sides without releasing",
    "imageUrl": "/images/machines/CRM-250-S.jpg",
    "specPdf": "/documents/specs/CRM-250-S.pdf",
    "youtubeUrl": "https://youtu.be/cipBYN8sKG4?si=UlU-2KoUWpvEoeRg",
    "category": "copy-routers",
    "featured": true,
    "releaseDate": "2023-01-01",
    "type": "Template Copy Router",
    "powerSpec": {
      "voltage": "220/230V",
      "frequency": "50-60Hz",
      "phase": "1",
      "consumption": "3.3 kW"
    },
    "airSpec": {
      "consumption": "24 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "2900mm",
      "width": "1260mm",
      "height": "1870mm"
    },
    "weight": {
      "net": "328 kg",
      "gross": "373 kg"
    },
    "workingCapacity": {
      "x1": "650mm",
      "x2": "350mm",
      "y1": "180mm",
      "y2": "230mm",
      "z1": "170mm",
      "z2": "150mm"
    },
    "spindleSpeed": "12,000 RPM",
    "cutterBits": "2x Ø10xL100mm / Ø5xL100mm",
    "tags": [
      "3-Spindle",
      "Multi-function",
      "Template Copy Router",
      "Aluminum",
      "PVC",
      "Heavy Duty",
      "Mass Production"
    ],
    "specifications": [
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
    "standardAccessories": [
      "1x Ø5 x L100 mm and 2x Ø10 x L100 mm cutter bits installed",
      "2x profile stops (left and right)",
      "Spray tool lubrication system",
      "2x pneumatic horizontal clamps",
      "2x pneumatic vertical clamps",
      "Air gun"
    ],
    "optionalAccessories": [
      "Spare cutter bits Ø5 x L100 mm (for copy routing)",
      "Spare cutter bits Ø10 x L100 mm (for copy routing)",
      "Spare collets for Ø5 mm cutter bit",
      "Spare collets for Ø10 mm cutter bit",
      "Special custom templates"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-017",
    "name": "ST 264",
    "description": "Automatic PVC Water Slot Machine",
    "imageUrl": "/images/machines/ST-264.jpg",
    "specPdf": "/documents/specs/ST-264.pdf",
    "youtubeUrl": "https://youtu.be/yYJ9NYoYKGI?si=P9Kfcl-1LRZVJGF1",
    "category": "processing-centers",
    "featured": false,
    "releaseDate": "2022-01-01",
    "type": "Slotting Machine",
    "powerSpec": {
      "voltage": "220V",
      "frequency": "50Hz",
      "phase": "1",
      "consumption": "0.66 kW"
    },
    "airSpec": {
      "consumption": "60 L/min",
      "pressure": "3 bar"
    },
    "dimensions": {
      "length": "610mm",
      "width": "730mm",
      "height": "1300mm"
    },
    "tags": [
      "PVC",
      "Water Slot"
    ],
    "specifications": [
      "Water slot opening process",
      "3-axis operation",
      "Adjustable water slot length and depth",
      "Speed-adjustable motor"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "EmergencyStop"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-018",
    "name": "SDT 275",
    "description": "Reinforcement Steel and Square Profile Cutting Saw",
    "imageUrl": "/images/machines/SDT-275.jpg",
    "specPdf": "/documents/specs/SDT-275.pdf",
    "youtubeUrl": "https://youtu.be/i3A8_92iNjA?si=LjXpb1R_nUuJT9qE",
    "category": "cutting-machines",
    "featured": true,
    "releaseDate": "2021-01-01",
    "type": "Cutting Machine",
    "powerSpec": {
      "voltage": "400V",
      "frequency": "50Hz",
      "phase": "3",
      "consumption": "1.8 kW"
    },
    "airSpec": {
      "consumption": "140 L/min",
      "pressure": "4 bar"
    },
    "dimensions": {
      "length": "800mm",
      "width": "900mm",
      "height": "1200mm"
    },
    "tags": [
      "Steel",
      "Reinforcement"
    ],
    "specifications": [
      "Cutting capacity: 70mm × 70mm square profile",
      "Double-speed motor (45/50 RPM)",
      "Pivoting range 45° left and right",
      "Manual material clamping"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-019",
    "name": "MK 450",
    "description": "Single Head Cutting Machine with versatile angle options",
    "imageUrl": "/images/machines/MK-450.jpg",
    "specPdf": "/documents/specs/MK-450.pdf",
    "youtubeUrl": "https://www.youtube.com/watch?v=PLACEHOLDER",
    "category": "cutting-machines",
    "featured": true,
    "releaseDate": "2021-01-01",
    "type": "Cutting Machine",
    "powerSpec": {
      "voltage": "230V",
      "frequency": "50Hz",
      "phase": "1",
      "consumption": "2.2 kW"
    },
    "airSpec": {
      "consumption": "160 L/min",
      "pressure": "4 bar"
    },
    "dimensions": {
      "length": "1500mm",
      "width": "800mm",
      "height": "1200mm"
    },
    "tags": [
      "Versatile",
      "Precision"
    ],
    "specifications": [
      "Location points at 60°, 45°, 30°, 22.5°, 15°, 0°",
      "Pivoting range from 45° left to 45° right",
      "Aluminium construction body",
      "Strong spring system and protective shield"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-020",
    "name": "RYK-420-W",
    "description": "Radial Saw Machine with ergonomic design",
    "imageUrl": "/images/machines/RYK-420-W.jpg",
    "specPdf": "/documents/specs/RYK-420-W.pdf",
    "youtubeUrl": "https://youtu.be/g_Nqd7qs6FM?si=nrCiN6ZVnoGSLJJ2",
    "category": "cutting-machines",
    "featured": false,
    "releaseDate": "2021-01-01",
    "type": "Radial Saw",
    "powerSpec": {
      "voltage": "400V",
      "frequency": "50Hz",
      "phase": "3",
      "consumption": "2.2 kW"
    },
    "airSpec": {
      "consumption": "170 L/min",
      "pressure": "4 bar"
    },
    "dimensions": {
      "length": "760mm",
      "width": "1840mm",
      "height": "1200mm"
    },
    "tags": [
      "Radial",
      "Ergonomic"
    ],
    "specifications": [
      "Pivoting range from 45° right to 60° left",
      "2.2 kW, 3,000 RPM motor",
      "Cast iron construction",
      "Laser marking for cutting line"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "EmergencyStop"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-021",
    "name": "SCM 420 L4 / SCM 420 L7",
    "description": "Servo Controlled Serial Cutting Machine - 3.6 m (L4) and 6.6 m (L7) pushing strokes with 300 mm of conveyor width",
    "imageUrl": "/images/machines/SCM-420-L4.jpg",
    "specPdf": "/documents/specs/SCM_420_L4-L7_TR_EN.pdf",
    "youtubeUrl": "https://youtu.be/OzPLbizCU0Y?si=0nkKACiAtVQnWgoh",
    "category": "cutting-machines",
    "featured": false,
    "releaseDate": "2022-01-01",
    "type": "Servo Controlled Serial Cutting Machine",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "2.2 kW"
    },
    "airSpec": {
      "consumption": "130 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "width": "1130mm",
      "length": "5250mm",
      "height": "1360mm"
    },
    "weight": {
      "net": "220 kg",
      "gross": "325 kg"
    },
    "sawBlade": {
      "diameter": "Ø420 mm",
      "bore": "Ø30/32 mm",
      "speed": "2,900 RPM",
      "motorPower": "2.2 kW"
    },
    "cuttingCapacity": {
      "pushingStroke": "3.6 m (L4) / 6.6 m (L7)",
      "conveyorWidth": "300 mm",
      "accuracy": "±0.2 mm"
    },
    "angularCapacity": {
      "automatic": "90°",
      "manualAngles": "75°, 60°, 45°, 30°, 22.5°, 15°, 90° (both left and right)"
    },
    "tags": [
      "Servo",
      "Precision",
      "Serial Cutting",
      "Touch Screen",
      "SD Card",
      "Remote Support"
    ],
    "specifications": [
      "3.6 m (SCM 420 L4) and 6.6 m (SCM 420 L7) pushing strokes with 300 of conveyor width",
      "Automatic and manual operation features",
      "Automatic serial cutting at 90°",
      "Manual cutting with location points at 75°, 60°, 45°, 30°, 22.5°, 15°, 90°, both left and right",
      "Two-hand run safety operation",
      "Hydro-pneumatic saw feed",
      "Adjustable saw blade feeding speed",
      "Turkish, English, Spanish and Russian",
      "Metric and imperial",
      "Store up to 50 different lengths",
      "Easy cutting lists transfer in CSV format with SD card",
      "7\" HMI colored touch screen monitor",
      "Preparing cutting lists manually",
      "Ability to change the cutting list on screen",
      "Problem solving with remote connection feature",
      "Units can be converted from Left to Right Hand operation",
      "Rack and pinion drive mechanism and rigid steel of construction body provide a repeatable cutting accuracy of +/- 0.2 mm providing superior pushing force for heaviest jobs",
      "Pieces are cut in the order according to the measurement data that is sent from the digital measuring rod (1.5 m, 3.0 m) (optional)"
    ],
    "standardAccessories": [
      "Equipped with saw blade Ø420 mm",
      "2x vertical clamps and 1x horizontal roller clamp",
      "Spray saw blade lubrication system",
      "Air gun"
    ],
    "optionalAccessories": [
      "Laser marker set indicating the cutting line",
      "Barcode printer",
      "Extendible digital measuring rod, 3.0 m",
      "Spare saw blade Ø420 mm",
      "VCE 1570 Chip vacuum extractor",
      "MKN 150 outfeed conveyor"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-022",
    "name": "CK 412",
    "description": "PVC Glazing Bead Saw for precise cutting",
    "imageUrl": "/images/machines/CK-412.jpg",
    "specPdf": "/documents/specs/CK-412.pdf",
    "youtubeUrl": "https://youtu.be/xXFc1Jc8m6U?si=gNbbV-Y-03xfo5Bk",
    "category": "cutting-machines",
    "featured": true,
    "releaseDate": "2021-01-01",
    "type": "Glazing Bead Saw",
    "powerSpec": {
      "voltage": "400V",
      "frequency": "50Hz",
      "phase": "3",
      "consumption": "0.24 kW"
    },
    "airSpec": {
      "consumption": "40 L/min",
      "pressure": "3 bar"
    },
    "dimensions": {
      "length": "2495mm",
      "width": "1035mm",
      "height": "1050mm"
    },
    "tags": [
      "PVC",
      "Glazing"
    ],
    "specifications": [
      "Equipped with 1x Ø200 and 1x Ø103 mm saw blades",
      "Pneumatic saw feed by pushing button",
      "Automatic return to start point",
      "2x pneumatic vertical clamps"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-023",
    "name": "DK 540",
    "description": "Four Corner PVC Welding Machine - Fully automatic four corner welding of PVC window profiles at 90°",
    "imageUrl": "/images/machines/DK-540.jpg",
    "specPdf": "/documents/specs/DK 540.pdf",
    "youtubeUrl": "https://youtu.be/gGwtxmf1_9k?si=9EWSs9j1FeCVSiRi",
    "category": "welding-machines",
    "featured": false,
    "releaseDate": "2022-01-01",
    "type": "Four Corner PVC Welding",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "8.4 kW"
    },
    "airSpec": {
      "consumption": "55 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "width": "515mm",
      "length": "450mm",
      "height": "1501mm"
    },
    "weight": {
      "net": "690 kg",
      "gross": "2079 kg"
    },
    "weldingCapacity": {
      "heightMax": "180mm",
      "heightMin": "30mm",
      "widthMax": "130mm",
      "widthMin": "30mm",
      "frameMin": "400 x 400 mm",
      "frameMax": "3,100 x 2,700 mm"
    },
    "temperatureRange": "0° - 300°C",
    "weldingOptions": "Standard (2.0 mm) or seamless (0.2 mm)",
    "tags": [
      "Four Corner",
      "PVC",
      "Welding",
      "Automatic",
      "Touch Screen",
      "Barcode"
    ],
    "specifications": [
      "Fully automatic four corner welding of PVC window profiles at 90°",
      "Welding of a complete window frame or sash in one cycle",
      "All profile related welding parameters are individually programmable",
      "Parameters are set easily by means of 8\" LCD colour touch screen",
      "Automatic line can be set by combining with Cooling Unit (SA 251), Corner Cleaning Machine (CNC 609-611) and Rotating Robot (SA 261)",
      "Automatically setting the standard (2.0 mm) or seamless (0.2 mm) welding options",
      "Long-period of teflon usage thanks to the teflon roller system",
      "Automatically discharging of the frames after welding operation",
      "Saving of time by means of practical mould change system",
      "Adjusting the heat between 0 - 300°C via electronic thermocouple",
      "Minimum welding measurement: 400 x 400 mm",
      "Maximum welding measurement: 3.100 x 2.700 mm",
      "Memory capacity to save up programs of 900 different profiles",
      "Operator safety barrier",
      "Barcode scanner"
    ],
    "standardAccessories": [
      "1 set of sash welding mould according to 70 mm of profile height",
      "1 set of adaptor for frame profile",
      "Manual greasing pump"
    ],
    "optionalAccessories": [
      "Welding fixture set for lame sash",
      "Special welding moulds on demand",
      "CS 240 gasket pressing system"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop",
      "OperatorSafetyBarrier"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-024",
    "name": "CA 603",
    "description": "PVC Corner Cleaning Machine (4 Cutters) - High quality stripping and cleaning operations by means of the hydro-pneumatic system with 4 different cutter sets",
    "imageUrl": "/images/machines/CA-603.jpg",
    "specPdf": "/documents/specs/CA 603.pdf",
    "youtubeUrl": "https://youtu.be/cbCvF9Phsq0?si=0rEsbv8tX9XrD82H",
    "category": "cleaning-machines",
    "featured": false,
    "releaseDate": "2022-01-01",
    "type": "PVC Corner Cleaning Machine (4 Cutters)",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "2.4 kW"
    },
    "airSpec": {
      "consumption": "48 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "2405mm",
      "width": "1525mm",
      "height": "1295mm"
    },
    "weight": {
      "net": "226 kg",
      "gross": "273 kg"
    },
    "sawBlade": {
      "diameter": "Ø210 mm",
      "bore": "Ø32 mm",
      "speed": "3,000 RPM"
    },
    "clampingCapacity": {
      "heightMax": "180mm",
      "heightMin": "50mm",
      "widthMax": "130mm",
      "widthMin": "30mm"
    },
    "frameCapacity": {
      "minOuter30": "350 x 350 mm (W: 30mm profiles)",
      "minOuter60": "380 x 380 mm (W: 60mm profiles)"
    },
    "tags": [
      "Corner Cleaning",
      "4 Cutters",
      "PLC",
      "PVC",
      "Hydro-Pneumatic"
    ],
    "specifications": [
      "High quality stripping and cleaning operations by means of the hydro-pneumatic system",
      "Processing capability for max. profile dimension: W: 130 - H: 180 mm",
      "Processing capability for min. profile dimension: W: 30 - H: 50 mm",
      "Min. outer frame sizes according to W: 30 and W: 60 mm of profile width L: 350 x L: 350 mm and L: 380 x L: 380 mm",
      "Stripping blade levels are adjustable according to laminated and unlaminated profiles",
      "Pneumatically working serial blade changing function that makes working easier",
      "Fixing the workpiece firmly by means of the vertical and horizontal clamps",
      "Stops automatically after stripping and cleaning operation",
      "PLC operation system",
      "Centring system to fit the profiles properly on the setsquare",
      "Robust machine stand",
      "Processing capability of 4 different PVC profiles",
      "4 different cutter sets can be mounted on both blocks"
    ],
    "standardAccessories": [
      "Corner cleaning cutter set",
      "Profile support table with brushed",
      "Air gun"
    ],
    "optionalAccessories": [
      "Cleaning cutter for colored profiles",
      "V type of cleaning cutter for white profiles"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-025",
    "name": "KD 305",
    "description": "Mitre Saw Machine with manual operation",
    "imageUrl": "/images/machines/KD-305.jpg",
    "specPdf": "/documents/specs/KD-305.pdf",
    "youtubeUrl": "https://youtu.be/zaLEsyS-fo8?si=Ole803MbU5SXmBbT",
    "category": "cutting-machines",
    "featured": true,
    "releaseDate": "2020-01-01",
    "type": "Mitre Saw",
    "powerSpec": {
      "voltage": "230V",
      "frequency": "50Hz",
      "phase": "1",
      "consumption": "0.74 kW"
    },
    "airSpec": {
      "consumption": "50 L/min",
      "pressure": "3 bar"
    },
    "dimensions": {
      "length": "840mm",
      "width": "700mm",
      "height": "670mm"
    },
    "tags": [
      "Manual",
      "Precision"
    ],
    "specifications": [
      "Location points at 45°, 30°, 22.5°, 15°, 0° both left and right",
      "Pivoting range from 45° left to 45° right",
      "Aluminium construction body",
      "Ø305 mm saw blade not included"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "both"
  },
  {
    "id": "ym-026",
    "name": "KD-350-PS",
    "description": "Mitre Saw Machine with pneumatic system",
    "imageUrl": "/images/machines/KD-350-PS.jpg",
    "specPdf": "/documents/specs/KD-350-PS.pdf",
    "youtubeUrl": "https://youtu.be/YIGYIfwFeys?si=QSiOXsi_RoxEr_OR",
    "category": "cutting-machines",
    "featured": false,
    "releaseDate": "2020-01-01",
    "type": "Mitre Saw",
    "powerSpec": {
      "voltage": "230V",
      "frequency": "50Hz",
      "phase": "3",
      "consumption": "2.2 kW"
    },
    "airSpec": {
      "consumption": "120 L/min",
      "pressure": "4 bar"
    },
    "dimensions": {
      "length": "760mm",
      "width": "720mm",
      "height": "1570mm"
    },
    "tags": [
      "Pneumatic",
      "Precision"
    ],
    "specifications": [
      "Location points at 45°, 30°, 22.5°, 15°, 0° both left and right",
      "Pivoting range from 45° left to 45° right",
      "2x pneumatic horizontal clamps",
      "Spray saw blade lubrication system"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "EmergencyStop"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-027",
    "name": "KD-350-M",
    "description": "Compact Mitre Saw Machine",
    "imageUrl": "/images/machines/KD-350-M.jpg",
    "specPdf": "/documents/specs/KD-350-M.pdf",
    "youtubeUrl": "https://youtu.be/YIGYIfwFeys?si=6dQKo94HM9KD94_1",
    "category": "cutting-machines",
    "featured": false,
    "releaseDate": "2020-01-01",
    "type": "Mitre Saw",
    "powerSpec": {
      "voltage": "400V",
      "frequency": "50Hz",
      "phase": "3",
      "consumption": "2.2 kW"
    },
    "airSpec": {
      "consumption": "110 L/min",
      "pressure": "4 bar"
    },
    "dimensions": {
      "length": "760mm",
      "width": "820mm",
      "height": "785mm"
    },
    "tags": [
      "Compact",
      "Portable"
    ],
    "specifications": [
      "Location points at 45°, 30°, 22.5°, 15°, 0° both left and right",
      "Pivoting range from 45° left to 45° right",
      "Ø350 mm saw blade included",
      "2x manual horizontal clamps"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-028",
    "name": "FR 223",
    "description": "Portable Template Copy Router",
    "imageUrl": "/images/machines/FR-223.jpg",
    "specPdf": "/documents/specs/FR-223.pdf",
    "youtubeUrl": "https://youtu.be/nMbHEJgK5Jg?si=VvBWWNUAnJqJNwmt",
    "modelPath": "/models/demo-machine.glb",
    "category": "processing-centers",
    "featured": true,
    "releaseDate": "2021-01-01",
    "type": "Copy Router",
    "powerSpec": {
      "voltage": "230V",
      "frequency": "50Hz",
      "phase": "1",
      "consumption": "0.75 kW"
    },
    "airSpec": {
      "consumption": "70 L/min",
      "pressure": "3 bar"
    },
    "dimensions": {
      "length": "520mm",
      "width": "590mm",
      "height": "465mm"
    },
    "tags": [
      "Portable",
      "Template"
    ],
    "specifications": [
      "Working area: 270mm × 110mm × 110mm",
      "14,000 RPM spindle speed",
      "2x manual horizontal clamps",
      "Electroplated copy template included"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "both"
  },
  {
    "id": "ym-029",
    "name": "FR-223-S",
    "description": "Portable Template Copy Router with spray cooling",
    "imageUrl": "/images/machines/FR-223-S.jpg",
    "specPdf": "/documents/specs/FR-223-S.pdf",
    "youtubeUrl": "https://www.youtube.com/watch?v=PLACEHOLDER",
    "modelPath": "/models/demo-machine.glb",
    "category": "processing-centers",
    "featured": false,
    "releaseDate": "2021-01-01",
    "type": "Copy Router",
    "powerSpec": {
      "voltage": "230V",
      "frequency": "50Hz",
      "phase": "1",
      "consumption": "0.75 kW"
    },
    "airSpec": {
      "consumption": "80 L/min",
      "pressure": "3 bar"
    },
    "dimensions": {
      "length": "520mm",
      "width": "590mm",
      "height": "465mm"
    },
    "tags": [
      "Portable",
      "Cooling System"
    ],
    "specifications": [
      "Working area: 270mm × 110mm × 110mm",
      "Electrically working spray cooling system",
      "14,000 RPM spindle speed",
      "2x manual horizontal clamps"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "both"
  },
  {
    "id": "ym-030",
    "name": "FR 222",
    "description": "Economical Portable Template Copy Router",
    "imageUrl": "/images/machines/FR-222.jpg",
    "specPdf": "/documents/specs/FR-222.pdf",
    "youtubeUrl": "https://www.youtube.com/watch?v=PLACEHOLDER",
    "modelPath": "/models/FR-222.glb",
    "category": "processing-centers",
    "featured": true,
    "releaseDate": "2020-01-01",
    "type": "Copy Router",
    "powerSpec": {
      "voltage": "230V",
      "frequency": "50Hz",
      "phase": "1",
      "consumption": "1.2 kW"
    },
    "airSpec": {
      "consumption": "90 L/min",
      "pressure": "3 bar"
    },
    "dimensions": {
      "length": "485mm",
      "width": "680mm",
      "height": "400mm"
    },
    "tags": [
      "Economical",
      "Portable"
    ],
    "specifications": [
      "Ø5 router bit included",
      "Electroplated copy template",
      "Cast aluminium structure",
      "2x horizontal clamps"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-031",
    "name": "KM-211-S",
    "description": "Manual End Milling Machine with pneumatic clamps",
    "imageUrl": "/images/machines/KM-211-S.jpg",
    "specPdf": "/documents/specs/KM-211-S.pdf",
    "youtubeUrl": "https://youtu.be/esqIqnukjBQ?si=jQPewW9VCLEvUU97",
    "category": "end-milling",
    "featured": false,
    "releaseDate": "2020-01-01",
    "type": "End Milling Machine",
    "powerSpec": {
      "voltage": "400V",
      "frequency": "50Hz",
      "phase": "3",
      "consumption": "1.2 kW"
    },
    "airSpec": {
      "consumption": "110 L/min",
      "pressure": "4 bar"
    },
    "dimensions": {
      "length": "740mm",
      "width": "440mm",
      "height": "1160mm"
    },
    "tags": [
      "Manual",
      "Pneumatic"
    ],
    "specifications": [
      "Max cutter diameter: Ø170mm",
      "Profile clamping capacity: 160mm × 150mm",
      "2x pneumatic horizontal clamps",
      "1x pneumatic vertical clamp"
    ],
    "certifications": [
      "CE"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-034",
    "name": "KD 400 D / KD 400 PS",
    "description": "Single Head Mitre Saw Machine - Location points at 45° - 30° - 22.5° - 15° - 0° both left and right",
    "imageUrl": "/images/machines/KD-400-D.jpg",
    "specPdf": "/documents/specs/KD 400 D - 400 PS.pdf",
    "youtubeUrl": "https://www.youtube.com/watch?v=PLACEHOLDER",
    "category": "cutting-machines",
    "featured": true,
    "releaseDate": "2020-01-01",
    "type": "Single Head Mitre Saw",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "2.2 kW"
    },
    "airSpec": {
      "consumption": "24 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "width": "860mm",
      "length": "760mm",
      "height": "1600mm"
    },
    "weight": {
      "net": "110 kg",
      "gross": "137 kg"
    },
    "sawBlade": {
      "diameter": "Ø400 mm",
      "bore": "Ø30/32 mm",
      "speed": "2,900 RPM",
      "motorPower": "2.2 kW"
    },
    "angularCapacity": {
      "presetAngles": "45°, 30°, 22.5°, 15°, 0° (both left and right)",
      "pivotingRange": "45° left to 45° right infinitely adjustable"
    },
    "tags": [
      "Single Head",
      "Mitre Saw",
      "Manual",
      "Pneumatic"
    ],
    "specifications": [
      "Location points at 45° - 30° - 22.5° - 15° - 0° both left and right",
      "Pivoting range from 45° left to 45° right infinitely adjustable",
      "Aluminium construction of the body and machine stand made of steel sheet",
      "Robust mechanical construction enables the ease of adjustment for the requested cutting angles",
      "Strong spring system and protective shield"
    ],
    "standardAccessories": [
      "Ø400 mm saw blade",
      "Machine stand",
      "2x manual horizontal clamps (KD 400 D)",
      "2x pneumatic horizontal clamps (KD 400 PS)",
      "Air gun (KD 400 PS)",
      "Spray saw blade lubrication system (KD 400 PS)"
    ],
    "optionalAccessories": [
      "2 x pneumatic vertical clamps (KD 400 PS)",
      "MKN 300 length stop-right (3m)",
      "MKN 300 length stop-left (3m)",
      "DKN 302 length stop (3m)",
      "DKN 602 length stop (6m)",
      "Spare saw blade, Ø 400 mm",
      "Brake unit working with motor stop button (KD 400 PS)"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "EmergencyStop"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-035",
    "name": "MK 420 / MK 420 PS / MK 450",
    "description": "Manual Up-Cutting Saw Machine - Manual upward saw stroke for wide and flat profiles",
    "imageUrl": "/images/machines/MK-420.jpg",
    "specPdf": "/documents/specs/MK 420 - 420 PS - 450 (1).pdf",
    "youtubeUrl": "https://www.youtube.com/watch?v=PLACEHOLDER",
    "category": "cutting-machines",
    "featured": true,
    "releaseDate": "2021-01-01",
    "type": "Manual Up-Cutting Saw",
    "powerSpec": {
      "voltage": "230V AC",
      "frequency": "50-60Hz",
      "phase": "1",
      "consumption": "2.2 kW"
    },
    "airSpec": {
      "consumption": "7 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "width": "725mm",
      "length": "865mm",
      "height": "1350mm"
    },
    "weight": {
      "net": "115 kg",
      "gross": "142 kg"
    },
    "sawBlade": {
      "diameter": "Ø420 mm",
      "bore": "Ø30/32 mm",
      "speed": "2,900 RPM",
      "motorPower": "2.2 kW"
    },
    "angularCapacity": {
      "presetAngles": "60°, 45°, 30°, 22.5°, 15°, 0° (both left and right)",
      "pivotingRange": "60° to the right and 60° to the left"
    },
    "tags": [
      "Up-Cutting",
      "Manual",
      "Wide Angle",
      "Portable"
    ],
    "specifications": [
      "Manual upward saw stroke",
      "The back fence is adjustable to allow the most effective use of the saw blade capacity for wide and flat profiles",
      "Location points at 60°, 45°, 30°, 22.5°, 15°, 0° for both left and right",
      "Wide angle cutting range up to 60° to the right and 60° to the left",
      "Adjustable machine working direction by means of rotatable (360°) platform via foot pedal",
      "Easy saw blade change",
      "It has the ability of lateral and longitudinal cutting operations"
    ],
    "standardAccessories": [
      "Equipped with saw blade Ø420 mm",
      "Equipped with saw blade Ø 450 mm (MK 450)",
      "Miter stop",
      "Profile length stop",
      "Pneumatically working spray saw blade lubrication system (MK 420 PS)",
      "Electrically working spray saw blade lubrication system (MK 420- MK 450)",
      "2x mechanic top clamps (MK 420)",
      "2x pneumatic top clamps (MK 420 PS)",
      "Safety guard for lateral cutting operations (MK 420 PS)"
    ],
    "optionalAccessories": [
      "Safety guard for longitudinal cutting operations (MK 420 PS)",
      "2 x vertical clamps",
      "MKN 300 length stop (3m)",
      "Connection kit for MKN and DKN length stops",
      "Spare saw blade, Ø420 mm",
      "Spare saw blade, Ø450 mm (MK 450)"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "EmergencyStop"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-036",
    "name": "TK 503",
    "description": "Single Corner PVC Welding Machine - All parameters such as melting time, welding time and welding pressure are set independently",
    "imageUrl": "/images/machines/TK-503.jpg",
    "specPdf": "/documents/specs/TK 503.pdf",
    "youtubeUrl": "https://www.youtube.com/watch?v=PLACEHOLDER",
    "category": "welding-machines",
    "featured": true,
    "releaseDate": "2022-01-01",
    "type": "Single Corner PVC Welding",
    "powerSpec": {
      "voltage": "230V AC",
      "frequency": "50-60Hz",
      "phase": "1",
      "consumption": "1.5 kW"
    },
    "airSpec": {
      "consumption": "20 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "19150mm",
      "width": "600mm",
      "height": "1400mm"
    },
    "weight": {
      "net": "113 kg",
      "gross": "128 kg"
    },
    "weldingCapacity": {
      "heightMax": "165mm",
      "heightMin": "30mm",
      "widthMax": "130mm",
      "widthMin": "30mm",
      "angleRange": "30° - 180°"
    },
    "temperatureRange": "0° - 300°C",
    "weldingOptions": "Standard (2.0 mm) or seamless (0.2 mm)",
    "tags": [
      "Single Corner",
      "PVC",
      "Welding",
      "Portable"
    ],
    "specifications": [
      "All parameters such as melting time, welding time and welding pressure are set independently",
      "User friendly with the features of cleaning the plates and replacing teflon very easily and quickly",
      "Practical adjustment of standard (2.0 mm) or seamless (0.2 mm) welding options manually",
      "Thanks to the profile support arms, long profiles can be easily welded",
      "Profile support arms are supplied as standard in both directions",
      "Adjusting the heat between 0 - 300°C by means of the electronic thermostat",
      "Saving of time thanks to the practical mold change feature",
      "Enable the welding of all angles between 30°- 180° infinitely adjustable",
      "Automatically start and finish the welding cycle",
      "Welding possibility of profiles up to H:165 mm of high",
      "Clamping the profiles separately via foot pedal",
      "Portable machine stand"
    ],
    "standardAccessories": [
      "Electrical foot pedal",
      "Profile support arms"
    ],
    "optionalAccessories": [
      "Special welding molds"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-037",
    "name": "VK 420",
    "description": "V-Notch and Arrow Cutting Machine - Designed to precisely cut PVC profiles in V notch or arrow shapes",
    "imageUrl": "/images/machines/VK-300.jpg",
    "specPdf": "/documents/specs/VK 300.pdf",
    "youtubeUrl": "https://www.youtube.com/watch?v=PLACEHOLDER",
    "category": "cutting-machines",
    "featured": false,
    "releaseDate": "2021-01-01",
    "type": "V-Notch and Arrow Cutting Machine",
    "powerSpec": {
      "voltage": "380V AC",
      "frequency": "50Hz",
      "phase": "3",
      "consumption": "2.2 kW",
      "amperage": "5A"
    },
    "airSpec": {
      "consumption": "20 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "2290mm",
      "width": "1090mm",
      "height": "1420mm"
    },
    "weight": {
      "net": "240 kg"
    },
    "sawBlade": {
      "diameter": "Ø300 mm",
      "bore": "Ø30-32 mm",
      "speed": "3,000 RPM"
    },
    "cuttingCapacity": {
      "heightMax": "65mm",
      "widthMax": "130mm"
    },
    "tags": [
      "V-Notch",
      "Arrow Cut",
      "Twin Saw",
      "Precision"
    ],
    "specifications": [
      "Performs the V-shaped notches and arrow-shaped cutting on sash and mullion profiles before welding operations",
      "Twin saw blade design",
      "Pneumatic saw feed by pushing two-hand button",
      "Automatic return to start point of the process",
      "Ability to cut 6 different V shaped notches without mechanical set-up thanks to the mechanical memory system",
      "Machine construction is designed as per minimum cut-off size",
      "Two-hand operation control",
      "Easily adjustable, V-notch depth or complete arrow cut",
      "2 x pneumatic horizontal profile vise",
      "Adjustable saw feed speed",
      "Max capacity: H 65 mm / W 130 mm",
      "Performs V and Arrow cutting operations up to 65 mm profile height",
      "Safe operation is ensured with the top cover",
      "V cutting process is completed in one step and arrow cutting process is completed in two steps"
    ],
    "standardAccessories": [
      "Equipped with 2 x Ø 300 mm saw",
      "Profile support conveyor",
      "8 and 22 key",
      "Air gun"
    ],
    "optionalAccessories": [
      "Spare saw blade, Ø300mm"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "EmergencyStop"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-038",
    "name": "CA 601",
    "description": "Semi-Automatic PVC Corner Cleaning Machine - High quality stripping and cleaning operations by means of the hydro-pneumatic system",
    "imageUrl": "/images/machines/CA-601.jpg",
    "specPdf": "/documents/specs/CA 601.pdf",
    "youtubeUrl": "https://youtu.be/qnCphTUy0qs?si=K81XL4fG81yDbsZk",
    "category": "cleaning-machines",
    "featured": true,
    "releaseDate": "2022-01-01",
    "type": "Semi-Automatic Corner Cleaning",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "1 kW"
    },
    "airSpec": {
      "consumption": "36 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "2405mm",
      "width": "1375mm",
      "height": "1255mm"
    },
    "weight": {
      "net": "165 kg",
      "gross": "210 kg"
    },
    "sawBlade": {
      "diameter": "Ø215 mm",
      "bore": "Ø32 mm",
      "speed": "3,000 RPM"
    },
    "clampingCapacity": {
      "heightMax": "180mm",
      "heightMin": "30mm",
      "widthMax": "130mm",
      "widthMin": "30mm"
    },
    "frameCapacity": {
      "minInner": "350 x 350 mm (W: 30mm profiles)",
      "minOuter": "380 x 380 mm (W: 60mm profiles)"
    },
    "tags": [
      "Corner Cleaning",
      "Semi-Automatic",
      "PLC",
      "PVC"
    ],
    "specifications": [
      "Min. inner and outer frame sizes according to W: 30 and W: 60 mm of profile width L: 350 x L: 350 mm and L: 380 x L: 380 mm",
      "High quality stripping and cleaning operations by means of the hydro-pneumatic system",
      "Stripping blade levels are adjustable according to laminated and unlaminated profiles",
      "Pneumatically working serial blade changing function that makes working easier",
      "Fixing the workpiece firmly by means of the vertical and horizontal clamps",
      "Processing capability for max. profile dimension: W: 130 - H: 180 mm",
      "Processing capability for min. profile dimension: W: 30 - H: 30 mm",
      "Centring system to fit the profiles properly on the setsquare",
      "Automatic start up feature when profile placed on the table",
      "Stops automatically after stripping and cleaning operation",
      "Single or multi cleaning operations can be processed",
      "Robust machine stand",
      "PLC control system"
    ],
    "standardAccessories": [
      "Profile support table with brushed",
      "Air gun"
    ],
    "optionalAccessories": [
      "Special corner cleaning cutter set",
      "Cleaning cutter for colored profiles",
      "V type of cleaning cutter for white profiles"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "EmergencyStop"
    ],
    "material": "pvc"
  },
  {
    "id": "ym-039",
    "name": "DC 550 PB",
    "description": "Full Automatic Double Head Mitre Saw Machine - Designed for the strait or angular cutting operations of large size of profiles made of PVC and aluminium materials",
    "imageUrl": "/images/machines/DC-550-PB.jpg",
    "specPdf": "/documents/specs/DC 550 PB.pdf",
    "youtubeUrl": "https://youtu.be/s48cmGhtHhI?si=c6yjBdp9sO1w3ZjH",
    "category": "cutting-machines",
    "featured": true,
    "releaseDate": "2022-01-01",
    "type": "Full Automatic Double Head Mitre Saw",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "5 kW"
    },
    "airSpec": {
      "consumption": "165 L/min",
      "pressure": "6-8 bar"
    },
    "dimensions": {
      "length": "5090mm",
      "width": "1850mm",
      "height": "1210mm"
    },
    "weight": {
      "net": "1200 kg",
      "gross": "1415 kg"
    },
    "sawBlade": {
      "diameter": "Ø550 mm",
      "bore": "Ø30-32 mm",
      "speed": "2,900 RPM",
      "motorPower": "5 kW"
    },
    "angularCapacity": {
      "tilting": "90° and 45° inward (automatic)",
      "pivotingRange": "45° inwards and 22.5° outwards",
      "compound": "Automatic slicing at 90° and 45° inward"
    },
    "cuttingCapacity": {
      "accuracy": "±0.2 mm"
    },
    "tags": [
      "Double Head",
      "Automatic",
      "Touch Screen",
      "Windows PC",
      "Barcode",
      "Remote Support"
    ],
    "specifications": [
      "Designed for the strait or angular cutting operations of large size of profiles made of PVC and aluminium materials",
      "Double head sawing units equipped with Ø 550 mm of saw blades",
      "Two-hand run safety operation",
      "Automatic positioning of the heads between 45° inwards and 22.5° outwards by the computer control",
      "Hydro-pneumatic saw feed",
      "Cutting accuracy +/- 0.2 mm",
      "2 x pneumatic profile supports",
      "Automatic slicing feature at 90° and 45° inward",
      "Windows based industrial PC and 15\" LCD touch screen colour monitor",
      "Facility to transfer the cutting list at 'mdb' and 'csv' formats via USB and network",
      "Obtains profile cutting dimensions and angles from the cut list while working in automatic mode",
      "Remote connection via internet and providing technical support",
      "Barcode printer & image print"
    ],
    "standardAccessories": [
      "Equipped with saw blades 2x Ø 550 mm",
      "Roller conveyor & 2x pneumatic profile supports",
      "Spray saw blade lubrication system",
      "Barcode printer",
      "4x horizontal clamps",
      "2x vertical clamps",
      "Air gun"
    ],
    "optionalAccessories": [
      "Machine with the length of 5m and 6m",
      "Short cut system (DKN 60 with digital unit)",
      "VCE 1570 Chip vacuum extractor",
      "Chip removal conveyor",
      "DLG100-DLG200-DLG300 digital length gauge",
      "Arrow cut system for mullion profiles (DKN 80)"
    ],
    "certifications": [
      "CE",
      "ISO9001"
    ],
    "safetyFeatures": [
      "TwoHandOperation",
      "AutomaticGuards",
      "EmergencyStop"
    ],
    "material": "aluminium"
  },
  {
    "id": "ym-040",
    "name": "SKN 301",
    "description": "Conveyor for aluminium & PVC profile fabrication. (YILMAZ model SKN 301 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115645/TCAT01000003891.jpg",
    "specPdf": "/documents/specs/SKN-301.pdf",
    "category": "conveying",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Conveyor",
    "powerSpec": {
      "voltage": "---",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "3120mm",
      "width": "510mm",
      "height": "300mm"
    },
    "tags": [
      "Conveyor",
      "Both",
      "New"
    ],
    "specifications": [
      "Conveyor (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "81.0 kg"
    }
  },
  {
    "id": "ym-041",
    "name": "VCE 3500",
    "description": "Swarf / Chip Extractor for PVC profile fabrication. (YILMAZ model VCE 3500 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2026/06/04230324/0084511052026142654IMG.jpg",
    "specPdf": "/documents/specs/VCE-3500.pdf",
    "category": "swarf-extraction",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Swarf / Chip Extractor",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "On request",
      "width": "On request",
      "height": "On request"
    },
    "tags": [
      "Swarf",
      "Pvc",
      "New"
    ],
    "specifications": [
      "Swarf / Chip Extractor for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": []
  },
  {
    "id": "ym-042",
    "name": "VCE 4000",
    "description": "Swarf / Chip Extractor for aluminium & PVC profile fabrication. (YILMAZ model VCE 4000 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/11/03113706/0075328102025162156IMG.jpg",
    "specPdf": "/documents/specs/VCE-4000.pdf",
    "category": "swarf-extraction",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Swarf / Chip Extractor",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "On request",
      "width": "On request",
      "height": "On request"
    },
    "tags": [
      "Swarf",
      "Both",
      "New"
    ],
    "specifications": [
      "Swarf / Chip Extractor (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": []
  },
  {
    "id": "ym-043",
    "name": "VCE 1570",
    "description": "Swarf / Chip Extractor for aluminium profile fabrication. (YILMAZ model VCE 1570 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/11/03113711/0077328102025172153IMG.png",
    "specPdf": "/documents/specs/VCE-1570.pdf",
    "category": "swarf-extraction",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Swarf / Chip Extractor",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "2030mm",
      "width": "840mm",
      "height": "On request"
    },
    "tags": [
      "Swarf",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "Swarf / Chip Extractor for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": []
  },
  {
    "id": "ym-044",
    "name": "AIM 7420",
    "description": "CNC Profile Machining Center for aluminium profile fabrication. (YILMAZ model AIM 7420 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115150/TCAT01000000391.jpg",
    "specPdf": "/documents/specs/AIM-7420.pdf",
    "category": "processing-centers",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "CNC Profile Machining Center",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "18.0 kW"
    },
    "dimensions": {
      "length": "8850mm",
      "width": "1800mm",
      "height": "2750mm"
    },
    "tags": [
      "CNC",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "CNC Profile Machining Center for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "250.0 L/min",
      "pressure": "6-8 bar"
    }
  },
  {
    "id": "ym-045",
    "name": "AIM 4420",
    "description": "CNC Profile Machining Center for aluminium profile fabrication. (YILMAZ model AIM 4420 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115316/TCAT01000000261.jpg",
    "specPdf": "/documents/specs/AIM-4420.pdf",
    "category": "processing-centers",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "CNC Profile Machining Center",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "18.0 kW"
    },
    "dimensions": {
      "length": "5900mm",
      "width": "1800mm",
      "height": "2750mm"
    },
    "tags": [
      "CNC",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "CNC Profile Machining Center for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "250.0 L/min",
      "pressure": "6-8 bar"
    },
    "weight": {
      "net": "2.85 kg"
    }
  },
  {
    "id": "ym-046",
    "name": "WGM 202",
    "description": "PVC Corner Cleaning Machine for PVC profile fabrication. (YILMAZ model WGM 202 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/11/03113627/0074828102025161837IMG.jpg",
    "specPdf": "/documents/specs/WGM-202.pdf",
    "category": "cleaning",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "PVC Corner Cleaning Machine",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "On request",
      "width": "On request",
      "height": "On request"
    },
    "tags": [
      "PVC",
      "Pvc",
      "New"
    ],
    "specifications": [
      "PVC Corner Cleaning Machine for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": []
  },
  {
    "id": "ym-047",
    "name": "MCA 801",
    "description": "Reinforcement Screwdriving Machine for PVC profile fabrication. (YILMAZ model MCA 801 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25120033/0040421082024160630IMG.png",
    "specPdf": "/documents/specs/MCA-801.pdf",
    "category": "screwdriving",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Reinforcement Screwdriving Machine",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "On request",
      "width": "On request",
      "height": "On request"
    },
    "tags": [
      "Reinforcement",
      "Pvc",
      "New"
    ],
    "specifications": [
      "Reinforcement Screwdriving Machine for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": []
  },
  {
    "id": "ym-048",
    "name": "SM 201 SD",
    "description": "Reinforcement Screwdriving Machine for PVC profile fabrication. (YILMAZ model SM 201 SD — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25120012/0032722042024132446IMG.jpg",
    "specPdf": "/documents/specs/SM-201-SD.pdf",
    "category": "screwdriving",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Reinforcement Screwdriving Machine",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "On request",
      "width": "On request",
      "height": "On request"
    },
    "tags": [
      "Reinforcement",
      "Pvc",
      "New"
    ],
    "specifications": [
      "Reinforcement Screwdriving Machine for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "100.0 kg"
    }
  },
  {
    "id": "ym-049",
    "name": "KP 130 CNC",
    "description": "Corner Crimping Press for aluminium profile fabrication. (YILMAZ model KP 130 CNC — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2022/12/17165600/KP130CNC_1.png",
    "specPdf": "/documents/specs/KP-130-CNC.pdf",
    "category": "corner-crimping",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Corner Crimping Press",
    "powerSpec": {
      "voltage": "220-230V 50 Hz",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "0.15 kW"
    },
    "dimensions": {
      "length": "1600mm",
      "width": "2340mm",
      "height": "On request"
    },
    "tags": [
      "Corner",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "Corner Crimping Press for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "580.0 kg"
    }
  },
  {
    "id": "ym-050",
    "name": "PIM 6508 SE",
    "description": "CNC Profile Machining Center for PVC profile fabrication. (YILMAZ model PIM 6508 SE — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/11/10180128/0066711072025171420IMG.jpg",
    "specPdf": "/documents/specs/PIM-6508-SE.pdf",
    "category": "processing-centers",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "CNC Profile Machining Center",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "On request",
      "width": "On request",
      "height": "On request"
    },
    "tags": [
      "CNC",
      "Pvc",
      "New"
    ],
    "specifications": [
      "CNC Profile Machining Center for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": []
  },
  {
    "id": "ym-051",
    "name": "GAS 301",
    "description": "Assembly Table / Station for aluminium & PVC profile fabrication. (YILMAZ model GAS 301 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2024/06/06171039/GAS-301-1-scaled.webp",
    "specPdf": "/documents/specs/GAS-301.pdf",
    "category": "assembling",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Assembly Table / Station",
    "powerSpec": {
      "voltage": "--",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "3050mm",
      "width": "900mm",
      "height": "24000mm"
    },
    "tags": [
      "Assembly",
      "Both",
      "New"
    ],
    "specifications": [
      "Assembly Table / Station (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "610.0 kg"
    }
  },
  {
    "id": "ym-052",
    "name": "CNC 611",
    "description": "PVC Corner Cleaning Machine for PVC profile fabrication. (YILMAZ model CNC 611 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2024/06/14151511/cnc-609-6011-8.webp",
    "specPdf": "/documents/specs/CNC-611.pdf",
    "category": "cleaning",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "PVC Corner Cleaning Machine",
    "powerSpec": {
      "voltage": "400V AC 3P PE 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "3.85 kW"
    },
    "dimensions": {
      "length": "2400mm",
      "width": "2310mm",
      "height": "1770mm"
    },
    "tags": [
      "PVC",
      "Pvc",
      "New"
    ],
    "specifications": [
      "PVC Corner Cleaning Machine for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "180.0 L/min",
      "pressure": "6-8 BAR"
    }
  },
  {
    "id": "ym-053",
    "name": "CPM 4150 S",
    "description": "CNC Profile Machining Center for aluminium profile fabrication. (YILMAZ model CPM 4150 S — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2024/06/06171619/CPM-4150-scaled.webp",
    "specPdf": "/documents/specs/CPM-4150-S.pdf",
    "category": "processing-centers",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "CNC Profile Machining Center",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "5550mm",
      "width": "3340mm",
      "height": "On request"
    },
    "tags": [
      "CNC",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "CNC Profile Machining Center for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "80.0 L/min",
      "pressure": "6-8 bar"
    },
    "weight": {
      "net": "2.01 kg"
    }
  },
  {
    "id": "ym-054",
    "name": "MKN 150 / 300 / 301",
    "description": "Conveyor for aluminium & PVC profile fabrication. (YILMAZ model MKN 150 / 300 / 301 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2026/03/05130059/0081302032026095231IMG.png",
    "specPdf": "/documents/specs/MKN-150-300-301.pdf",
    "category": "conveying",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Conveyor",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "On request",
      "width": "On request",
      "height": "On request"
    },
    "tags": [
      "Conveyor",
      "Both",
      "New"
    ],
    "specifications": [
      "Conveyor (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": []
  },
  {
    "id": "ym-055",
    "name": "RS 1000",
    "description": "Profile Transport Cart for aluminium & PVC profile fabrication. (YILMAZ model RS 1000 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115723/TCAT01000008841.png",
    "specPdf": "/documents/specs/RS-1000.pdf",
    "category": "transport",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Profile Transport Cart",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "On request",
      "width": "On request",
      "height": "On request"
    },
    "tags": [
      "Profile",
      "Both",
      "New"
    ],
    "specifications": [
      "Profile Transport Cart (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": []
  },
  {
    "id": "ym-056",
    "name": "PWB 4100",
    "description": "Assembly Table / Station for aluminium & PVC profile fabrication. (YILMAZ model PWB 4100 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25120654/0045730012025104642IMG.png",
    "specPdf": "/documents/specs/PWB-4100.pdf",
    "category": "assembling",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Assembly Table / Station",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "3250mm",
      "width": "2200mm",
      "height": "On request"
    },
    "tags": [
      "Assembly",
      "Both",
      "New"
    ],
    "specifications": [
      "Assembly Table / Station (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": []
  },
  {
    "id": "ym-057",
    "name": "CNC 609",
    "description": "PVC Corner Cleaning Machine for PVC profile fabrication. (YILMAZ model CNC 609 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2024/06/14151511/cnc-609-6011-8.webp",
    "specPdf": "/documents/specs/CNC-609.pdf",
    "category": "cleaning",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "PVC Corner Cleaning Machine",
    "powerSpec": {
      "voltage": "400V AC 3P PE 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "2400mm",
      "width": "2310mm",
      "height": "1770mm"
    },
    "tags": [
      "PVC",
      "Pvc",
      "New"
    ],
    "specifications": [
      "PVC Corner Cleaning Machine for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "180.0 L/min",
      "pressure": "6-8 Bar"
    }
  },
  {
    "id": "ym-058",
    "name": "NSM 352 / NSM 353",
    "description": "Assembly Table / Station for PVC profile fabrication. (YILMAZ model NSM 352 / NSM 353 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25120121/0038905072024103454IMG.png",
    "specPdf": "/documents/specs/NSM-352-NSM-353.pdf",
    "category": "assembling",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Assembly Table / Station",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "3450mm",
      "width": "2000mm",
      "height": "On request"
    },
    "tags": [
      "Assembly",
      "Pvc",
      "New"
    ],
    "specifications": [
      "Assembly Table / Station for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": []
  },
  {
    "id": "ym-059",
    "name": "PC 4000",
    "description": "Profile Transport Cart for aluminium & PVC profile fabrication. (YILMAZ model PC 4000 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2026/06/04230517/0084611052026145722IMG.jpg",
    "specPdf": "/documents/specs/PC-4000.pdf",
    "category": "transport",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Profile Transport Cart",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "4000mm",
      "width": "855mm",
      "height": "On request"
    },
    "tags": [
      "Profile",
      "Both",
      "New"
    ],
    "specifications": [
      "Profile Transport Cart (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "201.5 kg"
    }
  },
  {
    "id": "ym-060",
    "name": "PYE 101 / 102 / 103 / 104",
    "description": "Punch Press for aluminium profile fabrication. (YILMAZ model PYE 101 / 102 / 103 / 104 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115630/TCAT01000003551.jpg",
    "specPdf": "/documents/specs/PYE-101-102-103-104.pdf",
    "category": "pressing",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Punch Press",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "250mm",
      "width": "220mm",
      "height": "On request"
    },
    "tags": [
      "Punch",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "Punch Press for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "8.0 kg"
    }
  },
  {
    "id": "ym-061",
    "name": "RT 1000",
    "description": "Assembly Table / Station for aluminium & PVC profile fabrication. (YILMAZ model RT 1000 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115702/TCAT01000007701.png",
    "specPdf": "/documents/specs/RT-1000.pdf",
    "category": "assembling",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Assembly Table / Station",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "700mm",
      "width": "1400mm",
      "height": "On request"
    },
    "tags": [
      "Assembly",
      "Both",
      "New"
    ],
    "specifications": [
      "Assembly Table / Station (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "45.0 kg"
    }
  },
  {
    "id": "ym-062",
    "name": "WB 4000",
    "description": "Assembly Table / Station for aluminium & PVC profile fabrication. (YILMAZ model WB 4000 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115148/TCAT01000008741.jpg",
    "specPdf": "/documents/specs/WB-4000.pdf",
    "category": "assembling",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Assembly Table / Station",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "3250mm",
      "width": "2200mm",
      "height": "On request"
    },
    "tags": [
      "Assembly",
      "Both",
      "New"
    ],
    "specifications": [
      "Assembly Table / Station (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": []
  },
  {
    "id": "ym-063",
    "name": "GPT 1000",
    "description": "Profile Transport Cart for aluminium & PVC profile fabrication. (YILMAZ model GPT 1000 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115648/TCAT01000008731.png",
    "specPdf": "/documents/specs/GPT-1000.pdf",
    "category": "transport",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Profile Transport Cart",
    "powerSpec": {
      "voltage": "--",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "1500mm",
      "width": "990mm",
      "height": "On request"
    },
    "tags": [
      "Profile",
      "Both",
      "New"
    ],
    "specifications": [
      "Profile Transport Cart (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "80.0 kg"
    }
  },
  {
    "id": "ym-064",
    "name": "PT 1000",
    "description": "Profile Transport Cart for aluminium & PVC profile fabrication. (YILMAZ model PT 1000 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115912/0046118032025134934IMG.jpg",
    "specPdf": "/documents/specs/PT-1000.pdf",
    "category": "transport",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Profile Transport Cart",
    "powerSpec": {
      "voltage": "--",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "1500mm",
      "width": "990mm",
      "height": "On request"
    },
    "tags": [
      "Profile",
      "Both",
      "New"
    ],
    "specifications": [
      "Profile Transport Cart (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "50.0 kg"
    }
  },
  {
    "id": "ym-065",
    "name": "PT 2000",
    "description": "Profile Transport Cart for aluminium & PVC profile fabrication. (YILMAZ model PT 2000 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115910/0037903062024101256IMG.png",
    "specPdf": "/documents/specs/PT-2000.pdf",
    "category": "transport",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Profile Transport Cart",
    "powerSpec": {
      "voltage": "--",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "1540mm",
      "width": "1740mm",
      "height": "On request"
    },
    "tags": [
      "Profile",
      "Both",
      "New"
    ],
    "specifications": [
      "Profile Transport Cart (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "140.0 kg"
    }
  },
  {
    "id": "ym-066",
    "name": "HP 1000",
    "description": "Profile Transport Cart for aluminium & PVC profile fabrication. (YILMAZ model HP 1000 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115700/TCAT01000008851.png",
    "specPdf": "/documents/specs/HP-1000.pdf",
    "category": "transport",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Profile Transport Cart",
    "powerSpec": {
      "voltage": "--",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "1600mm",
      "width": "990mm",
      "height": "On request"
    },
    "tags": [
      "Profile",
      "Both",
      "New"
    ],
    "specifications": [
      "Profile Transport Cart (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "60.0 kg"
    }
  },
  {
    "id": "ym-067",
    "name": "VP 1000",
    "description": "Profile Transport Cart for aluminium & PVC profile fabrication. (YILMAZ model VP 1000 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115706/TCAT01000008861.png",
    "specPdf": "/documents/specs/VP-1000.pdf",
    "category": "transport",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Profile Transport Cart",
    "powerSpec": {
      "voltage": "--",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "1500mm",
      "width": "990mm",
      "height": "On request"
    },
    "tags": [
      "Profile",
      "Both",
      "New"
    ],
    "specifications": [
      "Profile Transport Cart (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "60.0 kg"
    }
  },
  {
    "id": "ym-068",
    "name": "VP 2000",
    "description": "Profile Transport Cart for aluminium & PVC profile fabrication. (YILMAZ model VP 2000 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115725/TCAT01000007881.png",
    "specPdf": "/documents/specs/VP-2000.pdf",
    "category": "transport",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Profile Transport Cart",
    "powerSpec": {
      "voltage": "--",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "1500mm",
      "width": "1980mm",
      "height": "On request"
    },
    "tags": [
      "Profile",
      "Both",
      "New"
    ],
    "specifications": [
      "Profile Transport Cart (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "120.0 kg"
    }
  },
  {
    "id": "ym-069",
    "name": "GT 1000",
    "description": "Profile Transport Cart for aluminium & PVC profile fabrication. (YILMAZ model GT 1000 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115622/TCAT01000007691.png",
    "specPdf": "/documents/specs/GT-1000.pdf",
    "category": "transport",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Profile Transport Cart",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "On request",
      "width": "On request",
      "height": "On request"
    },
    "tags": [
      "Profile",
      "Both",
      "New"
    ],
    "specifications": [
      "Profile Transport Cart (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": []
  },
  {
    "id": "ym-070",
    "name": "WAS 1000",
    "description": "Profile Transport Cart for aluminium & PVC profile fabrication. (YILMAZ model WAS 1000 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115139/TCAT01000008751.png",
    "specPdf": "/documents/specs/WAS-1000.pdf",
    "category": "transport",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Profile Transport Cart",
    "powerSpec": {
      "voltage": "--",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "3000mm",
      "width": "650mm",
      "height": "On request"
    },
    "tags": [
      "Profile",
      "Both",
      "New"
    ],
    "specifications": [
      "Profile Transport Cart (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "81.0 kg"
    }
  },
  {
    "id": "ym-071",
    "name": "KP 110",
    "description": "Corner Crimping Press for aluminium profile fabrication. (YILMAZ model KP 110 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115608/TCAT01000002581.jpg",
    "specPdf": "/documents/specs/KP-110.pdf",
    "category": "corner-crimping",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Corner Crimping Press",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "1950mm",
      "width": "1230mm",
      "height": "1310mm"
    },
    "tags": [
      "Corner",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "Corner Crimping Press for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "25.0 L/min",
      "pressure": "7-10 Bar"
    },
    "weight": {
      "net": "320.0 kg"
    }
  },
  {
    "id": "ym-072",
    "name": "CRM 201 S",
    "description": "Copy Router / Milling Machine for PVC profile fabrication. (YILMAZ model CRM 201 S — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115329/TCAT01000001031.jpg",
    "specPdf": "/documents/specs/CRM-201-S.pdf",
    "category": "milling",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Copy Router / Milling Machine",
    "powerSpec": {
      "voltage": "230V AC 1P+N+PE / 50/60Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "2.2 kW"
    },
    "dimensions": {
      "length": "2540mm",
      "width": "705mm",
      "height": "On request"
    },
    "tags": [
      "Copy",
      "Pvc",
      "New"
    ],
    "specifications": [
      "Copy Router / Milling Machine for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "24.0 L/min",
      "pressure": "6-8 bar"
    },
    "weight": {
      "net": "130.0 kg"
    }
  },
  {
    "id": "ym-073",
    "name": "MEM 128",
    "description": "End Milling / Notching Machine for PVC profile fabrication. (YILMAZ model MEM 128 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2021/04/17145137/MEM-128.png",
    "specPdf": "/documents/specs/MEM-128.pdf",
    "category": "end-milling",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "End Milling / Notching Machine",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "0.15 kW"
    },
    "dimensions": {
      "length": "1300mm",
      "width": "700mm",
      "height": "14350mm"
    },
    "tags": [
      "End",
      "Pvc",
      "New"
    ],
    "specifications": [
      "End Milling / Notching Machine for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "9.0 L/min",
      "pressure": "6-8 bar"
    },
    "weight": {
      "net": "255.0 kg"
    }
  },
  {
    "id": "ym-074",
    "name": "CPM 6161",
    "description": "CNC Profile Machining Center for aluminium profile fabrication. (YILMAZ model CPM 6161 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115159/TCAT01000000971.jpg",
    "specPdf": "/documents/specs/CPM-6161.pdf",
    "category": "processing-centers",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "CNC Profile Machining Center",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "8070mm",
      "width": "2670mm",
      "height": "1920mm"
    },
    "tags": [
      "CNC",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "CNC Profile Machining Center for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "280.0 L/min",
      "pressure": "6-8 bar"
    },
    "weight": {
      "net": "2.661 kg"
    }
  },
  {
    "id": "ym-075",
    "name": "AIM 7510",
    "description": "CNC Profile Machining Center for aluminium profile fabrication. (YILMAZ model AIM 7510 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2021/04/17145121/aim-7510_6.png",
    "specPdf": "/documents/specs/AIM-7510.pdf",
    "category": "processing-centers",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "CNC Profile Machining Center",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "15.0 kW"
    },
    "dimensions": {
      "length": "9720mm",
      "width": "2010mm",
      "height": "2200mm"
    },
    "tags": [
      "CNC",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "CNC Profile Machining Center for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "250.0 L/min",
      "pressure": "6-8 bar"
    },
    "weight": {
      "net": "4.49 kg"
    }
  },
  {
    "id": "ym-076",
    "name": "SM 201",
    "description": "Reinforcement Screwdriving Machine for PVC profile fabrication. (YILMAZ model SM 201 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115321/TCAT01000006691.png",
    "specPdf": "/documents/specs/SM-201.pdf",
    "category": "screwdriving",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Reinforcement Screwdriving Machine",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "2300mm",
      "width": "620mm",
      "height": "On request"
    },
    "tags": [
      "Reinforcement",
      "Pvc",
      "New"
    ],
    "specifications": [
      "Reinforcement Screwdriving Machine for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "100.0 kg"
    }
  },
  {
    "id": "ym-077",
    "name": "SM 206",
    "description": "Reinforcement Screwdriving Machine for PVC profile fabrication. (YILMAZ model SM 206 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2021/03/01100656/0086431082026141050IMG.webp",
    "specPdf": "/documents/specs/SM-206.pdf",
    "category": "screwdriving",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Reinforcement Screwdriving Machine",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "5220mm",
      "width": "1500mm",
      "height": "1900mm"
    },
    "tags": [
      "Reinforcement",
      "Pvc",
      "New"
    ],
    "specifications": [
      "Reinforcement Screwdriving Machine for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "415.0 kg"
    }
  },
  {
    "id": "ym-078",
    "name": "SKN 300-600",
    "description": "Conveyor for aluminium & PVC profile fabrication. (YILMAZ model SKN 300-600 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115645/TCAT01000003891.jpg",
    "specPdf": "/documents/specs/SKN-300-600.pdf",
    "category": "conveying",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Conveyor",
    "powerSpec": {
      "voltage": "230V AC 1P+N+PE / 50/60Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "0.3 kW"
    },
    "dimensions": {
      "length": "3050mm",
      "width": "540mm",
      "height": "3050mm"
    },
    "tags": [
      "Conveyor",
      "Both",
      "New"
    ],
    "specifications": [
      "Conveyor (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "130.0 kg"
    }
  },
  {
    "id": "ym-079",
    "name": "DKN 302-602",
    "description": "Conveyor for aluminium & PVC profile fabrication. (YILMAZ model DKN 302-602 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25120001/TCAT01000008051.jpg",
    "specPdf": "/documents/specs/DKN-302-602.pdf",
    "category": "conveying",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Conveyor",
    "powerSpec": {
      "voltage": "---",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "3120mm",
      "width": "510mm",
      "height": "On request"
    },
    "tags": [
      "Conveyor",
      "Both",
      "New"
    ],
    "specifications": [
      "Conveyor (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "81.0 kg"
    }
  },
  {
    "id": "ym-080",
    "name": "HDL 400 / HDL 700",
    "description": "Conveyor for aluminium & PVC profile fabrication. (YILMAZ model HDL 400 / HDL 700 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115748/TCAT01000007931.png",
    "specPdf": "/documents/specs/HDL-400-HDL-700.pdf",
    "category": "conveying",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Conveyor",
    "powerSpec": {
      "voltage": "230V AC 1P+N+PE / 50/60Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "1.6 kW"
    },
    "dimensions": {
      "length": "4150mm",
      "width": "850mm",
      "height": "700mm"
    },
    "tags": [
      "Conveyor",
      "Both",
      "New"
    ],
    "specifications": [
      "Conveyor (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "185.0 kg"
    }
  },
  {
    "id": "ym-081",
    "name": "KD 400 M",
    "description": "Cutting Machine for aluminium profile fabrication. (YILMAZ model KD 400 M — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115555/TCAT01000002251.jpg",
    "specPdf": "/documents/specs/KD-400-M.pdf",
    "category": "cutting",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Cutting Machine",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "2.2 kW"
    },
    "dimensions": {
      "length": "760mm",
      "width": "860mm",
      "height": "830mm"
    },
    "tags": [
      "Cutting",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "Cutting Machine for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "71.0 kg"
    }
  },
  {
    "id": "ym-082",
    "name": "KD 350 D",
    "description": "Cutting Machine for PVC profile fabrication. (YILMAZ model KD 350 D — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115431/0063226062025144112IMG.png",
    "specPdf": "/documents/specs/KD-350-D.pdf",
    "category": "cutting",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Cutting Machine",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "2.2 kW"
    },
    "dimensions": {
      "length": "760mm",
      "width": "720mm",
      "height": "1570mm"
    },
    "tags": [
      "Cutting",
      "Pvc",
      "New"
    ],
    "specifications": [
      "Cutting Machine for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": []
  },
  {
    "id": "ym-083",
    "name": "KY 305",
    "description": "Cutting Machine for aluminium & PVC profile fabrication. (YILMAZ model KY 305 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2021/03/17145132/KY-305.png",
    "specPdf": "/documents/specs/KY-305.pdf",
    "category": "cutting",
    "material": "both",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Cutting Machine",
    "powerSpec": {
      "voltage": "230V AC 1P+N+PE / 50Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "0.75 kW"
    },
    "dimensions": {
      "length": "840mm",
      "width": "700mm",
      "height": "On request"
    },
    "tags": [
      "Cutting",
      "Both",
      "New"
    ],
    "specifications": [
      "Cutting Machine (shared for aluminium & PVC lines)"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "26.0 kg"
    }
  },
  {
    "id": "ym-084",
    "name": "DC 550 SKH",
    "description": "Cutting Machine for aluminium profile fabrication. (YILMAZ model DC 550 SKH — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2021/03/17145020/550-SKH.png",
    "specPdf": "/documents/specs/DC-550-SKH.pdf",
    "category": "cutting",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Cutting Machine",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "8.5 kW"
    },
    "dimensions": {
      "length": "5090mm",
      "width": "1850mm",
      "height": "1720mm"
    },
    "tags": [
      "Cutting",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "Cutting Machine for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "160.0 L/min",
      "pressure": "6-8 bar"
    },
    "weight": {
      "net": "1.202 kg"
    }
  },
  {
    "id": "ym-085",
    "name": "RYK 420 S",
    "description": "Cutting Machine for aluminium profile fabrication. (YILMAZ model RYK 420 S — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115126/TCAT01000008871.png",
    "specPdf": "/documents/specs/RYK-420-S.pdf",
    "category": "cutting",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Cutting Machine",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "2.2 kW"
    },
    "dimensions": {
      "length": "760mm",
      "width": "1840mm",
      "height": "1590mm"
    },
    "tags": [
      "Cutting",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "Cutting Machine for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "24.0 L/min",
      "pressure": "6-8 bar"
    },
    "weight": {
      "net": "202.0 kg"
    }
  },
  {
    "id": "ym-086",
    "name": "SDT 280",
    "description": "Cutting Machine for PVC profile fabrication. (YILMAZ model SDT 280 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/11/03113714/0076528102025162816IMG.jpg",
    "specPdf": "/documents/specs/SDT-280.pdf",
    "category": "cutting",
    "material": "pvc",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Cutting Machine",
    "powerSpec": {
      "voltage": "400V AC",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "On request"
    },
    "dimensions": {
      "length": "4110mm",
      "width": "2000mm",
      "height": "On request"
    },
    "tags": [
      "Cutting",
      "Pvc",
      "New"
    ],
    "specifications": [
      "Cutting Machine for pvc profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "weight": {
      "net": "900.0 kg"
    }
  },
  {
    "id": "ym-087",
    "name": "SNM 560 SRV",
    "description": "End Milling / Notching Machine for aluminium profile fabrication. (YILMAZ model SNM 560 SRV — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2021/03/17145013/snm-560.png",
    "specPdf": "/documents/specs/SNM-560-SRV.pdf",
    "category": "end-milling",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "End Milling / Notching Machine",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "10.2 kW"
    },
    "dimensions": {
      "length": "3000mm",
      "width": "1600mm",
      "height": "1900mm"
    },
    "tags": [
      "End",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "End Milling / Notching Machine for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "160.0 L/min",
      "pressure": "6-8 bar"
    },
    "weight": {
      "net": "1.2 kg"
    }
  },
  {
    "id": "ym-088",
    "name": "SNM 560 M",
    "description": "End Milling / Notching Machine for aluminium profile fabrication. (YILMAZ model SNM 560 M — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115746/0045508012025110735IMG-scaled.jpg",
    "specPdf": "/documents/specs/SNM-560-M.pdf",
    "category": "end-milling",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "End Milling / Notching Machine",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "3.0 kW"
    },
    "dimensions": {
      "length": "3000mm",
      "width": "1600mm",
      "height": "1900mm"
    },
    "tags": [
      "End",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "End Milling / Notching Machine for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "160.0 L/min",
      "pressure": "6-8 bar"
    },
    "weight": {
      "net": "1.18 kg"
    }
  },
  {
    "id": "ym-089",
    "name": "SK 500 D",
    "description": "Cutting Machine for aluminium profile fabrication. (YILMAZ model SK 500 D — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115907/TCAT01000007481.png",
    "specPdf": "/documents/specs/SK-500-D.pdf",
    "category": "cutting",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Cutting Machine",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "5.5 kW"
    },
    "dimensions": {
      "length": "4720mm",
      "width": "1340mm",
      "height": "2000mm"
    },
    "tags": [
      "Cutting",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "Cutting Machine for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "150.0 L/min",
      "pressure": "6-8 bar"
    }
  },
  {
    "id": "ym-090",
    "name": "SK 500",
    "description": "Cutting Machine for aluminium profile fabrication. (YILMAZ model SK 500 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115418/TCAT01000003731.jpg",
    "specPdf": "/documents/specs/SK-500.pdf",
    "category": "cutting",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Cutting Machine",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "5.0 kW"
    },
    "dimensions": {
      "length": "4720mm",
      "width": "1340mm",
      "height": "1380mm"
    },
    "tags": [
      "Cutting",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "Cutting Machine for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "150.0 L/min",
      "pressure": "6-8 bar"
    },
    "weight": {
      "net": "540.0 kg"
    }
  },
  {
    "id": "ym-091",
    "name": "ACK 700",
    "description": "Cutting Machine for aluminium profile fabrication. (YILMAZ model ACK 700 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2025/07/25115315/TCAT01000005451.jpg",
    "specPdf": "/documents/specs/ACK-700.pdf",
    "category": "cutting",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Cutting Machine",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "4.0 kW"
    },
    "dimensions": {
      "length": "4590mm",
      "width": "1520mm",
      "height": "1600mm"
    },
    "tags": [
      "Cutting",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "Cutting Machine for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "180.0 L/min",
      "pressure": "6-8 bar"
    },
    "weight": {
      "net": "500.0 kg"
    }
  },
  {
    "id": "ym-092",
    "name": "ACK 550",
    "description": "Cutting Machine for aluminium profile fabrication. (YILMAZ model ACK 550 — specifications on request.)",
    "imageUrl": "https://di33l1fv68t4r.cloudfront.net/wp-content/uploads/2026/06/04230431/0083106052026161606IMG.png",
    "specPdf": "/documents/specs/ACK-550.pdf",
    "category": "cutting",
    "material": "aluminium",
    "featured": false,
    "releaseDate": "2026-10-17",
    "type": "Cutting Machine",
    "powerSpec": {
      "voltage": "400V AC 3P+PE / 50/60 Hz.",
      "frequency": "50-60Hz",
      "phase": "3",
      "consumption": "4.0 kW"
    },
    "dimensions": {
      "length": "4540mm",
      "width": "1250mm",
      "height": "On request"
    },
    "tags": [
      "Cutting",
      "Aluminium",
      "New"
    ],
    "specifications": [
      "Cutting Machine for aluminium profile fabrication"
    ],
    "certifications": [],
    "safetyFeatures": [],
    "airSpec": {
      "consumption": "160.0 L/min",
      "pressure": "6-8 bar"
    },
    "weight": {
      "net": "376.0 kg"
    }
  }
];

