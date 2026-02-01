/**
 * Safety Envelope Loader
 * 
 * Gold Tier Implementation:
 * - Loads machine-specific safety envelope JSON files
 * - Caches loaded envelopes for performance
 * - Type-safe with validation
 * - Error handling with fallbacks
 * 
 * Purpose: Load and validate safety envelope configurations for machines
 */

import type { CollisionCheckResult } from '@/components/fabricator/safety/ToolpathPreviewModal';

export interface SafetyEnvelope {
  machineId: string;
  machineName: string;
  manufacturer: string;
  version: string;
  lastUpdated: string;
  travelLimits: {
    x: { min: number; max: number; unit: string; description: string };
    y: { min: number; max: number; unit: string; description: string };
    z: { min: number; max: number; unit: string; description: string };
    a?: { min: number; max: number; unit: string; description: string };
  };
  clampZones: Array<{
    id: string;
    x: { min: number; max: number };
    y: { min: number; max: number };
    z: { min: number; max: number };
    description: string;
  }>;
  safetyEnvelopes: {
    rapidMove: { maxSpeed: number; unit: string; description: string };
    cuttingMove: { maxSpeed: number; unit: string; description: string };
    aAxisRotation?: { maxSpeed: number; unit: string; description: string };
    emergencyStop: {
      enabled: boolean;
      triggerZones: Array<{
        x: { min: number; max: number };
        y: { min: number; max: number };
        z: { min: number; max: number };
        a?: { min: number; max: number };
      }>;
      description: string;
    };
  };
  materialLimits: {
    maxThickness: number;
    minThickness: number;
    unit: string;
    supportedMaterials: string[];
    maxProfileHeight?: number;
    minProfileHeight?: number;
    maxProfileWidth?: number;
    minProfileWidth?: number;
    maxProfileLength?: number;
    minProfileLength?: number;
  };
  toolLimits: {
    maxToolDiameter: number;
    minToolDiameter: number;
    unit: string;
    supportedTools?: number[];
    maxToolDepth?: number;
    toolCapacity?: number;
    maxToolWeight?: number;
    unitWeight?: string;
    toolHolder?: string;
    description?: string;
  };
  validationRules: Array<{
    rule: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
  cncAxes?: number;
  spindleSpeed?: { max: number; unit: string; description: string };
  programmingLanguage?: string;
  programmingSoftware?: string;
  macroSupport?: boolean;
  automaticClampPositioning?: boolean;
  clampPositioningSoftware?: string;
  operationLimits?: {
    supportedOperations: string[];
    description: string;
  };
  feedRateLimits?: {
    x: number;
    y: number;
    z: number;
    a?: number;
    unit: string;
    description: string;
  };
  spindleLimits?: {
    maxSpeed: number;
    unit: string;
    maxPowerS1?: number;
    maxPowerS6?: number;
    unitPower?: string;
    description: string;
  };
}

/**
 * Safety Envelope Loader
 * 
 * Loads and caches safety envelope configurations
 */
export class SafetyEnvelopeLoader {
  private static cache: Map<string, SafetyEnvelope> = new Map();
  private static loadingPromises: Map<string, Promise<SafetyEnvelope>> = new Map();

  /**
   * Load safety envelope for a machine
   */
  static async load(machineId: string): Promise<SafetyEnvelope | null> {
    // Check cache first
    if (this.cache.has(machineId)) {
      return this.cache.get(machineId)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(machineId)) {
      return this.loadingPromises.get(machineId)!;
    }

    // Start loading
    const loadPromise = this.loadEnvelope(machineId);
    this.loadingPromises.set(machineId, loadPromise);

    try {
      const envelope = await loadPromise;
      this.cache.set(machineId, envelope);
      return envelope;
    } catch (error) {
      console.error(`Failed to load safety envelope for ${machineId}:`, error);
      return null;
    } finally {
      this.loadingPromises.delete(machineId);
    }
  }

  /**
   * Load envelope from JSON file
   */
  private static async loadEnvelope(machineId: string): Promise<SafetyEnvelope> {
    // Map machine IDs to file paths
    const machineIdToPath: Record<string, string> = {
      'yilmaz_w60': '/data/safety_profiles/yilmaz_w60.json',
      'elumatec_sbz151': '/data/safety_profiles/elumatec_sbz151.json',
      'yilmaz_alm_6510': '/data/safety_profiles/yilmaz_alm_6510.json',
      'yilmaz_aim_3410': '/data/safety_profiles/yilmaz_aim_3410.json',
      'alm-6510': '/data/safety_profiles/yilmaz_alm_6510.json',
      'aim-3410': '/data/safety_profiles/yilmaz_aim_3410.json',
    };

    const filePath = machineIdToPath[machineId];
    if (!filePath) {
      throw new Error(`No safety envelope file found for machine: ${machineId}`);
    }

    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch safety envelope: ${response.statusText}`);
      }

      const envelope = (await response.json()) as SafetyEnvelope;

      // Validate envelope structure
      this.validateEnvelope(envelope);

      return envelope;
    } catch (error) {
      // Try alternative path (for development)
      const altPath = `/src/data/safety_profiles/${machineId.replace(/-/g, '_')}.json`;
      try {
        const response = await fetch(altPath);
        if (!response.ok) {
          throw error; // Re-throw original error
        }
        const envelope = (await response.json()) as SafetyEnvelope;
        this.validateEnvelope(envelope);
        return envelope;
      } catch {
        throw error;
      }
    }
  }

  /**
   * Validate envelope structure
   */
  private static validateEnvelope(envelope: SafetyEnvelope): void {
    if (!envelope.machineId || !envelope.travelLimits || !envelope.safetyEnvelopes) {
      throw new Error('Invalid safety envelope structure');
    }

    // Validate travel limits
    const { x, y, z } = envelope.travelLimits;
    if (!x || !y || !z) {
      throw new Error('Missing travel limits in safety envelope');
    }

    if (x.min >= x.max || y.min >= y.max || z.min >= z.max) {
      throw new Error('Invalid travel limits: min must be less than max');
    }
  }

  /**
   * Get travel limits for a machine
   */
  static async getTravelLimits(machineId: string): Promise<CollisionCheckResult['travelLimits'] | null> {
    const envelope = await this.load(machineId);
    if (!envelope) return null;

    return {
      x: envelope.travelLimits.x,
      y: envelope.travelLimits.y,
      z: envelope.travelLimits.z,
    };
  }

  /**
   * Check if a position is within travel limits
   */
  static async validatePosition(
    machineId: string,
    position: { x: number; y: number; z: number; a?: number }
  ): Promise<{ valid: boolean; errors: string[] }> {
    const envelope = await this.load(machineId);
    if (!envelope) {
      return { valid: false, errors: [`No safety envelope found for machine: ${machineId}`] };
    }

    const errors: string[] = [];
    const { travelLimits } = envelope;

    // Check X axis
    if (position.x < travelLimits.x.min || position.x > travelLimits.x.max) {
      errors.push(
        `X position ${position.x}mm out of range (${travelLimits.x.min}-${travelLimits.x.max}mm)`
      );
    }

    // Check Y axis
    if (position.y < travelLimits.y.min || position.y > travelLimits.y.max) {
      errors.push(
        `Y position ${position.y}mm out of range (${travelLimits.y.min}-${travelLimits.y.max}mm)`
      );
    }

    // Check Z axis
    if (position.z < travelLimits.z.min || position.z > travelLimits.z.max) {
      errors.push(
        `Z position ${position.z}mm out of range (${travelLimits.z.min}-${travelLimits.z.max}mm)`
      );
    }

    // Check A axis (if present)
    if (position.a !== undefined && travelLimits.a) {
      if (position.a < travelLimits.a.min || position.a > travelLimits.a.max) {
        errors.push(
          `A angle ${position.a}° out of range (${travelLimits.a.min}°-${travelLimits.a.max}°)`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a position intersects with clamp zones
   */
  static async checkClampZones(
    machineId: string,
    position: { x: number; y: number; z: number }
  ): Promise<{ intersects: boolean; zones: string[] }> {
    const envelope = await this.load(machineId);
    if (!envelope) {
      return { intersects: false, zones: [] };
    }

    const intersectingZones: string[] = [];

    for (const zone of envelope.clampZones) {
      const inX = position.x >= zone.x.min && position.x <= zone.x.max;
      const inY = position.y >= zone.y.min && position.y <= zone.y.max;
      const inZ = position.z >= zone.z.min && position.z <= zone.z.max;

      if (inX && inY && inZ) {
        intersectingZones.push(zone.id);
      }
    }

    return {
      intersects: intersectingZones.length > 0,
      zones: intersectingZones,
    };
  }

  /**
   * Clear cache (useful for testing or reloading)
   */
  static clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

