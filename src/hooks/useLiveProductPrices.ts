import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Fetches live product prices from the `products` table (public read),
 * keyed by SKU (machine model number). Returns an empty map until loaded.
 */
export function useLiveProductPrices(): Map<string, number> {
  const [prices, setPrices] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let mounted = true;
    void supabase
      .from('products')
      .select('sku,price')
      .eq('is_active', true)
      .then(({ data }) => {
        if (!mounted) return;
        const map = new Map<string, number>();
        for (const row of (data ?? []) as { sku: string; price: number | string | null }[]) {
          if (row.price == null) continue;
          const v = Number(row.price);
          if (Number.isFinite(v) && v > 0) map.set(row.sku, v);
        }
        setPrices(map);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return prices;
}
