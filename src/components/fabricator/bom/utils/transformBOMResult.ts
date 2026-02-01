import { BOMData } from '@/components/fabricator/bom/BOMSidebar';
import type { FabricationData, Profile } from '@/types/fabricator';

// Simplified types based on usage
interface WorkerResult {
  profiles: FabricationData['profiles'];
  glazing: FabricationData['glazing'];
  hardware: FabricationData['hardware'];
  cost: {
    materialCost: number;
    laborCost: number;
    hardwareCost: number;
    glazingCost: number;
    accessoriesCost: number;
    totalCost: number;
  };
}

export function transformWorkerResultToBOMData(
  result: WorkerResult,
  systemPack: any,
  _t: (key: string, defaultVal?: string) => string
): BOMData {
  const { profiles, glazing, cost } = result;

  // 1. Categorize Profiles
  const componentsByCategory: BOMData['componentsByCategory'] = {
    frame: [],
    sash: [],
    structural: [],
    glazing: [],
    accessory: [],
    other: [],
  };

  const aggregatedByCategory: BOMData['aggregatedByCategory'] = {};

  // Map Worker Profiles to BOMSidebar structure
  profiles.forEach(p => {
     // Resolve full profile object from System Pack
     const resolvedProfile = systemPack?.profiles?.find((sp: Profile) => sp.id === p.profileCode);
     
     // Fallback if not found (shouldn't happen if validated)
     const description = (p as any).description || p.profileCode;
     const profile = resolvedProfile || {
         id: p.profileCode,
         name: description,
         profileRole: p.role,
         code: p.profileCode,
         systemBrand: systemPack?.meta?.name,
         // Dummy values for required fields
         material: 'aluminum',
         width: 0,
         height: 0,
         costPerMeter: 0,
         weightPerMeter: 0,
         color: 'mill_finish'
     } as unknown as Profile;

     const role = p.role || 'other';
     const targetCategory = 
        role.startsWith('frame') || ['architrave', 'threshold', 'sill'].includes(role) ? 'frame' :
        role.startsWith('sash') ? 'sash' :
        ['mullion', 'transom', 'reinforcement'].includes(role) ? 'structural' :
        role.startsWith('glazing') ? 'glazing' :
        ['interlock', 'adapter', 'gasket'].includes(role) ? 'accessory' : 'other';

     // Populate aggregated map
     if (!aggregatedByCategory[targetCategory]) aggregatedByCategory[targetCategory] = {};
     
     const key = `${profile.name}_${p.length}`;
     if (!aggregatedByCategory[targetCategory][key]) {
        aggregatedByCategory[targetCategory][key] = {
            profile: profile,
            type: role,
            quantity: 0,
            totalLength: 0,
            totalWeight: 0,
            totalCost: 0,
            role: role,
            verification: { verified: true, missing: [], mismatched: [] },
            specs: {
                width: profile.width,
                height: profile.height,
                material: profile.material,
            }
        };
     }
     
     const entry = aggregatedByCategory[targetCategory][key];
     entry.quantity += p.quantity;
     entry.totalLength += p.length * p.quantity;
     entry.totalWeight += (profile.weightPerMeter || 0) * (p.length/1000) * p.quantity;
     entry.totalCost += p.cost;
     
     // Also populate the "raw" components list
      const compStub = {
          id: `bom-${Math.random()}`,
          type: role,
          profile: profile,
          quantity: p.quantity,
          cuttingLengths: [p.length]
      };
      componentsByCategory[targetCategory].push(compStub);
  });

  // 2. Glass Details
  const glassSpecs = glazing.map((g, idx) => ({
      sashIndex: idx + 1, // Approximation
      width: g.dimensions.width,
      height: g.dimensions.height,
      area: (g.dimensions.width * g.dimensions.height) / 1_000_000,
      type: g.type || 'double'
  }));
  
  const totalGlassArea = glassSpecs.reduce((sum, g) => sum + g.area, 0);
  // Estimate weight - worker should ideally provide this, but we can standard calc
  const totalGlassWeight = totalGlassArea * 25; // approx 25kg/m2 typical

  const glassDetails = {
      glassSpecs,
      totalGlassArea,
      glazingType: glazing[0]?.type || 'double',
      glassThickness: glazing[0]?.dimensions.thickness || 24,
      totalGlassWeight
  };

  // 3. Totals
  const totals = {
      materialCost: cost.materialCost, // The worker provides accurate material cost
      weight: Object.values(aggregatedByCategory).reduce((sum, cat) => 
          sum + Object.values(cat).reduce((s, i: any) => s + i.totalWeight, 0), 0)
  };

  return {
    componentsByCategory,
    glassDetails,
    totals,
    aggregatedByCategory,
    systemPack: systemPack,
    verifyProfileSpecs: () => ({ verified: true, missing: [], mismatched: [] }), // Stub
  };
}
