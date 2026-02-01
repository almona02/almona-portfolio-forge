import React from 'react';
import { Slider } from '@/shared/ui/ui/slider';
import { Label } from '@/shared/ui/ui/label';
import { Card, CardContent } from '@/shared/ui/ui/card';

interface PriceRangeFilterProps {
  minPrice: number;
  maxPrice: number;
  currentRange: [number, number];
  onRangeChange: (range: [number, number]) => void;
  currency?: string;
}

/**
 * PriceRangeFilter Component
 * 
 * Provides an intuitive price range slider for filtering used machines
 * Supports Egyptian Pounds (EGP) formatting and responsive design
 */
const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  minPrice,
  maxPrice,
  currentRange,
  onRangeChange,
  currency = 'EGP'
}) => {
  
  const _formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price).replace('EGP', currency);
  };

  const formatCompactPrice = (price: number): string => {
    if (price >= 1000000) {
      return `${currency} ${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return `${currency} ${(price / 1000).toFixed(0)}K`;
    }
    return `${currency} ${price.toLocaleString()}`;
  };

  return (
    <Card className="bg-almona-darker border-almona-light/20">
      <CardContent className="p-4">
        <Label className="typography-label text-sm font-medium text-almona-light mb-3 block">
          Price Range
        </Label>
        
        <div className="space-y-4">
          {/* Price range display */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-amber-400 font-semibold">
              {formatCompactPrice(currentRange[0])}
            </span>
            <span className="text-almona-light/60">to</span>
            <span className="text-amber-400 font-semibold">
              {formatCompactPrice(currentRange[1])}
            </span>
          </div>

          {/* Dual-thumb slider */}
          <div className="px-2">
            <Slider
              min={minPrice}
              max={maxPrice}
              step={1000}
              value={currentRange}
              onValueChange={(value) => onRangeChange(value as [number, number])}
              className="w-full"
              // Custom styling for orange theme
              style={{
                '--slider-track': '#f97316',
                '--slider-range': '#ea580c',
                '--slider-thumb': '#fb923c'
              } as React.CSSProperties}
            />
          </div>

          {/* Min/Max labels */}
          <div className="flex justify-between text-xs text-almona-light/50">
            <span>{formatCompactPrice(minPrice)}</span>
            <span>{formatCompactPrice(maxPrice)}</span>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap gap-1 mt-3">
            {[
              { label: 'Under 100K', range: [minPrice, 100000] as [number, number] },
              { label: '100K-200K', range: [100000, 200000] as [number, number] },
              { label: 'Over 200K', range: [200000, maxPrice] as [number, number] },
              { label: 'All', range: [minPrice, maxPrice] as [number, number] }
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => onRangeChange(preset.range)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  currentRange[0] === preset.range[0] && currentRange[1] === preset.range[1]
                    ? 'bg-amber-600 text-white'
                    : 'bg-almona-dark text-almona-light/70 hover:bg-almona-light/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceRangeFilter;