import {
    PricingEngine,
    STUB_METAL_INDICES,
    checkMetalPriceAlert,
    type MetalAlert,
    type PricingConfiguration,
} from '@/lib/pricing/PricingEngine';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import type { FabricatorAccessory, Profile, WindowUnit } from '@/types/fabricator';
import React, { useEffect, useState } from 'react';

interface PricingPreviewProps {
  project: WindowUnit | null;
  profiles: Profile[];
  accessories?: FabricatorAccessory[];
  region: 'turkey' | 'egypt' | 'mena' | 'gulf' | 'global';
}

// Basic stub config – in production this will come from admin-configured
// pricing settings per tenant/region.
const getStubPricingConfig = (region: PricingPreviewProps['region']): PricingConfiguration => {
  // Map extended regions to base regions
  let baseRegion: 'turkey' | 'egypt' | 'global';
  if (region === 'mena' || region === 'gulf') {
    baseRegion = 'egypt';
  } else if (region === 'turkey' || region === 'egypt' || region === 'global') {
    baseRegion = region;
  } else {
    baseRegion = 'global';
  }
  
  return {
    region: baseRegion,
    currency: region === 'turkey' ? 'TRY' : region === 'egypt' ? 'EGP' : 'USD',
    isActive: true,
    materialMarkupPercentage: 35,
    laborMarkupPercentage: 50,
    hardwareMarkupPercentage: 40,
    glazingMarkupPercentage: 30,
    installationMarkupPercentage: 45,
    defaultTaxRate: region === 'turkey' ? 18 : region === 'egypt' ? 14 : 20,
    taxName: 'VAT',
    minProfitMargin: 25,
    maxDiscountPercentage: 15,
    roundingMethod: 'standard',
    roundingPrecision: 2,
    settings: {},
    metalIndex: region === 'egypt' ? STUB_METAL_INDICES.LOCAL_EGYPT : STUB_METAL_INDICES.LME_TURKEY,
  };
};

export const PricingPreview: React.FC<PricingPreviewProps> = ({
  project,
  profiles,
  accessories: _accessories = [],
  region,
}) => {
  const [materialTotal, setMaterialTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [metalAlert, setMetalAlert] = useState<MetalAlert | null>(null);
  const [currency, setCurrency] = useState<string>('USD');

  useEffect(() => {
    const run = async () => {
      if (!project || !project.components || project.components.length === 0) {
        setMaterialTotal(null);
        setMetalAlert(null);
        return;
      }

      setIsLoading(true);
      try {
        const config = getStubPricingConfig(region);
        const engine = new PricingEngine(config);
        setCurrency(config.currency);

        // Aggregate total length per profile across all components
        const lengthByProfileId = new Map<string, number>();
        project.components.forEach((component) => {
          const profileId = component.profile.id;
          const totalLenMm =
            component.cuttingLengths?.reduce((sum, len) => sum + len, 0) ?? 0;
          lengthByProfileId.set(
            profileId,
            (lengthByProfileId.get(profileId) ?? 0) + totalLenMm,
          );
        });

        let materialSum = 0;
        for (const [profileId, totalLenMm] of lengthByProfileId.entries()) {
          const profile = profiles.find((p) => p.id === profileId);
          if (!profile) continue;
          const perMeter = await engine.calculateMaterialPrice(profile, 1);
          const meters = totalLenMm / 1000;
          materialSum += perMeter.total * meters;
        }

        setMaterialTotal(materialSum);
        setMetalAlert(checkMetalPriceAlert(config.metalIndex));
      } catch (err) {
        console.error('Pricing preview calculation failed:', err);
        setMaterialTotal(null);
        setMetalAlert(null);
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [project, profiles, region]);

  // If there is no active project yet, keep the card dormant.
  if (!project) {
    return (
      <Card className="bg-gray-800/60 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            Pricing Preview
            <Badge variant="outline" className="text-[10px]">
              Beta
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-500">
          Create or select a project to see a quick pricing preview.
        </CardContent>
      </Card>
    );
  }

  if (isLoading || materialTotal === null) {
    return (
      <Card className="bg-gray-800/60 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            Pricing Preview
            <Badge variant="outline" className="text-[10px]">
              Metal-indexed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-400">
          Calculating metal-indexed material pricing...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/60 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            Pricing Preview
            <Badge variant="outline" className="text-[10px]">
              Metal-indexed
            </Badge>
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {currency}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-gray-300">
        {metalAlert && (
          <div
            className={`rounded border px-2 py-1 text-[11px] ${
              metalAlert.severity === 'high'
                ? 'border-red-500/60 bg-red-900/30 text-red-200'
                : metalAlert.severity === 'medium'
                ? 'border-amber-500/60 bg-amber-900/30 text-amber-100'
                : 'border-sky-500/60 bg-sky-900/30 text-sky-100'
            }`}
          >
            {metalAlert.message}
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-gray-400">Estimated material cost (profiles)</span>
          <span className="font-semibold">
            {materialTotal.toFixed(2)} {currency}
          </span>
        </div>

        <p className="text-[11px] text-gray-500 border-t border-gray-700 pt-2">
          This preview uses stub regional pricing and metal indices. Wire it into your quoting
          engine once you are ready to expose full price breakdowns and margins.
        </p>
      </CardContent>
    </Card>
  );
};

export default PricingPreview;


