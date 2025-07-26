export type { 
  Machine, 
  Part, 
  Profile, 
  PowerSpecification, 
  Certification, 
  SafetyStandard,
  MachineCategory
} from '../types';

// Import the Profile type directly for use in the arrays
import type { Profile } from '../types';

// Import the new typed machines
export { yilmazMachines } from './yilmazMachines';

// Legacy interfaces for backward compatibility
interface LegacyProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  featured?: boolean;
  releaseDate: string;
  tags?: string[];
}

interface LegacyMachine extends LegacyProduct {
  type: string;
  power: string;
  dimensions: string;
  specifications: string[];
  specPdf?: string;
  youtubeUrl?: string;
}

interface LegacyPart extends LegacyProduct {
  partNumber: string;
  compatibility: string[];
  specifications: string[];
}

// Simplified legacy machines for components that haven't been updated yet
export const yilmazMachinesLegacy: LegacyMachine[] = [
  {
    id: "ym-001",
    name: "YILMAZ ALM6510",
    description: "High-precision CNC cutting and processing machine for aluminum profiles",
    imageUrl: "/images/machines/cutting-machine.jpg",
    specPdf: "/documents/specs/cnc-cutting-machine.pdf",
    youtubeUrl: "https://www.youtube.com/watch?v=CeGDjE9QCqQ",
    category: "machines",
    featured: true,
    releaseDate: "2023-05-15",
    type: "CNC Cutting and Processing Center",
    power: "32.0 kW",
    dimensions: "7500 × 2200 × 1800 mm",
    tags: ["New", "TOP TECHNOLOGY"],
    specifications: [
      "Cutting accuracy: ±0.1mm",
      "Max cutting length: 6500mm",
      "Programmable cutting angles"
    ]
  },
  {
    id: "ym-002",
    name: "YILMAZ DC-421-PBS",
    description: "High-precision Double Head cutting machine for aluminum profiles",
    imageUrl: "/images/machines/DC-421-PBS.jpg",
    specPdf: "/documents/specs/cnc-cutting-machine.pdf",
    youtubeUrl: "https://www.youtube.com/watch?v=1B5elf1hDG4",
    category: "machines",
    featured: true,
    releaseDate: "2012-05-10",
    type: "Double Head Cutting Machine",
    power: "32.0 kW",
    dimensions: "4000 × 2200 × 1800 mm",
    tags: ["New", "Best Sales"],
    specifications: [
      "Cutting accuracy: ±0.1mm",
      "Max cutting length: 6500mm",
      "Programmable cutting angles"
    ]
  },
  {
    id: "ym-003",
    name: "YILMAZ DK502",
    description: "High-Quality Double Head Welding machine for UPVC profiles",
    imageUrl: "/images/machines/DK-502.jpg",
    specPdf: "/documents/specs/DK-502.pdf",
    youtubeUrl: "https://youtu.be/jOLX0XMXC9A?si=U6F-JPhfUVARqUx1",
    category: "machines",
    featured: true,
    releaseDate: "2012-05-10",
    type: "Double Head WELDING Machine",
    power: "2.2 kW",
    dimensions: "3500 × 1200 × 1800 mm",
    tags: ["New", "Best Sales"],
    specifications: [
      "Machine is ideal for welding process of PVC plastic profiles at two corners.",
      "Practical setting of standard (2 mm) or seamless (0.2 mm for free of flashes) welding options",
      "Max welding square is 3530 mm"
    ]
  }
];

export const yilmazParts: LegacyPart[] = [
  {
    id: "yp-001",
    name: "YILMAZ Cutting Blade",
    description: "High-quality cutting blade compatible with YILMAZ cutting machines.",
    imageUrl: "/images/parts/cutting-blade.jpg",
    category: "parts",
    featured: true,
    releaseDate: "2023-06-01",
    partNumber: "CB-1001",
    compatibility: ["YILMAZ ALM6510", "YILMAZ DC-421-PBS"],
    specifications: [
      "Material: High-speed steel",
      "Diameter: 300mm",
      "Thickness: 3mm"
    ]
  },
  {
    id: "yp-002",
    name: "YILMAZ Welding Electrode",
    description: "Durable welding electrode for YILMAZ welding machines.",
    imageUrl: "/images/parts/welding-electrode.jpg",
    category: "parts",
    featured: false,
    releaseDate: "2023-05-20",
    partNumber: "WE-2002",
    compatibility: ["YILMAZ DK502"],
    specifications: [
      "Material: Copper coated",
      "Length: 300mm",
      "Diameter: 2.5mm"
    ]
  },
   {
    id: "yp-003",
    name: "YILMAZ Saw Blade Ø420mm",
    description: "High-quality saw blade for cutting machines.",
    imageUrl: "/images/parts/saw-blade-420.jpg",
    category: "parts",
    featured: false,
    releaseDate: "2023-01-15",
    partNumber: "SB-420-01",
    compatibility: ["YILMAZ DC 421 PSD", "YILMAZ ACK 420 S"],
    specifications: [
      "Diameter: 420mm",
      "Bore: 30-32mm",
      "Material: Carbide-tipped",
      "Max RPM: 2900"
    ]
  },
  {
    id: "yp-004",
    name: "YILMAZ Router Bit Ø5xL80mm",
    description: "Precision router bit for copy routing operations.",
    imageUrl: "/images/parts/router-bit-5mm.jpg",
    category: "parts",
    featured: true,
    releaseDate: "2023-02-10",
    partNumber: "RB-5-80-01",
    compatibility: ["YILMAZ FR 226 S", "YILMAZ NCR 300"],
    specifications: [
      "Diameter: 5mm",
      "Length: 80mm",
      "Material: High-speed steel",
      "Max RPM: 14000"
    ]
  }
];

export const alfapenProfiles: Profile[] = [
  {
    id: "ap-001",
    name: "ALFAPEN Window System",
    description: "High-performance UPVC window profiles",
    imageUrl: "/images/profiles/window-system.jpg",
    category: "windows",
    material: "UPVC",
    color: "White",
    applications: ["Residential", "Commercial"],
    releaseDate: "2022-11-10",
    featured: true,
    tags: ["UPVC", "Energy Efficient"]
  }, 
   {
    id: "ap-002",
    name: "ALFAPEN Door System",
    description: "High-performance UPVC door profiles",
    imageUrl: "/images/profiles/door-system.jpg",
    category: "doors",
    material: "UPVC",
    color: "White",
    applications: ["Residential", "Commercial"],
    releaseDate: "2023-03-15",
    featured: true,
    tags: ["UPVC", "Durable"]
  }

];

