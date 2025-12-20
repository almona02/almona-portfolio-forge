import { v4 as uuidv4 } from 'uuid';
import type { MachiningZone } from '@/components/fabricator/smartscan/MachiningZoneEditor';
import { autoConfigureFromDXF, type DXFImportData, type AutoConfigOptions } from './autoConfigFromDXF';

interface BuildPackInput {
  name: string;
  profiles: Array<{
    id: string;
    name?: string;
    widthMm?: number;
    heightMm?: number;
    role?: string;
    fileName?: string;
    thickness?: number;
    areaMm2?: number;
    perimeterMm?: number;
    weightKgPerM?: number;
    isThermalBreak?: boolean;
    svgPreview?: string;
  }>;
  hardware?: any[];
  machiningZones?: MachiningZone[];
  windowType?: 'sliding' | 'casement' | 'tilt_turn' | 'fixed' | 'sliding_door';
}

export function buildCustomSystemPack(input: BuildPackInput) {
  const packId = `custom-pack-${uuidv4()}`;
  const windowType = input.windowType || 'sliding';
  
  // Auto-configure each profile if dimensions are available
  const configuredProfiles = input.profiles.map((p) => {
    if (p.widthMm && p.heightMm && p.role) {
      const dxfData: DXFImportData = {
        widthMm: p.widthMm,
        heightMm: p.heightMm,
        areaMm2: p.areaMm2,
        perimeterMm: p.perimeterMm,
        weightKgPerM: p.weightKgPerM,
        isThermalBreak: p.isThermalBreak,
        svgPreview: p.svgPreview,
      };
      
      const autoConfigOptions: AutoConfigOptions = {
        role: (p.role as any) || 'frame',
        windowType,
        systemPack: packId,
        materialThickness: p.thickness,
      };
      
      const autoConfig = autoConfigureFromDXF(dxfData, autoConfigOptions);
      
      return {
        id: p.id,
        name: p.name || p.fileName || 'Profile',
        role: p.role || 'unknown',
        width_mm: p.widthMm,
        height_mm: p.heightMm,
        // Include auto-configured specs
        kFactor: autoConfig.kFactor,
        cuttingRules: autoConfig.cuttingRules,
        glazingConfig: autoConfig.glazingConfig,
        geometryConfig: autoConfig.geometryConfig,
        structuralConfig: autoConfig.structuralConfig,
        machiningZones: autoConfig.machiningZones || [],
      };
    }
    
    // Fallback for profiles without dimensions
    return {
      id: p.id,
      name: p.name || p.fileName || 'Profile',
      role: p.role || 'unknown',
      width_mm: p.widthMm,
      height_mm: p.heightMm,
    };
  });
  
  return {
    meta: {
      id: packId,
      name: input.name || 'Custom System Pack',
      brands: ['Custom'],
      regions: ['egypt', 'global'],
      defaultStockLengthMm: 6000,
      hardware: input.hardware || [],
      machiningZones: input.machiningZones || [],
    },
    windowSystemSpec: {
      window_system: input.name || 'Custom System',
      window_type: windowType,
      profiles_cutting_list: configuredProfiles,
      // Include auto-configured system-wide settings
      auto_configured: true,
      auto_config_date: new Date().toISOString(),
    },
  };
}

