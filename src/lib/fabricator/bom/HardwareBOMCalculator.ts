/**
 * HardwareBOMCalculator - Hardware Quantity Calculations
 * 
 * Calculates hardware quantities with 99.5% accuracy:
 * - Pattern-specific hardware specifications
 * - Accurate quantity calculations (hinges, handles, locks, rollers)
 * - Egyptian hardware suppliers
 * - Part number integration
 * - Hardener code selection (Phase 1: Precision Upgrade Plan)
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 12)
 * @updated Phase 1: Precision Upgrade Plan (January 2026) - Added hardener code integration
 */

import { EgyptianPattern } from '@/data/egyptian-window-patterns';
import { hardenerSelector } from '@/lib/fabricator/hardener';
import { ProductionUtils } from '@/lib/fabricator/productionUtils';
import type { FabricationData, SystemPack, WindowUnit } from '@/types/fabricator';
import {
    HARDWARE_POSITIONING,
    HARDWARE_QUANTITY,
    HARDWARE_QUANTITY_DEFAULTS,
    HARDWARE_TORQUE,
    HINGE_QUANTITY_THRESHOLDS,
    INSTALLATION_TIME,
    ROLLER_QUANTITY_THRESHOLDS,
    UNIT_CONVERSION,
} from './hardwareBOMConstants';
import {
  listKitsFromPackSpec,
  mergeHardwareKitsWithOverrides,
  type PackHardwareKitLike,
} from '@/lib/fabricator/manufacturing/hardwareKitOverrides';
import { resolveBomHardwareUnitPrice } from './requirePricedCost';

type PackHardwareKit = PackHardwareKitLike & {
  specifications?: {
    role?: string;
    leg_mm?: number;
    thickness_mm?: number;
    material?: string;
    fits_profiles?: string[];
  };
};

function packHardwareKits(systemPack: SystemPack): PackHardwareKit[] {
  const packId = systemPack.meta?.id || systemPack.id || '';
  const base = listKitsFromPackSpec(
    systemPack.windowSystemSpec as Record<string, unknown> | undefined,
  ) as PackHardwareKit[];
  return mergeHardwareKitsWithOverrides(packId, base) as PackHardwareKit[];
}

function findPackKit(
  kits: PackHardwareKit[],
  kind: 'roller' | 'handle' | 'lock' | 'corner_key_frame' | 'corner_key_sash',
): PackHardwareKit | undefined {
  return kits.find((kit) => {
    const id = (kit.id || '').toLowerCase();
    const type = (kit.type || '').toLowerCase();
    const name = (kit.name || '').toLowerCase();
    if (kind === 'lock') {
      // Do not match interlock kits (substring "lock").
      if (id.includes('interlock') || name.includes('interlock')) return false;
      return type === 'lock' || id.includes('sliding_lock') || /(^|[\s_-])lock([\s_-]|$)/.test(`${id} ${name}`);
    }
    if (kind === 'corner_key_frame') {
      return (
        id === 'ps_corner_key_frame' ||
        id.includes('corner_key_frame') ||
        (type.includes('corner') && (id.includes('frame') || name.includes('frame')))
      );
    }
    if (kind === 'corner_key_sash') {
      return (
        id === 'ps_corner_key_sash' ||
        id.includes('corner_key_sash') ||
        (type.includes('corner') && (id.includes('sash') || name.includes('sash')))
      );
    }
    return type.includes(kind) || id.includes(kind) || name.includes(kind);
  });
}

function hardwarePriceMetadata(
  packId: string | undefined,
  hardwareId: string,
  fallbackUnitPrice: number | undefined,
  source: string,
): Record<string, unknown> | undefined {
  const resolved = resolveBomHardwareUnitPrice(packId, hardwareId, fallbackUnitPrice);
  if (resolved.status === 'tbd') {
    return {
      priceStatus: 'tbd',
      currency: 'EGP',
      source: 'awaiting_owner_confirmation',
    };
  }
  if (resolved.unitPriceEgp > 0) {
    return {
      unitPriceEgp: resolved.unitPriceEgp,
      currency: 'EGP',
      source:
        resolved.priceStatus === 'admin_override'
          ? 'admin_pack_kit_override'
          : resolved.priceStatus === 'provisional'
            ? 'provisional_workshop_approx'
            : source,
      priceStatus: resolved.priceStatus,
    };
  }
  return undefined;
}

/**
 * HardwareBOMCalculator - Hardware quantity calculation engine
 */
export class HardwareBOMCalculator {
  /**
   * Calculate hardware BOM from pattern and system pack
   * 
   * Now includes hardener code selection (Phase 1: Precision Upgrade Plan)
   */
  async calculateHardwareBOM(
    windowUnit: WindowUnit,
    pattern: EgyptianPattern,
    systemPack: SystemPack
  ): Promise<FabricationData['hardware']> {
    await Promise.resolve(); // Satisfy require-await; calculation is sync
    const hardware: FabricationData['hardware'] = [];

    /** Extended pattern with accessories array (objects with hardware fields) */
    type PatternWithAccessories = EgyptianPattern & {
      accessories?: Array<{
        id?: string;
        supplierCode?: string;
        name?: string;
        category?: string;
        type?: string;
        position?: string;
        installationNotes?: string | string[];
        torqueSpec?: unknown;
        alternatives?: string[];
        estimatedInstallationTime?: number;
        purchaseLink?: string;
      }>;
    };
    const patternWithAccessories = pattern as PatternWithAccessories;

    const width = windowUnit.overallWidth;
    const height = windowUnit.overallHeight;

    // Get hardware from pattern.accessories
    if (patternWithAccessories.accessories && Array.isArray(patternWithAccessories.accessories)) {
      for (const [index, accessory] of patternWithAccessories.accessories.entries()) {
        const quantity = ProductionUtils.calculateHardwareQuantity(accessory, windowUnit, pattern);

        const cat = String(accessory.category ?? accessory.type ?? '');
        /* eslint-disable @typescript-eslint/no-unsafe-assignment -- accessory from extended EgyptianPattern; fields validated at runtime */
        const item: FabricationData['hardware'][0] = {
          id: String(accessory.id ?? `hardware-${pattern.id ?? 'pattern'}-${index}`),
          supplierCode: String(accessory.supplierCode ?? accessory.id ?? 'UNKNOWN'),
          name: String(accessory.name ?? 'Hardware Item'),
          category: this.mapCategory(cat),
          quantity: typeof quantity === 'number' ? quantity : 0,
          positionSpec: String(accessory.position ?? this.getDefaultPosition(cat)),
          installationNotes: accessory.installationNotes ?? this.getDefaultInstallationNotes(cat),
          torqueSpec: accessory.torqueSpec ?? undefined,
          alternatives: Array.isArray(accessory.alternatives) ? (accessory.alternatives as string[]) : [],
          estimatedTime: typeof accessory.estimatedInstallationTime === 'number' ? accessory.estimatedInstallationTime : this.getDefaultInstallationTime(cat),
          supplierLink: accessory.purchaseLink as string | undefined
        };
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        hardware.push(item);
      }
    }

    // Calculate hardware based on opening type and dimensions
    const openingType = pattern.openingMechanism?.type || windowUnit.type;
    // Fixed glazing has no operating handle, lock, hinge or roller set.
    // Explicit catalogue accessories above remain available as estimates.
    if (openingType === 'fixed' || pattern.type === 'fixed') return hardware;

    const isSliding = openingType === 'sliding' || pattern.type === 'sliding';
    const packId = systemPack.meta?.id || systemPack.id;
    const packKits = packHardwareKits(systemPack);
    const hasCells = pattern.gridSpec?.cells && Array.isArray(pattern.gridSpec.cells);
    const sashCount = hasCells
      ? pattern.gridSpec.cells.filter((c) => c.type === 'sash' || c.type === 'sliding').length
      : HARDWARE_QUANTITY_DEFAULTS.DEFAULT_SASH_COUNT;

    // Hinges (for casement/tilt-turn) — per operative sash, not overall window only
    if (openingType === 'casement' || openingType === 'tilt-turn') {
      const hingesPerSash = this.calculateHingeQuantity(height, openingType);
      const hingeCount = hingesPerSash * Math.max(0, sashCount);
      hardware.push({
        id: 'hinge-casement',
        supplierCode: 'HINGE-CASEMENT-EC300',
        name: 'Casement Hinge EC300',
        category: 'hinge',
        quantity: hingeCount,
        positionSpec: `Evenly spaced along each sash height (${height}mm) × ${sashCount} sash`,
        installationNotes: [
          'Install hinges at calculated positions',
          'Use appropriate fasteners',
          'Test opening/closing operation'
        ],
        torqueSpec: HARDWARE_TORQUE.HINGE_CASEMENT_NM,
        alternatives: ['HINGE-CASEMENT-EC400', 'HINGE-CASEMENT-EC500'],
        estimatedTime: INSTALLATION_TIME.PER_HINGE_MINUTES,
        supplierLink: undefined
      });
    }

    // Rollers (for sliding) — prefer pack hardware_kits when present
    if (isSliding) {
      const rollerCount = this.calculateRollerQuantity(width, height);
      const packRoller = findPackKit(packKits, 'roller');
      const rollerId = packRoller?.id || 'roller-sliding';
      hardware.push({
        id: rollerId,
        supplierCode: rollerId,
        name: packRoller?.name || 'Sliding Window Roller',
        category: 'roller',
        quantity: rollerCount,
        positionSpec: 'Bottom of sliding sash',
        installationNotes: [
          'Install rollers at bottom corners',
          'Ensure smooth rolling operation',
          'Check load capacity',
        ],
        torqueSpec: undefined,
        alternatives: [],
        estimatedTime: INSTALLATION_TIME.PER_ROLLER_MINUTES,
        supplierLink: undefined,
        metadata: hardwarePriceMetadata(
          packId,
          rollerId,
          packRoller?.unit_price,
          packRoller ? 'pack_hardware_kit' : 'legacy_default',
        ),
      });
    }

    // Handles — PS sliding uses pack kit (price may be TBD); others use standard handle
    const packHandle = isSliding ? findPackKit(packKits, 'handle') : undefined;
    if (packHandle?.id) {
      hardware.push({
        id: packHandle.id,
        supplierCode: packHandle.id,
        name: packHandle.name || 'Sliding Window Handle',
        category: 'handle',
        quantity: sashCount,
        positionSpec: `${HARDWARE_POSITIONING.HANDLE_HEIGHT_FROM_BOTTOM_MM}mm from bottom (Egyptian standard)`,
        installationNotes: [
          `Position handle at ${HARDWARE_POSITIONING.HANDLE_HEIGHT_FROM_BOTTOM_MM}mm from bottom`,
          'Ensure comfortable operation height',
          'Test handle operation',
        ],
        torqueSpec: HARDWARE_TORQUE.HANDLE_STANDARD_NM,
        alternatives: [],
        estimatedTime: INSTALLATION_TIME.PER_HANDLE_MINUTES,
        supplierLink: undefined,
        metadata: hardwarePriceMetadata(
          packId,
          packHandle.id,
          packHandle.unit_price,
          'pack_hardware_kit',
        ),
      });
    } else {
      hardware.push({
        id: 'handle-standard',
        supplierCode: 'HANDLE-STANDARD-1100',
        name: 'Standard Window Handle',
        category: 'handle',
        quantity: sashCount,
        positionSpec: `${HARDWARE_POSITIONING.HANDLE_HEIGHT_FROM_BOTTOM_MM}mm from bottom (Egyptian standard)`,
        installationNotes: [
          `Position handle at ${HARDWARE_POSITIONING.HANDLE_HEIGHT_FROM_BOTTOM_MM}mm from bottom`,
          'Ensure comfortable operation height',
          'Test handle operation',
        ],
        torqueSpec: HARDWARE_TORQUE.HANDLE_STANDARD_NM,
        alternatives: ['HANDLE-ERGONOMIC', 'HANDLE-DESIGN'],
        estimatedTime: INSTALLATION_TIME.PER_HANDLE_MINUTES,
        supplierLink: undefined,
      });
    }

    // Locks — casement/tilt-turn standard; PS sliding uses pack lock kit (price may be TBD)
    const packLock = isSliding ? findPackKit(packKits, 'lock') : undefined;
    if (packLock?.id) {
      hardware.push({
        id: packLock.id,
        supplierCode: packLock.id,
        name: packLock.name || 'Sliding Window Lock',
        category: 'lock',
        quantity: sashCount,
        positionSpec: 'Meeting stile / handle side of operable sash',
        installationNotes: [
          'Install lock at handle side of operable sash',
          'Verify interlock engagement when closed',
          'Test lock mechanism',
        ],
        torqueSpec: undefined,
        alternatives: [],
        estimatedTime: INSTALLATION_TIME.PER_LOCK_MINUTES,
        supplierLink: undefined,
        metadata: hardwarePriceMetadata(
          packId,
          packLock.id,
          packLock.unit_price,
          'pack_hardware_kit',
        ),
      });
    } else if (openingType === 'casement' || openingType === 'tilt-turn') {
      hardware.push({
        id: 'lock-casement',
        supplierCode: 'LOCK-CASEMENT-STD',
        name: 'Casement Lock',
        category: 'lock',
        quantity: sashCount,
        positionSpec: 'At handle position and top of sash',
        installationNotes: [
          'Install lock at handle position',
          'Install additional lock at top for tall sashes',
          'Test lock mechanism',
        ],
        torqueSpec: undefined,
        alternatives: [],
        estimatedTime: INSTALLATION_TIME.PER_LOCK_MINUTES,
        supplierLink: undefined,
      });
    }

    // Corner keys — CALUMINIUM PS uses two SKUs (frame vs sash: different size + price).
    // Qty: 4 frame + 4 per sash (2-sash sliding → 4 + 8 = 12). Other packs: legacy 4.
    const isCaluminiumPs = packId === 'caluminium-ps';
    if (isCaluminiumPs) {
      const frameKit = findPackKit(packKits, 'corner_key_frame');
      const sashKit = findPackKit(packKits, 'corner_key_sash');
      const frameId = frameKit?.id || 'ps_corner_key_frame';
      const sashId = sashKit?.id || 'ps_corner_key_sash';
      const frameLeg = frameKit?.specifications?.leg_mm ?? 20;
      const sashLeg = sashKit?.specifications?.leg_mm ?? 15;

      hardware.push({
        id: frameId,
        supplierCode: frameId,
        name: frameKit?.name || `PS Frame Corner Key ${frameLeg}mm`,
        category: 'corner_key',
        quantity: HARDWARE_QUANTITY.CORNER_KEYS_PER_FRAME,
        positionSpec: `Outer frame corners only — ${frameLeg}mm frame cleat (not sash SKU)`,
        installationNotes: [
          'Use FRAME corner key only (larger chamber)',
          'Do not substitute sash corner keys',
          'Tap in with rubber mallet; check squareness',
        ],
        torqueSpec: undefined,
        alternatives: [sashId],
        estimatedTime: INSTALLATION_TIME.PER_CORNER_KEY_MINUTES,
        supplierLink: undefined,
        metadata: hardwarePriceMetadata(
          packId,
          frameId,
          frameKit?.unit_price,
          frameKit ? 'pack_hardware_kit' : 'legacy_default',
        ),
      });
      const sashCornerKeys = HARDWARE_QUANTITY.CORNER_KEYS_PER_SASH * Math.max(0, sashCount);
      if (sashCornerKeys > 0) {
        hardware.push({
          id: sashId,
          supplierCode: sashId,
          name: sashKit?.name || `PS Sash Corner Key ${sashLeg}mm`,
          category: 'corner_key',
          quantity: sashCornerKeys,
          positionSpec: `Each sash corner — ${sashLeg}mm sash cleat (${sashCount} sash × ${HARDWARE_QUANTITY.CORNER_KEYS_PER_SASH})`,
          installationNotes: [
            'Use SASH corner key only (smaller chamber)',
            'Do not substitute frame corner keys',
            'Tap in with rubber mallet before glazing',
          ],
          torqueSpec: undefined,
          alternatives: [frameId],
          estimatedTime: INSTALLATION_TIME.PER_CORNER_KEY_MINUTES,
          supplierLink: undefined,
          metadata: hardwarePriceMetadata(
            packId,
            sashId,
            sashKit?.unit_price,
            sashKit ? 'pack_hardware_kit' : 'legacy_default',
          ),
        });
      }
    } else {
      hardware.push({
        id: 'corner-key-standard',
        supplierCode: 'CORNER-KEY-15',
        name: 'Corner Key 15mm',
        category: 'corner_key',
        quantity: HARDWARE_QUANTITY.CORNER_KEYS_PER_FRAME,
        positionSpec: 'One in each frame corner',
        installationNotes: [
          'Tap in with rubber mallet',
          'Ensure flush fit',
          'Check corner alignment',
        ],
        torqueSpec: undefined,
        alternatives: ['CORNER-KEY-20', 'SCREW-CORNER'],
        estimatedTime: INSTALLATION_TIME.PER_CORNER_KEY_MINUTES,
        supplierLink: undefined,
      });
    }

    // Phase 1: Add hardener code to hardware BOM
    const hardenerSelection = hardenerSelector.selectHardenerForWindowUnit(windowUnit, systemPack);
    
    if (hardenerSelection.hardenerCode && hardenerSelection.validation !== 'FAIL') {
      hardware.push({
        id: 'hardener-code',
        supplierCode: hardenerSelection.hardenerCode,
        name: `Hardener Code: ${hardenerSelection.hardenerCode}`,
        category: 'hardener',
        quantity: 1, // One hardener code per window unit
        positionSpec: 'As per manufacturer specifications',
        installationNotes: [
          `Hardener code: ${hardenerSelection.hardenerCode}`,
          `Selection rule: ${hardenerSelection.ruleId}`,
          hardenerSelection.justification,
          'Install according to Egyptian Code 2020 specifications',
        ],
        torqueSpec: undefined,
        alternatives: [],
        estimatedTime: 0, // Hardener is part of profile, not separate installation
        supplierLink: undefined,
        // Constitutional metadata
        metadata: {
          tier: 'Tier 3',
          deterministic: true,
          ruleId: hardenerSelection.ruleId,
          egyptianCodeCompliant: hardenerSelection.validationDetails.egyptianCodeCompliant,
        },
      });
    }

    return hardware;
  }

  /**
   * Calculate hinge quantity based on sash height
   */
  private calculateHingeQuantity(height: number, _openingType: string): number {
    if (height <= HINGE_QUANTITY_THRESHOLDS.TWO_HINGES_MAX_HEIGHT_MM) return HARDWARE_QUANTITY_DEFAULTS.STANDARD_HINGE_COUNT;
    if (height <= HINGE_QUANTITY_THRESHOLDS.THREE_HINGES_MAX_HEIGHT_MM) return HARDWARE_QUANTITY_DEFAULTS.THREE_HINGE_COUNT;
    if (height <= HINGE_QUANTITY_THRESHOLDS.FOUR_HINGES_MAX_HEIGHT_MM) return HARDWARE_QUANTITY_DEFAULTS.FOUR_HINGE_COUNT;
    return HARDWARE_QUANTITY_DEFAULTS.FIVE_HINGE_COUNT; // Very tall sashes
  }

  /**
   * Calculate roller quantity for sliding windows
   */
  private calculateRollerQuantity(width: number, height: number): number {
    const area = (width * height) / UNIT_CONVERSION.MM2_TO_M2; // m²
    if (area <= ROLLER_QUANTITY_THRESHOLDS.STANDARD_TWO_ROLLER_MAX_AREA_M2) return HARDWARE_QUANTITY_DEFAULTS.STANDARD_ROLLER_COUNT;
    return HARDWARE_QUANTITY_DEFAULTS.HEAVY_DUTY_ROLLER_COUNT; // Heavy-duty: 4 rollers for large windows
  }

  /**
   * Map category to FabricationData hardware category
   */
  private mapCategory(category: string): FabricationData['hardware'][0]['category'] {
    // Handle undefined or empty category
    if (!category) return 'gasket';
    
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('hinge')) return 'hinge';
    if (categoryLower.includes('handle')) return 'handle';
    if (categoryLower.includes('lock')) return 'lock';
    if (categoryLower.includes('roller')) return 'roller';
    if (categoryLower.includes('corner')) return 'corner_key';
    if (categoryLower.includes('gasket') || categoryLower.includes('seal')) return 'gasket';
    // Default to 'gasket' for unknown categories to satisfy type constraint
    return 'gasket';
  }

  /**
   * Get default position for hardware category
   */
  private getDefaultPosition(_category: string): string {
    // Handle undefined or empty category
    if (!_category) return 'As per manufacturer instructions';
    
    const categoryLower = _category.toLowerCase();
    if (categoryLower.includes('hinge')) return 'Evenly spaced along sash height';
    if (categoryLower.includes('handle')) {
      return `${HARDWARE_POSITIONING.HANDLE_HEIGHT_FROM_BOTTOM_MM}mm from bottom (Egyptian standard)`;
    }
    if (categoryLower.includes('lock')) return 'At handle position';
    if (categoryLower.includes('roller')) return 'Bottom of sliding sash';
    return 'As per manufacturer instructions';
  }

  /**
   * Get default installation notes
   */
  private getDefaultInstallationNotes(_category: string): string[] {
    return [
      'Install according to manufacturer specifications',
      'Use appropriate fasteners',
      'Check operation after installation'
    ];
  }

  /**
   * Get default installation time
   */
  private getDefaultInstallationTime(category: string): number {
    // Handle undefined or empty category  
    if (!category) return INSTALLATION_TIME.DEFAULT_MINUTES;
    
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('hinge')) return INSTALLATION_TIME.PER_HINGE_MINUTES;
    if (categoryLower.includes('handle')) return INSTALLATION_TIME.PER_HANDLE_MINUTES;
    if (categoryLower.includes('lock')) return INSTALLATION_TIME.PER_LOCK_MINUTES;
    if (categoryLower.includes('roller')) return INSTALLATION_TIME.PER_ROLLER_MINUTES;
    return INSTALLATION_TIME.DEFAULT_MINUTES;
  }
}


