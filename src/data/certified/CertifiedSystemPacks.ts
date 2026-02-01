/**
 * CertifiedSystemPacks.ts
 * "Gold Tier" locked Data: Verified vendor profiles (Reynaers, Katra) that cannot be edited by users.
 * Ensures compliance and accuracy for production.
 */

import { SystemPack } from '@/types/fabricator';

export const CERTIFIED_SYSTEM_PACKS: SystemPack[] = [
    {
        id: 'reynaers-cp155',
        name: 'Reynaers CP 155-LS',
        category: 'aluminum_doors',
        brand: 'Reynaers Aluminium',
        description: 'Premium lift-slide system for large glass expanses. U-value down to 1.07 W/m²K.',
        compatibleProfiles: ['cp155-frame-2rail', 'cp155-sash-ls', 'cp155-interlock'],
        compatibleAccessories: ['reynaers-handle-ls', 'reynaers-bogie-300kg'],
        technicalData: {
            uValue: 1.07,
            airPermeability: 'Class 4',
            waterTightness: 'Class 9A',
            windLoad: 'Class C4',
            soundReduction: 42,
            certifications: ['IFT Rosenheim', 'SKG**']
        }
    },
    {
        id: 'katra-k60',
        name: 'Katra K60 Thermal',
        category: 'aluminum_windows',
        brand: 'Katra Aluminium',
        description: 'Standard 60mm thermal break system optimized for Egyptian market.',
        compatibleProfiles: ['k60-frame-flat', 'k60-sash-round', 'k60-mullion-heavy'],
        compatibleAccessories: ['giesse-hinge', 'fapim-handle'],
        technicalData: {
            uValue: 1.8,
            airPermeability: 'Class 3',
            waterTightness: 'Class 7A',
            windLoad: 'Class C3',
            soundReduction: 38,
            certifications: ['EOS 2023']
        }
    }
];

// Helper to check if a pack is certified and locked
export const isCertifiedPack = (packId: string): boolean => {
    return CERTIFIED_SYSTEM_PACKS.some(p => p.id === packId);
};
