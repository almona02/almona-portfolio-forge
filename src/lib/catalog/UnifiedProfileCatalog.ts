import { ElsherifPDFExtractor } from '@/lib/imports/ElsherifPDFExtractor';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { Profile } from '@/types/fabricator';
import { supabase } from '@/lib/supabase';

export interface CatalogProfile {
  profileCode: string;
  oldProfileCode?: string;
  name: string;
  systemName: string;
  systemPackId?: string;
  category: Profile['category'];
  role: Profile['profileRole'];
  weightPerMeter?: number;
  dimensions?: {
    width?: number;
    height?: number;
    thickness?: number;
  };
  description?: string;
  specifications?: Record<string, any>;
}

export interface CatalogSystem {
  id: string;
  name: string;
  brand: string;
  category: string;
  profiles: CatalogProfile[];
}

export class UnifiedProfileCatalog {
  private static cachedSystems: CatalogSystem[] | null = null;

  static async getAllSystems(userId?: string): Promise<CatalogSystem[]> {
    let systems: CatalogSystem[] = [];
    const userProfilesMap: Map<string, any> = new Map();

    // Pre-fetch user profiles if userId is provided to use their roles
    if (userId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any;
        const { data: userProfiles } = await db
          .from('fabricator_profiles')
          .select('*')
          .eq('user_id', userId);

        if (userProfiles && userProfiles.length > 0) {
          // Create a map by supplierCode/internalCode for quick lookup
          userProfiles.forEach((p: any) => {
            const specs = p.specifications || {};
            const code = specs.supplierCode || specs.internalCode;
            if (code) {
              userProfilesMap.set(code.toLowerCase(), p);
            }
          });
        }
      } catch (e) {
        console.error("Failed to pre-fetch user profiles for role mapping", e);
      }
    }

    // Use cached systems for the static parts if available, but we always re-fetch user profiles
    // Ideally we should cache static parts separately. For now, we rebuild static parts if not cached.
    if (this.cachedSystems) {
      systems = JSON.parse(JSON.stringify(this.cachedSystems)); // Deep copy to avoid mutation issues
    } else {
      systems = [];
      // 1. Import from System Packs (High confidence, structured)
      for (const pack of SYSTEM_PACKS) {
        const profiles: CatalogProfile[] = [];
        
        // Helper to extract from JUMBO100 style
        const packSpec = pack.windowSystemSpec;
        if (packSpec.aluminum_profiles) {
          for (const p of packSpec.aluminum_profiles) {
            // Check if user has this profile in database with a defined role
            const userProfile = userProfilesMap.get(p.profile_number.toLowerCase());
            const dbRole = userProfile?.specifications?.profileRole || userProfile?.profile_role;
            
            profiles.push({
              profileCode: p.profile_number,
              oldProfileCode: p.old_profile_number,
              name: `Profile ${p.profile_number}`,
              systemName: pack.meta.name,
              systemPackId: pack.meta.id,
              category: 'window', // Default guess
              role: dbRole || this.guessRoleFromCode(p.profile_number), // Use DB role if available, else guess
              weightPerMeter: p.weight_kg_per_ml,
              dimensions: {
                width: p.dimensions_mm?.A,
                height: p.dimensions_mm?.B,
              },
              specifications: p,
            });
          }
        }

        // Helper for ROCK60 style (from cutting config)
        if (packSpec.rock60_45_degree_config) {
          const config = packSpec.rock60_45_degree_config;
          
          // Frames
          Object.values(config.frame_profiles || {}).forEach((fp: any) => {
            const userProfile = userProfilesMap.get(fp.profile_code?.toLowerCase());
            const dbRole = userProfile?.specifications?.profileRole || userProfile?.profile_role;
            
            profiles.push({
              profileCode: fp.profile_code,
              oldProfileCode: fp.new_code,
              name: `Frame ${fp.profile_code}`,
              systemName: pack.meta.name,
              systemPackId: pack.meta.id,
              category: 'window',
              role: dbRole || 'frame', // Use DB role if available
              weightPerMeter: fp.weight_kg_m,
            });
          });

          // Sashes
          Object.values(config.sash_profiles || {}).forEach((sp: any) => {
            const userProfile = userProfilesMap.get(sp.profile_code?.toLowerCase());
            const dbRole = userProfile?.specifications?.profileRole || userProfile?.profile_role;
            
            profiles.push({
              profileCode: sp.profile_code,
              oldProfileCode: sp.new_code,
              name: `Sash ${sp.profile_code}`,
              systemName: pack.meta.name,
              systemPackId: pack.meta.id,
              category: 'window',
              role: dbRole || 'sash', // Use DB role if available
              weightPerMeter: sp.weight_kg_m,
            });
          });

          // Beads
          Object.values(config.glazing_beads || {}).forEach((bp: any) => {
            const userProfile = userProfilesMap.get(bp.profile_code?.toLowerCase());
            const dbRole = userProfile?.specifications?.profileRole || userProfile?.profile_role;
            
            profiles.push({
              profileCode: bp.profile_code,
              oldProfileCode: bp.new_code,
              name: `Bead ${bp.profile_code}`,
              systemName: pack.meta.name,
              systemPackId: pack.meta.id,
              category: 'window',
              role: dbRole || 'glazing_bead', // Use DB role if available
              weightPerMeter: bp.weight_kg_m,
            });
          });
        }

        // Deduplicate by profile code
        const uniqueProfiles = Array.from(new Map(profiles.map(p => [p.profileCode, p])).values());

        systems.push({
          id: pack.meta.id,
          name: pack.meta.name,
          brand: pack.meta.brands[0] || 'Generic',
          category: pack.meta.category || 'window',
          profiles: uniqueProfiles,
        });
      }

      // 2. Import from Elsherif PDF Extractor (Manual Catalog)
      try {
        // We create a dummy file object because the extractor signature requires it, 
        // but it returns hardcoded data anyway for manual extraction.
        const dummyFile = new File([""], "dummy.pdf");
        const extracted = await ElsherifPDFExtractor.extractProfilesFromPDF(dummyFile);
        
        // Group by series
        const grouped = extracted.reduce((acc, curr) => {
          const series = curr.series || 'Unknown';
          if (!acc[series]) acc[series] = [];
          acc[series].push(curr);
          return acc;
        }, {} as Record<string, typeof extracted>);

        for (const [series, items] of Object.entries(grouped)) {
          // Check if system already exists from packs
          let system = systems.find(s => s.name.toLowerCase().includes(series.toLowerCase()));
          if (!system) {
            system = {
              id: series.toLowerCase().replace(/\s+/g, '-'),
              name: series,
              brand: 'ELSHERIF', // From extractor context
              category: 'window',
              profiles: [],
            };
            systems.push(system);
          }

          for (const item of items) {
            // Avoid duplicates if already populated from pack
            if (!system.profiles.find(p => p.profileCode === item.profileNumber)) {
              // Check if user has this profile in database with a defined role
              const userProfile = userProfilesMap.get(item.profileNumber?.toLowerCase());
              const dbRole = userProfile?.specifications?.profileRole || userProfile?.profile_role;
              
              system.profiles.push({
                profileCode: item.profileNumber,
                oldProfileCode: item.oldProfileNumber,
                name: item.name,
                systemName: series,
                systemPackId: system.id,
                category: 'window',
                role: dbRole || this.guessRoleFromCode(item.profileNumber), // Use DB role if available
                weightPerMeter: item.weightPerMeter,
                dimensions: item.dimensions,
                specifications: item.specifications,
              });
            }
          }
        }
      } catch (e) {
        console.error("Failed to extract from Elsherif extractor", e);
      }

      // Cache the static part
      this.cachedSystems = JSON.parse(JSON.stringify(systems));
    }

    // 3. Import from User Fabricator Profiles (Dynamic)
    if (userId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any;
        const { data: userProfiles } = await db
          .from('fabricator_profiles')
          .select('*')
          .eq('user_id', userId);

        if (userProfiles && userProfiles.length > 0) {
          // Group user profiles by system brand/name
          const grouped = userProfiles.reduce((acc: any, curr: any) => {
            const sysName = curr.system_brand || (curr.specifications?.window_system) || 'Custom / Other';
            if (!acc[sysName]) acc[sysName] = [];
            acc[sysName].push(curr);
            return acc;
          }, {} as Record<string, any[]>);

          for (const [sysName, items] of Object.entries(grouped)) {
             // Check if system already exists in static systems
            let system = systems.find(s => s.name.toLowerCase() === sysName.toLowerCase());
            
            if (!system) {
               // Create new system for user custom profiles
               system = {
                 id: `user-${sysName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                 name: sysName,
                 brand: (items[0] as any).system_brand || 'Custom',
                 category: (items[0] as any).category || 'window',
                 profiles: [],
               };
               systems.push(system);
            }

            for (const p of items) {
              const specs = p.specifications || {};
              const code = specs.supplierCode || specs.internalCode || p.name;
              
              // Only add if not already in the system (by code)
              if (!system.profiles.find(existing => existing.profileCode === code)) {
                system.profiles.push({
                  profileCode: code,
                  oldProfileCode: specs.internalCode,
                  name: p.name,
                  systemName: sysName,
                  systemPackId: system.id,
                  category: p.category || specs.category || 'window',
                  role: p.profile_role || specs.profileRole || 'other',
                  weightPerMeter: p.weight_per_meter || specs.weightPerMeterKg,
                  dimensions: {
                    width: p.width,
                    height: p.height,
                    thickness: p.thickness,
                  },
                  specifications: specs,
                  description: 'User defined profile',
                });
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch user profiles for unified catalog", e);
      }
    }

    // Deduplicate systems by ID to prevent duplicate React keys
    // If multiple systems have the same ID, merge their profiles
    const systemsById = new Map<string, CatalogSystem>();
    for (const system of systems) {
      const existing = systemsById.get(system.id);
      if (existing) {
        // Merge profiles, avoiding duplicates by profileCode
        const existingProfileCodes = new Set(existing.profiles.map(p => p.profileCode));
        for (const profile of system.profiles) {
          if (!existingProfileCodes.has(profile.profileCode)) {
            existing.profiles.push(profile);
            existingProfileCodes.add(profile.profileCode);
          }
        }
      } else {
        systemsById.set(system.id, system);
      }
    }

    return Array.from(systemsById.values());
  }

  private static guessRoleFromCode(code: string): Profile['profileRole'] {
    // Heuristic role guessing based on common numbering patterns or ranges
    // This is a fallback; explicit config is better
    if (!code) return 'frame';
    const cleanCode = code.replace(/\s+/g, '');
    
    // Specific overrides based on user feedback
    if (cleanCode.includes('21001020')) return 'sash';

    // Very rough heuristics for standard systems (often frames are lower numbers, beads higher)
    if (code.includes("111") || code.includes("Frame")) return 'frame';
    if (code.includes("122") || code.includes("Sash")) return 'sash';
    if (code.includes("166") || code.includes("Bead")) return 'glazing_bead';
    
    // JUMBO specific guesses
    if (cleanCode.startsWith('21001')) return 'frame'; // 1000 series often frames
    if (cleanCode.startsWith('21002')) return 'sash'; // 2000 series often sashes
    if (cleanCode.startsWith('21006')) return 'glazing_bead'; // 6000 series often beads

    return 'frame'; // Default fallback
  }
}
