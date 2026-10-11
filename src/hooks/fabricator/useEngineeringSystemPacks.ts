import { SYSTEM_PACKS } from '@/data/systemPacks';
import { loadCustomSystemsFromSupabase } from '@/lib/fabricator/systemPackSupabase';
import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';

type EngineeringPacks = typeof SYSTEM_PACKS;

/**
 * Owner-scoped result cache with in-flight de-duplication.
 *
 * Nine studio surfaces mount this hook (engineering bay, project studio, project
 * summary, BOM review, tuning studio, workflow bar, optimize, produce, quote), and
 * previously every mount issued its own remote round trip - several per page view -
 * which made studio navigation slow. Requests for the same owner now share one
 * result.
 *
 * The cache is keyed by owner id, is never shared between owners, and is dropped on
 * sign-out and when a custom profile is added (the same invalidation the hook always
 * relied on), so it cannot serve another tenant's packs or stale edits.
 */
const packCache = new Map<string, EngineeringPacks>();
const inFlight = new Map<string, Promise<EngineeringPacks>>();

export function invalidateEngineeringSystemPacks(ownerId?: string): void {
  if (ownerId) packCache.delete(ownerId);
  else packCache.clear();
}

async function loadEngineeringSystemPacksCached(ownerId: string): Promise<EngineeringPacks> {
  const cached = packCache.get(ownerId);
  if (cached) return cached;
  const pending = inFlight.get(ownerId);
  if (pending) return pending;
  const request = loadCustomSystemsFromSupabase(ownerId)
    .then((packs) => {
      const resolved = packs.filter((pack) => !pack.isArchived) as EngineeringPacks;
      packCache.set(ownerId, resolved);
      return resolved;
    })
    .finally(() => {
      inFlight.delete(ownerId);
    });
  inFlight.set(ownerId, request);
  return request;
}

/** Load only the authenticated owner's persisted packs, never another owner's. */
export function useEngineeringSystemPacks() {
  const [owned, setOwned] = useState<EngineeringPacks>([]);
  useEffect(() => {
    let generation = 0;
    let disposed = false;
    const refresh = async (ownerId?: string) => {
      const request = ++generation;
      setOwned([]);
      if (!ownerId || disposed || request !== generation) return;
      const packs = await loadEngineeringSystemPacksCached(ownerId);
      if (!disposed && request === generation) setOwned(packs);
    };
    const listener = supabase.auth.onAuthStateChange((event, session) => {
      // An owner-scoped cache must never outlive the session that populated it.
      if (event === 'SIGNED_OUT') invalidateEngineeringSystemPacks();
      void refresh(session?.user.id).catch(() => { if (!disposed) setOwned([]); });
    });
    const reload = () => {
      void supabase.auth.getUser().then(({ data }) => refresh(data.user?.id)).catch(() => {});
    };
    const onProfileAdded = () => {
      invalidateEngineeringSystemPacks();
      reload();
    };
    reload();
    window.addEventListener('customProfileAdded', onProfileAdded);
    return () => {
      disposed = true;
      ++generation;
      listener.data.subscription.unsubscribe();
      window.removeEventListener('customProfileAdded', onProfileAdded);
    };
  }, []);
  return useMemo(() => [...SYSTEM_PACKS.filter(pack => !owned.some(custom => custom.meta.id === pack.meta.id)), ...owned], [owned]);
}