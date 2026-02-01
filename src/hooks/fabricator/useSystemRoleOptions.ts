import { useMemo } from 'react';

/**
 * Interface defining the structure of dropdown options for system roles (frame, sash, bead).
 */
export interface SystemPackRoleOption {
  id: string;
  label: string;
  description: string;
  options: { code: string; label: string }[];
}

/**
 * Interface for the minimal system pack structure required by this hook.
 * Compatible with both SystemPack and StoredSystemPack.
 */
interface BaseSystemPack {
  meta: {
    id: string;
    name?: string;
  };
  profiles?: Array<{
    id: string;
    name: string;
    profileRole?: string;
    specifications?: {
      partNumber?: string;
      [key: string]: any;
    };
  }>;
}

/**
 * Custom hook to generate dropdown options for system roles based on the active system pack.
 * Encapsulates legacy logic for 'rock60' and 'jumbo100' systems, preparing for a fully data-driven future.
 *
 * @param activeSystemPack - The currently selected system pack.
 * @returns An array of role option groups to render in the UI.
 */
export const useSystemRoleOptions = (activeSystemPack: BaseSystemPack | undefined): SystemPackRoleOption[] => {
  return useMemo(() => {
    if (!activeSystemPack) return [];

    // 1. Data-Driven Logic (Best Practice)
    // Check if system pack has profiles with explicit roles defined
    const profiles = activeSystemPack.profiles || [];
    
    // Check for standard roles (frame, sash, bead variants)
    const hasProfilesWithRoles = profiles.some((p) => {
      const role = p.profileRole;
      if (!role) return false;
      
      const isFrame = role.startsWith('frame') || ['architrave', 'threshold', 'sill', 'head', 'jamb'].includes(role);
      const isSash = role.startsWith('sash') || role === 'screen_sash';
      const isBead = role === 'glazing_bead' || role === 'bead';
      
      return isFrame || isSash || isBead;
    });

    if (hasProfilesWithRoles) {
      const roleOptions: SystemPackRoleOption[] = [];

      // Frame profiles
      const frameProfiles = profiles.filter((p) => {
        const role = p.profileRole;
        return role && (
          role.startsWith('frame') || 
          ['architrave', 'threshold', 'sill', 'head', 'jamb'].includes(role)
        );
      });
      
      if (frameProfiles.length > 0) {
        roleOptions.push({
          id: 'frameProfileCode',
          label: 'Frame profile',
          description: 'Select the frame profile code you will use for this unit.',
          options: frameProfiles.map((p) => ({
            code: p.id,
            label: `${p.name}${p.specifications?.partNumber ? ` (${p.specifications.partNumber})` : ''}`,
          })),
        });
      }

      // Sash profiles
      const sashProfiles = profiles.filter((p) => {
        const role = p.profileRole;
        return role && (role.startsWith('sash') || role === 'screen_sash');
      });
      
      if (sashProfiles.length > 0) {
        roleOptions.push({
          id: 'sashProfileCode',
          label: 'Sash profile',
          description: 'Select the sash profile code for operable leaves.',
          options: sashProfiles.map((p) => ({
            code: p.id,
            label: `${p.name}${p.specifications?.partNumber ? ` (${p.specifications.partNumber})` : ''}`,
          })),
        });
      }

      // Glazing bead profiles
      const beadProfiles = profiles.filter((p) => p.profileRole === 'glazing_bead' || p.profileRole === 'bead');
      
      if (beadProfiles.length > 0) {
        roleOptions.push({
          id: 'beadProfileCode',
          label: 'Glazing bead',
          description: 'Select the glazing bead profile used for this opening.',
          options: beadProfiles.map((p) => ({
            code: p.id,
            label: `${p.name}${p.specifications?.partNumber ? ` (${p.specifications.partNumber})` : ''}`,
          })),
        });
      }

      if (roleOptions.length > 0) {
        return roleOptions;
      }
    }

    // 2. Legacy Hardcoded Logic (Deprecation Candidate)
    // Preserved for backward compatibility with 'rock60' and 'jumbo100' until they are fully data-migrated.
    
    if (activeSystemPack.meta.id === 'rock60') {
      return [
        {
          id: 'frameProfileCode',
          label: 'Frame profile',
          description: 'Select the frame profile code you will use for this unit.',
          options: [
            { code: 'RC 6111-8', label: 'RC 6111-8 – Main frame (catalog default)' },
          ],
        },
        {
          id: 'sashProfileCode',
          label: 'Sash profile',
          description: 'Select the sash profile code for operable leaves.',
          options: [{ code: 'RC 6122', label: 'RC 6122 – Main sash' }],
        },
        {
          id: 'beadProfileCode',
          label: 'Glazing bead',
          description: 'Select the glazing bead profile used for this opening.',
          options: [{ code: 'RC 6166', label: 'RC 6166 – Standard bead' }],
        },
      ];
    }

    if (activeSystemPack.meta.id === 'jumbo100') {
      return [
        {
          id: 'frameProfileCode',
          label: 'Outer frame profile',
          description: 'Main perimeter frame profile for JUMBO100 sliding.',
          options: [
            { code: '2 100 1020', label: '2 100 1020 – Sliding frame (narrow)' },
            { code: '2 100 1120', label: '2 100 1120 – Sliding frame (wide)' },
          ],
        },
        {
          id: 'sashProfileCode',
          label: 'Sash / leaf profile',
          description: 'Active sliding leaf profile code.',
          options: [
            { code: '2 100 1130', label: '2 100 1130 – Sliding sash A' },
            { code: '2 100 1150', label: '2 100 1150 – Sliding sash B' },
          ],
        },
        {
          id: 'beadProfileCode',
          label: 'Small / glazing profile',
          description: 'Typical small profile used for beads or adapters.',
          options: [
            { code: '2 100 6120', label: '2 100 6120 – Small profile' },
            { code: '2 100 6180', label: '2 100 6180 – Small profile' },
          ],
        },
      ];
    }

    // Fallback: no specialised mapping – nothing to select.
    return [];
  }, [activeSystemPack]);
};
