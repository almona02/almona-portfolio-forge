import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { AlertCircle, DollarSign, Save } from 'lucide-react';
import type { Profile } from '@/types/fabricator';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Rock60PricingSetupProps {
  profiles: Profile[];
  userId?: string;
}

type Rock60PricingState = {
  currency: string;
  framePricePerMeter: number;
  sashPricePerMeter: number;
  beadPricePerMeter: number;
  glassPricePerSquareMeter: number;
  hardware: Record<string, number>;
  gaskets: Record<string, number>;
};

/**
 * Rock60PricingSetup
 * Guided pricing editor for ROCK 60 system elements (profiles, glass, hardware, gaskets).
 * Persists values into ROCK 60 template profile specifications under rock60_pricing.
 */
export const Rock60PricingSetup: React.FC<Rock60PricingSetupProps> = ({ profiles, userId }) => {
  const rockProfile = useMemo(
    () =>
      profiles.find(
        (p) =>
          p.systemBrand === 'ROCK 60' ||
          (p.specifications && (p.specifications as any).window_system === 'ROCK 60')
      ),
    [profiles]
  );

  const existingPricing = (rockProfile?.specifications as any)?.rock60_pricing as
    | (Rock60PricingState & { initialized?: boolean })
    | undefined;

  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<Rock60PricingState>(() => ({
    currency: existingPricing?.currency || 'USD',
    framePricePerMeter: existingPricing?.framePricePerMeter ?? 0,
    sashPricePerMeter: existingPricing?.sashPricePerMeter ?? 0,
    beadPricePerMeter: existingPricing?.beadPricePerMeter ?? 0,
    glassPricePerSquareMeter: existingPricing?.glassPricePerSquareMeter ?? 0,
    hardware: {
      '0253': existingPricing?.hardware?.['0253'] ?? 0,
      '0707': existingPricing?.hardware?.['0707'] ?? 0,
      'KIT 10451': existingPricing?.hardware?.['KIT 10451'] ?? 0,
      ...existingPricing?.hardware,
    },
    gaskets: {
      'GT 0122': existingPricing?.gaskets?.['GT 0122'] ?? 0,
      'GT 0118': existingPricing?.gaskets?.['GT 0118'] ?? 0,
      'GT 0137': existingPricing?.gaskets?.['GT 0137'] ?? 0,
      'GT 0146': existingPricing?.gaskets?.['GT 0146'] ?? 0,
      'GT 0152': existingPricing?.gaskets?.['GT 0152'] ?? 0,
      ...existingPricing?.gaskets,
    },
  }));

  const isConfigured = !!existingPricing?.initialized;

  if (!rockProfile) {
    return null;
  }

  const handleChange = (field: keyof Rock60PricingState, value: number | string) => {
    setState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleHardwareChange = (code: string, value: number) => {
    setState((prev) => ({
      ...prev,
      hardware: {
        ...prev.hardware,
        [code]: value,
      },
    }));
  };

  const handleGasketChange = (code: string, value: number) => {
    setState((prev) => ({
      ...prev,
      gaskets: {
        ...prev.gaskets,
        [code]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!userId || !rockProfile) {
      toast.error('User ID or ROCK 60 template not available');
      return;
    }

    try {
      setSaving(true);

      const nextSpecs = {
        ...(rockProfile.specifications || {}),
        rock60_pricing: {
          ...state,
          initialized: true,
        },
      };

      const { error } = await supabase
        .from('fabricator_profiles')
        .update({ specifications: nextSpecs })
        .eq('id', rockProfile.id)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      toast.success('ROCK 60 pricing saved');
    } catch (error) {
      console.error('Error saving ROCK 60 pricing:', error);
      toast.error('Failed to save ROCK 60 pricing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-gray-900/70 border-gray-700">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm flex items-center gap-2">
            ROCK 60 Pricing Setup
            <Badge
              variant={isConfigured ? 'outline' : 'destructive'}
              className="text-[10px]"
            >
              {isConfigured ? 'Configured' : 'Required'}
            </Badge>
          </CardTitle>
          <CardDescription className="text-[11px]">
            Set base prices for all ROCK 60 elements: profiles, glass, hardware, and gaskets.
          </CardDescription>
        </div>
        <DollarSign className="h-4 w-4 text-green-400" />
      </CardHeader>
      <CardContent className="space-y-4 text-[11px]">
        {!isConfigured && (
          <Alert className="bg-yellow-900/20 border-yellow-700 text-[11px]">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              First time setup: please review and fill prices before using ROCK 60 for quotations.
            </AlertDescription>
          </Alert>
        )}

        {/* Profiles */}
        <div className="space-y-2">
          <div className="font-semibold text-gray-200">Profiles (per meter)</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="flex justify-between mb-1">
                <span>Frame RC 6111-8</span>
                <span className="text-gray-500 text-[10px]">1 061 1138</span>
              </div>
              <Input
                type="number"
                step="0.01"
                value={state.framePricePerMeter}
                onChange={(e) => handleChange('framePricePerMeter', parseFloat(e.target.value) || 0)}
                placeholder={`Price / m (${state.currency})`}
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Sash RC 6122</span>
                <span className="text-gray-500 text-[10px]">1 061 1300</span>
              </div>
              <Input
                type="number"
                step="0.01"
                value={state.sashPricePerMeter}
                onChange={(e) => handleChange('sashPricePerMeter', parseFloat(e.target.value) || 0)}
                placeholder={`Price / m (${state.currency})`}
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Bead RC 6166</span>
                <span className="text-gray-500 text-[10px]">1 061 6180</span>
              </div>
              <Input
                type="number"
                step="0.01"
                value={state.beadPricePerMeter}
                onChange={(e) => handleChange('beadPricePerMeter', parseFloat(e.target.value) || 0)}
                placeholder={`Price / m (${state.currency})`}
              />
            </div>
          </div>
        </div>

        {/* Glass */}
        <div className="space-y-2">
          <div className="font-semibold text-gray-200">Glass</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 text-gray-400">
              Double Glass 24mm – dimensions per job: (L - 167) × (H - 167).
            </div>
            <div>
              <div className="mb-1">Price per m²</div>
              <Input
                type="number"
                step="0.01"
                value={state.glassPricePerSquareMeter}
                onChange={(e) =>
                  handleChange('glassPricePerSquareMeter', parseFloat(e.target.value) || 0)
                }
                placeholder={`Price / m² (${state.currency})`}
              />
            </div>
          </div>
        </div>

        {/* Hardware */}
        <div className="space-y-2">
          <div className="font-semibold text-gray-200">Hardware (per piece / set)</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { code: '0253', label: 'Hinges (2 pcs)' },
              { code: '0707', label: 'Common Handle (1 pc)' },
              { code: 'KIT 10451', label: 'Locking Kit (1 set)' },
            ].map((hw) => (
              <div key={hw.code}>
                <div className="mb-1 flex justify-between">
                  <span>{hw.code}</span>
                  <span className="text-gray-500 text-[10px]">{hw.label}</span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={state.hardware[hw.code] ?? 0}
                  onChange={(e) => handleHardwareChange(hw.code, parseFloat(e.target.value) || 0)}
                  placeholder={`Price (${state.currency})`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Gaskets */}
        <div className="space-y-2">
          <div className="font-semibold text-gray-200">Gaskets (per meter)</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { code: 'GT 0122', label: 'Glass Gasket' },
              { code: 'GT 0118', label: 'Glass Gasket' },
              { code: 'GT 0137', label: 'Central Gasket' },
              { code: 'GT 0146', label: 'Sash Striker Gasket' },
              { code: 'GT 0152', label: 'Frame Gasket' },
            ].map((g) => (
              <div key={g.code}>
                <div className="mb-1 flex justify-between">
                  <span>{g.code}</span>
                  <span className="text-gray-500 text-[10px]">{g.label}</span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={state.gaskets[g.code] ?? 0}
                  onChange={(e) => handleGasketChange(g.code, parseFloat(e.target.value) || 0)}
                  placeholder={`Price / m (${state.currency})`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !userId}
            className="bg-orange-500 hover:bg-orange-600 text-xs"
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save ROCK 60 Pricing'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Rock60PricingSetup;


