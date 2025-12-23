/**
 * System Tuning Utilities
 * Helper functions to check tuning status and manage system pack tuning
 */

import type { SystemPack } from '@/data/systemPacks';
import type { UPVCSystemPack } from '@/data/upvc-systems';

/**
 * Check if a system pack is tuned (has tuning parameters configured)
 */
export function isSystemPackTuned(systemPack: SystemPack | UPVCSystemPack | null): boolean {
  if (!systemPack) return false;
  
  // Check if system pack has profiles with tuning status
  const profiles = (systemPack as any).profiles || [];
  
  // For UPVC systems, check if profiles exist and have roles
  if ((systemPack as any).upvcSpec) {
    const upvcPack = systemPack as UPVCSystemPack;
    const upvcProfiles = (upvcPack as any).profiles || [];
    if (upvcProfiles.length > 0) {
      // Check if frame and sash profiles exist with roles
      const hasFrame = upvcProfiles.some((p: any) => 
        p.profileRole === 'frame' || p.type === 'frame'
      );
      const hasSash = upvcProfiles.some((p: any) => 
        p.profileRole === 'sash' || p.type === 'sash'
      );
      
      // System is considered tuned if it has both frame and sash profiles
      if (hasFrame && hasSash) {
        // Check if profiles have tuning parameters
        const frameProfile = upvcProfiles.find((p: any) => 
          p.profileRole === 'frame' || p.type === 'frame'
        );
        const sashProfile = upvcProfiles.find((p: any) => 
          p.profileRole === 'sash' || p.type === 'sash'
        );
        
        // Check if profiles have specifications with tuning data
        const frameTuned = frameProfile?.specifications && 
          (frameProfile.specifications as any).tuningStatus === 'tuned';
        const sashTuned = sashProfile?.specifications && 
          (sashProfile.specifications as any).tuningStatus === 'tuned';
        
        // If both are explicitly tuned, return true
        // Otherwise, if profiles exist with roles, consider it ready for tuning
        return frameTuned && sashTuned;
      }
      
      // If profiles exist but not tuned, return false (needs tuning)
      return false;
    }
  }
  
  // For aluminum systems, check windowSystemSpec
  const windowSpec = (systemPack as SystemPack).windowSystemSpec;
  if (windowSpec && (windowSpec as any).aluminum_profiles) {
    const aluminumProfiles = (windowSpec as any).aluminum_profiles || [];
    const hasFrame = aluminumProfiles.some((p: any) => p.role === 'frame');
    const hasSash = aluminumProfiles.some((p: any) => p.role === 'sash');
    
    if (hasFrame && hasSash) {
      // Check if profiles have cutting_allowance (indicates tuning)
      const frameProfile = aluminumProfiles.find((p: any) => p.role === 'frame');
      const sashProfile = aluminumProfiles.find((p: any) => p.role === 'sash');
      
      return !!(frameProfile?.cutting_allowance && sashProfile?.cutting_allowance);
    }
  }
  
  // Check custom systems in localStorage
  const customSystemId = (systemPack as any).meta?.id;
  if (customSystemId) {
    try {
      const stored = localStorage.getItem(`custom-profile-${customSystemId}`);
      if (stored) {
        const customPack = JSON.parse(stored);
        return customPack.tuningStatus === 'tuned' || 
               (customPack.profiles?.every((p: any) => p.tuningStatus === 'tuned'));
      }
    } catch {
      // Ignore errors
    }
  }
  
  // Default: system packs with profiles are considered ready but may need tuning
  return profiles.length > 0;
}

/**
 * Get system pack tuning status
 */
export function getSystemPackTuningStatus(systemPack: SystemPack | UPVCSystemPack | null): {
  isTuned: boolean;
  needsTuning: boolean;
  hasProfiles: boolean;
  hasFrame: boolean;
  hasSash: boolean;
} {
  if (!systemPack) {
    return {
      isTuned: false,
      needsTuning: true,
      hasProfiles: false,
      hasFrame: false,
      hasSash: false,
    };
  }
  
  const profiles = (systemPack as any).profiles || [];
  const isUPVC = !!(systemPack as any).upvcSpec;
  
  let hasFrame = false;
  let hasSash = false;
  
  if (isUPVC && profiles.length > 0) {
    hasFrame = profiles.some((p: any) => 
      p.profileRole === 'frame' || p.type === 'frame'
    );
    hasSash = profiles.some((p: any) => 
      p.profileRole === 'sash' || p.type === 'sash'
    );
  } else {
    const windowSpec = (systemPack as SystemPack).windowSystemSpec;
    if (windowSpec) {
      const aluminumProfiles = (windowSpec as any).aluminum_profiles || [];
      hasFrame = aluminumProfiles.some((p: any) => p.role === 'frame');
      hasSash = aluminumProfiles.some((p: any) => p.role === 'sash');
    }
  }
  
  const hasProfiles = profiles.length > 0 || hasFrame || hasSash;
  const isTuned = isSystemPackTuned(systemPack);
  const needsTuning = hasProfiles && !isTuned;
  
  return {
    isTuned,
    needsTuning,
    hasProfiles,
    hasFrame,
    hasSash,
  };
}

/**
 * Save return URL for navigation after tuning
 */
export function saveReturnUrl(url: string, params?: Record<string, string>): void {
  const returnData = {
    url,
    params: params || {},
    timestamp: Date.now(),
  };
  sessionStorage.setItem('tuning_return_url', JSON.stringify(returnData));
}

/**
 * Get and clear return URL
 */
export function getReturnUrl(): { url: string; params: Record<string, string> } | null {
  try {
    const stored = sessionStorage.getItem('tuning_return_url');
    if (stored) {
      const data = JSON.parse(stored);
      sessionStorage.removeItem('tuning_return_url');
      return data;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

