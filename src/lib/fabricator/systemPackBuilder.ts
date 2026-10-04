import type { MachiningZone } from '@/components/fabricator/smartscan/MachiningZoneEditor';
import type { Profile } from '@/types/fabricator';
import { v4 as uuidv4 } from 'uuid';
import { autoConfigureFromDXF, type AutoConfigOptions, type DXFImportData } from './autoConfigFromDXF';

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

function toEngineProfile(
  packId: string,
  p: BuildPackInput['profiles'][number],
): Profile {
  const role = (p.role || 'frame') as NonNullable<Profile['profileRole']>;
  const width = p.widthMm ?? 60;
  return {
    id: p.id,
    name: p.name || p.fileName || 'Profile',
    material: 'aluminum',
    width,
    height: p.heightMm ?? width,
    thickness: p.thickness ?? 1.8,
    color: '#C0C0C0',
    costPerMeter: 0,
    cuttingAllowance: 3,
    stockQuantity: 0,
    minStockLevel: 0,
    maxStockLevel: 1000,
    supplier: 'Custom',
    systemBrand: 'Custom',
    weightPerMeter: p.weightKgPerM,
    profileRole: role,
    systemPackIds: [packId],
    barLength: 6000,
    specifications: {
      partNumber: p.id,
      catalog_sourced: false,
      starter_profile: true,
    },
  };
}

/** Manual starter pack: frame + sash without DXF. Operator edits dimensions later. */
export function buildStarterSystemPack(name: string) {
  const stamp = Date.now();
  return buildCustomSystemPack({
    name: name.trim() || 'Custom Workshop Pack',
    windowType: 'sliding',
    profiles: [
      {
        id: `frame-${stamp}`,
        name: 'Frame Profile',
        role: 'frame',
        widthMm: 60,
        heightMm: 60,
        thickness: 1.8,
        weightKgPerM: 1.3,
      },
      {
        id: `sash-${stamp}`,
        name: 'Sash Profile',
        role: 'sash',
        widthMm: 72,
        heightMm: 72,
        thickness: 1.6,
        weightKgPerM: 1.2,
      },
    ],
  });
}

export function buildCustomSystemPack(input: BuildPackInput) {
  const packId = `custom-pack-${uuidv4()}`;
  const windowType = input.windowType || 'sliding';

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
        kFactor: autoConfig.kFactor,
        cuttingRules: autoConfig.cuttingRules,
        glazingConfig: autoConfig.glazingConfig,
        geometryConfig: autoConfig.geometryConfig,
        structuralConfig: autoConfig.structuralConfig,
        machiningZones: autoConfig.machiningZones || [],
      };
    }

    return {
      id: p.id,
      name: p.name || p.fileName || 'Profile',
      role: p.role || 'unknown',
      fileName: p.fileName,
      width_mm: p.widthMm,
      height_mm: p.heightMm,
      areaMm2: p.areaMm2,
      perimeterMm: p.perimeterMm,
      weightKgPerM: p.weightKgPerM,
      isThermalBreak: p.isThermalBreak,
      svgPreview: p.svgPreview,
    };
  });

  // Engine-ready Profile[] — required for design/BOM (not only cutting_list JSON)
  const engineProfiles = input.profiles.map((p) => toEngineProfile(packId, p));

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
    profiles: engineProfiles,
    windowSystemSpec: {
      window_system: input.name || 'Custom System',
      window_type: windowType,
      profiles_cutting_list: configuredProfiles,
      auto_configured: true,
      auto_config_date: new Date().toISOString(),
    },
  };
}
