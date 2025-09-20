import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OptionItem { id: string; label: string; price: number }
interface Options { [category: string]: OptionItem[] }

interface Props {
  product: { id: string; sku?: string; name_en?: string; name_ar?: string; price?: number | null };
  onAddToQuote?: (payload: { productId: string; configurations: Record<string, string>; totalPrice: number }) => void;
}

export const IndustrialProductConfigurator: React.FC<Props> = ({ product, onAddToQuote }) => {
  const basePrice = product.price ?? 0;
  const [configurations, setConfigurations] = useState<Record<string, string>>({});

  const options: Options = useMemo(() => ({
    automation: [
      { id: 'basic', label: 'Basic Manual', price: 0 },
      { id: 'semi', label: 'Semi-Automatic', price: 5000 },
      { id: 'full', label: 'Fully Automatic', price: 15000 }
    ],
    tooling: [
      { id: 'standard', label: 'Standard Tooling', price: 0 },
      { id: 'premium', label: 'Premium Tooling', price: 8000 }
    ]
  }), []);

  const priceAdjustment = useMemo(() => {
    let add = 0;
    for (const [category, value] of Object.entries(configurations)) {
      const opt = options[category]?.find(o => o.id === value);
      if (opt) add += opt.price;
    }
    return add;
  }, [configurations, options]);

  const totalPrice = basePrice + priceAdjustment;

  const handleOptionSelect = (category: string, value: string) => {
    setConfigurations(prev => ({ ...prev, [category]: value }));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Configure Your Machine</h3>
      {Object.entries(options).map(([category, items]) => (
        <div key={category} className="space-y-2">
          <div className="text-sm font-medium capitalize">{category}</div>
          <div className="w-full">
          <Select value={configurations[category] ?? ''} onValueChange={(value) => handleOptionSelect(category, value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              {items.map(item => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label} (+{item.price.toLocaleString()} EGP)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between p-3 rounded-md bg-muted">
        <div className="text-sm">Total</div>
        <div className="text-base font-semibold">{totalPrice.toLocaleString()} EGP</div>
      </div>
      <Button
        onClick={() => onAddToQuote?.({ productId: product.id, configurations, totalPrice })}
      >
        Add Configured Machine to Quote
      </Button>
    </div>
  );
};

export default IndustrialProductConfigurator;
