import { SYSTEM_PACKS } from '@/data/systemPacks';
import { loadCustomSystemsFromSupabase } from '@/lib/fabricator/systemPackSupabase';
import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';

/** Load only the authenticated owner's persisted packs, never a shared browser cache. */
export function useEngineeringSystemPacks() {
  const [owned, setOwned] = useState<typeof SYSTEM_PACKS>([]);
  useEffect(() => {
    let generation = 0;
    let disposed = false;
    const refresh = async (ownerId?: string) => {
      const request = ++generation;
      setOwned([]);
      if (!ownerId || disposed || request !== generation) return;
      const packs = await loadCustomSystemsFromSupabase(ownerId);
      if (!disposed && request === generation) {
        setOwned(packs.filter(pack => !pack.isArchived) as typeof SYSTEM_PACKS);
      }
    };
    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      void refresh(session?.user.id).catch(() => { if (!disposed) setOwned([]); });
    });
    const reload = () => {
      void supabase.auth.getUser().then(({ data }) => refresh(data.user?.id)).catch(() => {});
    };
    reload();
    window.addEventListener('customProfileAdded', reload);
    return () => {
      disposed = true;
      ++generation;
      listener.data.subscription.unsubscribe();
      window.removeEventListener('customProfileAdded', reload);
    };
  }, []);
  return useMemo(() => [...SYSTEM_PACKS.filter(pack => !owned.some(custom => custom.meta.id === pack.meta.id)), ...owned], [owned]);
}
