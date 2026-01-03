/**
 * useLivePricing Hook
 * Reactive pricing hook that updates in real-time as components change
 */

import { PricingEngine } from '@/lib/pricing/PricingEngine';
import type { Profile, WindowComponent } from '@/types/fabricator';
import { useCallback, useEffect, useState } from 'react';

export interface LivePricingData {
  totalCost: number;
  breakdown: {
    aluminum: number;
    glass: number;
    accessories: number;
    labor: number;
  };
  currency: string;
  loading: boolean;
  error: string | null;
}

export interface UseLivePricingOptions {
  components: WindowComponent[];
  profiles: Profile[];
  currency?: string;
  region?: 'egypt' | 'turkey' | 'global';
  enabled?: boolean;
}

export function useLivePricing({
  components,
  profiles,
  currency = 'EGP',
  region = 'egypt',
  enabled = true,
}: UseLivePricingOptions): LivePricingData {
  const [pricingData, setPricingData] = useState<LivePricingData>({
    totalCost: 0,
    breakdown: {
      aluminum: 0,
      glass: 0,
      accessories: 0,
      labor: 0,
    },
    currency,
    loading: false,
    error: null,
  });

  const calculatePricing = useCallback(async () => {
    if (!enabled || components.length === 0) {
      setPricingData((prev) => ({
        ...prev,
        totalCost: 0,
        breakdown: {
          aluminum: 0,
          glass: 0,
          accessories: 0,
          labor: 0,
        },
        loading: false,
      }));
      return;
    }

    setPricingData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const _pricingEngine = new PricingEngine({
        region,
        currency: currency as any,
      });

      let totalAluminum = 0;
      let totalGlass = 0;
      let totalAccessories = 0;

      // Calculate material costs
      for (const component of components) {
        const profile = component.profile || profiles.find((p) => p.id === component.profile?.id);
        if (profile) {
          // Use first cutting length or calculate from component dimensions
          const componentLength = component.cuttingLengths?.[0] || 
            Math.max(component.width, component.height) || 0;
          const lengthM = componentLength / 1000;
          const costPerMeter = profile.costPerMeter || 0;
          const cost = costPerMeter * lengthM * (component.quantity || 1);
          totalAluminum += cost;
        }
      }

      // Estimate glass cost (simplified - would use actual glass pricing engine)
      // This is a placeholder - in production, would calculate based on actual glass dimensions
      const totalLength = components.reduce(
        (sum, c) => {
          const componentLength = c.cuttingLengths?.[0] || 
            Math.max(c.width, c.height) || 0;
          return sum + componentLength * (c.quantity || 1);
        },
        0
      );
      const estimatedAreaM2 = (totalLength / 1000) * 0.5; // Rough estimate
      totalGlass = estimatedAreaM2 * 500; // 500 EGP per m2 estimate

      // Estimate accessories (simplified)
      totalAccessories = components.length * 50; // 50 EGP per component estimate

      // Estimate labor (30% of material cost)
      const totalLabor = (totalAluminum + totalGlass) * 0.3;

      const totalCost = totalAluminum + totalGlass + totalAccessories + totalLabor;

      setPricingData({
        totalCost,
        breakdown: {
          aluminum: totalAluminum,
          glass: totalGlass,
          accessories: totalAccessories,
          labor: totalLabor,
        },
        currency,
        loading: false,
        error: null,
      });
    } catch (error) {
      setPricingData((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to calculate pricing',
      }));
    }
  }, [components, profiles, currency, region, enabled]);

  useEffect(() => {
    // Debounce calculation to avoid excessive recalculations
    const timeoutId = setTimeout(() => {
      void calculatePricing();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [calculatePricing]);

  return pricingData;
}

