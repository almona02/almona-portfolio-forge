/**
 * HardenerCatalog - Hardener Code Catalog
 * 
 * Defines hardener codes based on material, glass thickness, sash size, and opening type.
 * This catalog is Tier 3 deterministic - no ML, no supplier data dependencies.
 * 
 * Constitutional Compliance: AICS-001 §4.3.5 (Certification Constraints)
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import type { HardenerCode, HardenerCodeSpec } from './types';

/**
 * Hardener Code Catalog
 * 
 * Format: HX-{thickness}-{material}-{opening}
 * - HX: Hardener prefix
 * - Thickness: 14, 16, 20 (1.4mm, 1.6mm, 2.0mm)
 * - Material: A (Aluminum), U (UPVC)
 * - Opening: C (Casement), T (Tilt-Turn), S (Sliding), F (Fixed)
 */
export const HARDENER_CATALOG: HardenerCodeSpec[] = [
  // Aluminum - Small Sash (< 1.5m²) - 1.4mm
  {
    code: 'HX-14-A-C',
    name: 'Hardener 1.4mm Aluminum Casement',
    thickness: 1.4,
    material: 'aluminum',
    openingTypes: ['casement'],
    sashArea: { min: 0, max: 1.5 },
    glassThickness: { min: 4, max: 12 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
  {
    code: 'HX-14-A-T',
    name: 'Hardener 1.4mm Aluminum Tilt-Turn',
    thickness: 1.4,
    material: 'aluminum',
    openingTypes: ['tilt-turn'],
    sashArea: { min: 0, max: 1.5 },
    glassThickness: { min: 4, max: 12 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
  {
    code: 'HX-14-A-S',
    name: 'Hardener 1.4mm Aluminum Sliding',
    thickness: 1.4,
    material: 'aluminum',
    openingTypes: ['sliding'],
    sashArea: { min: 0, max: 1.5 },
    glassThickness: { min: 4, max: 12 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
  {
    code: 'HX-14-A-F',
    name: 'Hardener 1.4mm Aluminum Fixed',
    thickness: 1.4,
    material: 'aluminum',
    openingTypes: ['fixed'],
    sashArea: { min: 0, max: 1.5 },
    glassThickness: { min: 4, max: 12 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },

  // Aluminum - Medium Sash (1.5-2.5m²) - 1.6mm
  {
    code: 'HX-16-A-C',
    name: 'Hardener 1.6mm Aluminum Casement',
    thickness: 1.6,
    material: 'aluminum',
    openingTypes: ['casement'],
    sashArea: { min: 1.5, max: 2.5 },
    glassThickness: { min: 6, max: 18 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
  {
    code: 'HX-16-A-T',
    name: 'Hardener 1.6mm Aluminum Tilt-Turn',
    thickness: 1.6,
    material: 'aluminum',
    openingTypes: ['tilt-turn'],
    sashArea: { min: 1.5, max: 2.5 },
    glassThickness: { min: 6, max: 18 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
  {
    code: 'HX-16-A-S',
    name: 'Hardener 1.6mm Aluminum Sliding',
    thickness: 1.6,
    material: 'aluminum',
    openingTypes: ['sliding'],
    sashArea: { min: 1.5, max: 2.5 },
    glassThickness: { min: 6, max: 18 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },

  // Aluminum - Large Sash (> 2.5m²) - 2.0mm
  {
    code: 'HX-20-A-C',
    name: 'Hardener 2.0mm Aluminum Casement',
    thickness: 2.0,
    material: 'aluminum',
    openingTypes: ['casement'],
    sashArea: { min: 2.5, max: Infinity },
    glassThickness: { min: 8, max: 24 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
  {
    code: 'HX-20-A-T',
    name: 'Hardener 2.0mm Aluminum Tilt-Turn',
    thickness: 2.0,
    material: 'aluminum',
    openingTypes: ['tilt-turn'],
    sashArea: { min: 2.5, max: Infinity },
    glassThickness: { min: 8, max: 24 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
  {
    code: 'HX-20-A-S',
    name: 'Hardener 2.0mm Aluminum Sliding',
    thickness: 2.0,
    material: 'aluminum',
    openingTypes: ['sliding'],
    sashArea: { min: 2.5, max: Infinity },
    glassThickness: { min: 8, max: 24 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },

  // UPVC - Small Sash (< 1.5m²) - 1.2mm
  {
    code: 'HX-12-U-C',
    name: 'Hardener 1.2mm UPVC Casement',
    thickness: 1.2,
    material: 'upvc',
    openingTypes: ['casement'],
    sashArea: { min: 0, max: 1.5 },
    glassThickness: { min: 4, max: 10 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
  {
    code: 'HX-12-U-T',
    name: 'Hardener 1.2mm UPVC Tilt-Turn',
    thickness: 1.2,
    material: 'upvc',
    openingTypes: ['tilt-turn'],
    sashArea: { min: 0, max: 1.5 },
    glassThickness: { min: 4, max: 10 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
  {
    code: 'HX-12-U-S',
    name: 'Hardener 1.2mm UPVC Sliding',
    thickness: 1.2,
    material: 'upvc',
    openingTypes: ['sliding'],
    sashArea: { min: 0, max: 1.5 },
    glassThickness: { min: 4, max: 10 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },

  // UPVC - Medium Sash (1.5-2.5m²) - 1.4mm
  {
    code: 'HX-14-U-C',
    name: 'Hardener 1.4mm UPVC Casement',
    thickness: 1.4,
    material: 'upvc',
    openingTypes: ['casement'],
    sashArea: { min: 1.5, max: 2.5 },
    glassThickness: { min: 6, max: 16 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
  {
    code: 'HX-14-U-T',
    name: 'Hardener 1.4mm UPVC Tilt-Turn',
    thickness: 1.4,
    material: 'upvc',
    openingTypes: ['tilt-turn'],
    sashArea: { min: 1.5, max: 2.5 },
    glassThickness: { min: 6, max: 16 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
  {
    code: 'HX-14-U-S',
    name: 'Hardener 1.4mm UPVC Sliding',
    thickness: 1.4,
    material: 'upvc',
    openingTypes: ['sliding'],
    sashArea: { min: 1.5, max: 2.5 },
    glassThickness: { min: 6, max: 16 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },

  // UPVC - Large Sash (> 2.5m²) - 1.8mm
  {
    code: 'HX-18-U-C',
    name: 'Hardener 1.8mm UPVC Casement',
    thickness: 1.8,
    material: 'upvc',
    openingTypes: ['casement'],
    sashArea: { min: 2.5, max: Infinity },
    glassThickness: { min: 8, max: 20 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
  {
    code: 'HX-18-U-T',
    name: 'Hardener 1.8mm UPVC Tilt-Turn',
    thickness: 1.8,
    material: 'upvc',
    openingTypes: ['tilt-turn'],
    sashArea: { min: 2.5, max: Infinity },
    glassThickness: { min: 8, max: 20 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
  {
    code: 'HX-18-U-S',
    name: 'Hardener 1.8mm UPVC Sliding',
    thickness: 1.8,
    material: 'upvc',
    openingTypes: ['sliding'],
    sashArea: { min: 2.5, max: Infinity },
    glassThickness: { min: 8, max: 20 },
    egyptianCodeCompliant: true,
    gccStandards: ['UAE-ES-2020', 'SA-SASO-2021'],
  },
];

/**
 * Get hardener code by code string
 */
export function getHardenerByCode(code: HardenerCode): HardenerCodeSpec | undefined {
  return HARDENER_CATALOG.find(h => h.code === code);
}

/**
 * Get all hardener codes for a material
 */
export function getHardenerCodesByMaterial(material: 'aluminum' | 'upvc'): HardenerCodeSpec[] {
  return HARDENER_CATALOG.filter(h => h.material === material);
}

/**
 * Get all hardener codes for an opening type
 */
export function getHardenerCodesByOpeningType(openingType: 'casement' | 'tilt-turn' | 'sliding' | 'fixed' | 'pivot'): HardenerCodeSpec[] {
  return HARDENER_CATALOG.filter(h => h.openingTypes.includes(openingType));
}

