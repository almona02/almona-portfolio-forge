import { v4 as uuidv4 } from 'uuid';
import type { MachiningZone } from '@/components/fabricator/smartscan/MachiningZoneEditor';

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
  }>;
  hardware?: any[];
  machiningZones?: MachiningZone[];
}

export function buildCustomSystemPack(input: BuildPackInput) {
  const packId = `custom-pack-${uuidv4()}`;
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
      profiles_cutting_list: input.profiles.map((p) => ({
        id: p.id,
        name: p.name || p.fileName || 'Profile',
        role: p.role || 'unknown',
        width_mm: p.widthMm,
        height_mm: p.heightMm,
      })),
    },
  };
}

