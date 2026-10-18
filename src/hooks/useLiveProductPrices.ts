import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Normalize a machine name / SKU so hyphens, spaces and case never break the match:
 * "ACK-420-S" -> "ACK 420 S", "ack 420 s" -> "ACK 420 S".
 */
function normalizeKey(value: string): string {
  return (value || '').toUpperCase().replace(/[\s\-_.]+/g, ' ').trim();
}

/**
 * Fetches live product prices from the `products` table (public read) and returns a
 * lookup function keyed by normalized SKU/model. Returns undefined for unpriced items.
 */
export function useLiveProductPrices(): (name: string) => number | undefined {
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
          if (Number.isFinite(v) && v > 0) map.set(normalizeKey(row.sku), v);
        }
        setPrices(map);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return useCallback((name: string) => prices.get(normalizeKey(name)), [prices]);
}
