/**
 * Auto Remnant Generator
 * Automatically generates remnants after job completion
 */

import { RemnantManager, type Remnant } from './RemnantManager';
import type { CuttingPlan, Cut } from '@/types/fabricator';
import { supabase } from '../supabase';

export interface RemnantGenerationResult {
  remnantsCreated: number;
  remnants: Remnant[];
  totalValue: number;
}

export class AutoRemnantGenerator {
  private remnantManager: RemnantManager;
  private minRemnantLength: number = 200; // Minimum usable remnant length in mm

  constructor() {
    this.remnantManager = new RemnantManager();
  }

  /**
   * Generate remnants from cutting plan after job completion
   */
  async generateRemnantsFromCuttingPlan(
    cuttingPlan: CuttingPlan[],
    projectId: string,
    userId: string,
    options?: {
      generateQRCodes?: boolean;
      locationId?: string;
    }
  ): Promise<RemnantGenerationResult> {
    const remnants: Remnant[] = [];
    let totalValue = 0;

    for (const plan of cuttingPlan) {
      const stockLength = plan.stockLength || 6000;
      const profile = plan.profile;

      // Calculate total cut length for this plan
      const totalCutLength = plan.cuts.reduce((sum, cut) => {
        return sum + cut.length * (cut.quantity || 1);
      }, 0);

      // Calculate remnant for each stock bar used
      const barsUsed = Math.ceil(totalCutLength / stockLength);
      const totalMaterialUsed = barsUsed * stockLength;
      const totalWaste = totalMaterialUsed - totalCutLength;

      // If there's significant waste (> minRemnantLength), create remnant
      if (totalWaste >= this.minRemnantLength) {
        // Distribute waste across bars (simplified - in production would track per bar)
        const remnantLength = totalWaste / barsUsed;

        if (remnantLength >= this.minRemnantLength) {
          // Create remnant for each bar (simplified - creates one remnant per plan)
          const remnant: Remnant = {
            id: `remnant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
            profileId: profile.id,
            profile,
            locationId: options?.locationId,
            length: Math.floor(remnantLength),
            sourceProjectId: projectId,
            sourceStockLength: stockLength,
            createdAt: new Date(),
            lastCheckedAt: new Date(),
            status: 'available',
            quality: 'good',
            estimatedValue: (remnantLength / 1000) * (profile.cost_per_meter || 0) * 0.8, // 80% of cost
            usageCount: 0,
          };

          // Generate QR code if requested
          if (options?.generateQRCodes) {
            remnant.barcode = `R-${remnant.id.substring(0, 8).toUpperCase()}`;
            // In production, would generate actual QR code image and upload to storage
            // remnant.qrCodeUrl = await generateQRCode(remnant.barcode);
          }

          remnants.push(remnant);
          totalValue += remnant.estimatedValue;
        }
      }
    }

    // Save remnants to database
    if (remnants.length > 0) {
      await this.saveRemnants(remnants);
    }

    return {
      remnantsCreated: remnants.length,
      remnants,
      totalValue,
    };
  }

  /**
   * Save remnants to database
   */
  private async saveRemnants(remnants: Remnant[]): Promise<void> {
    try {
      const { error } = await supabase.from('material_remnants').insert(
        remnants.map((r) => ({
          user_id: r.userId,
          profile_id: r.profileId,
          location_id: r.locationId,
          length: r.length,
          source_project_id: r.sourceProjectId,
          source_stock_length: r.sourceStockLength,
          status: r.status,
          quality: r.quality,
          estimated_value: r.estimatedValue,
          barcode: r.barcode,
          qr_code_url: r.qrCodeUrl,
        }))
      );

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save remnants:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for remnant (placeholder - would use qrcode library)
   */
  async generateQRCode(barcode: string): Promise<string> {
    // In production, would use qrcode library to generate image
    // and upload to Supabase Storage
    // For now, return placeholder URL
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(barcode)}`;
  }
}

export const autoRemnantGenerator = new AutoRemnantGenerator();

