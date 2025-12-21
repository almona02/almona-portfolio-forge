/**
 * Multi-Profile DXF Extractor
 * 
 * Handles DXF files containing multiple profiles (frame, sash, mullion, etc.)
 * and automatically builds a complete system pack.
 * 
 * For files like "tango 60 new.dxf" that contain the entire system pack.
 */

import type { ImportedProfile } from '@/components/fabricator/smartscan/DXFProfileImporter';
import { autoConfigureFromDXF, type DXFImportData, type AutoConfigOptions } from './autoConfigFromDXF';
import { buildCustomSystemPack } from './systemPackBuilder';

export interface MultiProfileDXFResult {
  profiles: ImportedProfile[];
  systemPack?: {
    id: string;
    name: string;
    profiles: Array<{
      id: string;
      name: string;
      role: string;
      widthMm: number;
      heightMm: number;
      autoConfig?: any;
    }>;
  };
  detectedRoles: string[];
}

/**
 * Advanced role detection for multiple profiles
 * Handles: multiple frames, multiple sashes (small/big), adapters, etc.
 */
function detectProfileRole(
  profileName: string,
  widthMm: number,
  heightMm: number,
  areaMm2: number,
  index: number,
  totalProfiles: number,
  allProfiles: Array<{ width_mm: number; height_mm: number; area_mm2: number }>
): 'frame' | 'sash' | 'mullion' | 'transom' | 'bead' | 'interlock' | 'accessory' | 'adapter' {
  const nameUpper = profileName.toUpperCase();
  const avgDimension = (widthMm + heightMm) / 2;
  
  // 1. Check filename/layer name for explicit role hints
  if (nameUpper.includes('FRAME') || nameUpper.includes('CERCEVE') || nameUpper.includes('ÇERÇEVE')) {
    // Check if it's a specific frame type
    if (nameUpper.includes('SMALL') || nameUpper.includes('KÜÇÜK') || nameUpper.includes('KUCUK')) {
      return 'frame'; // Small frame
    }
    if (nameUpper.includes('BIG') || nameUpper.includes('BÜYÜK') || nameUpper.includes('BUYUK') || nameUpper.includes('LARGE')) {
      return 'frame'; // Large frame
    }
    return 'frame';
  }
  if (nameUpper.includes('SASH') || nameUpper.includes('KANAT')) {
    // Check if it's small or big sash
    if (nameUpper.includes('SMALL') || nameUpper.includes('KÜÇÜK') || nameUpper.includes('KUCUK')) {
      return 'sash'; // Small sash
    }
    if (nameUpper.includes('BIG') || nameUpper.includes('BÜYÜK') || nameUpper.includes('BUYUK') || nameUpper.includes('LARGE')) {
      return 'sash'; // Large sash
    }
    return 'sash';
  }
  if (nameUpper.includes('MULLION') || nameUpper.includes('DIKME') || nameUpper.includes('DİKME')) {
    return 'mullion';
  }
  if (nameUpper.includes('TRANSOM') || nameUpper.includes('YATAY')) {
    return 'transom';
  }
  if (nameUpper.includes('BEAD') || nameUpper.includes('CAM PROFİL') || nameUpper.includes('CAM PROFIL')) {
    return 'bead';
  }
  if (nameUpper.includes('INTERLOCK') || nameUpper.includes('KİLİT') || nameUpper.includes('KILIT')) {
    return 'interlock';
  }
  if (nameUpper.includes('ADAPTER') || nameUpper.includes('ADAPTÖR') || nameUpper.includes('ADAPTOR') || 
      nameUpper.includes('COMPLETION') || nameUpper.includes('TAMAMLAMA')) {
    return 'adapter';
  }
  
  // 2. Size-based heuristics with context from all profiles
  if (totalProfiles > 1 && allProfiles.length > 0) {
    // Find largest and second largest profiles
    const sortedByArea = [...allProfiles].sort((a, b) => b.area_mm2 - a.area_mm2);
    const largestArea = sortedByArea[0]?.area_mm2 || 0;
    const secondLargestArea = sortedByArea[1]?.area_mm2 || 0;
    
    // Largest profiles are frames (could be multiple frame types)
    if (areaMm2 >= largestArea * 0.9) {
      return 'frame'; // Largest or near-largest = frame
    }
    
    // Second largest could be sash or another frame type
    if (areaMm2 >= secondLargestArea * 0.8 && areaMm2 <= secondLargestArea * 1.2) {
      // Check if there are multiple large profiles (multiple frames)
      const largeProfiles = sortedByArea.filter(p => p.area_mm2 >= largestArea * 0.7);
      if (largeProfiles.length >= 2) {
        // Multiple frames detected
        return 'frame';
      }
      // Otherwise, likely a sash
      return 'sash';
    }
    
    // Medium profiles: could be sash, mullion, or adapter
    if (areaMm2 >= largestArea * 0.3 && areaMm2 <= largestArea * 0.7) {
      // Check aspect ratio: tall = mullion, wide = transom, square = sash/adapter
      const aspectRatio = widthMm / heightMm;
      if (aspectRatio < 0.7) {
        return 'mullion'; // Tall profile
      }
      if (aspectRatio > 1.4) {
        return 'transom'; // Wide profile
      }
      // Square-ish: could be sash or adapter
      // If there are already sashes detected, this might be an adapter
      const hasSash = sortedByArea.some((p, i) => 
        i > 0 && i < totalProfiles && 
        p.area_mm2 >= largestArea * 0.3 && 
        p.area_mm2 <= largestArea * 0.7
      );
      return hasSash ? 'adapter' : 'sash';
    }
    
    // Small profiles: beads or accessories
    if (areaMm2 < largestArea * 0.1) {
      if (avgDimension < 20) {
        return 'bead'; // Very small = glazing bead
      }
      return 'accessory'; // Small but not tiny = accessory
    }
  }
  
  // 3. Fallback: dimension-based detection
  if (avgDimension > 80) {
    return 'frame'; // Large profiles are usually frames
  }
  if (avgDimension < 20) {
    return 'bead'; // Small profiles are usually beads
  }
  if (avgDimension >= 40 && avgDimension <= 80) {
    return 'sash'; // Medium profiles are usually sashes
  }
  
  return 'frame'; // Default fallback
}

/**
 * Extracts multiple profiles from a DXF import response
 * 
 * Now uses backend's all_profiles array to extract ALL polygons separately.
 * Handles: multiple frames, multiple sashes, adapters, etc.
 */
export async function extractMultipleProfilesFromDXF(
  dxfFileName: string,
  apiResponse: any,
  windowType: 'sliding' | 'casement' | 'tilt_turn' | 'fixed' | 'sliding_door' = 'sliding',
  systemPackName?: string
): Promise<MultiProfileDXFResult> {
  const metrics = apiResponse?.profile_metrics || {};
  const allProfilesData = apiResponse?.all_profiles || [];
  const baseName = dxfFileName.replace(/\.(dxf|dwg)$/i, '').replace(/\s*(new|v2|v3)\s*/i, '').trim();
  
  const profiles: ImportedProfile[] = [];
  
  // If backend returned all profiles, use them (most accurate)
  if (allProfilesData && allProfilesData.length > 0) {
    // Extract all profiles from backend response
    for (const profileData of allProfilesData) {
      const profile: ImportedProfile = {
        id: `${baseName}-profile-${profileData.index}-${Date.now()}`,
        fileName: dxfFileName,
        name: `${baseName} - Profile ${profileData.index + 1}`,
        widthMm: profileData.width_mm,
        heightMm: profileData.height_mm,
        areaMm2: profileData.area_mm2,
        perimeterMm: profileData.perimeter_mm,
        weightKgPerM: profileData.weight_kg_per_m,
        isThermalBreak: allProfilesData.length > 1, // Multiple profiles = thermal break system
        svgPreview: apiResponse?.svg_preview, // Same SVG for all (shows all profiles)
        metadata: {
          source: 'backend',
          units: 'mm',
          hasSvgPreview: Boolean(apiResponse?.svg_preview),
          profileIndex: profileData.index,
          center: profileData.center,
          boundingBox: profileData.bounding_box,
        },
      };
      profiles.push(profile);
    }
  } else {
    // Fallback: Backend only returned single profile (legacy)
    const widthMm = metrics.profile_width_mm || (metrics.bounding_box?.[2] - metrics.bounding_box?.[0]);
    const heightMm = metrics.profile_height_mm || (metrics.bounding_box?.[3] - metrics.bounding_box?.[1]);
    
    if (widthMm && heightMm) {
      const singleProfile: ImportedProfile = {
        id: `${baseName}-${Date.now()}`,
        fileName: dxfFileName,
        name: baseName,
        widthMm,
        heightMm,
        areaMm2: metrics.area_mm2,
        perimeterMm: metrics.perimeter_mm,
        weightKgPerM: metrics.weight_kg_per_m,
        isThermalBreak: metrics.is_thermal_break,
        svgPreview: apiResponse?.svg_preview,
        metadata: {
          source: 'backend',
          units: 'mm',
          hasSvgPreview: Boolean(apiResponse?.svg_preview),
        },
      };
      profiles.push(singleProfile);
    }
  }
  
  // Auto-detect roles for all profiles using advanced detection
  const allProfilesForDetection = profiles.map(p => ({
    width_mm: p.widthMm || 0,
    height_mm: p.heightMm || 0,
    area_mm2: p.areaMm2 || 0,
  }));
  
  const profilesWithRoles = profiles.map((p, index) => {
    const detectedRole = detectProfileRole(
      p.name || p.fileName,
      p.widthMm || 50,
      p.heightMm || 50,
      p.areaMm2 || 0,
      index,
      profiles.length,
      allProfilesForDetection
    );
    
    // Generate more descriptive name based on role
    let roleSuffix = '';
    if (detectedRole === 'frame') {
      // Check if there are multiple frames
      const frameCount = profilesWithRoles.filter(pr => pr.metadata?.detectedRole === 'frame').length;
      if (frameCount > 0) {
        // This is an additional frame - check size relative to others
        const otherFrames = allProfilesForDetection.filter((_, i) => 
          i < index && detectProfileRole('', allProfilesForDetection[i].width_mm, 
            allProfilesForDetection[i].height_mm, allProfilesForDetection[i].area_mm2, i, 
            profiles.length, allProfilesForDetection) === 'frame'
        );
        if (otherFrames.length > 0) {
          const avgOtherFrameArea = otherFrames.reduce((sum, f) => sum + f.area_mm2, 0) / otherFrames.length;
          if ((p.areaMm2 || 0) < avgOtherFrameArea * 0.8) {
            roleSuffix = ' (Small)';
          } else if ((p.areaMm2 || 0) > avgOtherFrameArea * 1.2) {
            roleSuffix = ' (Large)';
          }
        }
      }
    } else if (detectedRole === 'sash') {
      // Check if there are multiple sashes
      const sashCount = profilesWithRoles.filter(pr => pr.metadata?.detectedRole === 'sash').length;
      if (sashCount > 0) {
        const otherSashes = allProfilesForDetection.filter((_, i) => 
          i < index && detectProfileRole('', allProfilesForDetection[i].width_mm, 
            allProfilesForDetection[i].height_mm, allProfilesForDetection[i].area_mm2, i, 
            profiles.length, allProfilesForDetection) === 'sash'
        );
        if (otherSashes.length > 0) {
          const avgOtherSashArea = otherSashes.reduce((sum, s) => sum + s.area_mm2, 0) / otherSashes.length;
          if ((p.areaMm2 || 0) < avgOtherSashArea * 0.8) {
            roleSuffix = ' (Small)';
          } else if ((p.areaMm2 || 0) > avgOtherSashArea * 1.2) {
            roleSuffix = ' (Large)';
          }
        }
      }
    }
    
    return {
      ...p,
      name: `${baseName} - ${detectedRole.charAt(0).toUpperCase() + detectedRole.slice(1)}${roleSuffix}`,
      metadata: {
        ...p.metadata,
        detectedRole,
      },
    };
  });
  
  // Build system pack if we have multiple profiles
  let systemPack;
  if (profilesWithRoles.length > 1) {
    const packName = systemPackName || baseName.replace(/\s*(new|v2|v3)\s*/i, '').trim();
    systemPack = buildCustomSystemPack({
      name: packName,
      profiles: profilesWithRoles.map((p) => ({
        id: p.id,
        name: p.name || p.fileName,
        widthMm: p.widthMm,
        heightMm: p.heightMm,
        role: p.metadata?.detectedRole || 'frame',
        fileName: p.fileName,
        areaMm2: p.areaMm2,
        perimeterMm: p.perimeterMm,
        weightKgPerM: p.weightKgPerM,
        isThermalBreak: p.isThermalBreak,
        svgPreview: p.svgPreview,
      })),
      windowType,
    });
  }
  
  return {
    profiles: profilesWithRoles,
    systemPack: systemPack ? {
      id: systemPack.meta.id,
      name: systemPack.meta.name,
      profiles: systemPack.windowSystemSpec.profiles_cutting_list.map((p: any) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        widthMm: p.width_mm,
        heightMm: p.height_mm,
        autoConfig: {
          kFactor: p.kFactor,
          cuttingRules: p.cuttingRules,
          glazingConfig: p.glazingConfig,
          geometryConfig: p.geometryConfig,
          structuralConfig: p.structuralConfig,
          machiningZones: p.machiningZones,
        },
      })),
    } : undefined,
    detectedRoles: profilesWithRoles.map((p) => p.metadata?.detectedRole || 'frame'),
  };
}

/**
 * Helper to update backend API to return all polygons separately
 * This is a placeholder for future backend enhancement
 */
export interface MultiProfileDXFRequest {
  extractAllProfiles?: boolean; // Flag to request all profiles, not just largest
  detectRoles?: boolean; // Auto-detect roles from layers/blocks
  systemPackName?: string; // Known system pack name for better detection
}

